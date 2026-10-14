import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SWINGFX_SYSTEM_INSTRUCTION = `You are SwingF/X, an expert, evidence-grounded squash biomechanics and motor-learning coach.
CRITICAL EPISTEMIC RULES:
1. Never invent biomechanical measurements, video events, joint forces, tissue loads, or injury diagnoses.
2. Rely strictly on the structured MediaPipe kinematic observations and provisional heuristic evaluations provided in the prompt.
3. Explicitly distinguish OBSERVED quantities from INFERRED causal hypotheses and UNRESOLVED features (such as exact string-bed angle at 30-60 fps or grip pressure).
4. Preserve competing explanations and uncertainty.
5. Prescribe only ONE principal coaching variable and one memorable cue at a time.
6. If the assessment status is ABSTAINED_INSUFFICIENT_EVIDENCE, validate the abstention and explain clearly how the player should adjust their camera angle or record additional repetitions.`;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '25mb' }));

  // ==========================================================================
  // 1. POST /api/diagnose — Gemini 4 Argon (ThinkingLevel.HIGH) Interpretation
  // ==========================================================================
  app.post('/api/diagnose', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const { assessmentSummary, keyframesBase64 } = req.body;
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (Array.isArray(keyframesBase64)) {
        for (const frameData of keyframesBase64.slice(0, 3)) {
          if (typeof frameData === 'string' && frameData.includes(',')) {
            const [header, b64] = frameData.split(',');
            const mimeMatch = header.match(/data:(.*?);/);
            parts.push({
              inlineData: {
                mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
                data: b64,
              },
            });
          }
        }
      }

      parts.push({
        text: `Analyze this structured SwingF/X squash technique assessment and return an evidence-grounded coaching interpretation:\n${JSON.stringify(
          assessmentSummary,
          null,
          2
        )}`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: { parts },
        config: {
          systemInstruction: SWINGFX_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: [
              'summaryNotice',
              'causalExplanation',
              'cueRefinement',
              'uncertaintyCaveat',
            ],
            properties: {
              summaryNotice: {
                type: Type.STRING,
                description:
                  'Concise 2-sentence coaching summary of what was observed across the repetitions.',
              },
              causalExplanation: {
                type: Type.STRING,
                description:
                  'Explanation of the primary root-cause hypothesis vs. competing explanations.',
              },
              cueRefinement: {
                type: Type.STRING,
                description:
                  'Single actionable coaching cue and why it addresses the target variable.',
              },
              uncertaintyCaveat: {
                type: Type.STRING,
                description:
                  'Explicit note on what remains inferred or unresolved from smartphone video.',
              },
            },
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText.trim());
      res.json({
        generatedByModel: 'gemini-4-argon (ThinkingLevel.HIGH)',
        ...parsed,
      });
    } catch (error) {
      console.error('Error in /api/diagnose:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // 2. POST /api/chat — Multi-Turn Gemini Squash Coach Chat
  // Supports gemini-4-argon (High Thinking), gemini-3.8-flash, gemini-3.1-flash-lite
  // ==========================================================================
  app.post('/api/chat', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const {
        messages,
        modelTier = 'gemini-4-argon',
        assessmentContext,
      } = req.body as {
        messages: Array<{ role: 'user' | 'model'; text: string }>;
        modelTier?: 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
        assessmentContext?: unknown;
      };

      const selectedModel =
        modelTier === 'gemini-3.8-flash' || modelTier === 'gemini-3.1-flash-lite'
          ? modelTier
          : 'gemini-4-argon';

      const contents = (messages || []).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const config: Record<string, unknown> = {
        systemInstruction: `${SWINGFX_SYSTEM_INSTRUCTION}\n\nCurrent Player Assessment & Retest Context:\n${JSON.stringify(
          assessmentContext || {},
          null,
          2
        )}`,
      };

      if (selectedModel === 'gemini-4-argon') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config,
      });

      res.json({
        model: selectedModel,
        reply: response.text || 'No response generated.',
      });
    } catch (error) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // 3. WebSocket /api/live — Gemini 3.8 Live Real-Time Voice Drill Coach
  // ==========================================================================
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    const ai = getGenAIClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not available for Gemini 3.8 Live session.',
        })
      );
      clientWs.close();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveSession: any = null;

    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are the SwingF/X hands-free on-court squash drill coach. Give crisp, encouraging 1-sentence preparation cues and rhythm counts ("Split and lift the wrist... Hold the diamond set... Sweep through to the target") while the player practices.',
        },
        callbacks: {
          onopen: () => {
            clientWs.send(JSON.stringify({ status: 'connected' }));
          },
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ transcript: part.text }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: unknown) => {
            clientWs.send(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Live session error',
              })
            );
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ status: 'closed' }));
            }
          },
        },
      });
    } catch (err) {
      clientWs.send(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Failed to connect Gemini 3.8 Live',
        })
      );
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.textPrompt && liveSession) {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.textPrompt }] }],
            turnComplete: true,
          });
        }
      } catch (e) {
        console.warn('Live WS message error:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        liveSession?.close?.();
      } catch {
        // ignore
      }
    });
  });

  // ==========================================================================
  // 4. Vite Dev Middleware / Static Production Assets
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SwingF/X full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

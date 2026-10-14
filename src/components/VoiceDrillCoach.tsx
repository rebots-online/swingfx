import React, { useEffect, useRef, useState } from 'react';
import { CorrectiveIntervention } from '../types/swingfx';
import { Mic, MicOff, Volume2, Square } from 'lucide-react';

interface VoiceDrillCoachProps {
  intervention: CorrectiveIntervention;
}

export const VoiceDrillCoach: React.FC<VoiceDrillCoachProps> = ({ intervention }) => {
  const [liveStatus, setLiveStatus] = useState<'IDLE' | 'CONNECTING' | 'LIVE' | 'CADENCE_LOCAL'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Hands-free audio cadence or Gemini 3.8 Live voice coach ready for on-court practice.'
  );
  const [repCounter, setRepCounter] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const cadenceTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (cadenceTimerRef.current) {
      window.clearInterval(cadenceTimerRef.current);
      cadenceTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setLiveStatus('IDLE');
  };

  const startLocalSpokenCadence = () => {
    stopAllAudio();
    setLiveStatus('CADENCE_LOCAL');
    setRepCounter(1);
    setStatusMessage(`Speaking 5-rep drill cadence: "${intervention.onCourtCue}"`);

    const speakPhrase = (text: string) => {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    };

    speakPhrase(
      `Starting ${intervention.drillTitle}. Remember your cue: ${intervention.onCourtCue}. Rep 1: Split and lift wrist... Hold set... Swing through.`
    );

    let rep = 1;
    cadenceTimerRef.current = window.setInterval(() => {
      rep += 1;
      if (rep > 5) {
        speakPhrase('Five repetitions complete. Ready to record your Try Again retest set.');
        stopAllAudio();
        setStatusMessage('5-rep spoken drill cadence completed. Ready for Stage 5 Retest!');
        return;
      }
      setRepCounter(rep);
      speakPhrase(`Rep ${rep}: Split and cock the wrist high... Hold set... Release.`);
    }, 5200);
  };

  const toggleGeminiLiveSession = async () => {
    if (liveStatus === 'LIVE' || liveStatus === 'CONNECTING') {
      stopAllAudio();
      setStatusMessage('Gemini 3.8 Live voice coach stopped.');
      return;
    }

    stopAllAudio();
    setLiveStatus('CONNECTING');
    setStatusMessage('Connecting to Gemini 3.8 Live real-time audio coach...');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
      wsRef.current = ws;

      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = outputCtx;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            textPrompt: `The player is practicing "${intervention.drillTitle}" with cue "${intervention.onCourtCue}" to improve ${intervention.targetVariableLabel}. Greet them briefly in one sentence and count out their first repetition.`,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'connected') {
            setLiveStatus('LIVE');
            setStatusMessage('Gemini 3.8 Live connected. Speak hands-free while practicing.');
            // Start microphone stream if granted
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaStreamRef.current = stream;
              const inputCtx = new AudioContext({ sampleRate: 16000 });
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              source.connect(processor);
              processor.connect(inputCtx.destination);
              processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const float32 = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(float32.length);
                for (let i = 0; i < float32.length; i++) {
                  const s = Math.max(-1, Math.min(1, float32[i]));
                  int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                const bytes = new Uint8Array(int16.buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                ws.send(JSON.stringify({ audio: btoa(binary) }));
              };
            } catch {
              setStatusMessage(
                'Gemini 3.8 Live audio connected (microphone permission skipped; listening to coach cues).'
              );
            }
          } else if (data.audio && outputCtx) {
            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768;
            }
            const audioBuffer = outputCtx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            const src = outputCtx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(outputCtx.destination);
            src.start();
          } else if (data.error) {
            // Gracefully fallback to local spoken cadence if Live API key is not configured
            startLocalSpokenCadence();
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onerror = () => {
        startLocalSpokenCadence();
      };
    } catch {
      startLocalSpokenCadence();
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#F3EFE6] border border-[#E2DDD2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-mono text-[#52525B]">
          <span>ON-COURT AUDIO DRILL COACH</span>
          <span aria-hidden="true">·</span>
          <span>
            {liveStatus === 'LIVE'
              ? 'GEMINI 3.8 LIVE ACTIVE'
              : liveStatus === 'CADENCE_LOCAL'
                ? `CADENCE REP ${repCounter}/5`
                : 'READY'}
          </span>
        </div>
        <p className="text-xs text-[#18181B]">{statusMessage}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {liveStatus === 'CADENCE_LOCAL' ? (
          <button
            onClick={stopAllAudio}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#18181B] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Square className="w-3.5 h-3.5" />
            Stop Cadence
          </button>
        ) : (
          <button
            onClick={startLocalSpokenCadence}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white border border-[#E2DDD2] text-[#18181B] hover:bg-[#F3EFE6] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-4 h-4 text-[#C84B31]" />
            Play 5-Rep Audio Cadence
          </button>
        )}

        <button
          onClick={toggleGeminiLiveSession}
          className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            liveStatus === 'LIVE' || liveStatus === 'CONNECTING'
              ? 'bg-[#DC2626] text-white'
              : 'bg-[#C84B31] text-white hover:bg-[#B03E26]'
          }`}
        >
          {liveStatus === 'LIVE' || liveStatus === 'CONNECTING' ? (
            <>
              <MicOff className="w-4 h-4" />
              End Gemini Live
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Gemini 3.8 Live Coach
            </>
          )}
        </button>
      </div>
    </div>
  );
};

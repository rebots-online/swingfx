import React, { useState } from 'react';
import {
  CorrectionOutcome,
  RetentionAssessment,
  TechniqueAssessment,
} from '../types/swingfx';
import { Send, Sparkles, Cpu } from 'lucide-react';

interface CoachChatPanelProps {
  assessment: TechniqueAssessment;
  outcome: CorrectionOutcome | null;
  retentions: RetentionAssessment[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

export const CoachChatPanel: React.FC<CoachChatPanelProps> = ({
  assessment,
  outcome,
  retentions,
}) => {
  const [modelTier, setModelTier] = useState<
    'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'
  >('gemini-4-argon');
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      modelUsed: 'SwingF/X Grounded Coach',
      text:
        assessment.outcomeStatus === 'ABSTAINED_INSUFFICIENT_EVIDENCE'
          ? `I abstained from diagnosing "${assessment.clipTitle}" because ${assessment.abstentionDetails?.explanation} Ask me how to set up your tripod on court for the cleanest view.`
          : `I've analyzed "${assessment.clipTitle}" (${assessment.observations.length} repetitions). Your primary correctable target is ${
              assessment.detectedFaults[0]?.title || 'clean preparation'
            } (${assessment.detectedFaults[0]?.observedMean ?? ''} ${
              assessment.detectedFaults[0]?.unit ?? ''
            }). Ask me about the competing root-cause hypotheses, how to adapt the drill, or what cannot be measured from 30 fps video.`,
    },
  ]);

  const sendQuestion = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!promptText) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelTier,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          assessmentContext: {
            clipTitle: assessment.clipTitle,
            outcomeStatus: assessment.outcomeStatus,
            abstentionDetails: assessment.abstentionDetails,
            primaryFault: assessment.detectedFaults[0] || null,
            secondaryFaults: assessment.detectedFaults.slice(1),
            hypotheses: assessment.hypotheses,
            selectedIntervention: assessment.selectedIntervention,
            latestRetestOutcome: outcome,
            retentionCount: retentions.length,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Chat request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply,
          modelUsed:
            modelTier === 'gemini-4-argon'
              ? 'gemini-4-argon (ThinkingLevel.HIGH)'
              : modelTier,
        },
      ]);
    } catch {
      // Evidence-grounded deterministic fallback response if API key is not yet selected
      const pf = assessment.detectedFaults[0];
      const hyp = assessment.hypotheses[0];
      const fallbackReply =
        assessment.outcomeStatus === 'ABSTAINED_INSUFFICIENT_EVIDENCE'
          ? `Based on the empirical perspective check (Core visibility ${(
              (assessment.observations[0]?.perspectiveDiagnostic.meanCoreVisibility ?? 0) * 100
            ).toFixed(0)}%, Foreshortening: ${
              assessment.observations[0]?.perspectiveDiagnostic.foreshorteningSeverity
            }), SwingF/X abstains from guessing. Place the camera 3m behind the T at 1.2m height and record 4–5 continuous swings.`
          : `Grounded in your ${assessment.observations.length} recorded repetitions:\n• Observed Deviation: ${pf?.title} (Mean ${pf?.observedMean} ${pf?.unit} across Reps ${pf?.affectedRepetitionIndices.join(', ')} vs. provisional heuristic ${pf?.heuristicSnapshot.operator} ${pf?.heuristicSnapshot.activeThresholdValue} ${pf?.unit}).\n• Primary Root-Cause Hypothesis (INFERRED, confidence ${((hyp?.confidence ?? 0.8) * 100).toFixed(0)}%): ${hyp?.statement}\n• Single-Variable Cue: "${assessment.selectedIntervention?.onCourtCue}"\n• Unresolved Boundary: Exact string-bed angle at the 5 ms impact frame and grip pressure remain UNRESOLVED in 30 fps smartphone footage.`;

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: fallbackReply,
          modelUsed: 'Local Deterministic Biomechanics Engine',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-[#E2DDD2] rounded-2xl bg-white overflow-hidden flex flex-col">
      {/* Header & Model Tier Selector */}
      <div className="px-6 py-4 bg-[#F3EFE6] border-b border-[#E2DDD2] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#52525B]">
            <Cpu className="w-3.5 h-3.5 text-[#C84B31]" />
            <span>EVIDENCE-GROUNDED SQUASH COACH CHAT</span>
          </div>
          <h3 className="text-base font-bold text-[#18181B]">
            Ask About Competing Hypotheses, Drill Adaptations, or Observability Limits
          </h3>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-[#E2DDD2]">
          {(
            [
              {
                id: 'gemini-4-argon',
                label: 'Argon 4 (High Thinking)',
              },
              {
                id: 'gemini-3.8-flash',
                label: 'Flash 3.8 (General)',
              },
              {
                id: 'gemini-3.1-flash-lite',
                label: 'Flash-Lite 3.1 (Fast)',
              },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setModelTier(m.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                modelTier === m.id
                  ? 'bg-[#18181B] text-white font-semibold'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Evidence-Grounded Prompts */}
      <div className="px-6 py-2.5 bg-[#FBF9F5] border-b border-[#E2DDD2] flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-[#52525B]">Quick Questions:</span>
        {[
          'Why did you pick this root cause over competing explanations?',
          'How do I test whether my lunge collapse caused the slow recovery?',
          'What can and cannot be measured from my 30 fps camera angle?',
        ].map((q) => (
          <button
            key={q}
            onClick={() => sendQuestion(q)}
            className="px-2.5 py-1 rounded-md bg-[#F3EFE6] hover:bg-[#E5DFD2] text-xs text-[#18181B] transition-colors whitespace-nowrap shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message Thread */}
      <div className="p-6 max-h-[380px] overflow-y-auto flex flex-col gap-4 bg-[#FBF9F5]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'self-end bg-[#18181B] text-white'
                : 'self-start bg-white border border-[#E2DDD2] text-[#18181B]'
            }`}
          >
            {m.modelUsed && (
              <div className="mb-1 text-[11px] font-mono text-[#52525B] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#C84B31]" />
                <span>{m.modelUsed}</span>
              </div>
            )}
            <div className="whitespace-pre-line">{m.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="self-start px-4 py-3 rounded-2xl bg-white border border-[#E2DDD2] text-xs font-mono text-[#52525B]">
            Reasoning with {modelTier} (ThinkingLevel.HIGH)...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion();
        }}
        className="p-4 bg-white border-t border-[#E2DDD2] flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your swing kinematics, competing causes, or drill modifications..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2DDD2] bg-[#FBF9F5] text-sm text-[#18181B] focus:outline-none focus:border-[#C84B31]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};

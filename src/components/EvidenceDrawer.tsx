import React, { useState } from 'react';
import {
  CausalHypothesis,
  CoachReviewStatus,
  HeuristicThresholdConfig,
  StrokeCategory,
  TechniqueAssessment,
} from '../types/swingfx';
import { ChevronDown, ChevronUp, RotateCcw, Sliders, ShieldCheck } from 'lucide-react';

interface EvidenceDrawerProps {
  assessment: TechniqueAssessment;
  heuristics: HeuristicThresholdConfig[];
  onOverrideHeuristic: (
    faultId: string,
    newThreshold: number,
    coachName: string,
    rationale: string
  ) => void;
  onResetHeuristics: () => void;
  onUpdateHypothesisStatus: (
    hypothesisId: string,
    status: CoachReviewStatus,
    note: string
  ) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  assessment,
  heuristics,
  onOverrideHeuristic,
  onResetHeuristics,
  onUpdateHypothesisStatus,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'QUANTITATIVE' | 'EMPIRICAL_VALIDATION' | 'TAXONOMY_OVERRIDES' | 'COACH_AUDIT'
  >('QUANTITATIVE');
  const [selectedStrokeFilter, setSelectedStrokeFilter] = useState<StrokeCategory>(
    assessment.playerIntent.strokeCategory
  );
  const [coachName, setCoachName] = useState<string>('Club Head Coach');
  const [overrideNote, setOverrideNote] = useState<string>(
    'Adjusted for player shoulder mobility and court pace'
  );
  const [draftValues, setDraftValues] = useState<Record<string, number>>({});

  const firstObs = assessment.observations[0];

  return (
    <section className="mt-8 border border-[#E2DDD2] rounded-2xl bg-[#F3EFE6]/70 overflow-hidden">
      {/* Drawer Header Button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#EFEAE0] transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#52525B]">
            <span>BIOMECHANICS EVIDENCE & HEURISTIC PROVENANCE</span>
            <span aria-hidden="true">·</span>
            <span>{assessment.cvPipelineVersion}</span>
            <span aria-hidden="true">·</span>
            <span>{assessment.observations.length} Segmented Reps</span>
          </div>
          <h3 className="text-base font-bold text-[#18181B]">
            Inspect Quantitative Measurements, Empirical Reference Residuals & Coach Threshold Overrides
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#C84B31] whitespace-nowrap shrink-0">
          <span>{isOpen ? 'Hide Technical Drawer' : 'Expand Evidence Drawer'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-[#E2DDD2] bg-[#FBF9F5]">
          {/* Segmented Tab Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-[#E2DDD2]">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg">
              {(
                [
                  { id: 'QUANTITATIVE', label: '1. Quantitative Kinematics & Provenance' },
                  { id: 'EMPIRICAL_VALIDATION', label: '2. Empirical Segmentation & Perspective' },
                  { id: 'TAXONOMY_OVERRIDES', label: '3. Fault Taxonomy & Coach Heuristic Overrides' },
                  { id: 'COACH_AUDIT', label: '4. Coach Hypothesis Review' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-[#18181B] shadow-xs font-semibold'
                      : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-[#52525B]">
              OBSERVED · INFERRED · SIMULATED · UNRESOLVED
            </div>
          </div>

          {/* TAB 1: Quantitative Kinematics & Epistemic Provenance */}
          {activeTab === 'QUANTITATIVE' && firstObs && (
            <div className="mt-4 flex flex-col gap-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2DDD2] text-[#52525B] font-mono">
                      <th className="py-2.5 pr-4">Biomechanical Variable</th>
                      <th className="py-2.5 px-3">Provenance</th>
                      <th className="py-2.5 px-3">Normalization</th>
                      {assessment.observations.map((o, idx) => (
                        <th key={o.observationId} className="py-2.5 px-3 text-right">
                          Rep {idx + 1}
                        </th>
                      ))}
                      <th className="py-2.5 pl-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD2]/60 font-mono tabular-nums">
                    {Object.values(firstObs.metrics).map((metric) => (
                      <tr key={metric.metricKey} className="hover:bg-[#F3EFE6]/50">
                        <td className="py-2.5 pr-4 font-sans font-medium text-[#18181B]">
                          {metric.label}
                        </td>
                        <td className="py-2.5 px-3 text-[#52525B]">{metric.provenance}</td>
                        <td className="py-2.5 px-3 text-[#52525B]">{metric.normalizationBasis}</td>
                        {assessment.observations.map((obs) => {
                          const val = obs.metrics[metric.metricKey]?.value;
                          return (
                            <td key={obs.observationId} className="py-2.5 px-3 text-right font-semibold">
                              {val !== undefined ? `${val} ${metric.unit}` : '—'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 pl-3 text-right text-[#52525B]">
                          {(metric.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Explicit Unobservable / UNRESOLVED Disclosure */}
              <div className="p-4 rounded-xl bg-[#F3EFE6] border border-[#E2DDD2] flex flex-col gap-2">
                <div className="text-xs font-mono font-semibold text-[#B45309]">
                  EPISTEMIC BOUNDARY — UNRESOLVED QUANTITIES IN 30–60 FPS SMARTPHONE VIDEO
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#52525B]">
                  {firstObs.unobservableFlags.map((flag) => (
                    <div key={flag.feature} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[#18181B]">
                        {flag.feature} · {flag.provenance}
                      </span>
                      <span>{flag.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Empirical Reference Validation & Camera Perspective Diagnostics */}
          {activeTab === 'EMPIRICAL_VALIDATION' && (
            <div className="mt-4 flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-[#F3EFE6] border border-[#E2DDD2] flex flex-col gap-2">
                <div className="text-xs font-mono text-[#52525B]">
                  EMPIRICAL VALIDATION PROTOCOL (NO FIXED PRECISION ASSUMPTIONS)
                </div>
                <p className="text-xs text-[#18181B] leading-relaxed">
                  SwingF/X does not assert fixed angular or temporal accuracy bounds out of context.
                  Instead, each assessment logs actual frame interval (
                  <span className="font-mono">
                    Δt = {firstObs ? firstObs.frameIntervalMs : 33.3} ms @{' '}
                    {firstObs ? firstObs.fps : 30} fps
                  </span>
                  ), planar torso aspect ratio, landmark visibility, and—when running on annotated
                  reference clips—the exact frame residual between automated phase detection and
                  human-annotated ground truth.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-[#E2DDD2] text-[#52525B]">
                      <th className="py-2 pr-3">Rep</th>
                      <th className="py-2 px-3">Core Visibility</th>
                      <th className="py-2 px-3">Torso Aspect</th>
                      <th className="py-2 px-3">Foreshortening</th>
                      <th className="py-2 px-3">Auto Backswing / GT</th>
                      <th className="py-2 px-3">Auto Impact / GT</th>
                      <th className="py-2 pl-3">Auto Recovery / GT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD2]/60">
                    {assessment.observations.map((obs, idx) => {
                      const rv = obs.referenceValidation;
                      return (
                        <tr key={obs.observationId}>
                          <td className="py-2.5 pr-3 font-bold">Rep #{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            {(obs.perspectiveDiagnostic.meanCoreVisibility * 100).toFixed(0)}%
                          </td>
                          <td className="py-2.5 px-3">
                            {obs.perspectiveDiagnostic.torsoAspectRatio}
                          </td>
                          <td className="py-2.5 px-3">
                            {obs.perspectiveDiagnostic.foreshorteningSeverity}
                          </td>
                          <td className="py-2.5 px-3">
                            f{obs.phaseFrames.backswingPeak}
                            {rv.hasGroundTruthAnnotations
                              ? ` / f${rv.annotatedBackswingPeakFrame} (Δ=${rv.backswingFrameResidual}f)`
                              : ' (Live/Unannotated)'}
                          </td>
                          <td className="py-2.5 px-3">
                            f{obs.phaseFrames.impactEstimate}
                            {rv.hasGroundTruthAnnotations
                              ? ` / f${rv.annotatedImpactFrame} (Δ=${rv.impactFrameResidual}f)`
                              : ' (Live/Unannotated)'}
                          </td>
                          <td className="py-2.5 pl-3">
                            f{obs.phaseFrames.recoveryStart}
                            {rv.hasGroundTruthAnnotations
                              ? ` / f${rv.annotatedRecoveryStartFrame} (Δ=${rv.recoveryFrameResidual}f)`
                              : ' (Live/Unannotated)'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Hierarchical Fault Taxonomy & Coach Heuristic Overrides */}
          {activeTab === 'TAXONOMY_OVERRIDES' && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#52525B]">Filter by Stroke:</span>
                  <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg">
                    {(['FOREHAND', 'BACKHAND', 'VOLLEY', 'DROP_BOAST'] as StrokeCategory[]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => setSelectedStrokeFilter(st)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                            selectedStrokeFilter === st
                              ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                              : 'text-[#52525B] hover:text-[#18181B]'
                          }`}
                        >
                          {st.replace('_', ' / ')}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="Coach Name"
                    className="px-2.5 py-1 text-xs rounded border border-[#E2DDD2] bg-white"
                  />
                  <input
                    type="text"
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    placeholder="Override rationale"
                    className="px-2.5 py-1 text-xs rounded border border-[#E2DDD2] bg-white w-56"
                  />
                  <button
                    onClick={onResetHeuristics}
                    className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-white text-xs font-medium text-[#18181B] hover:bg-[#F3EFE6] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Defaults
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {heuristics
                  .filter((h) => h.strokeCategory === selectedStrokeFilter)
                  .map((h) => {
                    const currentVal =
                      draftValues[h.faultId] !== undefined
                        ? draftValues[h.faultId]
                        : h.activeThresholdValue;
                    return (
                      <div
                        key={h.faultId}
                        className="p-4 rounded-xl border border-[#E2DDD2] bg-[#F3EFE6]/40 flex flex-col justify-between gap-3"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#52525B]">
                            <span>
                              {h.faultId} · {h.movementPhase} · {h.bodyPart}
                            </span>
                            <span
                              className={
                                h.provenance === 'COACH_OVERRIDE'
                                  ? 'text-[#C84B31] font-semibold'
                                  : 'text-[#52525B]'
                              }
                            >
                              {h.provenance}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#18181B]">{h.title}</h4>
                          <p className="text-xs text-[#52525B] leading-relaxed">
                            {h.briefDescription}
                          </p>
                          <div className="mt-1 text-[11px] text-[#52525B]">
                            <span className="font-semibold text-[#18181B]">Root Causes: </span>
                            {h.plausibleRootCauses.map((rc) => rc.title).join(' · ')}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#E2DDD2] flex items-center justify-between gap-3">
                          <div className="text-xs font-mono">
                            Rule: <span className="font-semibold">{h.metricKey}</span> {h.operator}{' '}
                            <span className="font-bold text-[#C84B31]">
                              {h.activeThresholdValue} {h.unit}
                            </span>{' '}
                            (Default: {h.defaultThresholdValue})
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.02"
                              value={currentVal}
                              onChange={(e) =>
                                setDraftValues((prev) => ({
                                  ...prev,
                                  [h.faultId]: parseFloat(e.target.value),
                                }))
                              }
                              className="w-20 px-2 py-1 text-xs font-mono rounded border border-[#E2DDD2] bg-white text-right"
                            />
                            <button
                              onClick={() =>
                                onOverrideHeuristic(
                                  h.faultId,
                                  Number(currentVal),
                                  coachName,
                                  overrideNote
                                )
                              }
                              className="px-2.5 py-1 rounded bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Sliders className="w-3 h-3" />
                              Apply Override
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 4: Coach Hypothesis Confirmation / Amendment */}
          {activeTab === 'COACH_AUDIT' && (
            <div className="mt-4 flex flex-col gap-4">
              {assessment.hypotheses.length === 0 ? (
                <p className="text-xs text-[#52525B]">
                  No active diagnostic hypotheses for this assessment (Abstained or zero faults triggered).
                </p>
              ) : (
                assessment.hypotheses.map((hyp: CausalHypothesis) => (
                  <div
                    key={hyp.hypothesisId}
                    className="p-4 rounded-xl border border-[#E2DDD2] bg-[#F3EFE6]/50 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                      <span>
                        {hyp.classification} · Provenance: {hyp.provenance} · Confidence:{' '}
                        {(hyp.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="font-semibold text-[#18181B]">
                        Coach Review: {hyp.coachReviewStatus}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#18181B]">{hyp.statement}</p>
                    <p className="text-xs text-[#52525B]">{hyp.biomechanicalMechanism}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {(
                        [
                          { status: 'COACH_CONFIRMED', label: 'Confirm Hypothesis' },
                          { status: 'COACH_AMENDED', label: 'Amend with Coach Note' },
                          { status: 'COACH_REJECTED', label: 'Reject Hypothesis' },
                        ] as const
                      ).map((btn) => (
                        <button
                          key={btn.status}
                          onClick={() =>
                            onUpdateHypothesisStatus(
                              hyp.hypothesisId,
                              btn.status,
                              `Reviewed by ${coachName}: ${overrideNote}`
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                            hyp.coachReviewStatus === btn.status
                              ? 'bg-[#C84B31] text-white'
                              : 'bg-white border border-[#E2DDD2] text-[#18181B] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

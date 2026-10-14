import {
  CausalHypothesis,
  CorrectionOutcome,
  CorrectiveIntervention,
  DiagnosticAbstention,
  FramePoseSample,
  Handedness,
  HeuristicThresholdConfig,
  PhysicalVenue,
  CourtConfiguration,
  PracticeProtocol,
  RetentionAssessment,
  ShotSubType,
  StrokeCategory,
  TechniqueAssessment,
  TechniqueFault,
} from '../types/swingfx';
import {
  computePerspectiveDiagnostic,
  segmentRepetitionsAndExtractObservations,
} from './kinematicsEngine';
import { computeDTWAlignment } from './dtwEngine';
import { ReferenceSquashClipSpec } from './videoReferenceGenerator';
import buildVersion from '../../version.json';

/**
 * Evaluates extracted observations against the configurable heuristic taxonomy,
 * enforces the First-Class Diagnostic Abstention Gate when evidence is inadequate,
 * and constructs ranked CausalHypotheses and a single-variable CorrectiveIntervention.
 */
export function evaluateTechniqueAssessment(params: {
  assessmentId: string;
  userId: string;
  clipTitle: string;
  videoSourceType: TechniqueAssessment['videoSourceType'];
  referenceClip?: ReferenceSquashClipSpec;
  frames: FramePoseSample[];
  fps: number;
  strokeCategory: StrokeCategory;
  shotSubType: ShotSubType;
  handedness: Handedness;
  subjectiveFeel: string;
  venue: PhysicalVenue;
  courtConfig: CourtConfiguration;
  protocol: PracticeProtocol;
  heuristics: HeuristicThresholdConfig[];
}): TechniqueAssessment {
  const {
    assessmentId,
    userId,
    clipTitle,
    videoSourceType,
    referenceClip,
    frames,
    fps,
    strokeCategory,
    shotSubType,
    handedness,
    subjectiveFeel,
    venue,
    courtConfig,
    protocol,
    heuristics,
  } = params;

  const overallPerspective = computePerspectiveDiagnostic(frames);
  const observations = segmentRepetitionsAndExtractObservations(
    assessmentId,
    frames,
    fps,
    handedness,
    referenceClip
  );

  // ==========================================================================
  // FIRST-CLASS DIAGNOSTIC ABSTENTION GATE
  // ==========================================================================
  if (!overallPerspective.perspectiveValidForAnalysis) {
    const abstention: DiagnosticAbstention = {
      abstained: true,
      reasonCode:
        overallPerspective.foreshorteningSeverity === 'SEVERE'
          ? 'SEVERE_CAMERA_FORESHORTENING'
          : 'LOW_LANDMARK_VISIBILITY',
      headline:
        'Diagnostic Abstention — Camera Perspective or Landmark Visibility Insufficient',
      explanation:
        overallPerspective.warningMessage ||
        'Pose landmarks could not be tracked with sufficient confidence across the swing phases to support an evidence-grounded biomechanical correction.',
      observedEvidenceSummary: `Mean core landmark visibility: ${(
        overallPerspective.meanCoreVisibility * 100
      ).toFixed(0)}% · Distal arm visibility: ${(
        overallPerspective.meanDistalArmVisibility * 100
      ).toFixed(0)}% · Torso planar aspect ratio: ${overallPerspective.torsoAspectRatio} (${
        overallPerspective.foreshorteningSeverity
      } foreshortening).`,
      recommendedCameraPlacement:
        'Position your smartphone at chest-to-hip height (1.1 m – 1.4 m) on the back-wall diagonal or side gallery so the full body, lead foot, and hitting elbow remain unoccluded through preparation and lunge.',
      requestedAction: 'ADJUST_CAMERA_ANGLE',
      provenance: 'OBSERVED',
    };

    return {
      assessmentId,
      userId,
      createdAt: new Date().toISOString(),
      clipTitle,
      videoSourceType,
      referenceClipId: referenceClip?.clipId,
      modelVersion: 'mediapipe-pose-landmarker-v0.10.34',
      cvPipelineVersion: `swingfx-cv-v${buildVersion.version}`,
      heuristicVersion: 'provisional-heuristics-v0.1',
      venue,
      courtConfig,
      protocol,
      playerIntent: {
        strokeCategory,
        shotSubType,
        handedness,
        subjectiveFeel,
      },
      outcomeStatus: 'ABSTAINED_INSUFFICIENT_EVIDENCE',
      abstentionDetails: abstention,
      observations,
      detectedFaults: [],
      primaryFaultId: null,
      hypotheses: [],
      selectedIntervention: null,
    };
  }

  if (observations.length < 2) {
    const abstention: DiagnosticAbstention = {
      abstained: true,
      reasonCode: 'INSUFFICIENT_REPETITIONS',
      headline: 'Diagnostic Abstention — Fewer Than 2 Usable Repetitions Detected',
      explanation:
        'SwingF/X requires multiple repetitions of the same stroke to distinguish a recurring technical habit from an isolated one-off adjustment.',
      observedEvidenceSummary: `Detected ${observations.length} usable repetition(s) across ${(
        frames.length / fps
      ).toFixed(1)} s of footage.`,
      recommendedCameraPlacement:
        'Keep the camera stationary and record 3 to 6 continuous repetitions of the same stroke.',
      requestedAction: 'RECORD_MORE_REPETITIONS',
      provenance: 'OBSERVED',
    };

    return {
      assessmentId,
      userId,
      createdAt: new Date().toISOString(),
      clipTitle,
      videoSourceType,
      referenceClipId: referenceClip?.clipId,
      modelVersion: 'mediapipe-pose-landmarker-v0.10.34',
      cvPipelineVersion: `swingfx-cv-v${buildVersion.version}`,
      heuristicVersion: 'provisional-heuristics-v0.1',
      venue,
      courtConfig,
      protocol,
      playerIntent: {
        strokeCategory,
        shotSubType,
        handedness,
        subjectiveFeel,
      },
      outcomeStatus: 'ABSTAINED_INSUFFICIENT_EVIDENCE',
      abstentionDetails: abstention,
      observations,
      detectedFaults: [],
      primaryFaultId: null,
      hypotheses: [],
      selectedIntervention: null,
    };
  }

  // ==========================================================================
  // CONFIGURABLE HEURISTIC FAULT EVALUATION
  // ==========================================================================
  const applicableHeuristics = heuristics.filter((h) => h.strokeCategory === strokeCategory);
  const detectedFaults: TechniqueFault[] = [];

  for (const h of applicableHeuristics) {
    const values: number[] = [];
    const affectedReps: number[] = [];

    observations.forEach((obs, idx) => {
      const m = obs.metrics[h.metricKey];
      if (!m) return;
      values.push(m.value);
      const isViolation =
        h.operator === '<'
          ? m.value < h.activeThresholdValue
          : m.value > h.activeThresholdValue;
      if (isViolation) {
        affectedReps.push(idx + 1);
      }
    });

    const consistencyRatio = affectedReps.length / Math.max(1, observations.length);
    // Require recurring pattern across at least 50% of repetitions
    if (consistencyRatio >= 0.5 && values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // 6-Factor Evidence-Grounded Prioritization Rubric
      const detectability = observations[0].metrics[h.metricKey].provenance === 'OBSERVED' ? 0.92 : 0.76;
      const functionalSignificance =
        h.movementPhase === 'PREPARATION' || h.movementPhase === 'CONTACT' ? 0.90 : 0.82;
      const causalImportance =
        h.movementPhase === 'PREPARATION'
          ? 0.94
          : h.movementPhase === 'BACKSWING'
            ? 0.85
            : 0.74;
      const correctability = 0.88;
      const evidenceConfidence = Number(
        (consistencyRatio * overallPerspective.meanCoreVisibility).toFixed(2)
      );
      const testability = 0.91;
      const compositeScore = Number(
        (
          detectability * 0.18 +
          functionalSignificance * 0.20 +
          causalImportance * 0.24 +
          correctability * 0.14 +
          evidenceConfidence * 0.14 +
          testability * 0.10
        ).toFixed(3)
      );

      detectedFaults.push({
        faultId: h.faultId,
        strokeCategory: h.strokeCategory,
        movementPhase: h.movementPhase,
        bodyPart: h.bodyPart,
        title: h.title,
        description: h.briefDescription,
        metricKey: h.metricKey,
        metricLabel: h.metricLabel,
        unit: h.unit,
        observedMean: Number(mean.toFixed(2)),
        observedStdDev: Number(stdDev.toFixed(2)),
        observedMin: Number(Math.min(...values).toFixed(2)),
        observedMax: Number(Math.max(...values).toFixed(2)),
        affectedRepetitionIndices: affectedReps,
        totalRepetitions: observations.length,
        consistencyRatio: Number(consistencyRatio.toFixed(2)),
        heuristicSnapshot: {
          operator: h.operator,
          activeThresholdValue: h.activeThresholdValue,
          defaultThresholdValue: h.defaultThresholdValue,
          targetEffectiveRange: h.targetEffectiveRange,
          provenance: h.provenance,
          overriddenByCoach: h.overriddenByCoach,
        },
        priorityScore: {
          detectability,
          functionalSignificance,
          causalImportance,
          correctability,
          evidenceConfidence,
          testability,
          compositeScore,
        },
        provenance: observations[0].metrics[h.metricKey].provenance,
      });
    }
  }

  // Sort faults by composite priority score descending (upstream root-cause preference)
  detectedFaults.sort(
    (a, b) => b.priorityScore.compositeScore - a.priorityScore.compositeScore
  );

  const primaryFault = detectedFaults[0] || null;
  const hypotheses: CausalHypothesis[] = [];
  let selectedIntervention: CorrectiveIntervention | null = null;

  if (primaryFault) {
    const hConfig = heuristics.find((h) => h.faultId === primaryFault.faultId)!;
    const primaryRoot = hConfig.plausibleRootCauses[0];
    const competing = hConfig.plausibleRootCauses.slice(1).map((rc) => ({
      id: rc.id,
      title: rc.title,
      mechanism: rc.mechanism,
      confidence: rc.defaultConfidence,
      disambiguationTest: rc.disambiguationTest,
    }));

    // Check if downstream faults were also detected in the same session
    const coOccurringDownstream = detectedFaults
      .slice(1)
      .map((f) => `${f.title} (${f.observedMean} ${f.unit})`);

    const mainHypothesis: CausalHypothesis = {
      hypothesisId: `hyp-${assessmentId}-${primaryFault.faultId}`,
      faultId: primaryFault.faultId,
      classification: 'PRIMARY_ROOT_CAUSE',
      statement: `${primaryRoot.title} is likely driving the observed ${primaryFault.title.toLowerCase()} across ${
        primaryFault.affectedRepetitionIndices.length
      } of ${primaryFault.totalRepetitions} repetitions.`,
      biomechanicalMechanism: primaryRoot.mechanism,
      downstreamEffects:
        coOccurringDownstream.length > 0
          ? [
              `Co-occurring in this session: ${coOccurringDownstream.join('; ')}`,
              ...hConfig.downstreamSymptoms,
            ]
          : hConfig.downstreamSymptoms,
      supportingObservationIds: observations.map((o) => o.observationId),
      supportingRepetitionNumbers: primaryFault.affectedRepetitionIndices,
      competingHypotheses: competing,
      confidence: primaryRoot.defaultConfidence,
      limitations: [
        `Evaluated against provisional coaching heuristic (${hConfig.provenance}: ${hConfig.operator} ${hConfig.activeThresholdValue} ${hConfig.unit}).`,
        'Monocular 2D/3D pose estimation cannot directly measure grip tension or exact string-bed angle at impact.',
      ],
      disambiguationDrillOrView: primaryRoot.disambiguationTest,
      provenance: 'INFERRED',
      coachReviewStatus: 'UNREVIEWED',
    };

    hypotheses.push(mainHypothesis);

    // Add secondary co-occurring faults as downstream symptom hypotheses
    for (const secFault of detectedFaults.slice(1)) {
      hypotheses.push({
        hypothesisId: `hyp-${assessmentId}-${secFault.faultId}`,
        faultId: secFault.faultId,
        classification: 'DOWNSTREAM_SYMPTOM',
        statement: `${secFault.title} (${secFault.observedMean} ${secFault.unit}) appears across ${secFault.affectedRepetitionIndices.length}/${secFault.totalRepetitions} reps, likely compounded by upstream preparation or spacing timing.`,
        biomechanicalMechanism:
          'When early preparation or spacing breaks down, downstream lunge stability and recovery timing frequently compensate.',
        downstreamEffects: ['Reduced T-recovery margin on the following shot'],
        supportingObservationIds: observations.map((o) => o.observationId),
        supportingRepetitionNumbers: secFault.affectedRepetitionIndices,
        competingHypotheses: [],
        confidence: 0.68,
        limitations: ['Test whether correcting the primary upstream cue resolves this secondary deviation automatically.'],
        disambiguationDrillOrView: 'Re-evaluate after completing the primary intervention drill.',
        provenance: 'INFERRED',
        coachReviewStatus: 'UNREVIEWED',
      });
    }

    selectedIntervention = {
      interventionId: `int-${assessmentId}-${primaryFault.faultId}`,
      faultId: primaryFault.faultId,
      hypothesisId: mainHypothesis.hypothesisId,
      targetVariableKey: primaryFault.metricKey,
      targetVariableLabel: primaryFault.metricLabel,
      unit: primaryFault.unit,
      currentObservedMean: primaryFault.observedMean,
      targetHeuristicRange: hConfig.targetEffectiveRange,
      plainLanguageExplanation: hConfig.defaultDrill.targetVariableDescription,
      drillTitle: hConfig.defaultDrill.drillTitle,
      drillModality: hConfig.defaultDrill.drillModality,
      drillProtocolSteps: hConfig.defaultDrill.drillProtocolSteps,
      onCourtCue: hConfig.defaultDrill.onCourtCue,
      adaptationContext: {
        handedness,
        mobilityNotes: 'Maintain comfortable hip/thoracic range without forcing end-range lumbar extension.',
        tacticalIntent: `Consistent ${strokeCategory.toLowerCase()} length and early T recovery.`,
      },
      targetPoseAdjustments: {
        description: 'Elevated wrist & elbow preparation diamond with tall chest posture at lunge plant',
        elbowElevationDeltaDeg: 22,
        wristElevationDeltaRatio: 0.22,
        trunkInclinationTargetDeg: 26,
        shoulderCoilTargetDeg: 32,
        lateralSpacingTargetRatio: 0.52,
      },
    };
  }

  return {
    assessmentId,
    userId,
    createdAt: new Date().toISOString(),
    clipTitle,
    videoSourceType,
    referenceClipId: referenceClip?.clipId,
    modelVersion: 'mediapipe-pose-landmarker-v0.10.34',
    cvPipelineVersion: `swingfx-cv-v${buildVersion.version}`,
    heuristicVersion: 'provisional-heuristics-v0.1',
    venue,
    courtConfig,
    protocol,
    playerIntent: {
      strokeCategory,
      shotSubType,
      handedness,
      subjectiveFeel,
    },
    outcomeStatus: 'DIAGNOSIS_READY',
    observations,
    detectedFaults,
    primaryFaultId: primaryFault ? primaryFault.faultId : null,
    hypotheses,
    selectedIntervention,
  };
}

/**
 * Quantifies whether a post-intervention Retest attempt changed the target
 * mechanical variable, improved execution repeatability, or introduced new compensations.
 */
export function evaluateCorrectionOutcome(params: {
  baseline: TechniqueAssessment;
  retest: TechniqueAssessment;
  intervention: CorrectiveIntervention;
}): CorrectionOutcome {
  const { baseline, retest, intervention } = params;
  const key = intervention.targetVariableKey;

  const beforeVals = baseline.observations.map((o) => o.metrics[key].value);
  const afterVals = retest.observations.map((o) => o.metrics[key].value);

  const beforeMean =
    beforeVals.reduce((a, b) => a + b, 0) / Math.max(1, beforeVals.length);
  const afterMean =
    afterVals.reduce((a, b) => a + b, 0) / Math.max(1, afterVals.length);

  const beforeStdDev = Math.sqrt(
    beforeVals.reduce((acc, v) => acc + Math.pow(v - beforeMean, 2), 0) /
      Math.max(1, beforeVals.length)
  );
  const afterStdDev = Math.sqrt(
    afterVals.reduce((acc, v) => acc + Math.pow(v - afterMean, 2), 0) /
      Math.max(1, afterVals.length)
  );

  const [minTarget, maxTarget] = intervention.targetHeuristicRange;
  const inRangeReps = afterVals.filter((v) => v >= minTarget && v <= maxTarget).length;
  const repeatabilityRatio = Number(
    (inRangeReps / Math.max(1, afterVals.length)).toFixed(2)
  );

  const distBefore =
    beforeMean < minTarget
      ? minTarget - beforeMean
      : beforeMean > maxTarget
        ? beforeMean - maxTarget
        : 0;
  const distAfter =
    afterMean < minTarget
      ? minTarget - afterMean
      : afterMean > maxTarget
        ? afterMean - maxTarget
        : 0;

  const targetVariableChanged = Math.abs(afterMean - beforeMean) > Math.max(0.03, beforeStdDev * 0.8);
  const executionQualityImproved = distAfter < distBefore && repeatabilityRatio >= 0.6;

  // Check for newly induced compensatory faults not present in baseline
  const baselineFaultIds = new Set(baseline.detectedFaults.map((f) => f.faultId));
  const newCompensationsDetected = retest.detectedFaults.filter(
    (f) => !baselineFaultIds.has(f.faultId)
  );

  const dtwAlignment = computeDTWAlignment(
    baseline.observations[0],
    retest.observations[0]
  );

  let recommendation: CorrectionOutcome['recommendation'] = 'CONTINUE_CURRENT_DRILL';
  if (retest.outcomeStatus === 'ABSTAINED_INSUFFICIENT_EVIDENCE') {
    recommendation = 'ABSTAIN_RECAPTURE';
  } else if (executionQualityImproved && newCompensationsDetected.length === 0) {
    recommendation = 'PROCEED_TO_RETENTION';
  } else if (!targetVariableChanged || newCompensationsDetected.length > 0) {
    recommendation = 'PIVOT_HYPOTHESIS';
  }

  const deltaValue = Number((afterMean - beforeMean).toFixed(2));
  const coachingSummary = executionQualityImproved
    ? `Target variable (${intervention.targetVariableLabel}) shifted from ${beforeMean.toFixed(
        2
      )} to ${afterMean.toFixed(2)} ${intervention.unit} (target [${minTarget}, ${maxTarget}]), holding across ${inRangeReps}/${
        afterVals.length
      } repetitions with zero new compensatory faults.`
    : `Target variable moved from ${beforeMean.toFixed(2)} to ${afterMean.toFixed(
        2
      )} ${intervention.unit} (${inRangeReps}/${
        afterVals.length
      } reps in target range). Consider adjusting the cue or testing the competing hypothesis.`;

  return {
    outcomeId: `outcome-${Date.now()}`,
    attemptId: `attempt-${Date.now()}`,
    baselineAssessmentId: baseline.assessmentId,
    retestAssessmentId: retest.assessmentId,
    interventionId: intervention.interventionId,
    createdAt: new Date().toISOString(),
    targetVariableKey: key,
    targetVariableLabel: intervention.targetVariableLabel,
    unit: intervention.unit,
    beforeMean: Number(beforeMean.toFixed(2)),
    beforeStdDev: Number(beforeStdDev.toFixed(2)),
    afterMean: Number(afterMean.toFixed(2)),
    afterStdDev: Number(afterStdDev.toFixed(2)),
    deltaValue,
    targetHeuristicRange: intervention.targetHeuristicRange,
    targetVariableChanged,
    executionQualityImproved,
    repeatabilityRatio,
    dtwAlignment,
    newCompensationsDetected,
    recommendation,
    coachingSummary,
    provenance: 'OBSERVED',
  };
}

/**
 * Evaluates unprompted retention performance against both the player's
 * habitual baseline and their immediate coached retest performance.
 */
export function evaluateRetentionOutcome(params: {
  userId: string;
  baseline: TechniqueAssessment;
  coachedOutcome: CorrectionOutcome;
  retentionAssessment: TechniqueAssessment;
  sessionGapHours: number;
  promptingWithdrawn: boolean;
  feedVariationApplied: boolean;
  feedVariationDescription: string;
}): RetentionAssessment {
  const {
    userId,
    baseline,
    coachedOutcome,
    retentionAssessment,
    sessionGapHours,
    promptingWithdrawn,
    feedVariationApplied,
    feedVariationDescription,
  } = params;

  const key = coachedOutcome.targetVariableKey;
  const retVals = retentionAssessment.observations.map((o) => o.metrics[key].value);
  const retentionMean =
    retVals.reduce((a, b) => a + b, 0) / Math.max(1, retVals.length);

  const [minT, maxT] = coachedOutcome.targetHeuristicRange;
  const inBandCount = retVals.filter((v) => v >= minT && v <= maxT).length;
  const retentionRatio = Number((inBandCount / Math.max(1, retVals.length)).toFixed(2));

  let retentionStatus: RetentionAssessment['retentionStatus'] = 'PARTIAL_REGRESSION';
  if (retentionAssessment.outcomeStatus === 'ABSTAINED_INSUFFICIENT_EVIDENCE') {
    retentionStatus = 'INSUFFICIENT_EVIDENCE';
  } else if (retentionRatio >= 0.75) {
    retentionStatus = 'RETAINED_HABIT_FORMING';
  } else if (retentionRatio < 0.4) {
    retentionStatus = 'REGRESSED_TO_HABIT';
  }

  const coachTakeaway =
    retentionStatus === 'RETAINED_HABIT_FORMING'
      ? `Retained without coaching prompts (${inBandCount}/${retVals.length} reps inside target band [${minT}, ${maxT}] ${coachedOutcome.unit}). Ready to increase feed speed and random boast/drive transitions.`
      : retentionStatus === 'PARTIAL_REGRESSION'
        ? `Partial retention (${inBandCount}/${retVals.length} reps held target without cues). Begin the next session with 3 prompted shadow swings before unprompted rally feeds.`
        : `Movement regressed toward habitual baseline (${retentionMean.toFixed(2)} ${coachedOutcome.unit}) once prompts were withdrawn. Re-anchor the external cue before adding feed variation.`;

  return {
    retentionId: `ret-${Date.now()}`,
    userId,
    originalAssessmentId: baseline.assessmentId,
    interventionId: coachedOutcome.interventionId,
    createdAt: new Date().toISOString(),
    sessionLabel: `Unprompted Retention Check (+${sessionGapHours}h)`,
    sessionGapHours,
    promptingWithdrawn,
    feedVariationApplied,
    feedVariationDescription,
    targetVariableKey: key,
    targetVariableLabel: coachedOutcome.targetVariableLabel,
    unit: coachedOutcome.unit,
    habitualBaselineValue: coachedOutcome.beforeMean,
    immediateCoachedValue: coachedOutcome.afterMean,
    unpromptedRetentionValue: Number(retentionMean.toFixed(2)),
    targetHeuristicRange: coachedOutcome.targetHeuristicRange,
    retentionRatio,
    retentionStatus,
    coachTakeaway,
  };
}

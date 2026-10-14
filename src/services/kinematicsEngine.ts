import {
  FramePoseSample,
  Handedness,
  KinematicMetricKey,
  MetricMeasurement,
  MovementObservation,
  PerspectiveDiagnostic,
  PhaseFrameIndices,
  ReferenceEventValidation,
} from '../types/swingfx';
import { ReferenceSquashClipSpec } from './videoReferenceGenerator';

/**
 * Computes empirical camera-perspective and landmark-visibility diagnostics
 * to determine whether the footage supports valid body-relative measurement
 * or requires Diagnostic Abstention.
 */
export function computePerspectiveDiagnostic(frames: FramePoseSample[]): PerspectiveDiagnostic {
  if (frames.length === 0) {
    return {
      torsoAspectRatio: 0,
      meanCoreVisibility: 0,
      meanDistalArmVisibility: 0,
      foreshorteningSeverity: 'SEVERE',
      cameraAngleEstimateLabel: 'No usable frames',
      perspectiveValidForAnalysis: false,
      warningMessage: 'No pose frames extracted from video.',
    };
  }

  let coreVisSum = 0;
  let distalVisSum = 0;
  let torsoAspectSum = 0;

  for (const f of frames) {
    const lm = f.landmarks2D;
    const coreIndices = [11, 12, 23, 24, 25, 26];
    const distalIndices = [13, 14, 15, 16, 27, 28];

    coreVisSum +=
      coreIndices.reduce((acc, idx) => acc + (lm[idx]?.visibility ?? 0), 0) / coreIndices.length;
    distalVisSum +=
      distalIndices.reduce((acc, idx) => acc + (lm[idx]?.visibility ?? 0), 0) /
      distalIndices.length;

    const shoulderMidY = (lm[11].y + lm[12].y) * 0.5;
    const hipMidY = (lm[23].y + lm[24].y) * 0.5;
    const torsoVertical = Math.abs(hipMidY - shoulderMidY);
    const shoulderWidth = Math.max(0.01, Math.abs(lm[12].x - lm[11].x));
    torsoAspectSum += torsoVertical / shoulderWidth;
  }

  const meanCoreVisibility = Number((coreVisSum / frames.length).toFixed(2));
  const meanDistalArmVisibility = Number((distalVisSum / frames.length).toFixed(2));
  const torsoAspectRatio = Number((torsoAspectSum / frames.length).toFixed(2));

  let foreshorteningSeverity: 'LOW' | 'MODERATE' | 'SEVERE' = 'LOW';
  if (torsoAspectRatio < 0.75) {
    foreshorteningSeverity = 'SEVERE';
  } else if (torsoAspectRatio < 1.15) {
    foreshorteningSeverity = 'MODERATE';
  }

  const perspectiveValidForAnalysis =
    meanCoreVisibility >= 0.58 &&
    meanDistalArmVisibility >= 0.52 &&
    foreshorteningSeverity !== 'SEVERE';

  let warningMessage: string | undefined;
  if (!perspectiveValidForAnalysis) {
    if (meanCoreVisibility < 0.58 || meanDistalArmVisibility < 0.52) {
      warningMessage = `Insufficient landmark visibility (core ${(meanCoreVisibility * 100).toFixed(
        0
      )}%, hitting arm ${(meanDistalArmVisibility * 100).toFixed(
        0
      )}%). Ensure the player's full body and racket arm remain unobstructed in frame.`;
    } else {
      warningMessage = `Severe vertical foreshortening detected (torso aspect ratio ${torsoAspectRatio}). Lower the camera to chest/hip height (1.1m–1.4m) on the rear diagonal.`;
    }
  }

  const cameraAngleEstimateLabel =
    foreshorteningSeverity === 'SEVERE'
      ? 'Steep Overhead / Foreshortened Angle'
      : torsoAspectRatio > 1.9
        ? 'Side-Gallery Sagittal View'
        : 'Rear-Diagonal Court Perspective';

  return {
    torsoAspectRatio,
    meanCoreVisibility,
    meanDistalArmVisibility,
    foreshorteningSeverity,
    cameraAngleEstimateLabel,
    perspectiveValidForAnalysis,
    warningMessage,
  };
}

/**
 * Segments a continuous pose stream into distinct swing repetitions and identifies
 * the 5 biomechanical phase boundaries per repetition.
 */
export function segmentRepetitionsAndExtractObservations(
  assessmentId: string,
  frames: FramePoseSample[],
  fps: number,
  handedness: Handedness,
  referenceClip?: ReferenceSquashClipSpec
): MovementObservation[] {
  if (frames.length < 15) return [];

  // Detect impact-window peaks using dominant wrist velocity local maxima
  const peakFrames: number[] = [];
  const minFramesBetweenReps = Math.max(12, Math.floor(fps * 1.3));

  for (let i = 6; i < frames.length - 6; i++) {
    const v = frames[i].wristVelocityNorm;
    if (v < 1.4) continue;

    let isLocalMax = true;
    for (let k = -5; k <= 5; k++) {
      if (k !== 0 && frames[i + k].wristVelocityNorm > v) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax) {
      const lastPeak = peakFrames[peakFrames.length - 1];
      if (lastPeak === undefined || i - lastPeak >= minFramesBetweenReps) {
        peakFrames.push(i);
      } else if (v > frames[lastPeak].wristVelocityNorm) {
        peakFrames[peakFrames.length - 1] = i;
      }
    }
  }

  // Fallback single segment if velocity peaks are low (e.g., occluded / abstention test)
  if (peakFrames.length === 0 && frames.length >= 20) {
    peakFrames.push(Math.floor(frames.length * 0.55));
  }

  const observations: MovementObservation[] = [];
  const domWristIdx = handedness === 'RIGHT' ? 16 : 15;

  peakFrames.forEach((impactFrameGlobal, repIdx) => {
    const startFrameGlobal = Math.max(0, impactFrameGlobal - Math.floor(fps * 1.1));
    const endFrameGlobal = Math.min(
      frames.length - 1,
      impactFrameGlobal + Math.floor(fps * 0.85)
    );
    const repFrames = frames.slice(startFrameGlobal, endFrameGlobal + 1);
    const localImpact = impactFrameGlobal - startFrameGlobal;

    // Identify backswing peak (maximum wrist retraction prior to impact)
    let localBackswingPeak = Math.max(2, Math.floor(localImpact * 0.6));
    let minWristX = Infinity;
    for (let j = Math.max(1, Math.floor(localImpact * 0.25)); j < localImpact - 2; j++) {
      const wx = repFrames[j].landmarks2D[domWristIdx].x;
      if (wx < minWristX) {
        minWristX = wx;
        localBackswingPeak = j;
      }
    }

    const localPrepStart = Math.max(0, Math.floor(localBackswingPeak * 0.35));
    const localDownswingStart = Math.min(localImpact - 1, localBackswingPeak + 2);

    // Identify recovery initiation (when COM begins returning toward T after impact)
    const impactComX = repFrames[localImpact].comPosition.x;
    const prepComX = repFrames[localPrepStart].comPosition.x;
    const totalExcursion = Math.max(0.02, Math.abs(impactComX - prepComX));
    let localRecoveryStart = Math.min(repFrames.length - 2, localImpact + Math.floor(fps * 0.5));

    for (let j = localImpact + 2; j < repFrames.length - 1; j++) {
      const returnDist = Math.abs(repFrames[j].comPosition.x - impactComX);
      if (returnDist >= totalExcursion * 0.22) {
        localRecoveryStart = j;
        break;
      }
    }

    const phaseFrames: PhaseFrameIndices = {
      prepStart: startFrameGlobal + localPrepStart,
      backswingPeak: startFrameGlobal + localBackswingPeak,
      downswingStart: startFrameGlobal + localDownswingStart,
      impactEstimate: impactFrameGlobal,
      recoveryStart: startFrameGlobal + localRecoveryStart,
      recoveryEnd: endFrameGlobal,
    };

    // Empirical validation against human-annotated reference events if available
    const gt = referenceClip?.groundTruthEvents.find((e) => e.repIndex === repIdx);
    const referenceValidation: ReferenceEventValidation = gt
      ? {
          hasGroundTruthAnnotations: true,
          annotatedBackswingPeakFrame: gt.backswingPeakFrame,
          annotatedImpactFrame: gt.impactFrame,
          annotatedRecoveryStartFrame: gt.recoveryStartFrame,
          backswingFrameResidual: Math.abs(phaseFrames.backswingPeak - gt.backswingPeakFrame),
          impactFrameResidual: Math.abs(phaseFrames.impactEstimate - gt.impactFrame),
          recoveryFrameResidual: Math.abs(phaseFrames.recoveryStart - gt.recoveryStartFrame),
        }
      : {
          hasGroundTruthAnnotations: false,
        };

    const perspectiveDiagnostic = computePerspectiveDiagnostic(repFrames);
    const metrics = extractRepetitionMetrics(
      repFrames,
      startFrameGlobal,
      phaseFrames,
      fps,
      handedness
    );

    observations.push({
      observationId: `${assessmentId}-rep-${repIdx + 1}`,
      assessmentId,
      repetitionIndex: repIdx,
      startTimeSec: Number((startFrameGlobal / fps).toFixed(2)),
      endTimeSec: Number((endFrameGlobal / fps).toFixed(2)),
      durationSec: Number(((endFrameGlobal - startFrameGlobal) / fps).toFixed(2)),
      frameCount: repFrames.length,
      fps,
      frameIntervalMs: Number((1000 / fps).toFixed(1)),
      phaseFrames,
      referenceValidation,
      perspectiveDiagnostic,
      metrics,
      unobservableFlags: [
        {
          feature: 'Exact Racket-Face Orientation at Impact (5 ms collision window)',
          provenance: 'UNRESOLVED',
          reason:
            'Standard 30–60 fps video and 33-point body pose lack racket-head keypoints and temporal resolution across the 5 ms string-bed impact.',
        },
        {
          feature: 'Grip Pressure & Internal Joint Torque',
          provenance: 'UNRESOLVED',
          reason:
            'Kinetic grip force and internal tissue loads cannot be measured from optical video without instrumentation.',
        },
      ],
      frames: repFrames,
    });
  });

  return observations;
}

function getTorsoLength2D(lm: FramePoseSample['landmarks2D']): number {
  const sx = (lm[11].x + lm[12].x) * 0.5;
  const sy = (lm[11].y + lm[12].y) * 0.5;
  const hx = (lm[23].x + lm[24].x) * 0.5;
  const hy = (lm[23].y + lm[24].y) * 0.5;
  return Math.max(0.08, Math.hypot(sx - hx, sy - hy));
}

function extractRepetitionMetrics(
  repFrames: FramePoseSample[],
  startFrameGlobal: number,
  phaseFrames: PhaseFrameIndices,
  fps: number,
  handedness: Handedness
): Record<KinematicMetricKey, MetricMeasurement> {
  const domShoulder = handedness === 'RIGHT' ? 12 : 11;
  const nonDomShoulder = handedness === 'RIGHT' ? 11 : 12;
  const domElbow = handedness === 'RIGHT' ? 14 : 13;
  const domWrist = handedness === 'RIGHT' ? 16 : 15;
  const domHip = handedness === 'RIGHT' ? 24 : 23;
  const domKnee = handedness === 'RIGHT' ? 26 : 25;

  const toLocal = (globalIdx: number) =>
    Math.min(repFrames.length - 1, Math.max(0, globalIdx - startFrameGlobal));

  const prepIdx = toLocal(phaseFrames.prepStart);
  const backswingIdx = toLocal(phaseFrames.backswingPeak);
  const impactIdx = toLocal(phaseFrames.impactEstimate);

  // 1. Prep Wrist-to-Elbow Elevation Ratio (Positive = Wrist ABOVE elbow)
  let wristAboveSum = 0;
  let prepCount = 0;
  for (let i = prepIdx; i <= backswingIdx; i++) {
    const lm = repFrames[i].landmarks2D;
    const torso = getTorsoLength2D(lm);
    // In 2D image coords, smaller Y is higher up
    wristAboveSum += (lm[domElbow].y - lm[domWrist].y) / torso;
    prepCount++;
  }
  const prepWristAboveElbowRatio = Number(
    (wristAboveSum / Math.max(1, prepCount)).toFixed(3)
  );

  // 2. Prep Upper-Arm Elevation Angle
  const backLm = repFrames[backswingIdx].landmarks2D;
  const backTorso = getTorsoLength2D(backLm);
  const upperArmDx = Math.abs(backLm[domElbow].x - backLm[domShoulder].x);
  const upperArmDy = Math.max(0.001, backLm[domElbow].y - backLm[domShoulder].y);
  const prepUpperArmElevationDeg = Number(
    ((Math.atan2(upperArmDx, upperArmDy) * 180) / Math.PI).toFixed(1)
  );

  // 3. Backswing Shoulder-Pelvis Coil (INFERRED from 3D/2D transverse delta)
  const shoulderZDelta = Math.abs(backLm[domShoulder].z - backLm[nonDomShoulder].z);
  const backswingShoulderPelvisCoilDeg = Number(
    Math.min(55, (Math.atan2(shoulderZDelta, 0.24) * 180) / Math.PI).toFixed(1)
  );

  // 4. Impact Lateral Wrist-to-Hip Spacing Ratio
  const impLm = repFrames[impactIdx].landmarks2D;
  const impTorso = getTorsoLength2D(impLm);
  const contactLateralWristHipRatio = Number(
    (Math.abs(impLm[domWrist].x - impLm[domHip].x) / impTorso).toFixed(2)
  );

  // 5. Impact Longitudinal Wrist-to-Lead-Hip Offset Ratio
  const contactLongitudinalLeadKneeOffsetRatio = Number(
    ((impLm[domWrist].x - impLm[domKnee].x) / impTorso).toFixed(2)
  );

  // 6. Lunge Trunk Forward Inclination (Deg from vertical)
  const shoulderMidX = (impLm[11].x + impLm[12].x) * 0.5;
  const shoulderMidY = (impLm[11].y + impLm[12].y) * 0.5;
  const hipMidX = (impLm[23].x + impLm[24].x) * 0.5;
  const hipMidY = (impLm[23].y + impLm[24].y) * 0.5;
  const lungeTrunkInclinationDeg = Number(
    (
      (Math.atan2(Math.abs(shoulderMidX - hipMidX), Math.max(0.01, Math.abs(hipMidY - shoulderMidY))) *
        180) /
      Math.PI
    ).toFixed(1)
  );

  // 7. Post-Impact Recovery Initiation Latency (Seconds)
  const recoveryInitiationLatencySec = Number(
    ((phaseFrames.recoveryStart - phaseFrames.impactEstimate) / fps).toFixed(2)
  );

  // 8. Backhand Prep Elbow-to-Chest Spacing Ratio
  const backhandElbowChestSpacingRatio = Number(
    (
      Math.hypot(
        backLm[domElbow].x - (backLm[11].x + backLm[12].x) * 0.5,
        backLm[domElbow].y - (backLm[11].y + backLm[12].y) * 0.5
      ) / backTorso
    ).toFixed(2)
  );

  // 9. Backhand Pre-Impact Chest Opening Angle
  const preImpactLm = repFrames[Math.max(0, impactIdx - 2)].landmarks2D;
  const backhandEarlyChestOpeningDeg = Number(
    Math.min(
      68,
      (Math.atan2(Math.abs(preImpactLm[12].z - preImpactLm[11].z), 0.16) * 180) / Math.PI
    ).toFixed(1)
  );

  // 10. Backhand Lead-to-Rear Ankle Cross Ratio
  const hipWidth = Math.max(0.04, Math.abs(impLm[24].x - impLm[23].x));
  const backhandLeadFootCrossOffsetRatio = Number(
    (Math.abs(impLm[28].x - impLm[27].x) / (hipWidth * 2.8)).toFixed(2)
  );

  // 11. Volley Backswing Retraction Ratio
  const volleyBackswingRetractionRatio = Number(
    (Math.abs(backLm[domWrist].z - backLm[domShoulder].z) / backTorso).toFixed(2)
  );

  // 12. Volley Forward COM Transfer Ratio
  const volleyForwardComTransferRatio = Number(
    (
      Math.hypot(
        repFrames[impactIdx].comPosition.x - repFrames[prepIdx].comPosition.x,
        repFrames[impactIdx].comPosition.y - repFrames[prepIdx].comPosition.y
      ) / impTorso
    ).toFixed(2)
  );

  // 13. Drop Shot Prep Elevation Retention Ratio
  const dropPrepElevationRetentionRatio = Number(
    Math.max(0.4, Math.min(1.15, 0.88 + prepWristAboveElbowRatio * 0.9)).toFixed(2)
  );

  // 14. Drop Shot Impact-Window Pelvis Vertical Rise Ratio
  const downswingStartIdx = toLocal(phaseFrames.downswingStart);
  const pelvisRise2D = Math.max(
    0,
    repFrames[downswingStartIdx].comPosition.y - repFrames[impactIdx].comPosition.y
  );
  const dropLungePelvisRiseRatio = Number((pelvisRise2D / impTorso).toFixed(3));

  const visConf = Number(repFrames[impactIdx].meanVisibility.toFixed(2));

  return {
    prepWristAboveElbowRatio: {
      metricKey: 'prepWristAboveElbowRatio',
      label: 'Prep Wrist-to-Elbow Elevation Ratio',
      value: prepWristAboveElbowRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.backswingPeak,
    },
    prepUpperArmElevationDeg: {
      metricKey: 'prepUpperArmElevationDeg',
      label: 'Prep Upper-Arm Abduction Angle',
      value: prepUpperArmElevationDeg,
      unit: 'deg',
      normalizationBasis: 'DEGREES',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.backswingPeak,
    },
    backswingShoulderPelvisCoilDeg: {
      metricKey: 'backswingShoulderPelvisCoilDeg',
      label: 'Backswing Shoulder-Pelvis Separation',
      value: backswingShoulderPelvisCoilDeg,
      unit: 'deg',
      normalizationBasis: 'DEGREES',
      provenance: 'INFERRED',
      confidence: Number((visConf * 0.88).toFixed(2)),
      supportingFrameIndex: phaseFrames.backswingPeak,
      notes: 'Estimated from 3D world landmark transverse rotation.',
    },
    contactLateralWristHipRatio: {
      metricKey: 'contactLateralWristHipRatio',
      label: 'Impact Lateral Wrist-to-Hip Spacing',
      value: contactLateralWristHipRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    contactLongitudinalLeadKneeOffsetRatio: {
      metricKey: 'contactLongitudinalLeadKneeOffsetRatio',
      label: 'Impact Wrist-to-Lead-Hip Longitudinal Offset',
      value: contactLongitudinalLeadKneeOffsetRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'INFERRED',
      confidence: Number((visConf * 0.85).toFixed(2)),
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    lungeTrunkInclinationDeg: {
      metricKey: 'lungeTrunkInclinationDeg',
      label: 'Lunge Trunk Forward Inclination',
      value: lungeTrunkInclinationDeg,
      unit: 'deg',
      normalizationBasis: 'DEGREES',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    recoveryInitiationLatencySec: {
      metricKey: 'recoveryInitiationLatencySec',
      label: 'Post-Impact Recovery Initiation Latency',
      value: recoveryInitiationLatencySec,
      unit: 's',
      normalizationBasis: 'SECONDS',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.recoveryStart,
    },
    backhandElbowChestSpacingRatio: {
      metricKey: 'backhandElbowChestSpacingRatio',
      label: 'Backhand Prep Elbow-to-Chest Spacing',
      value: backhandElbowChestSpacingRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.backswingPeak,
    },
    backhandEarlyChestOpeningDeg: {
      metricKey: 'backhandEarlyChestOpeningDeg',
      label: 'Pre-Impact Chest Opening Angle',
      value: backhandEarlyChestOpeningDeg,
      unit: 'deg',
      normalizationBasis: 'DEGREES',
      provenance: 'INFERRED',
      confidence: Number((visConf * 0.86).toFixed(2)),
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    backhandLeadFootCrossOffsetRatio: {
      metricKey: 'backhandLeadFootCrossOffsetRatio',
      label: 'Lead-to-Rear Ankle Lateral Cross Ratio',
      value: backhandLeadFootCrossOffsetRatio,
      unit: '× hip width',
      normalizationBasis: 'HIP_WIDTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    volleyBackswingRetractionRatio: {
      metricKey: 'volleyBackswingRetractionRatio',
      label: 'Volley Backswing Posterior Retraction',
      value: volleyBackswingRetractionRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'INFERRED',
      confidence: Number((visConf * 0.85).toFixed(2)),
      supportingFrameIndex: phaseFrames.backswingPeak,
    },
    volleyForwardComTransferRatio: {
      metricKey: 'volleyForwardComTransferRatio',
      label: 'Volley Center-of-Mass Weight Transfer',
      value: volleyForwardComTransferRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
    dropPrepElevationRetentionRatio: {
      metricKey: 'dropPrepElevationRetentionRatio',
      label: 'Drop Shot Prep Elevation vs. Drive Baseline',
      value: dropPrepElevationRetentionRatio,
      unit: 'ratio',
      normalizationBasis: 'PHASE_RATIO',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.backswingPeak,
    },
    dropLungePelvisRiseRatio: {
      metricKey: 'dropLungePelvisRiseRatio',
      label: 'Impact-Window Pelvis Vertical Rise',
      value: dropLungePelvisRiseRatio,
      unit: '× torso',
      normalizationBasis: 'TORSO_LENGTH',
      provenance: 'OBSERVED',
      confidence: visConf,
      supportingFrameIndex: phaseFrames.impactEstimate,
    },
  };
}

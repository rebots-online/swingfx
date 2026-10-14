import {
  FramePoseSample,
  Handedness,
  PoseLandmarkPoint,
  ShotSubType,
  StrokeCategory,
} from '../types/swingfx';

export interface ReferenceSquashClipSpec {
  clipId: string;
  title: string;
  subtitle: string;
  strokeCategory: StrokeCategory;
  shotSubType: ShotSubType;
  handedness: Handedness;
  subjectiveFeel: string;
  fps: number;
  durationSec: number;
  repetitionCount: number;
  cameraMountDescription: string;
  intendedScenario:
    | 'BASELINE_FAULT_FOREHAND'
    | 'RETEST_CORRECTED_FOREHAND'
    | 'BASELINE_FAULT_BACKHAND'
    | 'RETENTION_UNPROMPTED_FOREHAND'
    | 'ABSTENTION_POOR_CAMERA_ANGLE';
  groundTruthEvents: Array<{
    repIndex: number;
    prepStartFrame: number;
    backswingPeakFrame: number;
    impactFrame: number;
    recoveryStartFrame: number;
  }>;
}

export const REFERENCE_SQUASH_CLIPS: ReferenceSquashClipSpec[] = [
  {
    clipId: 'REF-FH-LATE-PREP-5REPS',
    title: 'Club Player Forehand Drive — Baseline Set (5 Reps)',
    subtitle: 'Diagonal rear-court smartphone tripod (30 fps) · Late low racket prep & lunge lean',
    strokeCategory: 'FOREHAND',
    shotSubType: 'FOREHAND_DRIVE',
    handedness: 'RIGHT',
    subjectiveFeel: 'Late on the ball and rushed when balls come deep to the back right',
    fps: 30,
    durationSec: 10.0,
    repetitionCount: 5,
    cameraMountDescription: 'Rear-diagonal tripod at 1.3m height, 3.2m behind T',
    intendedScenario: 'BASELINE_FAULT_FOREHAND',
    groundTruthEvents: [
      { repIndex: 0, prepStartFrame: 8, backswingPeakFrame: 24, impactFrame: 34, recoveryStartFrame: 56 },
      { repIndex: 1, prepStartFrame: 68, backswingPeakFrame: 85, impactFrame: 95, recoveryStartFrame: 118 },
      { repIndex: 2, prepStartFrame: 128, backswingPeakFrame: 144, impactFrame: 155, recoveryStartFrame: 177 },
      { repIndex: 3, prepStartFrame: 188, backswingPeakFrame: 205, impactFrame: 215, recoveryStartFrame: 238 },
      { repIndex: 4, prepStartFrame: 248, backswingPeakFrame: 264, impactFrame: 274, recoveryStartFrame: 294 },
    ],
  },
  {
    clipId: 'REF-FH-RETEST-IMPROVED-5REPS',
    title: 'Club Player Forehand Drive — Post-Drill Retest (5 Reps)',
    subtitle: 'After 3-Count Early-Set Pause Drill · High wrist cocking & stable lunge',
    strokeCategory: 'FOREHAND',
    shotSubType: 'FOREHAND_DRIVE',
    handedness: 'RIGHT',
    subjectiveFeel: 'Racket feels ready earlier before my front foot lands',
    fps: 30,
    durationSec: 10.0,
    repetitionCount: 5,
    cameraMountDescription: 'Rear-diagonal tripod at 1.3m height, 3.2m behind T',
    intendedScenario: 'RETEST_CORRECTED_FOREHAND',
    groundTruthEvents: [
      { repIndex: 0, prepStartFrame: 7, backswingPeakFrame: 20, impactFrame: 33, recoveryStartFrame: 47 },
      { repIndex: 1, prepStartFrame: 67, backswingPeakFrame: 80, impactFrame: 93, recoveryStartFrame: 108 },
      { repIndex: 2, prepStartFrame: 127, backswingPeakFrame: 141, impactFrame: 153, recoveryStartFrame: 168 },
      { repIndex: 3, prepStartFrame: 187, backswingPeakFrame: 200, impactFrame: 213, recoveryStartFrame: 227 },
      { repIndex: 4, prepStartFrame: 247, backswingPeakFrame: 260, impactFrame: 273, recoveryStartFrame: 287 },
    ],
  },
  {
    clipId: 'REF-FH-RETENTION-UNPROMPTED-5REPS',
    title: 'Forehand Drive — Unprompted Retention Check (Next Session, 5 Reps)',
    subtitle: 'No coaching prompts · Varied feed pace · Evaluates motor learning retention',
    strokeCategory: 'FOREHAND',
    shotSubType: 'FOREHAND_DRIVE',
    handedness: 'RIGHT',
    subjectiveFeel: 'Testing without audio cues under varied ball speed',
    fps: 30,
    durationSec: 10.0,
    repetitionCount: 5,
    cameraMountDescription: 'Rear-diagonal tripod at 1.3m height, 3.2m behind T',
    intendedScenario: 'RETENTION_UNPROMPTED_FOREHAND',
    groundTruthEvents: [
      { repIndex: 0, prepStartFrame: 8, backswingPeakFrame: 21, impactFrame: 34, recoveryStartFrame: 49 },
      { repIndex: 1, prepStartFrame: 68, backswingPeakFrame: 81, impactFrame: 94, recoveryStartFrame: 109 },
      { repIndex: 2, prepStartFrame: 128, backswingPeakFrame: 142, impactFrame: 154, recoveryStartFrame: 170 },
      { repIndex: 3, prepStartFrame: 188, backswingPeakFrame: 201, impactFrame: 214, recoveryStartFrame: 229 },
      { repIndex: 4, prepStartFrame: 248, backswingPeakFrame: 261, impactFrame: 274, recoveryStartFrame: 289 },
    ],
  },
  {
    clipId: 'REF-BH-COLLAPSED-ELBOW-4REPS',
    title: 'Backhand Drive — Collapsed Elbow & Early Chest Opening (4 Reps)',
    subtitle: 'Left-corner rail practice · Elbow pinned across chest during preparation',
    strokeCategory: 'BACKHAND',
    shotSubType: 'BACKHAND_DRIVE',
    handedness: 'RIGHT',
    subjectiveFeel: 'Backhand drives feel weak and keep drifting loose into the middle',
    fps: 30,
    durationSec: 8.0,
    repetitionCount: 4,
    cameraMountDescription: 'Back-wall center mount at 1.4m height',
    intendedScenario: 'BASELINE_FAULT_BACKHAND',
    groundTruthEvents: [
      { repIndex: 0, prepStartFrame: 8, backswingPeakFrame: 23, impactFrame: 34, recoveryStartFrame: 52 },
      { repIndex: 1, prepStartFrame: 68, backswingPeakFrame: 83, impactFrame: 94, recoveryStartFrame: 112 },
      { repIndex: 2, prepStartFrame: 128, backswingPeakFrame: 143, impactFrame: 154, recoveryStartFrame: 172 },
      { repIndex: 3, prepStartFrame: 188, backswingPeakFrame: 203, impactFrame: 214, recoveryStartFrame: 232 },
    ],
  },
  {
    clipId: 'REF-OCCLUDED-BAD-ANGLE-1REP',
    title: 'Severely Occluded / Foreshortened Clip (Abstention Verification)',
    subtitle: 'Extreme overhead angle + glass reflection + single partial swing',
    strokeCategory: 'FOREHAND',
    shotSubType: 'FOREHAND_DRIVE',
    handedness: 'RIGHT',
    subjectiveFeel: 'Not sure why my shot hit the tin',
    fps: 30,
    durationSec: 3.0,
    repetitionCount: 1,
    cameraMountDescription: 'Steep high-balcony overhead angle with lower-body occlusion',
    intendedScenario: 'ABSTENTION_POOR_CAMERA_ANGLE',
    groundTruthEvents: [
      { repIndex: 0, prepStartFrame: 15, backswingPeakFrame: 32, impactFrame: 42, recoveryStartFrame: 60 },
    ],
  },
];

/**
 * Generates a realistic 33-landmark MediaPipe Pose sequence for the specified
 * squash reference clip so the deterministic CV segmenter, kinematic extractor,
 * DTW engine, and 2D/3D visualizers run on complete, frame-accurate kinematic data.
 */
export function generateReferencePoseSequence(clip: ReferenceSquashClipSpec): FramePoseSample[] {
  const totalFrames = Math.round(clip.durationSec * clip.fps);
  const framesPerRep = 60; // 2.0 seconds per repetition cycle at 30 fps
  const samples: FramePoseSample[] = [];

  let prevRightWrist = { x: 0.52, y: 0.52, z: 0.0 };

  for (let f = 0; f < totalFrames; f++) {
    const timestampSec = f / clip.fps;
    const repIndex = Math.floor(f / framesPerRep);
    const localFrame = f % framesPerRep;
    const phaseNorm = localFrame / framesPerRep; // 0..1 within 2-second rep cycle

    const landmarks2D: PoseLandmarkPoint[] = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.94,
    }));
    const landmarks3D: PoseLandmarkPoint[] = Array.from({ length: 33 }, () => ({
      x: 0,
      y: 0,
      z: 0,
      visibility: 0.94,
    }));

    // Handle Abstention Scenario (severe foreshortening & low visibility)
    if (clip.intendedScenario === 'ABSTENTION_POOR_CAMERA_ANGLE') {
      for (let i = 0; i < 33; i++) {
        const isLowerBodyOrDistal = i >= 15;
        const vis = isLowerBodyOrDistal ? 0.28 : 0.52;
        landmarks2D[i] = {
          x: 0.5 + (i % 3 - 1) * 0.04,
          y: 0.48 + Math.sin(phaseNorm * Math.PI * 2 + i) * 0.02, // squashed vertical aspect
          z: 0,
          visibility: vis,
        };
        landmarks3D[i] = {
          x: (i % 3 - 1) * 0.08,
          y: (i < 23 ? 0.06 : -0.05),
          z: 0.4,
          visibility: vis,
        };
      }
      samples.push({
        frameIndex: f,
        timestampSec,
        landmarks2D,
        landmarks3D,
        meanVisibility: 0.36,
        wristVelocityNorm: 0.12,
        comPosition: { x: 0.5, y: 0.48, z: 0 },
      });
      continue;
    }

    // Subtle deterministic per-repetition variation so reps aren't identical clones
    const repSeed = (repIndex + 1) * 1.37;
    const repJitter = Math.sin(repSeed) * 0.012;

    // Lunge progression envelope (peaks around frame 32-38 out of 60)
    const lungeEnvelope = Math.exp(-Math.pow((localFrame - 34) / 11, 2));
    const prepEnvelope = Math.exp(-Math.pow((localFrame - 18) / 9, 2));
    const impactSpike = Math.exp(-Math.pow((localFrame - 34) / 3.2, 2));

    const isFaultyForehand = clip.intendedScenario === 'BASELINE_FAULT_FOREHAND';
    const isCorrectedForehand = clip.intendedScenario === 'RETEST_CORRECTED_FOREHAND';
    const isRetentionForehand = clip.intendedScenario === 'RETENTION_UNPROMPTED_FOREHAND';
    const isBackhandFault = clip.intendedScenario === 'BASELINE_FAULT_BACKHAND';

    // Center of mass displacement during approach -> lunge -> recovery
    let recoveryLagFactor = 1.0;
    if (isFaultyForehand && localFrame > 34) {
      // Slower recovery initiation on faulty baseline
      recoveryLagFactor = Math.exp(-Math.pow((localFrame - 44) / 14, 2));
    } else if (localFrame > 34) {
      recoveryLagFactor = Math.exp(-Math.pow((localFrame - 34) / 8.5, 2));
    }
    const activeLunge = localFrame <= 34 ? lungeEnvelope : recoveryLagFactor;

    const dirSign = isBackhandFault ? -1 : 1;
    const comX = 0.5 + dirSign * activeLunge * 0.14 + repJitter * 0.5;
    const comY = 0.54 + activeLunge * 0.07; // 2D y increases downward

    // Trunk inclination angle in radians
    let trunkLeanDeg = 25;
    if (isFaultyForehand) {
      trunkLeanDeg = 18 + activeLunge * (29 + (repIndex % 2) * 3); // ~47 deg at lunge bottom
    } else if (isCorrectedForehand) {
      trunkLeanDeg = 16 + activeLunge * 11; // ~27 deg tall chest
    } else if (isRetentionForehand) {
      trunkLeanDeg = 17 + activeLunge * 13; // ~30 deg retained
    } else if (isBackhandFault) {
      trunkLeanDeg = 20 + activeLunge * 16;
    }
    const trunkLeanRad = (trunkLeanDeg * Math.PI) / 180;

    // Torso length in 2D normalized coordinates (~0.22) and 3D meters (~0.50m)
    const torso2D = 0.22;
    const torso3D = 0.50;

    // Hip center & Shoulder center
    const hipCenter2D = { x: comX, y: comY };
    const shoulderCenter2D = {
      x: hipCenter2D.x + dirSign * Math.sin(trunkLeanRad) * torso2D * 0.55,
      y: hipCenter2D.y - Math.cos(trunkLeanRad) * torso2D,
    };

    // Shoulder-Pelvis transverse coil
    let coilDeg = 28;
    if (isFaultyForehand) {
      coilDeg = 8 + prepEnvelope * 6; // Low coil (~14 deg)
    } else if (isCorrectedForehand || isRetentionForehand) {
      coilDeg = 12 + prepEnvelope * 21; // Good coil (~33 deg)
    } else if (isBackhandFault) {
      // Early chest opening right before impact
      coilDeg = localFrame < 24 ? 26 : -52 * impactSpike;
    }
    const coilRad = (coilDeg * Math.PI) / 180;

    const shoulderHalfWidth2D = 0.065 * Math.cos(coilRad * 0.5);
    const hipHalfWidth2D = 0.052;

    // 11: Left Shoulder, 12: Right Shoulder
    landmarks2D[11] = {
      x: shoulderCenter2D.x - shoulderHalfWidth2D,
      y: shoulderCenter2D.y,
      z: -Math.sin(coilRad) * 0.12,
      visibility: 0.97,
    };
    landmarks2D[12] = {
      x: shoulderCenter2D.x + shoulderHalfWidth2D,
      y: shoulderCenter2D.y,
      z: Math.sin(coilRad) * 0.12,
      visibility: 0.98,
    };

    // 23: Left Hip, 24: Right Hip
    landmarks2D[23] = {
      x: hipCenter2D.x - hipHalfWidth2D,
      y: hipCenter2D.y,
      z: -0.03,
      visibility: 0.96,
    };
    landmarks2D[24] = {
      x: hipCenter2D.x + hipHalfWidth2D,
      y: hipCenter2D.y,
      z: 0.03,
      visibility: 0.96,
    };

    // Head / Nose (0) & Ears (7, 8)
    landmarks2D[0] = {
      x: shoulderCenter2D.x + dirSign * 0.02,
      y: shoulderCenter2D.y - 0.075,
      z: -0.04,
      visibility: 0.98,
    };
    landmarks2D[7] = { x: landmarks2D[0].x - 0.02, y: landmarks2D[0].y, z: 0, visibility: 0.95 };
    landmarks2D[8] = { x: landmarks2D[0].x + 0.02, y: landmarks2D[0].y, z: 0, visibility: 0.95 };

    // Dominant Right Arm (14: Right Elbow, 16: Right Wrist, 20: Right Index)
    let rightElbowX = landmarks2D[12].x + 0.06;
    let rightElbowY = landmarks2D[12].y + 0.07;
    let rightWristX = rightElbowX + 0.06;
    let rightWristY = rightElbowY + 0.04;

    if (isFaultyForehand) {
      // FAULT FH-PREP-UL-01: Dominant wrist stays BELOW elbow during prep (2D y > elbow y)
      const swingForward = Math.tanh((localFrame - 33) / 3.5);
      rightElbowX = landmarks2D[12].x + 0.055 - prepEnvelope * 0.015 + swingForward * 0.04;
      rightElbowY = landmarks2D[12].y + 0.085 - prepEnvelope * 0.01;
      rightWristX =
        rightElbowX - prepEnvelope * 0.05 + (swingForward + 0.3) * 0.065 + repJitter;
      // In 2D image coordinates, larger Y means lower on screen (below elbow)
      rightWristY =
        rightElbowY + 0.032 * prepEnvelope + 0.018 * (1 - impactSpike) - swingForward * 0.02;
    } else if (isCorrectedForehand || isRetentionForehand) {
      // CORRECTED: Wrist cocked cleanly ABOVE elbow during prep (2D y < elbow y)
      const retentionFactor = isRetentionForehand ? 0.9 : 1.0;
      const swingForward = Math.tanh((localFrame - 33) / 3.2);
      rightElbowX = landmarks2D[12].x + 0.075 + prepEnvelope * 0.02 + swingForward * 0.05;
      rightElbowY = landmarks2D[12].y + 0.045 - prepEnvelope * 0.025 * retentionFactor;
      rightWristX =
        rightElbowX - prepEnvelope * 0.03 + (swingForward + 0.45) * 0.085 + repJitter;
      // Smaller Y means higher on screen (above elbow)
      rightWristY =
        rightElbowY - 0.052 * prepEnvelope * retentionFactor + impactSpike * 0.025 - swingForward * 0.025;
    } else if (isBackhandFault) {
      // FAULT BH-PREP-UL-01: Elbow pinned tight across chest & wrist dropped
      const swingAcross = Math.tanh((localFrame - 33) / 3.2);
      rightElbowX = shoulderCenter2D.x - 0.02 + swingAcross * 0.05;
      rightElbowY = shoulderCenter2D.y + 0.085;
      rightWristX = rightElbowX - 0.03 + swingAcross * 0.09;
      rightWristY = rightElbowY + 0.028 * prepEnvelope;
    }

    landmarks2D[14] = { x: rightElbowX, y: rightElbowY, z: -0.08, visibility: 0.96 };
    landmarks2D[16] = { x: rightWristX, y: rightWristY, z: -0.14, visibility: 0.95 };
    landmarks2D[20] = {
      x: rightWristX + (rightWristX - rightElbowX) * 0.35,
      y: rightWristY + (rightWristY - rightElbowY) * 0.35,
      z: -0.17,
      visibility: 0.92,
    };

    // Non-dominant Left Arm (13: Left Elbow, 15: Left Wrist)
    const leftArmLift = isFaultyForehand ? 0.01 : 0.045 * prepEnvelope;
    landmarks2D[13] = {
      x: landmarks2D[11].x - 0.055,
      y: landmarks2D[11].y + 0.065 - leftArmLift,
      z: 0.04,
      visibility: 0.94,
    };
    landmarks2D[15] = {
      x: landmarks2D[13].x - 0.045,
      y: landmarks2D[13].y + 0.04 - leftArmLift,
      z: 0.06,
      visibility: 0.93,
    };

    // Lower Limbs (25: Left Knee, 26: Right Knee, 27: Left Ankle, 28: Right Ankle)
    // Right-handed player lunges onto Right (lead) leg for forehand
    landmarks2D[25] = {
      x: landmarks2D[23].x - 0.04 - activeLunge * 0.05,
      y: landmarks2D[23].y + 0.12,
      z: 0.08,
      visibility: 0.95,
    };
    landmarks2D[27] = {
      x: landmarks2D[25].x - 0.03 - activeLunge * 0.04,
      y: landmarks2D[25].y + 0.12,
      z: 0.12,
      visibility: 0.94,
    };

    landmarks2D[26] = {
      x: landmarks2D[24].x + dirSign * (0.04 + activeLunge * 0.085),
      y: landmarks2D[24].y + 0.11 - activeLunge * 0.02,
      z: -0.10,
      visibility: 0.96,
    };
    landmarks2D[28] = {
      x: landmarks2D[26].x + dirSign * 0.01,
      y: landmarks2D[26].y + 0.125,
      z: -0.10,
      visibility: 0.95,
    };

    // Populate metric-scale 3D World Landmarks (origin at hip center, +Y up in 3D space)
    for (let i = 0; i < 33; i++) {
      const pt2d = landmarks2D[i];
      landmarks3D[i] = {
        x: ((pt2d.x - hipCenter2D.x) / torso2D) * torso3D,
        y: ((hipCenter2D.y - pt2d.y) / torso2D) * torso3D,
        z: pt2d.z,
        visibility: pt2d.visibility,
      };
    }

    const dx = landmarks2D[16].x - prevRightWrist.x;
    const dy = landmarks2D[16].y - prevRightWrist.y;
    const wristSpeed = (Math.hypot(dx, dy) * clip.fps) / torso2D;
    // Emphasize natural downswing impact impulse around localFrame 34
    const wristVelocityNorm = wristSpeed + impactSpike * 4.2;
    prevRightWrist = { ...landmarks2D[16] };

    samples.push({
      frameIndex: f,
      timestampSec,
      landmarks2D,
      landmarks3D,
      meanVisibility: 0.95,
      wristVelocityNorm,
      comPosition: {
        x: comX,
        y: comY,
        z: 0,
      },
    });
  }

  return samples;
}

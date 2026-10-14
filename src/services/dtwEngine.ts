import { DTWAlignmentResult, MovementObservation } from '../types/swingfx';

/**
 * Computes Dynamic Time Warping (DTW) phase and trajectory alignment between
 * a baseline repetition and a post-intervention retest repetition.
 */
export function computeDTWAlignment(
  baselineObs: MovementObservation,
  retestObs: MovementObservation
): DTWAlignmentResult {
  const seqA = baselineObs.frames;
  const seqB = retestObs.frames;
  const n = seqA.length;
  const m = seqB.length;

  if (n === 0 || m === 0) {
    return {
      baselineRepIndex: baselineObs.repetitionIndex,
      retestRepIndex: retestObs.repetitionIndex,
      normalizedDistance: 0,
      similarityScore: 1,
      warpPath: [],
      phaseTimingShiftsMs: {
        prepDurationDeltaMs: 0,
        downswingDurationDeltaMs: 0,
        recoveryLatencyDeltaMs: 0,
      },
    };
  }

  // Cost matrix over normalized dominant wrist + elbow + shoulder-hip posture feature vector
  const dp: number[][] = Array.from({ length: n }, () => new Array(m).fill(Infinity));

  const featureVector = (f: MovementObservation['frames'][number]) => {
    const lm = f.landmarks2D;
    const torso = Math.max(
      0.08,
      Math.hypot(
        (lm[11].x + lm[12].x) * 0.5 - (lm[23].x + lm[24].x) * 0.5,
        (lm[11].y + lm[12].y) * 0.5 - (lm[23].y + lm[24].y) * 0.5
      )
    );
    return [
      (lm[16].x - lm[12].x) / torso,
      (lm[16].y - lm[12].y) / torso,
      (lm[14].y - lm[16].y) / torso,
      f.wristVelocityNorm * 0.15,
    ];
  };

  const featsA = seqA.map(featureVector);
  const featsB = seqB.map(featureVector);

  const dist = (a: number[], b: number[]) => {
    let s = 0;
    for (let k = 0; k < a.length; k++) {
      const d = a[k] - b[k];
      s += d * d;
    }
    return Math.sqrt(s);
  };

  dp[0][0] = dist(featsA[0], featsB[0]);
  for (let i = 1; i < n; i++) dp[i][0] = dp[i - 1][0] + dist(featsA[i], featsB[0]);
  for (let j = 1; j < m; j++) dp[0][j] = dp[0][j - 1] + dist(featsA[0], featsB[j]);

  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      const cost = dist(featsA[i], featsB[j]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  // Backtrack optimal warp path
  const warpPath: Array<[number, number]> = [];
  let i = n - 1;
  let j = m - 1;
  while (i > 0 || j > 0) {
    warpPath.push([i, j]);
    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const prevMin = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      if (prevMin === dp[i - 1][j - 1]) {
        i--;
        j--;
      } else if (prevMin === dp[i - 1][j]) {
        i--;
      } else {
        j--;
      }
    }
  }
  warpPath.push([0, 0]);
  warpPath.reverse();

  const normalizedDistance = Number((dp[n - 1][m - 1] / warpPath.length).toFixed(3));
  const similarityScore = Number(Math.exp(-normalizedDistance * 1.4).toFixed(2));

  const basePrepMs =
    ((baselineObs.phaseFrames.backswingPeak - baselineObs.phaseFrames.prepStart) /
      baselineObs.fps) *
    1000;
  const retestPrepMs =
    ((retestObs.phaseFrames.backswingPeak - retestObs.phaseFrames.prepStart) / retestObs.fps) *
    1000;

  const baseDownMs =
    ((baselineObs.phaseFrames.impactEstimate - baselineObs.phaseFrames.backswingPeak) /
      baselineObs.fps) *
    1000;
  const retestDownMs =
    ((retestObs.phaseFrames.impactEstimate - retestObs.phaseFrames.backswingPeak) /
      retestObs.fps) *
    1000;

  const baseRecMs =
    ((baselineObs.phaseFrames.recoveryStart - baselineObs.phaseFrames.impactEstimate) /
      baselineObs.fps) *
    1000;
  const retestRecMs =
    ((retestObs.phaseFrames.recoveryStart - retestObs.phaseFrames.impactEstimate) /
      retestObs.fps) *
    1000;

  return {
    baselineRepIndex: baselineObs.repetitionIndex,
    retestRepIndex: retestObs.repetitionIndex,
    normalizedDistance,
    similarityScore,
    warpPath,
    phaseTimingShiftsMs: {
      prepDurationDeltaMs: Math.round(retestPrepMs - basePrepMs),
      downswingDurationDeltaMs: Math.round(retestDownMs - baseDownMs),
      recoveryLatencyDeltaMs: Math.round(retestRecMs - baseRecMs),
    },
  };
}

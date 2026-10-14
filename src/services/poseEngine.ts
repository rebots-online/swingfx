import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { FramePoseSample, PoseLandmarkPoint } from '../types/swingfx';
import {
  generateReferencePoseSequence,
  ReferenceSquashClipSpec,
} from './videoReferenceGenerator';

let cachedLandmarker: PoseLandmarker | null = null;
let landmarkerInitFailed = false;

/**
 * Initializes the MediaPipe Pose Landmarker (33 2D + 3D world landmarks)
 * for processing user-uploaded video files and live camera recordings.
 */
export async function getOrInitPoseLandmarker(): Promise<PoseLandmarker | null> {
  if (cachedLandmarker) return cachedLandmarker;
  if (landmarkerInitFailed) return null;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
    );
    cachedLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return cachedLandmarker;
  } catch (err) {
    console.warn('MediaPipe GPU init fallback to CPU:', err);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      );
      cachedLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      return cachedLandmarker;
    } catch (cpuErr) {
      console.warn('MediaPipe WASM unavailable in offline sandbox:', cpuErr);
      landmarkerInitFailed = true;
      return null;
    }
  }
}

/**
 * Extracts frame-by-frame pose landmarks from an HTMLVideoElement using MediaPipe PoseLandmarker.
 */
export async function extractPoseFromVideoElement(
  video: HTMLVideoElement,
  targetFps = 24,
  onProgress?: (pct: number) => void
): Promise<{ frames: FramePoseSample[]; fps: number; usedMediaPipeWasm: boolean }> {
  const landmarker = await getOrInitPoseLandmarker();
  const duration = Math.min(Math.max(video.duration || 4.0, 1.5), 14.0);
  const totalFrames = Math.max(12, Math.floor(duration * targetFps));
  const samples: FramePoseSample[] = [];

  let prevWrist = { x: 0.5, y: 0.5 };

  for (let i = 0; i < totalFrames; i++) {
    const t = (i / totalFrames) * duration;
    video.currentTime = t;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked, { once: true });
      setTimeout(resolve, 120);
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    if (landmarker) {
      try {
        const timestampMs = Math.round(t * 1000) + i;
        const result = landmarker.detectForVideo(video, timestampMs);
        if (result.landmarks && result.landmarks.length > 0) {
          const lm2dRaw = result.landmarks[0];
          const lm3dRaw = result.worldLandmarks?.[0] || lm2dRaw;

          const landmarks2D: PoseLandmarkPoint[] = lm2dRaw.map((pt) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z,
            visibility: pt.visibility ?? 0.85,
          }));
          const landmarks3D: PoseLandmarkPoint[] = lm3dRaw.map((pt) => ({
            x: pt.x,
            y: -pt.y, // Convert MediaPipe world -Y up to +Y up
            z: pt.z,
            visibility: pt.visibility ?? 0.85,
          }));

          const meanVisibility =
            landmarks2D.reduce((acc, p) => acc + p.visibility, 0) / landmarks2D.length;

          const torsoLen = Math.max(
            0.08,
            Math.hypot(
              (landmarks2D[11].x + landmarks2D[12].x) * 0.5 -
                (landmarks2D[23].x + landmarks2D[24].x) * 0.5,
              (landmarks2D[11].y + landmarks2D[12].y) * 0.5 -
                (landmarks2D[23].y + landmarks2D[24].y) * 0.5
            )
          );

          const wristSpeed =
            (Math.hypot(landmarks2D[16].x - prevWrist.x, landmarks2D[16].y - prevWrist.y) *
              targetFps) /
            torsoLen;
          prevWrist = { x: landmarks2D[16].x, y: landmarks2D[16].y };

          samples.push({
            frameIndex: i,
            timestampSec: t,
            landmarks2D,
            landmarks3D,
            meanVisibility,
            wristVelocityNorm: wristSpeed,
            comPosition: {
              x: (landmarks2D[23].x + landmarks2D[24].x) * 0.5,
              y: (landmarks2D[23].y + landmarks2D[24].y) * 0.5,
              z: (landmarks2D[23].z + landmarks2D[24].z) * 0.5,
            },
          });
          continue;
        }
      } catch (detectErr) {
        console.warn('Frame pose detection error:', detectErr);
      }
    }

    // If a frame had no person detected, record low visibility sample so the empirical
    // visibility / abstention gate accurately reflects missing pose evidence.
    const emptyLm: PoseLandmarkPoint[] = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.1,
    }));
    samples.push({
      frameIndex: i,
      timestampSec: t,
      landmarks2D: emptyLm,
      landmarks3D: emptyLm,
      meanVisibility: 0.1,
      wristVelocityNorm: 0,
      comPosition: { x: 0.5, y: 0.5, z: 0 },
    });
  }

  return {
    frames: samples,
    fps: targetFps,
    usedMediaPipeWasm: Boolean(landmarker),
  };
}

/**
 * Extracts frames from a calibrated reference squash clip specification.
 */
export function extractPoseFromReferenceClip(clip: ReferenceSquashClipSpec): {
  frames: FramePoseSample[];
  fps: number;
} {
  return {
    frames: generateReferencePoseSequence(clip),
    fps: clip.fps,
  };
}

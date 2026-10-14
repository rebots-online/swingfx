import React, { useEffect, useRef, useState } from 'react';
import {
  FramePoseSample,
  MovementObservation,
  TechniqueFault,
} from '../types/swingfx';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

interface VideoPoseCanvasProps {
  frames: FramePoseSample[];
  fps: number;
  observations: MovementObservation[];
  selectedRepIndex: number;
  onSelectRep: (index: number) => void;
  primaryFault: TechniqueFault | null;
  comparisonFrames?: FramePoseSample[];
  comparisonLabel?: string;
  videoUrl?: string | null;
}

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], // shoulders
  [11, 23],
  [12, 24], // torso
  [23, 24], // hips
  [11, 13],
  [13, 15], // left arm
  [12, 14],
  [14, 16], // right arm
  [16, 20], // right hand/racket extension
  [23, 25],
  [25, 27], // left leg
  [24, 26],
  [26, 28], // right leg
];

export const VideoPoseCanvas: React.FC<VideoPoseCanvasProps> = ({
  frames,
  fps,
  observations,
  selectedRepIndex,
  onSelectRep,
  primaryFault,
  comparisonFrames,
  comparisonLabel,
  videoUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [showGhostComparison, setShowGhostComparison] = useState<boolean>(true);

  const activeObs = observations[selectedRepIndex] || observations[0];
  const repStartFrame = activeObs ? activeObs.frames[0]?.frameIndex ?? 0 : 0;
  const repEndFrame = activeObs
    ? activeObs.frames[activeObs.frames.length - 1]?.frameIndex ?? Math.max(0, frames.length - 1)
    : Math.max(0, frames.length - 1);

  useEffect(() => {
    setCurrentFrameIdx(repStartFrame);
  }, [selectedRepIndex, repStartFrame]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const intervalMs = 1000 / (fps * playbackSpeed);
    const timer = window.setInterval(() => {
      setCurrentFrameIdx((prev) => {
        if (prev >= repEndFrame) return repStartFrame;
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, fps, playbackSpeed, repStartFrame, repEndFrame, frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const sample = frames[Math.min(frames.length - 1, Math.max(0, currentFrameIdx))];
    if (!sample) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw either uploaded video frame or squash court environment backdrop
    if (videoUrl && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      ctx.fillStyle = 'rgba(17, 19, 24, 0.35)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Warm architectural squash court perspective background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#161920');
      grad.addColorStop(0.62, '#1E232D');
      grad.addColorStop(0.63, '#2A241E');
      grad.addColorStop(1, '#1A1714');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Court floor & front/side wall markings
      ctx.strokeStyle = 'rgba(226, 221, 210, 0.14)';
      ctx.lineWidth = 1.5;
      // Front wall tin line
      ctx.beginPath();
      ctx.moveTo(width * 0.12, height * 0.56);
      ctx.lineTo(width * 0.88, height * 0.56);
      ctx.stroke();

      // Red tin band
      ctx.strokeStyle = 'rgba(200, 75, 49, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.12, height * 0.62);
      ctx.lineTo(width * 0.88, height * 0.62);
      ctx.stroke();

      // Perspective side walls & T-line
      ctx.strokeStyle = 'rgba(226, 221, 210, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.12, height * 0.1);
      ctx.lineTo(width * 0.12, height * 0.62);
      ctx.lineTo(width * 0.02, height * 0.96);
      ctx.moveTo(width * 0.88, height * 0.1);
      ctx.lineTo(width * 0.88, height * 0.62);
      ctx.lineTo(width * 0.98, height * 0.96);
      // Short line & T
      ctx.moveTo(width * 0.06, height * 0.81);
      ctx.lineTo(width * 0.94, height * 0.81);
      ctx.moveTo(width * 0.5, height * 0.81);
      ctx.lineTo(width * 0.5, height * 0.98);
      ctx.stroke();
    }

    // 2. Draw wrist preparation trajectory ribbon across current repetition
    if (activeObs) {
      ctx.save();
      ctx.beginPath();
      activeObs.frames.forEach((f, idx) => {
        const wx = f.landmarks2D[16].x * width;
        const wy = f.landmarks2D[16].y * height;
        if (idx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      });
      ctx.strokeStyle = 'rgba(200, 75, 49, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw optional Comparison Ghost Skeleton (e.g., Baseline vs. Retest)
    if (comparisonFrames && comparisonFrames.length > 0 && showGhostComparison) {
      const compSample =
        comparisonFrames[Math.min(comparisonFrames.length - 1, currentFrameIdx)];
      if (compSample) {
        drawSkeleton2D(ctx, compSample.landmarks2D, width, height, {
          boneColor: 'rgba(148, 163, 184, 0.45)',
          jointColor: 'rgba(203, 213, 225, 0.55)',
          racketColor: 'rgba(148, 163, 184, 0.45)',
          isGhost: true,
        });
      }
    }

    // 4. Draw Primary Tracked Skeleton
    drawSkeleton2D(ctx, sample.landmarks2D, width, height, {
      boneColor: '#FBF9F5',
      jointColor: '#C84B31',
      racketColor: '#22C55E',
      isGhost: false,
    });

    // 5. Highlight Primary Fault Joint Vector (Elbow-to-Wrist Prep or Trunk Inclination)
    const lm = sample.landmarks2D;
    const elbow = lm[14];
    const wrist = lm[16];
    const shoulderMid = {
      x: (lm[11].x + lm[12].x) * 0.5 * width,
      y: (lm[11].y + lm[12].y) * 0.5 * height,
    };
    const hipMid = {
      x: (lm[23].x + lm[24].x) * 0.5 * width,
      y: (lm[23].y + lm[24].y) * 0.5 * height,
    };

    // Draw horizontal reference plane at elbow height to show wrist-vs-elbow elevation clearly
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(elbow.x * width - 48, elbow.y * height);
    ctx.lineTo(elbow.x * width + 75, elbow.y * height);
    ctx.stroke();
    ctx.restore();

    // Draw HUD telemetry overlay inside video viewport
    const torsoLen = Math.max(
      0.08,
      Math.hypot(
        (lm[11].x + lm[12].x) * 0.5 - (lm[23].x + lm[24].x) * 0.5,
        (lm[11].y + lm[12].y) * 0.5 - (lm[23].y + lm[24].y) * 0.5
      )
    );
    const wristElbowRatio = ((elbow.y - wrist.y) / torsoLen).toFixed(2);
    const trunkDeg = (
      (Math.atan2(
        Math.abs(shoulderMid.x - hipMid.x),
        Math.max(1, Math.abs(hipMid.y - shoulderMid.y))
      ) *
        180) /
      Math.PI
    ).toFixed(1);

    // Phase label determination
    let currentPhaseLabel = 'APPROACH / PREP';
    if (activeObs) {
      const pf = activeObs.phaseFrames;
      if (currentFrameIdx < pf.backswingPeak) currentPhaseLabel = '1. PREPARATION';
      else if (currentFrameIdx <= pf.downswingStart + 1) currentPhaseLabel = '2. BACKSWING SET';
      else if (currentFrameIdx < pf.impactEstimate) currentPhaseLabel = '3. DOWNSWING';
      else if (currentFrameIdx <= pf.impactEstimate + 3) currentPhaseLabel = '4. IMPACT WINDOW';
      else currentPhaseLabel = '5. FOLLOW-THROUGH & RECOVERY';
    }

    // Scrim top-left for live frame telemetry
    ctx.fillStyle = 'rgba(17, 19, 24, 0.78)';
    ctx.fillRect(14, 14, 290, 74);
    ctx.fillStyle = '#FBF9F5';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(
      `FRAME ${String(currentFrameIdx).padStart(3, '0')} · ${(currentFrameIdx / fps).toFixed(2)}s · ${currentPhaseLabel}`,
      24,
      34
    );
    ctx.fillStyle = Number(wristElbowRatio) >= 0.08 ? '#4ADE80' : '#FBBF24';
    ctx.fillText(`Wrist-Elbow Elev: ${wristElbowRatio} × torso`, 24, 54);
    ctx.fillStyle = '#E2DDD2';
    ctx.fillText(
      `Trunk Lean: ${trunkDeg}° · Vis: ${(sample.meanVisibility * 100).toFixed(0)}%`,
      24,
      72
    );
  }, [
    currentFrameIdx,
    frames,
    fps,
    activeObs,
    comparisonFrames,
    showGhostComparison,
    videoUrl,
    primaryFault,
  ]);

  return (
    <div className="flex flex-col bg-[#111318] rounded-2xl overflow-hidden border border-[#E2DDD2]">
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          muted
          playsInline
          crossOrigin="anonymous"
        />
      )}

      {/* Top Viewport Strip: Rep Switcher & Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#181B22] border-b border-white/10 text-xs text-[#E2DDD2]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#A1A1AA]">REPETITIONS:</span>
          <div className="flex items-center gap-1">
            {observations.map((obs, idx) => {
              const isAffected = primaryFault?.affectedRepetitionIndices.includes(idx + 1);
              return (
                <button
                  key={obs.observationId}
                  onClick={() => onSelectRep(idx)}
                  className={`px-2.5 py-1 rounded font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                    selectedRepIndex === idx
                      ? 'bg-[#C84B31] text-white font-semibold'
                      : 'bg-white/5 text-[#E2DDD2] hover:bg-white/10'
                  }`}
                >
                  Rep {idx + 1} {isAffected ? '!' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {comparisonFrames && comparisonFrames.length > 0 && (
            <button
              onClick={() => setShowGhostComparison((v) => !v)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                showGhostComparison
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-[#A1A1AA] hover:text-white'
              }`}
            >
              {showGhostComparison ? `Hide ${comparisonLabel || 'Baseline Ghost'}` : `Show ${comparisonLabel || 'Baseline Ghost'}`}
            </button>
          )}
          <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded">
            {[0.25, 0.5, 1].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                  playbackSpeed === spd
                    ? 'bg-white text-[#111318] font-semibold'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2D Annotated Video Canvas */}
      <div className="relative aspect-video w-full bg-[#111318] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={760}
          height={428}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Phase Keyframe Bar & Scrubber */}
      <div className="px-4 py-3 bg-[#181B22] border-t border-white/10 flex flex-col gap-2">
        {activeObs && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#A1A1AA]">
            <span>Jump to Phase Keyframe:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'Prep Start', frame: activeObs.phaseFrames.prepStart },
                { label: 'Backswing Peak', frame: activeObs.phaseFrames.backswingPeak },
                { label: 'Impact Estimate', frame: activeObs.phaseFrames.impactEstimate },
                { label: 'Recovery Start', frame: activeObs.phaseFrames.recoveryStart },
              ].map((kf) => (
                <button
                  key={kf.label}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx(kf.frame);
                  }}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                    Math.abs(currentFrameIdx - kf.frame) <= 1
                      ? 'bg-[#C84B31] text-white'
                      : 'bg-white/5 text-[#E2DDD2] hover:bg-white/15'
                  }`}
                >
                  {kf.label} (f{kf.frame})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#C84B31] text-white hover:bg-[#B03E26] transition-colors shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrameIdx((f) => Math.max(repStartFrame, f - 1));
            }}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors shrink-0"
            aria-label="Previous Frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrameIdx((f) => Math.min(repEndFrame, f + 1));
            }}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors shrink-0"
            aria-label="Next Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={repStartFrame}
            max={Math.max(repStartFrame + 1, repEndFrame)}
            value={Math.min(repEndFrame, Math.max(repStartFrame, currentFrameIdx))}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrameIdx(Number(e.target.value));
            }}
            className="flex-1 accent-[#C84B31] cursor-pointer"
          />
          <button
            onClick={() => {
              setCurrentFrameIdx(repStartFrame);
              setIsPlaying(true);
            }}
            className="min-h-[38px] px-2.5 flex items-center gap-1 rounded-lg bg-white/10 text-xs text-white hover:bg-white/15 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Loop Rep
          </button>
        </div>
      </div>
    </div>
  );
};

function drawSkeleton2D(
  ctx: CanvasRenderingContext2D,
  lm: FramePoseSample['landmarks2D'],
  width: number,
  height: number,
  style: {
    boneColor: string;
    jointColor: string;
    racketColor: string;
    isGhost: boolean;
  }
) {
  ctx.save();
  ctx.strokeStyle = style.boneColor;
  ctx.lineWidth = style.isGhost ? 2.5 : 3.5;
  ctx.lineCap = 'round';

  for (const [a, b] of POSE_CONNECTIONS) {
    const ptA = lm[a];
    const ptB = lm[b];
    if (!ptA || !ptB) continue;
    ctx.beginPath();
    ctx.moveTo(ptA.x * width, ptA.y * height);
    ctx.lineTo(ptB.x * width, ptB.y * height);
    ctx.stroke();
  }

  // Draw illustrative squash racket extending from dominant wrist (16) through index (20)
  const wrist = lm[16];
  const indexPt = lm[20];
  if (wrist && indexPt) {
    const dx = indexPt.x - wrist.x;
    const dy = indexPt.y - wrist.y;
    const shaftEndX = (wrist.x + dx * 2.2) * width;
    const shaftEndY = (wrist.y + dy * 2.2) * height;
    const headCenterX = (wrist.x + dx * 3.2) * width;
    const headCenterY = (wrist.y + dy * 3.2) * height;

    ctx.strokeStyle = style.racketColor;
    ctx.lineWidth = style.isGhost ? 2 : 3;
    ctx.beginPath();
    ctx.moveTo(wrist.x * width, wrist.y * height);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      headCenterX,
      headCenterY,
      16,
      11,
      Math.atan2(dy, dx),
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  // Draw key anatomical joints
  const keyJoints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of keyJoints) {
    const pt = lm[idx];
    if (!pt) continue;
    ctx.fillStyle = idx === 16 || idx === 14 ? '#C84B31' : style.jointColor;
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, style.isGhost ? 3.5 : 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

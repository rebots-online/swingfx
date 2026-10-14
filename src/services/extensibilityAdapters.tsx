import React, { useState } from 'react';
import {
  BallLauncherFeedCommand,
  IdentityBillingAdapter,
  ObservedBallTrajectory,
} from '../types/swingfx';
import { Cpu, ShieldAlert, Radio, PlayCircle } from 'lucide-react';

/**
 * Section 8 & Section 14 Extensibility Interfaces:
 * 1. Optional DIY ESP32 Squash-Ball Launcher Protocol Panel (Hardware-Independent, E-Stop Decoupled)
 * 2. BIDLR / BIDLLER Commercial Identity & Tier Adapter Boundary
 */

export const DEFAULT_IDENTITY_ADAPTER: IdentityBillingAdapter = {
  providerName: 'LOCAL_STANDALONE',
  actorId: 'local-club-player-01',
  actorDisplayName: 'Solo Squash Player',
  actorEmail: null,
  isAuthenticated: false,
  tier: 'COACH_STUDIO',
  entitlements: {
    canRunLocalCV: true,
    canOverrideHeuristics: true,
    canRunCloudArgonReasoning: true,
    canPersistLongitudinalRetention: true,
    canConnectCoachReview: true,
  },
};

export const Esp32BallLauncherPanel: React.FC<{
  onSelectVariationFeed?: (description: string) => void;
}> = ({ onSelectVariationFeed }) => {
  const [command, setCommand] = useState<BallLauncherFeedCommand>({
    commandId: 'cmd-esp32-01',
    targetZone: 'FOREHAND_LENGTH',
    upperRollerRpm: 2450,
    lowerRollerRpm: 2100,
    yawAngleDeg: 14,
    pitchAngleDeg: 8,
    feedIntervalSec: 4.5,
    sequenceMode: 'FIXED_REPEAT',
    hardwareEStopIndependentVerified: true,
  });

  const [lastObservedBall, setLastObservedBall] = useState<ObservedBallTrajectory>({
    trajectoryId: 'traj-obs-01',
    linkedCommandId: 'cmd-esp32-01',
    provenance: 'UNRESOLVED',
    launchVelocityEstimateMps: null,
    bounceFloorLocationNormalized: null,
    notes:
      'Commanded feed settings are kept strictly separate from observed ball trajectory. At 30 fps monocular video, high-speed ball flight is marked UNRESOLVED unless verified.',
  });

  const triggerSimulatedCommand = (mode: BallLauncherFeedCommand['sequenceMode']) => {
    const nextCmd: BallLauncherFeedCommand = {
      ...command,
      commandId: `cmd-esp32-${Date.now()}`,
      sequenceMode: mode,
    };
    setCommand(nextCmd);
    setLastObservedBall({
      trajectoryId: `traj-${Date.now()}`,
      linkedCommandId: nextCmd.commandId,
      provenance: 'UNRESOLVED',
      launchVelocityEstimateMps: null,
      bounceFloorLocationNormalized: { x: 0.78, y: 0.68 },
      notes: `Queued ${mode} protocol (${nextCmd.upperRollerRpm}/${nextCmd.lowerRollerRpm} RPM, ${nextCmd.feedIntervalSec}s interval). Observed trajectory remains separated from commanded settings.`,
    });
    if (onSelectVariationFeed) {
      onSelectVariationFeed(
        `ESP32 Launcher Protocol: ${mode} (${nextCmd.targetZone}, ${nextCmd.feedIntervalSec}s cadence)`
      );
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-[#E2DDD2] bg-[#F3EFE6]/60 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#C84B31]" />
          <h4 className="text-sm font-bold text-[#18181B]">
            Optional DIY ESP32 Squash-Ball Launcher Interface (v0.1 Hardware-Independent Spec)
          </h4>
        </div>
        <span className="text-xs font-mono text-[#52525B]">
          Not required for v0.1 · Commanded ≠ Observed Trajectory
        </span>
      </div>

      <div className="p-3 rounded-xl bg-white border border-[#E2DDD2] flex items-start gap-2.5 text-xs text-[#52525B]">
        <ShieldAlert className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#18181B]">Hardware Safety Invariant:</strong> Physical E-Stop,
          roller motor shutdown, and magazine servo interlock operate in independent ESP32 hardware
          circuitry—never gated on browser WebSocket connectivity, CV frame rate, or LLM inference.
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg bg-white border border-[#E2DDD2]">
          <div className="text-[#52525B]">Target Feed Zone</div>
          <select
            value={command.targetZone}
            onChange={(e) =>
              setCommand((c) => ({
                ...c,
                targetZone: e.target.value as BallLauncherFeedCommand['targetZone'],
              }))
            }
            className="mt-1 w-full font-semibold text-[#18181B] bg-transparent"
          >
            <option value="FOREHAND_LENGTH">FOREHAND_LENGTH</option>
            <option value="BACKHAND_LENGTH">BACKHAND_LENGTH</option>
            <option value="MID_VOLLEY">MID_VOLLEY</option>
            <option value="FRONT_DROP">FRONT_DROP</option>
          </select>
        </div>
        <div className="p-3 rounded-lg bg-white border border-[#E2DDD2]">
          <div className="text-[#52525B]">Roller RPM (Top/Bot)</div>
          <div className="mt-1 font-bold text-[#18181B]">
            {command.upperRollerRpm} / {command.lowerRollerRpm}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white border border-[#E2DDD2]">
          <div className="text-[#52525B]">Yaw / Pitch Servo</div>
          <div className="mt-1 font-bold text-[#18181B]">
            +{command.yawAngleDeg}° / +{command.pitchAngleDeg}°
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white border border-[#E2DDD2]">
          <div className="text-[#52525B]">Feed Interval</div>
          <div className="mt-1 font-bold text-[#18181B]">{command.feedIntervalSec}s / ball</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#52525B] font-mono">
          Observed Ball Trajectory State:{' '}
          <strong className="text-[#18181B]">{lastObservedBall.provenance}</strong> —{' '}
          {lastObservedBall.notes}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSimulatedCommand('FIXED_REPEAT')}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E2DDD2] text-xs font-medium text-[#18181B] hover:bg-[#F3EFE6] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <PlayCircle className="w-3.5 h-3.5 text-[#C84B31]" />
            Queue Fixed Corrective Feeds
          </button>
          <button
            onClick={() => triggerSimulatedCommand('RANDOMIZED_RETENTION')}
            className="px-3 py-1.5 rounded-lg bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Radio className="w-3.5 h-3.5 text-[#4ADE80]" />
            Queue Randomized Retention Feeds
          </button>
        </div>
      </div>
    </div>
  );
};

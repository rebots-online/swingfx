import {
  CorrectionOutcome,
  HeuristicThresholdConfig,
  PlayerTechniqueBaseline,
  RetentionAssessment,
  TechniqueAssessment,
} from '../types/swingfx';
import { INITIAL_HEURISTIC_TAXONOMY } from '../config/heuristics';

const KEYS = {
  HEURISTICS: 'swingfx_heuristics_v0.1',
  ASSESSMENTS: 'swingfx_assessments_v0.1',
  OUTCOMES: 'swingfx_outcomes_v0.1',
  RETENTIONS: 'swingfx_retentions_v0.1',
  BASELINE: 'swingfx_baseline_v0.1',
};

export function loadHeuristicsFromStorage(): HeuristicThresholdConfig[] {
  try {
    const raw = localStorage.getItem(KEYS.HEURISTICS);
    if (!raw) return INITIAL_HEURISTIC_TAXONOMY;
    const parsed = JSON.parse(raw) as HeuristicThresholdConfig[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn('Failed to read heuristics from storage:', e);
  }
  return INITIAL_HEURISTIC_TAXONOMY;
}

export function saveHeuristicsToStorage(heuristics: HeuristicThresholdConfig[]): void {
  try {
    localStorage.setItem(KEYS.HEURISTICS, JSON.stringify(heuristics));
  } catch (e) {
    console.warn('Failed to save heuristics:', e);
  }
}

export function loadAssessmentsFromStorage(): TechniqueAssessment[] {
  try {
    const raw = localStorage.getItem(KEYS.ASSESSMENTS);
    if (!raw) return [];
    // Omit full frame arrays when reading summary if needed, or restore full objects
    return JSON.parse(raw) as TechniqueAssessment[];
  } catch {
    return [];
  }
}

export function saveAssessmentToStorage(assessment: TechniqueAssessment): void {
  try {
    const existing = loadAssessmentsFromStorage();
    // Keep lightweight frame copies in localStorage so quota isn't exceeded
    const compact: TechniqueAssessment = {
      ...assessment,
      observations: assessment.observations.map((obs) => ({
        ...obs,
        frames: obs.frames.slice(0, 60),
      })),
    };
    const next = [compact, ...existing.filter((a) => a.assessmentId !== assessment.assessmentId)].slice(
      0,
      12
    );
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save assessment locally:', e);
  }
}

export function loadOutcomesFromStorage(): CorrectionOutcome[] {
  try {
    const raw = localStorage.getItem(KEYS.OUTCOMES);
    return raw ? (JSON.parse(raw) as CorrectionOutcome[]) : [];
  } catch {
    return [];
  }
}

export function saveOutcomeToStorage(outcome: CorrectionOutcome): void {
  try {
    const existing = loadOutcomesFromStorage();
    const next = [outcome, ...existing.filter((o) => o.outcomeId !== outcome.outcomeId)].slice(0, 20);
    localStorage.setItem(KEYS.OUTCOMES, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save outcome locally:', e);
  }
}

export function loadRetentionsFromStorage(): RetentionAssessment[] {
  try {
    const raw = localStorage.getItem(KEYS.RETENTIONS);
    return raw ? (JSON.parse(raw) as RetentionAssessment[]) : [];
  } catch {
    return [];
  }
}

export function saveRetentionToStorage(retention: RetentionAssessment): void {
  try {
    const existing = loadRetentionsFromStorage();
    const next = [
      retention,
      ...existing.filter((r) => r.retentionId !== retention.retentionId),
    ].slice(0, 25);
    localStorage.setItem(KEYS.RETENTIONS, JSON.stringify(next));
  } catch (e) {
    console.warn('Failed to save retention locally:', e);
  }
}

export function loadOrCreatePlayerBaseline(userId: string): PlayerTechniqueBaseline {
  try {
    const raw = localStorage.getItem(KEYS.BASELINE);
    if (raw) return JSON.parse(raw) as PlayerTechniqueBaseline;
  } catch {
    // ignore
  }
  const initial: PlayerTechniqueBaseline = {
    baselineId: `base-${userId}`,
    userId,
    playerName: 'Club Squash Player',
    handedness: 'RIGHT',
    updatedAt: new Date().toISOString(),
    noteOnHabitualVsEffective:
      'Habitual baseline records how the player currently moves across sessions. Consistency in a habitual metric does NOT imply biomechanical effectiveness.',
    strokeHabitualProfiles: {
      FOREHAND: {
        sessionsRecorded: 1,
        habitualMetrics: {
          prepWristAboveElbowRatio: { mean: -0.04, stdDev: 0.03 },
          lungeTrunkInclinationDeg: { mean: 45.2, stdDev: 3.1 },
        },
        recurringFaultIds: ['FH-PREP-UL-01', 'FH-FOOT-LL-01'],
        retainedCorrectionFaultIds: [],
      },
      BACKHAND: {
        sessionsRecorded: 0,
        habitualMetrics: {},
        recurringFaultIds: [],
        retainedCorrectionFaultIds: [],
      },
      VOLLEY: {
        sessionsRecorded: 0,
        habitualMetrics: {},
        recurringFaultIds: [],
        retainedCorrectionFaultIds: [],
      },
      DROP_BOAST: {
        sessionsRecorded: 0,
        habitualMetrics: {},
        recurringFaultIds: [],
        retainedCorrectionFaultIds: [],
      },
    },
  };
  return initial;
}

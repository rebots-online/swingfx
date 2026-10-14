/**
 * SwingF/X (swingfx) — Authoritative Domain & Epistemic Data Contracts
 * Derived from DOCS/ARCHITECTURE.md (arch-swingfx-v0.1.0)
 */

export type EvidenceProvenance = 'OBSERVED' | 'INFERRED' | 'SIMULATED' | 'UNRESOLVED';

export type StrokeCategory = 'FOREHAND' | 'BACKHAND' | 'VOLLEY' | 'DROP_BOAST';

export type ShotSubType =
  | 'FOREHAND_DRIVE'
  | 'BACKHAND_DRIVE'
  | 'FOREHAND_VOLLEY'
  | 'BACKHAND_VOLLEY'
  | 'STRAIGHT_DROP'
  | 'TWO_WALL_BOAST'
  | 'RACKET_PREP_SPLIT_STEP';

export type MovementPhase =
  | 'PREPARATION'
  | 'BACKSWING'
  | 'CONTACT'
  | 'FOOTWORK_LUNGE'
  | 'FOLLOW_THROUGH_RECOVERY';

export type BodyPartGroup =
  | 'UPPER_LIMB'
  | 'TRUNK_CORE'
  | 'SPACING_WRIST'
  | 'LOWER_LIMB_FOOTWORK';

export type Handedness = 'RIGHT' | 'LEFT';

export type HeuristicProvenance =
  | 'PROVISIONAL_COACH_HEURISTIC_V0.1'
  | 'COACH_OVERRIDE'
  | 'EMPIRICAL_SESSION_CALIBRATION';

export type NormalizationBasis =
  | 'TORSO_LENGTH'
  | 'SHOULDER_WIDTH'
  | 'HIP_WIDTH'
  | 'DEGREES'
  | 'PHASE_RATIO'
  | 'SECONDS';

export type CoachReviewStatus =
  | 'UNREVIEWED'
  | 'COACH_CONFIRMED'
  | 'COACH_AMENDED'
  | 'COACH_REJECTED';

export type LearningLoopStage =
  | 'OBSERVE'
  | 'DETECT'
  | 'DIAGNOSE'
  | 'INTERVENE'
  | 'RETEST'
  | 'RETAIN';

export interface PhysicalVenue {
  venueId: string;
  venueType:
    | 'UNCALIBRATED_SPACE'
    | 'INTERNATIONAL_SINGLES'
    | 'NORTH_AMERICAN_HARDBALL'
    | 'DOUBLES_COURT'
    | 'CONVERTED_RACQUETBALL_HANDBALL'
    | 'SOLO_PRACTICE_WALL';
  calibrationState:
    | 'BODY_RELATIVE_ONLY'
    | 'PARTIAL_WALL_REFERENCE'
    | 'CALIBRATED_HOMOGRAPHY';
  cameraMountDescription: string;
  notes?: string;
}

export interface CourtConfiguration {
  configId: string;
  tinHeightMeters: number | null;
  courtLinesVisible: boolean;
  wallMaterial: 'PLASTER' | 'GLASS_BACK' | 'ALL_GLASS' | 'PANEL' | 'IMPROVISED';
  lightingCondition: 'CLUB_LED' | 'DAYLIGHT_MIXED' | 'LOW_CONTRAST';
}

export interface PracticeProtocol {
  protocolId: string;
  strokeCategory: StrokeCategory;
  shotSubType: ShotSubType;
  feedType:
    | 'SHADOW_SWING'
    | 'GHOSTING'
    | 'SELF_DROP_FEED'
    | 'PARTNER_MANUAL_FEED'
    | 'SOLO_CONTINUOUS_DRIVE'
    | 'ESP32_LAUNCHER_FEED';
  promptingMode:
    | 'COACHED_WITH_CUES'
    | 'UNPROMPTED_RETENTION'
    | 'VARIED_FEED_RETENTION';
  targetRepetitionCount: number;
}

export interface HeuristicThresholdConfig {
  faultId: string;
  strokeCategory: StrokeCategory;
  movementPhase: MovementPhase;
  bodyPart: BodyPartGroup;
  title: string;
  briefDescription: string;
  metricKey: KinematicMetricKey;
  metricLabel: string;
  operator: '<' | '>';
  defaultThresholdValue: number;
  activeThresholdValue: number;
  targetEffectiveRange: [number, number];
  unit: string;
  normalizationBasis: NormalizationBasis;
  provenance: HeuristicProvenance;
  observabilityNotes: string;
  updatedAt: string;
  overriddenByCoach?: string;
  coachOverrideRationale?: string;
  plausibleRootCauses: Array<{
    id: string;
    title: string;
    mechanism: string;
    defaultConfidence: number;
    disambiguationTest: string;
  }>;
  downstreamSymptoms: string[];
  defaultDrill: {
    drillTitle: string;
    drillModality: PracticeProtocol['feedType'];
    drillProtocolSteps: string[];
    onCourtCue: string;
    targetVariableDescription: string;
  };
}

export type KinematicMetricKey =
  | 'prepWristAboveElbowRatio'
  | 'prepUpperArmElevationDeg'
  | 'backswingShoulderPelvisCoilDeg'
  | 'contactLateralWristHipRatio'
  | 'contactLongitudinalLeadKneeOffsetRatio'
  | 'lungeTrunkInclinationDeg'
  | 'recoveryInitiationLatencySec'
  | 'backhandElbowChestSpacingRatio'
  | 'backhandEarlyChestOpeningDeg'
  | 'backhandLeadFootCrossOffsetRatio'
  | 'volleyBackswingRetractionRatio'
  | 'volleyForwardComTransferRatio'
  | 'dropPrepElevationRetentionRatio'
  | 'dropLungePelvisRiseRatio';

export interface PoseLandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface FramePoseSample {
  frameIndex: number;
  timestampSec: number;
  landmarks2D: PoseLandmarkPoint[];
  landmarks3D: PoseLandmarkPoint[];
  meanVisibility: number;
  wristVelocityNorm: number;
  comPosition: { x: number; y: number; z: number };
}

export interface PhaseFrameIndices {
  prepStart: number;
  backswingPeak: number;
  downswingStart: number;
  impactEstimate: number;
  recoveryStart: number;
  recoveryEnd: number;
}

export interface ReferenceEventValidation {
  hasGroundTruthAnnotations: boolean;
  annotatedBackswingPeakFrame?: number;
  annotatedImpactFrame?: number;
  annotatedRecoveryStartFrame?: number;
  backswingFrameResidual?: number;
  impactFrameResidual?: number;
  recoveryFrameResidual?: number;
}

export interface PerspectiveDiagnostic {
  torsoAspectRatio: number;
  meanCoreVisibility: number;
  meanDistalArmVisibility: number;
  foreshorteningSeverity: 'LOW' | 'MODERATE' | 'SEVERE';
  cameraAngleEstimateLabel: string;
  perspectiveValidForAnalysis: boolean;
  warningMessage?: string;
}

export interface MetricMeasurement {
  metricKey: KinematicMetricKey;
  label: string;
  value: number;
  unit: string;
  normalizationBasis: NormalizationBasis;
  provenance: EvidenceProvenance;
  confidence: number;
  supportingFrameIndex: number;
  notes?: string;
}

export interface MovementObservation {
  observationId: string;
  assessmentId: string;
  repetitionIndex: number;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  frameCount: number;
  fps: number;
  frameIntervalMs: number;
  phaseFrames: PhaseFrameIndices;
  referenceValidation: ReferenceEventValidation;
  perspectiveDiagnostic: PerspectiveDiagnostic;
  metrics: Record<KinematicMetricKey, MetricMeasurement>;
  unobservableFlags: Array<{
    feature: string;
    provenance: 'UNRESOLVED';
    reason: string;
  }>;
  frames: FramePoseSample[];
}

export interface PriorityScoreBreakdown {
  detectability: number;
  functionalSignificance: number;
  causalImportance: number;
  correctability: number;
  evidenceConfidence: number;
  testability: number;
  compositeScore: number;
}

export interface TechniqueFault {
  faultId: string;
  strokeCategory: StrokeCategory;
  movementPhase: MovementPhase;
  bodyPart: BodyPartGroup;
  title: string;
  description: string;
  metricKey: KinematicMetricKey;
  metricLabel: string;
  unit: string;
  observedMean: number;
  observedStdDev: number;
  observedMin: number;
  observedMax: number;
  affectedRepetitionIndices: number[];
  totalRepetitions: number;
  consistencyRatio: number;
  heuristicSnapshot: {
    operator: '<' | '>';
    activeThresholdValue: number;
    defaultThresholdValue: number;
    targetEffectiveRange: [number, number];
    provenance: HeuristicProvenance;
    overriddenByCoach?: string;
  };
  priorityScore: PriorityScoreBreakdown;
  provenance: EvidenceProvenance;
}

export interface CompetingHypothesisItem {
  id: string;
  title: string;
  mechanism: string;
  confidence: number;
  disambiguationTest: string;
}

export interface CausalHypothesis {
  hypothesisId: string;
  faultId: string;
  classification: 'PRIMARY_ROOT_CAUSE' | 'DOWNSTREAM_SYMPTOM' | 'COMPETING_EXPLANATION';
  statement: string;
  biomechanicalMechanism: string;
  downstreamEffects: string[];
  supportingObservationIds: string[];
  supportingRepetitionNumbers: number[];
  competingHypotheses: CompetingHypothesisItem[];
  confidence: number;
  limitations: string[];
  disambiguationDrillOrView: string;
  provenance: 'INFERRED';
  coachReviewStatus: CoachReviewStatus;
  coachAmendmentNote?: string;
}

export interface CorrectiveIntervention {
  interventionId: string;
  faultId: string;
  hypothesisId: string;
  targetVariableKey: KinematicMetricKey;
  targetVariableLabel: string;
  unit: string;
  currentObservedMean: number;
  targetHeuristicRange: [number, number];
  plainLanguageExplanation: string;
  drillTitle: string;
  drillModality: PracticeProtocol['feedType'];
  drillProtocolSteps: string[];
  onCourtCue: string;
  adaptationContext: {
    handedness: Handedness;
    mobilityNotes: string;
    tacticalIntent: string;
  };
  targetPoseAdjustments: {
    description: string;
    elbowElevationDeltaDeg: number;
    wristElevationDeltaRatio: number;
    trunkInclinationTargetDeg: number;
    shoulderCoilTargetDeg: number;
    lateralSpacingTargetRatio: number;
  };
}

export interface DiagnosticAbstention {
  abstained: true;
  reasonCode:
    | 'LOW_LANDMARK_VISIBILITY'
    | 'SEVERE_CAMERA_FORESHORTENING'
    | 'INSUFFICIENT_REPETITIONS'
    | 'AMBIGUOUS_CONFLICTING_EVIDENCE';
  headline: string;
  explanation: string;
  observedEvidenceSummary: string;
  recommendedCameraPlacement: string;
  requestedAction:
    | 'ADJUST_CAMERA_ANGLE'
    | 'RECORD_MORE_REPETITIONS'
    | 'IMPROVE_LIGHTING_FRAMING'
    | 'REQUEST_HUMAN_COACH_REVIEW';
  provenance: 'OBSERVED' | 'UNRESOLVED';
}

export interface TechniqueAssessment {
  assessmentId: string;
  userId: string;
  createdAt: string;
  clipTitle: string;
  videoSourceType: 'LIVE_CAMERA' | 'UPLOADED_VIDEO' | 'REFERENCE_SQUASH_CLIP';
  referenceClipId?: string;
  modelVersion: string;
  cvPipelineVersion: string;
  heuristicVersion: string;
  venue: PhysicalVenue;
  courtConfig: CourtConfiguration;
  protocol: PracticeProtocol;
  playerIntent: {
    strokeCategory: StrokeCategory;
    shotSubType: ShotSubType;
    handedness: Handedness;
    subjectiveFeel: string;
    playerNotes?: string;
  };
  outcomeStatus: 'DIAGNOSIS_READY' | 'ABSTAINED_INSUFFICIENT_EVIDENCE';
  abstentionDetails?: DiagnosticAbstention;
  observations: MovementObservation[];
  detectedFaults: TechniqueFault[];
  primaryFaultId: string | null;
  hypotheses: CausalHypothesis[];
  selectedIntervention: CorrectiveIntervention | null;
  aiCoachingNarrative?: {
    generatedByModel: string;
    summaryNotice: string;
    causalExplanation: string;
    cueRefinement: string;
    uncertaintyCaveat: string;
  };
}

export interface DTWAlignmentResult {
  baselineRepIndex: number;
  retestRepIndex: number;
  normalizedDistance: number;
  similarityScore: number;
  warpPath: Array<[number, number]>;
  phaseTimingShiftsMs: {
    prepDurationDeltaMs: number;
    downswingDurationDeltaMs: number;
    recoveryLatencyDeltaMs: number;
  };
}

export interface PracticeAttempt {
  attemptId: string;
  userId: string;
  baselineAssessmentId: string;
  retestAssessment: TechniqueAssessment;
  interventionId: string;
  createdAt: string;
}

export interface CorrectionOutcome {
  outcomeId: string;
  attemptId: string;
  baselineAssessmentId: string;
  retestAssessmentId: string;
  interventionId: string;
  createdAt: string;
  targetVariableKey: KinematicMetricKey;
  targetVariableLabel: string;
  unit: string;
  beforeMean: number;
  beforeStdDev: number;
  afterMean: number;
  afterStdDev: number;
  deltaValue: number;
  targetHeuristicRange: [number, number];
  targetVariableChanged: boolean;
  executionQualityImproved: boolean;
  repeatabilityRatio: number;
  dtwAlignment: DTWAlignmentResult;
  newCompensationsDetected: TechniqueFault[];
  recommendation:
    | 'PROCEED_TO_RETENTION'
    | 'CONTINUE_CURRENT_DRILL'
    | 'PIVOT_HYPOTHESIS'
    | 'ABSTAIN_RECAPTURE';
  coachingSummary: string;
  provenance: EvidenceProvenance;
}

export interface RetentionAssessment {
  retentionId: string;
  userId: string;
  originalAssessmentId: string;
  interventionId: string;
  createdAt: string;
  sessionLabel: string;
  sessionGapHours: number;
  promptingWithdrawn: boolean;
  feedVariationApplied: boolean;
  feedVariationDescription: string;
  targetVariableKey: KinematicMetricKey;
  targetVariableLabel: string;
  unit: string;
  habitualBaselineValue: number;
  immediateCoachedValue: number;
  unpromptedRetentionValue: number;
  targetHeuristicRange: [number, number];
  retentionRatio: number;
  retentionStatus:
    | 'RETAINED_HABIT_FORMING'
    | 'PARTIAL_REGRESSION'
    | 'REGRESSED_TO_HABIT'
    | 'INSUFFICIENT_EVIDENCE';
  coachTakeaway: string;
}

export interface PlayerTechniqueBaseline {
  baselineId: string;
  userId: string;
  playerName: string;
  handedness: Handedness;
  updatedAt: string;
  noteOnHabitualVsEffective: string;
  strokeHabitualProfiles: Record<
    StrokeCategory,
    {
      sessionsRecorded: number;
      habitualMetrics: Partial<Record<KinematicMetricKey, { mean: number; stdDev: number }>>;
      recurringFaultIds: string[];
      retainedCorrectionFaultIds: string[];
    }
  >;
}

/**
 * Section 8 — Optional Future ESP32 Squash Ball Launcher Interface
 * Hardware-independent contract separating commanded settings from observed ball flight.
 */
export interface BallLauncherFeedCommand {
  commandId: string;
  targetZone: 'FOREHAND_LENGTH' | 'BACKHAND_LENGTH' | 'MID_VOLLEY' | 'FRONT_DROP';
  upperRollerRpm: number;
  lowerRollerRpm: number;
  yawAngleDeg: number;
  pitchAngleDeg: number;
  feedIntervalSec: number;
  sequenceMode: 'FIXED_REPEAT' | 'RANDOMIZED_RETENTION';
  hardwareEStopIndependentVerified: true;
}

export interface ObservedBallTrajectory {
  trajectoryId: string;
  linkedCommandId?: string;
  provenance: 'OBSERVED' | 'UNRESOLVED';
  launchVelocityEstimateMps: number | null;
  bounceFloorLocationNormalized: { x: number; y: number } | null;
  notes: string;
}

/**
 * Section 14 — Commercial & Identity Extensibility Boundary (BIDLR / BIDLLER compatible)
 */
export interface IdentityBillingAdapter {
  providerName: 'LOCAL_STANDALONE' | 'FIREBASE_AUTH' | 'BIDLR_FEDERATED';
  actorId: string;
  actorDisplayName: string;
  actorEmail: string | null;
  isAuthenticated: boolean;
  tier: 'FREE_DIAGNOSTIC' | 'CLUB_PLAYER_PRO' | 'COACH_STUDIO';
  entitlements: {
    canRunLocalCV: boolean;
    canOverrideHeuristics: boolean;
    canRunCloudArgonReasoning: boolean;
    canPersistLongitudinalRetention: boolean;
    canConnectCoachReview: boolean;
  };
}

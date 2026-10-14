---
project_id: "swingfx"
canonical_name: "SwingF/X"
artifact_id: "arch-swingfx-v0.1.0"
artifact_type: "architecture_digital_twin"
document_revision: "1.0.0"
architecture_revision: "v0.1.0-frozen"
source_commit_id: "HEAD-initial-swingfx-v0.1"
created_at: "2026-10-13T22:34:00-07:00"
status: "FROZEN"
depends_on: []
derives:
  - "checklist-swingfx-v0.1.0"
kstore_refs:
  - uri: "kstore://swingfx/biomechanics/mediapipe-pose-33-topology-v1"
    domain: "kinematics_pose_extraction"
    integrity: "required"
  - uri: "kstore://swingfx/taxonomy/squash-stroke-phase-fault-heuristics-v0.1"
    domain: "provisional_coaching_heuristics"
    integrity: "configurable_with_provenance"
  - uri: "kstore://swingfx/learning/corrective-motor-learning-loop-v1"
    domain: "motor_learning_and_retention"
    integrity: "required"
  - uri: "kstore://swingfx/epistemology/evidence-provenance-abstention-v1"
    domain: "evidence_integrity"
    integrity: "strict_enforced"
  - uri: "kstore://swingfx/hardware/esp32-ball-launcher-decoupled-spec-v0.1"
    domain: "optional_hardware_interface"
    integrity: "future_compatible"
  - uri: "kstore://swingfx/commercial/bidlr-auth-entitlement-adapter-v0.1"
    domain: "commercial_extensibility"
    integrity: "future_compatible"
agent_execution_profile:
  target_worker_model: "glm-5.3"
  fallback_worker_model: "glm-latest-deterministic"
  reasoning_enabled: false
  temperature: 0.0
  stateless_assignment: true
  orchestrator_interface: "ACP-1.0"
  role_separation:
    orchestration: "external_acp_supervisor"
    architectural_judgment: "principal_architect_spec_author"
    implementation: "stateless_glm_worker_agent"
    verification: "independent_gate_verifier"
verification_gates:
  - gate_id: "GATE-0-DOGMA"
    description: "Verify DOCS/ARCHITECTURE.md and CHECKLIST.md frontmatter, schema parity, and invariant coverage prior to code mutation."
    command: "test -f DOCS/ARCHITECTURE.md && test -f CHECKLIST.md"
  - gate_id: "GATE-1-CV-EXTRACTION"
    description: "Verify real video decoding, MediaPipe Pose Landmarker extraction, repetition segmentation, body-relative kinematic extraction, DTW alignment, heuristic evaluation with coach override, and diagnostic abstention on representative squash footage."
    command: "npm run lint && npm run build"
  - gate_id: "GATE-2-CORRECTIVE-LOOP-UI"
    description: "Verify 6-stage CorrectiveLearningLoop UI, 2D synchronized overlay, 3D Three.js Skeleton Inspector with collapsible dock, Before/After retest comparison, and unprompted retention testing."
    command: "npm run lint && npm run build"
  - gate_id: "GATE-3-AI-REASONING-PROXY"
    description: "Verify server-side Gemini 4 Argon (ThinkingLevel.HIGH) diagnostic interpretation, abstention compliance, multi-turn coaching chat, and Gemini 3.8 Live voice drill cues."
    command: "npm run lint && npm run build"
  - gate_id: "GATE-4-PERSISTENCE"
    description: "Verify local storage repository + optional Firebase Auth and Firestore persistence with hardened security rules."
    command: "npm run lint && npm run build"
---

# SwingF/X (`swingfx`) — Authoritative System Architecture (v0.1)

## 1. Executive Purpose & Central Dogma

**SwingF/X** ("Diagnose My Swing — and Fix It!") is a standalone AI-assisted squash technique coach designed to identify consequential, correctable mechanical faults across swing repetitions, formulate evidence-grounded causal hypotheses (or abstain when video evidence is insufficient), prescribe a single-variable corrective drill and cue, and verify whether the correction improves execution and persists across unprompted retention tests.

### 1.1 Architectural Invariants
1. **CV-First Technical Gate (`INV-01`)**: Genuine video processing, pose landmark extraction, repetition segmentation, and quantitative kinematic measurement must execute and verify locally before any cloud database, billing, or generative LLM dependency is invoked.
2. **Provisional Heuristic Provenance & Coach Override (`INV-02`)**: All numerical fault thresholds are modeled as provisional, configurable coaching heuristics (`PROVISIONAL_COACH_HEURISTIC_V0.1`), never as universal biomechanical laws. Every threshold supports runtime override by a coach or advanced player with preserved audit provenance.
3. **Empirical Validation & Epistemic Honesty (`INV-03`)**: SwingF/X never claims fixed angular or temporal precision out of thin air. Every assessment records frame interval ($\Delta t = 1 / f_s$), landmark visibility statistics, camera-perspective diagnostics, and reference-event alignment residuals. Unobservable quantities (exact string-bed contact angle at 30–60 fps, grip pressure, joint reaction forces, internal tissue loads, or injury diagnoses) are never fabricated.
4. **First-Class Diagnostic Abstention (`INV-04`)**: When landmark confidence, camera perspective, repetition count, or kinematic signal is insufficient to support a specific correction, the pipeline must return a structured `DiagnosticAbstention` outcome requesting a specific camera angle adjustment, additional repetitions, or human-coach review.
5. **Single-Variable Corrective Loop (`INV-05`)**: Each intervention targets one principal biomechanical variable at a time and evaluates retest repetitions for target variable shift, functional execution quality, repeatability, and absence of newly induced compensatory faults.
6. **Separation of Habitual Baseline vs. Effective Technique (`INV-06`)**: A player's historical baseline (`PlayerTechniqueBaseline`) represents how they habitually move—never an automatically desirable target. Consistency of a flawed movement is classified as a stable habit requiring intervention, not correctness.

---

## 2. System Topology & Gate-Ordered Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        GATE 1: DETERMINISTIC VIDEO & CV ENGINE                       │
│                                                                                      │
│  [Video Source: Live Camera │ User Video Upload │ Annotated Reference Squash Clips]  │
│                                         │                                            │
│                                         ▼                                            │
│  [Frame Sampler & Metadata Extractor (fps, Δt, resolution, shutter/blur estimate)]   │
│                                         │                                            │
│                                         ▼                                            │
│  [MediaPipe Pose Landmarker (33 2D Normalized + 33 3D World Landmarks per Frame)]    │
│                                         │                                            │
│                                         ▼                                            │
│  [Empirical Perspective & Visibility Gate]                                           │
│     ├──► Fails Minimum Visibility / Perspective / Rep Count                          │
│     │         └──► [DiagnosticAbstention Outcome + Camera/Rep Guidance]              │
│     ▼ Passes                                                                         │
│  [Repetition & Phase Segmenter]                                                      │
│     └──► Phases: PREP ──► BACKSWING_PEAK ──► DOWNSWING ──► IMPACT_WINDOW ──► RECOVERY│
│                                         │                                            │
│                                         ▼                                            │
│  [Body-Relative Kinematic Extractor & Dynamic Time Warping (DTW) Alignment Engine]   │
│                                         │                                            │
│                                         ▼                                            │
│  [Hierarchical Fault Evaluator (Provisional Heuristics + Coach Override Registry)]   │
└──────────────────┬────────────────────────────────────────────────┬──────────────────┘
                   │                                                │
                   ▼                                                ▼
┌──────────────────────────────────────────┐     ┌─────────────────────────────────────┐
│   GATE 2: INTERACTIVE COACHING STUDIO    │     │ GATE 3 & 4: AI & CLOUD EXTENSIONS   │
│                                          │     │                                     │
│  • 6-Stage CorrectiveLearningLoop UI     │     │ • Express Proxy (/api/diagnose,     │
│  • 2D Synchronized Video + Path Canvas   │     │   /api/retest-compare, /api/chat)   │
│  • 3D Three.js Skeleton Inspector        │     │ • Gemini 4 Argon (ThinkingLevel.HIGH│
│    with Collapsible Bottom HUD Dock      │     │   + Structured Abstention/Hypothesis│
│  • Expandable Evidence & Override Drawer │     │ • Gemini 3.8 Live Drill Audio Cues  │
│  • Local-First Repository (IndexedDB/LS) │     │ • Firebase Auth + Firestore Sync    │
└──────────────────────────────────────────┘     └─────────────────────────────────────┘
```

---

## 3. Core Domain & Epistemic Data Model

### 3.1 Epistemic Provenance Enum (`EvidenceProvenance`)
Every measurement, fault detection, and causal claim must carry one of four explicit provenance states:
- `OBSERVED`: Directly computed from visible video frames and high-confidence pose landmarks within validated camera perspective bounds.
- `INFERRED`: Derived from multi-joint kinematic relationships, 3D monocular world-landmark lifting, peak wrist-velocity impact estimation, or generative causal reasoning over observed metrics.
- `SIMULATED`: Illustrative 3D target posture demonstration or synthetic reference trajectory used for visual coaching comparison.
- `UNRESOLVED`: Insufficient frame rate, landmark occlusion, planar foreshortening, or unobservable physical quantity (e.g., racket-face angle through impact at 30 fps, grip pressure).

### 3.2 Core Persistent Entities
1. **`PhysicalVenue`**:
   - `venueId`, `venueType` (`'UNCALIBRATED_SPACE' | 'INTERNATIONAL_SINGLES' | 'NORTH_AMERICAN_HARDBALL' | 'DOUBLES_COURT' | 'CONVERTED_RACQUETBALL_HANDBALL' | 'SOLO_PRACTICE_WALL'`), `calibrationState` (`'BODY_RELATIVE_ONLY' | 'PARTIAL_WALL_REFERENCE' | 'CALIBRATED_HOMOGRAPHY'`), `notes`.
2. **`CourtConfiguration`**:
   - `configId`, `tinHeightMeters` (`0.48 | 0.43 | null`), `courtLinesVisible`, `wallMaterial`, `lightingCondition`.
3. **`PracticeProtocol`**:
   - `protocolId`, `strokeCategory` (`'FOREHAND' | 'BACKHAND' | 'VOLLEY' | 'DROP_BOAST'`), `shotSubType`, `feedType` (`'SHADOW_SWING' | 'GHOSTING' | 'SELF_DROP_FEED' | 'PARTNER_MANUAL_FEED' | 'SOLO_CONTINUOUS_DRIVE' | 'ESP32_LAUNCHER_FEED'`), `promptingMode` (`'COACHED_WITH_CUES' | 'UNPROMPTED_RETENTION' | 'VARIED_FEED_RETENTION'`), `targetRepetitionCount`.
4. **`HeuristicThresholdConfig`**:
   - `faultId`, `strokeCategory`, `movementPhase`, `bodyPartGroup`, `metricKey`, `operator` (`'<' | '>' | 'OUTSIDE_RANGE'`), `defaultThresholdValue`, `activeThresholdValue`, `unit`, `normalizationBasis` (`'TORSO_LENGTH' | 'SHOULDER_WIDTH' | 'HIP_WIDTH' | 'DEGREES' | 'PHASE_RATIO' | 'SECONDS'`), `provenance` (`'PROVISIONAL_COACH_HEURISTIC_V0.1' | 'COACH_OVERRIDE' | 'EMPIRICAL_SESSION_CALIBRATION'`), `updatedAt`, `coachOverrideNote`.
5. **`MovementObservation`**:
   - `observationId`, `assessmentId`, `repetitionIndex`, `startTimeSec`, `endTimeSec`, `frameCount`, `fps`, `frameIntervalMs`, `phaseFrames` (`prepStart`, `backswingPeak`, `downswingStart`, `impactEstimate`, `recoveryStart`, `recoveryEnd`), `referenceAnnotationComparison` (optional manual vs. automated frame delta for empirical validation), `meanLandmarkVisibility`, `perspectiveDiagnostic` (`torsoAspectRatio`, `planarConfidence`, `foreshorteningWarning`), `metrics` (record of computed body-relative variables with `EvidenceProvenance`), `landmarksTimeSeries`.
6. **`TechniqueFault`**:
   - `faultId`, `strokeCategory`, `movementPhase` (`'PREPARATION' | 'BACKSWING' | 'CONTACT' | 'FOOTWORK_LUNGE' | 'FOLLOW_THROUGH_RECOVERY'`), `bodyPart` (`'UPPER_LIMB' | 'TRUNK_CORE' | 'SPACING_WRIST' | 'LOWER_LIMB_FOOTWORK'`), `title`, `description`, `metricKey`, `observedMean`, `observedStdDev`, `affectedRepetitionIndices`, `totalRepetitions`, `heuristicSnapshot` (`HeuristicThresholdConfig`), `priorityScore` (6-factor rubric: `detectability`, `functionalSignificance`, `causalImportance`, `correctability`, `evidenceConfidence`, `testability`, `compositeScore`), `provenance` (`EvidenceProvenance`).
7. **`CausalHypothesis`**:
   - `hypothesisId`, `faultId`, `classification` (`'PRIMARY_ROOT_CAUSE' | 'DOWNSTREAM_SYMPTOM' | 'COMPETING_EXPLANATION'`), `statement`, `biomechanicalMechanism`, `supportingObservationIds`, `competingHypotheses` (`Array<{ title: string; mechanism: string; confidence: number; disambiguationTest: string }>`), `confidence` (`0.0` to `1.0`), `limitations`, `provenance` (`'INFERRED'`), `coachReviewStatus` (`'UNREVIEWED' | 'COACH_CONFIRMED' | 'COACH_AMENDED' | 'COACH_REJECTED'`), `coachAmendmentNote`.
8. **`CorrectiveIntervention`**:
   - `interventionId`, `faultId`, `hypothesisId`, `targetVariableKey`, `targetVariableLabel`, `currentObservedValue`, `targetHeuristicRange`, `plainLanguageExplanation`, `drillTitle`, `drillProtocolSteps`, `drillModality` (`'SHADOW_SWING' | 'GHOSTING' | 'MANUAL_BALL_FEED' | 'TARGET_PRACTICE' | 'LAUNCHER_FEED'`), `onCourtCue`, `adaptationContext` (`handedness`, `mobilityNotes`, `tacticalIntent`), `targetPose3DKeyframes`.
9. **`TechniqueAssessment`**:
   - `assessmentId`, `userId`, `createdAt`, `modelVersion`, `cvPipelineVersion`, `heuristicVersion`, `venue` (`PhysicalVenue`), `courtConfig` (`CourtConfiguration`), `protocol` (`PracticeProtocol`), `playerIntent` (`strokeCategory`, `handedness`, `subjectiveFeel`), `outcomeStatus` (`'DIAGNOSIS_READY' | 'ABSTAINED_INSUFFICIENT_EVIDENCE'`), `abstentionDetails` (optional `DiagnosticAbstention`), `observations` (`MovementObservation[]`), `detectedFaults` (`TechniqueFault[]`), `primaryFaultId`, `hypotheses` (`CausalHypothesis[]`), `selectedIntervention` (`CorrectiveIntervention | null`).
10. **`PracticeAttempt` & `CorrectionOutcome`**:
    - `attemptId`, `baselineAssessmentId`, `retestAssessmentId`, `interventionId`, `createdAt`, `dtwAlignmentScore`, `targetVariableBefore`, `targetVariableAfter`, `targetVariableDelta`, `targetVariableChanged` (`boolean`), `executionQualityImproved` (`boolean`), `repeatabilityRatio` (`number`), `newCompensationsDetected` (`TechniqueFault[]`), `recommendation` (`'PROCEED_TO_RETENTION' | 'CONTINUE_CURRENT_DRILL' | 'PIVOT_HYPOTHESIS' | 'ABSTAIN_RECAPTURE'`), `coachingSummary`.
11. **`RetentionAssessment`**:
    - `retentionId`, `userId`, `originalAssessmentId`, `interventionId`, `createdAt`, `sessionGapHours`, `promptingWithdrawn` (`boolean`), `feedVariationApplied` (`boolean`), `baselineMetricValue`, `immediateCoachedMetricValue`, `retentionMetricValue`, `retentionStatus` (`'RETAINED_HABIT_FORMING' | 'PARTIAL_REGRESSION' | 'REGRESSED_TO_HABIT' | 'INSUFFICIENT_EVIDENCE'`), `notes`.
12. **`PlayerTechniqueBaseline`**:
    - `baselineId`, `userId`, `handedness`, `updatedAt`, `strokeProfiles` (map of stroke category to habitual metric distributions, recurring fault history, failed interventions, and retained corrections).

---

## 4. Hierarchical Stroke-by-Phase Fault Taxonomy (Provisional Heuristics)

All thresholds are configurable in the `HeuristicRegistry` and carry `provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1'`:

1. **Forehand (`FOREHAND`)**
   - `FH-PREP-UL-01` (*Preparation / Upper Limb*): **Late / Low Racket Preparation** — Dominant wrist stays below elbow height for $>50\%$ of Prep phase; upper-arm elevation $<25^\circ$.
   - `FH-BACK-TC-01` (*Backswing / Trunk & Core*): **Insufficient Shoulder-Pelvis Coil** — Projected transverse shoulder-pelvis separation $<15^\circ$ at peak backswing.
   - `FH-CONT-SP-01` (*Contact / Spacing & Wrist*): **Cramped Lateral Ball Spacing** — Normalized horizontal wrist-to-hip spacing $<0.35 \times \text{torso length}$ at impact estimate.
   - `FH-CONT-TM-02` (*Contact / Longitudinal Timing*): **Trailing Contact Point Behind Lead Hip** — Dominant wrist longitudinal coordinate trails lead hip centroid at peak wrist velocity.
   - `FH-FOOT-LL-01` (*Footwork & Lunge / Lower Limb & Trunk*): **Excessive Forward Trunk Collapse on Lunge** — Trunk inclination angle relative to vertical $>42^\circ$ at minimum hip height.
   - `FH-REC-FW-01` (*Follow-Through & Recovery / Footwork*): **Delayed Post-Shot T-Recovery Impulse** — Center-of-mass recovery initiation $>0.75\text{ s}$ after impact window.

2. **Backhand (`BACKHAND`)**
   - `BH-PREP-UL-01` (*Preparation / Upper Limb & Scapula*): **Collapsed Across-Chest Elbow Preparation** — Hitting elbow-to-contralateral-shoulder distance $<0.28 \times \text{torso length}$ with wrist below elbow.
   - `BH-CONT-TC-01` (*Contact / Trunk & Core*): **Premature Chest Opening Before Impact** — Transverse shoulder line opens $>45^\circ$ toward front wall before peak wrist velocity.
   - `BH-FOOT-LL-01` (*Footwork & Lunge / Lower Limb*): **Over-Blocked / Crossed Lead Foot Stance** — Lead ankle lateral offset exceeds rear ankle by $>0.55 \times \text{hip width}$ with inward knee projection.

3. **Volley (`VOLLEY`)**
   - `VL-PREP-UL-01` (*Preparation / Upper Limb*): **Overswinging Backswing on Volley** — Dominant wrist retracts $>0.30 \times \text{torso length}$ behind posterior shoulder plane during volley prep.
   - `VL-FOOT-LL-01` (*Footwork & Contact / Lower Limb*): **Static / Flat-Footed Volley Strike** — Center-of-mass forward transfer $<0.08 \times \text{torso length}$ during volley execution.

4. **Drop & Boast (`DROP_BOAST`)**
   - `DB-PREP-UL-01` (*Preparation / Upper Limb*): **Telegraphed Low Preparation on Drop Shot** — Prep wrist-to-shoulder elevation drops $>25\%$ below player's drive baseline.
   - `DB-CONT-LL-01` (*Contact & Lunge / Lower Limb*): **Rising Out of Lunge During Delicate Contact** — Pelvis vertical centroid rises $>0.08 \times \text{torso length}$ during downswing-to-impact window.

---

## 5. Decoupled Hardware & Commercial Extensibility Interfaces

### 5.1 Optional ESP32 Squash Ball Launcher Interface (`LauncherProtocolAdapter`)
- Separates `CommandedFeedSettings` (`upperRollerRpm`, `lowerRollerRpm`, `yawDeg`, `pitchDeg`, `feedIntervalSec`, `randomizationMode`) from `ObservedBallTrajectory` (camera-observed or unresolved).
- **Safety Invariant**: Physical emergency stop (`E-STOP`), watchdog motor cutoff, and magazine interlock must operate in ESP32 firmware/hardware independently of browser connectivity, CV frame rate, or LLM inference. Not required for v0.1 operation.

### 5.2 Commercial Identity & Entitlement Boundary (`IdentityBillingAdapter`)
- Defines a clean adapter interface (`getCurrentActor()`, `getEntitlementTier()`, `canAccessFeature()`) supporting local anonymous coaching, Firebase Google Sign-In, and future BIDLR/BIDLLER centralized subscription federation without coupling core coaching logic to billing infrastructure.

# SwingF/X — Diagnose My Swing, and Fix It!

**SwingF/X** (`swingfx`) is a standalone AI-assisted squash technique coach that observes a player's swing repetitions via smartphone video or webcam, extracts quantitative pose and timing kinematics, formulates evidence-grounded diagnostic hypotheses with explicit uncertainty (or abstains when evidence is insufficient), prescribes a single testable corrective drill, and verifies whether the mechanical correction holds and persists across unprompted retention tests.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed product decisions and targeted architectural revisions govern the **SwingF/X v0.1** implementation:

- **Canonical Branding (`SwingF/X` / `swingfx`)**: **SwingF/X** is the canonical product name, UI wordmark, document title, and project metadata identifier, using `swingfx` for filesystem-safe slugs and artifact IDs.
- **CV-First Technical Gate Ordering**: Genuine video processing, MediaPipe Pose Landmarker extraction, repetition segmentation, and quantitative biomechanical extraction on actual squash footage constitute **Technical Gate 1**—executed and verified *before* introducing Firebase provisioning, paid-model dependencies, or conversational voice coaching.
- **Provisional Heuristic Thresholds & Coach Override**: All numerical thresholds in the fault taxonomy are explicitly modeled as **provisional, configurable coaching heuristics** (with recorded provenance, version, and author/source), never as fixed universal biomechanical laws. Coaches and advanced users can inspect, adjust, and override heuristic thresholds per player or session.
- **Empirical Validation Over Fixed Accuracy Claims**: All unverified fixed-precision claims (such as assumed angular or millisecond error bounds) are removed. Pose landmark stability and event-timing precision must be empirically evaluated against representative squash footage, manually annotated reference events, and camera-perspective sensitivity checks.
- **Diagnostic Abstention as a First-Class Success Outcome**: When landmark visibility, camera perspective, repetition count, or kinematic signal cannot support a specific correction with confidence, **SwingF/X** explicitly abstains (`ABSTAINED_INSUFFICIENT_EVIDENCE`) and requests a specific camera angle adjustment, additional repetitions, or human-coach review rather than forcing a speculative diagnosis.
- **Central Dogma Governance**: `DOCS/ARCHITECTURE.md` and `CHECKLIST.md` remain authoritative and frozen before writing application code, preserving machine-readable YAML frontmatter, `kstore` references, stateless `GLM-5.3` (`reasoning: disabled`) worker execution profiles, and deterministic verification gates.

---

## 1. Overview & Standalone v0.1 Product Definition (Deliverable 1)

### What It Does
SwingF/X intervenes early in recreational and club squash players' practice habits so flawed motor patterns are identified and corrected before they become deeply ingrained. Rather than overwhelming the player with a laboratory telemetry dashboard or arbitrary 0–100 technique scores, SwingF/X guides the player through a closed-loop **Corrective Learning Loop**:
$$\text{Observe} \longrightarrow \text{Detect} \longrightarrow \text{Diagnose (or Abstain)} \longrightarrow \text{Intervene} \longrightarrow \text{Retest} \longrightarrow \text{Validate} \longrightarrow \text{Retain}$$

### Target Audience & Context
- **Recreational & Club Squash Players**: Solo hit-and-practice players who record 3–6 swing repetitions on a smartphone tripod or court ledge and want one clear, actionable adjustment they can immediately test.
- **Squash Coaches & Advanced Players**: Users who inspect the expandable Biomechanics Evidence Drawer to review joint-angle trajectories, phase durations, competing root-cause hypotheses, heuristic threshold settings (with full coach override), and longitudinal retention history.

### Key Value & Non-Goals
- **Primary Value**: Identifies the single most consequential, correctable mechanical fault in a set of repetitions (or abstains honestly when video evidence is inadequate), distinguishes root causes from downstream compensations, prescribes one concrete drill and internal/external cue, and measures whether the target biomechanical variable changed on retest without introducing a secondary compensation.
- **Strict Non-Goals for v0.1**: Not a multi-sport platform, not a multi-player rally tactical analyzer, not a medical/injury diagnostic device, and does not fabricate unobservable metrics (such as string tension, exact ball-racket impact force, or metabolic load).

---

## 2. User Experience, Primary Journey & Visual Design (Deliverable 2)

### Primary 6-Stage User Journey (`Diagnose My Swing. And Fix It!`)

1. **Stage 1 — Show Me Your Swing (`Observe`)**
   - Immediate zero-configuration entry from the hero screen (`Diagnose My Swing. / And Fix It!`).
   - Player selects or records a set of 3–6 repetitions (Live Camera with framing guide, Upload Video, or Built-In Reference Swing Footage for immediate verification).
   - Optional quick context selectors: Stroke Type (`Forehand Drive`, `Backhand Drive`, `Volley`, `Drop`, `Boast`, `Racket Prep & Split-Step`), Handedness (`Right` / `Left`), and Subjective Feel (`Late on the ball`, `Ball drifting loose`, `Off-balance after lunge`, `Low power`, `Not sure`).
   - Interactive Camera Placement Guide illustrates optimal diagonal back-wall or side-gallery framing and warns when occlusion, frame rate, or perspective degrades observability.

2. **Stage 2 — Here's What I Notice (`Detect`)**
   - Displays synchronized video playback with 2D MediaPipe skeletal landmarks, wrist/elbow preparation trajectories, and automatic repetition segmentation markers (`Prep`, `Backswing Peak`, `Downswing`, `Impact Window`, `Follow-Through & Recovery`).
   - Interactive toggle switches between **2D Annotated Video** and the **3D Skeleton Inspector** (Three.js studio viewport with orbital camera, floor contact grid, and phase-locked joint angle arcs).
   - Highlights either:
     - The **single most consequential repeatable deviation** across the captured repetitions evaluated against configurable heuristic thresholds, OR
     - A clear **Diagnostic Abstention Notice** explaining why the footage cannot support a reliable measurement (e.g., severe landmark occlusion, extreme foreshortening, or fewer than 3 usable repetitions) along with specific re-recording guidance.

3. **Stage 3 — Here's What Might Be Causing It (`Diagnose`)**
   - Presents ranked `CausalHypothesis` cards separating **Primary Root-Cause Hypotheses** from **Downstream Symptoms**.
   - Every claim displays its **Evidence Provenance Tag** (`OBSERVED · INFERRED · SIMULATED · UNRESOLVED`), empirical confidence indicator, supporting repetition timestamps, heuristic provenance (`DEFAULT_COACH_HEURISTIC` vs. `COACH_OVERRIDE`), and **Competing Interpretations**.
   - Allows a human coach or player to inspect and override heuristic thresholds or confirm/amend/reject a hypothesis with full audit traceability.

4. **Stage 4 — Let's Fix That (`Intervene`)**
   - Prescribes **one principal coaching variable** to change at a time.
   - Displays a visual side-by-side target posture comparison in the 3D Skeleton Inspector (Player Habitual Pose vs. Corrective Target Pose).
   - Provides a concise **Practice Drill Card** and a memorable **On-Court Cue** adapted to handedness, mobility, and tactical intent.
   - Includes optional **Hands-Free Live Voice Coach (`gemini-3.8-live`)** audio cadence counts and preparation reminders during drill execution.

5. **Stage 5 — Try Again (`Retest & Validate`)**
   - Captures or loads post-intervention repetitions under the same protocol.
   - Runs Dynamic Time Warping (DTW) phase alignment to compare **Before (Baseline)** vs. **After (Retest)** in synchronized dual-video and 3D ghost-overlay playback.
   - Quantifies three distinct outcomes:
     1. *Did the target mechanical variable change?*
     2. *Did overall movement sequencing improve?*
     3. *Did a new compensatory fault appear?*
   - If the target variable did not improve or induced compensation, the loop branches to **Reconsider Hypothesis / Adjust Cue / Escalate to Coach**.

6. **Stage 6 — Did It Stick? (`Retain`)**
   - Evaluates **Retained Technique** vs. **Immediate Coached Performance**.
   - Offers an **Unprompted Retention Test** mode (silent capture without coaching prompts, delayed session check-in, or varied feed demands).
   - Logs longitudinal progression across `Habitual Baseline` $\rightarrow$ `Coached Shift` $\rightarrow$ `Unprompted Retention`.

### Visual Identity & Theme (`Warm Athletic Club Coach`)
- **Aesthetic Direction**: Approachable, authoritative squash club coaching notebook meets precision sports biomechanics studio. Clean daylight-first canvas with high-contrast video viewports and zero pseudo-technical clutter.
- **60-30-10 Color Palette**:
  - **60% Dominant Neutral Canvas**: Warm Court Parchment (`#FBF9F5`) for main coaching workspace; Deep Charcoal Court (`#111318`) strictly inside video/3D inspection viewports.
  - **30% Structural Surfaces**: Warm Alabaster cards (`#F3EFE6`), Crisp Hairline dividers (`#E2DDD2`), and Deep Slate prose (`#18181B` primary, `#52525B` secondary).
  - **10% Accent Budget**: Squash Maple / Terracotta (`#C84B31`) for primary coaching CTAs and target focus markers; Court Line Emerald (`#15803D`) for verified mechanical improvement; Caution Amber (`#B45309`) for diagnostic abstention, competing hypotheses, or partial occlusion warnings.
- **Typography & Hierarchy (2+1 Font Rule)**:
  - *Display / Coaching Headlines*: `Plus Jakarta Sans` (SemiBold/Bold, tight tracking, `text-wrap: balance`).
  - *Body & Coaching Explanations*: `DM Sans` (Regular/Medium, 15px–16px, comfortable 65ch reading measure).
  - *Biomechanical Angles, Phase Timings & Provenance Codes*: `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
- **Top Bar Contract & Layout Discipline**:
  - Strict 3-zone header: `SwingF/X` wordmark on the left — 4 single-line navigation links (`Coaching Loop`, `Before & After`, `Retention Log`, `Coach Chat`) in the center — 1 primary action button (`New Swing Check`) on the right.
  - Zero static pill badges: all metadata (`OBSERVED · 5 Reps · Forehand Drive · Heuristic v0.1`) rendered as clean unboxed inline typography with `·` separators.
  - Expandable **Biomechanics Evidence Drawer**: Kept tucked below the primary coaching card by default so players see one focused instruction first, while coaches and analytical players can expand the full joint-angle time-series, heuristic threshold configurator, DTW alignment curve, and JSON provenance at a click.

---

## 3. Evidence-Grounded Diagnostic Architecture & Abstention Logic (Deliverable 3)

### Separation of Deterministic Kinematics, Configurable Heuristics, and Generative Interpretation
SwingF/X enforces a strict boundary between **deterministic numerical measurement** (computed in TypeScript from MediaPipe landmarks), **provisional heuristic evaluation** (configurable threshold tables with coach override), and **generative diagnostic reasoning** (performed by Gemini models over structured JSON observations):

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                   GATE 1: CLIENT DETERMINISTIC VIDEO & CV ENGINE                  │
│                                                                                   │
│  [Live Camera / Uploaded Video / Representative Squash Footage]                   │
│         │                                                                         │
│         ▼                                                                         │
│  [MediaPipe Pose Landmarker (33 3D World + 2D Normalized Landmarks)]              │
│         │                                                                         │
│         ▼                                                                         │
│  [Temporal Smoother, Camera-Perspective Validator & Empirical Quality Gate]       │
│         │                                                                         │
│         ├──► (Insufficient Visibility / Perspective / Reps)                       │
│         │            │                                                            │
│         │            ▼                                                            │
│         │    [DIAGNOSTIC ABSTENTION: Request Angle / Reps / Coach Input]          │
│         │                                                                         │
│         ▼ (Sufficient Evidence Quality)                                           │
│  [Repetition & Phase Segmenter] ──► (Prep │ Backswing │ Downswing │ Impact │ Rec) │
│         │                                                                         │
│         ▼                                                                         │
│  [Body-Relative Kinematic Extractor & DTW Phase Alignment Engine]                 │
│         │                                                                         │
│         ▼                                                                         │
│  [Provisional Heuristic Fault Evaluator (Configurable + Coach Override)]          │
└─────────┬─────────────────────────────────────────────────────────┬───────────────┘
          │ Structured Kinematic JSON + Heuristic Provenance        │
          ▼                                                         ▼
┌─────────────────────────────────────────┐       ┌─────────────────────────────────┐
│   GATE 2: OPTIONAL AI & CLOUD SERVICES  │       │   CLIENT: 2D/3D VISUALIZATION   │
│                                         │       │                                 │
│  • POST /api/diagnose (gemini-4-argon   │       │  • 2D Synchronized Video Canvas │
│    + ThinkingLevel.HIGH + Abstention)   │       │  • 3D Three.js Skeleton Studio  │
│  • POST /api/retest-compare             │       │    with Collapsible Bottom Dock │
│  • POST /api/chat (Argon/Flash/Lite)    │       │  • Heuristic Override Controls  │
│  • WS   /api/live (gemini-3.8-live)     │       │  • Before/After DTW Scrubber    │
│  • Firebase Auth + Firestore Sync       │       │  • Expandable Evidence Drawer   │
└─────────────────────────────────────────┘       └─────────────────────────────────┘
```

### First-Class Diagnostic Abstention Protocol
Diagnostic abstention (`outcomeStatus: 'ABSTAINED_INSUFFICIENT_EVIDENCE'`) is treated as a **valid, successful system outcome** rather than an error state. The pipeline triggers abstention whenever:
1. **Landmark Visibility Gate**: Key joints required for the stroke phase fall below the minimum visibility confidence threshold across $>30\%$ of phase frames.
2. **Repetition Count Gate**: Fewer than 2 segmentable repetitions are detected, preventing distinction between a one-off mishit and a recurring pattern.
3. **Perspective & Foreshortening Gate**: The camera viewing angle creates severe planar foreshortening for the target angle (e.g., attempting to measure sagittal lunge trunk lean from directly overhead or extreme front-on occlusion).
4. **Ambiguous / Conflicting Signal Gate**: Competing hypotheses have overlapping low confidence without a safe single-variable test drill.

When abstention occurs, SwingF/X outputs:
- Exact reason for abstention (`OBSERVED` / `UNRESOLVED` provenance).
- Concrete remedial action: **Recommended Camera Repositioning Diagram**, **Additional Repetition Request**, or **Flag for Human Coach Review**.

---

## 4. Hierarchical Squash Technique-Fault Taxonomy (Deliverable 4)

All numerical thresholds below are **provisional, configurable coaching heuristics (`provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1'`)** normalized to body proportions where appropriate. Every threshold is stored in a `HeuristicThresholdConfig` record that supports real-time **Coach Override** and logs the exact threshold version used during each assessment.

### A. Forehand Stroke (`strokeCategory: 'FOREHAND'`)

| Movement Phase & Body Part | Fault ID & Name | Brief Description | Provisional Heuristic Indicator *(Configurable / Overridable)* | Plausible Root Causes (`CausalHypothesis`) | Downstream Symptoms |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation**<br>*(Upper Limb: Shoulder, Elbow, Wrist)* | **`FH-PREP-UL-01`**<br>*Late / Low Racket Preparation* | Player approaches the ball with the racket hand hanging below the elbow and minimal shoulder abduction during the first half of the preparation phase. | Dominant wrist vertical coordinate remains below elbow height across $>50\%$ of Prep phase; upper-arm elevation angle $<25^\circ$ (provisional heuristic). | • Delayed split-step or late ball-read off front wall.<br>• Habitual "pancake" low backswing loop.<br>• Rushed approach footwork. | Rushed downswing; late contact behind lead hip; compensatory wrist flick. |
| **2. Backswing**<br>*(Trunk & Core: Thorax, Pelvis, Guide Arm)* | **`FH-BACK-TC-01`**<br>*Insufficient Shoulder-Pelvis Coil* | Upper torso fails to rotate toward the side wall relative to the pelvis during backswing set, resulting in an arm-dominated swing. | Projected transverse shoulder-to-pelvis alignment delta remains $<15^\circ$ at peak backswing (provisional heuristic; perspective-dependent). | • Opening chest to front wall prematurely during approach.<br>• Non-dominant balance arm dropping lifelessly to waist. | Reduced shot pace; inconsistent length; excessive anterior shoulder effort. |
| **3. Contact**<br>*(Spacing & Upper Limb: Lead Hip, Elbow, Wrist)* | **`FH-CONT-SP-01`**<br>*Cramped Lateral Ball Spacing* | Player over-runs the ball laterally, pinning the hitting elbow against the ribcage during the impact window. | Normalized horizontal wrist-to-hip distance $<0.35 \times \text{torso length}$ at peak wrist velocity frame (provisional heuristic). | • Misjudging ball rebound speed off side wall.<br>• Omitting short final adjustment spacer step.<br>• Late racket preparation forcing close stance. | Jammed swing path; steep upward scooping trajectory; ball clinging to side wall. |
| **3. Contact**<br>*(Longitudinal Timing: Lead Knee, Hip, Wrist)* | **`FH-CONT-TM-02`**<br>*Trailing Contact Point Behind Lead Hip* | Impact window occurs after the ball has passed behind the player's lead hip/knee plane. | Dominant wrist longitudinal position trails lead hip centroid at estimated peak downswing velocity (provisional heuristic). | • Late racket preparation (`FH-PREP-UL-01`).<br>• Closed stance planted too late.<br>• Waiting for ball to drop too low. | Ball pushed cross-court into middle or tin; loss of drop/drive deception. |
| **4. Footwork & Lunge**<br>*(Lower Limb & Trunk: Lead Knee, Hip, Spine)* | **`FH-FOOT-LL-01`**<br>*Excessive Forward Trunk Collapse on Lunge* | Upper body pitches steeply forward over the lead knee at lunge bottom instead of absorbing load through hip/knee flexion. | Trunk inclination from vertical exceeds $42^\circ$ at minimum hip height (provisional heuristic). | • Reaching for ball instead of taking an extra approach step.<br>• Insufficient eccentric hip/quad deceleration.<br>• Late heel plant on braking step. | Slow multi-step recovery to the T; unstable head position during strike. |
| **5. Follow-Through & Recovery**<br>*(Full Body Center of Mass & Footwork)* | **`FH-REC-FW-01`**<br>*Delayed Post-Shot T-Recovery Impulse* | Player lingers in the corner after follow-through completion rather than rebounding immediately toward the T. | Normalized center-of-mass return initiation exceeds $0.75\text{ s}$ after peak wrist velocity frame (provisional heuristic). | • Unbalanced lunge posture (`FH-FOOT-LL-01`).<br>• Over-rotating follow-through toward back corner.<br>• Ball-watching after impact. | Late arrival at T; chronic rushed preparation on subsequent shot. |

### B. Backhand Stroke (`strokeCategory: 'BACKHAND'`)

| Movement Phase & Body Part | Fault ID & Name | Brief Description | Provisional Heuristic Indicator *(Configurable / Overridable)* | Plausible Root Causes (`CausalHypothesis`) | Downstream Symptoms |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation**<br>*(Upper Limb & Scapula: Lead Shoulder, Elbow)* | **`BH-PREP-UL-01`**<br>*Collapsed Across-Chest Elbow Preparation* | Hitting elbow is pinned flat across the lower chest with the wrist dropped, rather than creating a compact high backhand diamond frame. | Hitting elbow-to-contralateral-shoulder normalized distance $<0.28 \times \text{torso length}$ with wrist below elbow at backswing set (provisional heuristic). | • Turning shoulders too late when moving to backhand side.<br>• Lifting racket purely with wrist instead of scapular/shoulder turn. | Chopping downward plane; weak backhand length; inability to hit crisp crosscourt. |
| **2. Contact**<br>*(Trunk & Spacing: Spine Axis, Lead Foot, Wrist)* | **`BH-CONT-TC-01`**<br>*Premature Chest Opening Before Impact* | Player pulls the rear shoulder and chest open toward the front wall before the hitting arm reaches the impact window. | Transverse shoulder line rotates past $45^\circ$ toward front wall prior to peak wrist velocity frame (provisional heuristic). | • Trying to muscle the ball with trunk pull instead of forearm/shoulder release.<br>• Cramped lateral distance from ball. | Ball sprayed loose into middle of court; loss of straight backhand rail accuracy. |
| **3. Footwork & Lunge**<br>*(Lower Limb: Lead Foot Alignment & Knee)* | **`BH-FOOT-LL-01`**<br>*Over-Blocked / Crossed Lead Foot Stance* | Lead foot steps excessively across toward the side wall with knee collapsing inward, locking hip rotation on exit. | Lead ankle lateral offset exceeds rear ankle by $>0.55 \times \text{hip width}$ with valgus knee projection (provisional heuristic). | • Entering backhand corner on a single long lunging stride without split adjustment.<br>• Poor distance estimation from side wall. | Trapped in backhand corner; blocked follow-through path; slow recovery step. |

### C. Volley (`strokeCategory: 'VOLLEY'`)

| Movement Phase & Body Part | Fault ID & Name | Brief Description | Provisional Heuristic Indicator *(Configurable / Overridable)* | Plausible Root Causes (`CausalHypothesis`) | Downstream Symptoms |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation**<br>*(Upper Limb: Wrist & Elbow Compactness)* | **`VL-PREP-UL-01`**<br>*Overswinging Backswing on Volley* | Player takes a full groundstroke backswing behind the torso plane when intercepting a fast volley on the T. | Dominant wrist retracts behind posterior shoulder line by $>0.30 \times \text{torso length}$ during volley prep (provisional heuristic). | • Failing to shorten preparation for high-pace mid-court interception.<br>• Late split-step reaction on the T. | Late contact behind body; ball framed or hit into tin. |
| **2. Footwork & Contact**<br>*(Lower Limb: Split-Step & Weight Transfer)* | **`VL-FOOT-LL-01`**<br>*Static / Flat-Footed Volley Strike* | Player reaches for the volley with arms only while feet remain planted flat without forward weight transfer. | Center-of-mass horizontal displacement $<0.08 \times \text{torso length}$ during downswing-to-impact window (provisional heuristic). | • Skipping the pre-shot micro split-step.<br>• Reacting late to opponent's boast or crosscourt. | Arm-only punch lacking depth; loss of balance when stretching wide. |

### D. Drop & Boast (`strokeCategory: 'DROP_BOAST'`)

| Movement Phase & Body Part | Fault ID & Name | Brief Description | Provisional Heuristic Indicator *(Configurable / Overridable)* | Plausible Root Causes (`CausalHypothesis`) | Downstream Symptoms |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation & Deception**<br>*(Upper Limb & Trunk Posture)* | **`DB-PREP-UL-01`**<br>*Telegraphed Low Preparation on Drop Shot* | Player drops the racket head early during approach instead of matching their standard drive preparation posture. | Prep-phase wrist-to-shoulder elevation drops $>25\%$ below player's recorded drive baseline (provisional heuristic). | • Treating the drop shot as a gentle push rather than shaping from a standard high set.<br>• Rushing to decelerate early. | Opponent reads the drop immediately and moves forward effortlessly. |
| **2. Contact & Lunge**<br>*(Lower Limb & Head Stability)* | **`DB-CONT-LL-01`**<br>*Rising Out of Lunge During Delicate Contact* | Player lifts the hips and head upward during the impact window of a front-court drop or recovery boast. | Pelvis centroid vertical coordinate rises $>0.08 \times \text{torso length}$ during downswing-to-impact window (provisional heuristic). | • Anxiousness to recover to the T before completing the stroke.<br>• Insufficient front-leg stability in deep lunge. | Ball pops up high above the tin or clips the tin directly. |

---

## 5. Corrective-Learning & Retention Data Model (Deliverable 5)

All entities are strongly typed in TypeScript, validated against JSON Schema in `firebase-blueprint.json`, and work both **locally in browser storage (IndexedDB/LocalStorage for offline/Gate 1 operation)** and **synced with Firestore (Gate 2)** with full provenance metadata (`modelVersion`, `algorithmVersion`, `heuristicConfigVersion`, `cameraMetadata`, `evidenceState: 'OBSERVED' | 'INFERRED' | 'SIMULATED' | 'UNRESOLVED'`).

- **`HeuristicThresholdConfig`**: Stores provisional coaching thresholds per fault ID, including `defaultValue`, `currentValue`, `unit`, `normalizationBasis`, `provenanceSource` (`'PROVISIONAL_COACH_HEURISTIC_V0.1' | 'COACH_OVERRIDE' | 'EMPIRICAL_CALIBRATION'`), `overriddenByCoachId`, and `overrideRationale`.
- **`PlayerTechniqueBaseline`**: Captures the player's habitual movement distributions (`habitualMetrics` per stroke), handedness, anatomical normalization ratios, and historical recurring faults—explicitly separated from `EffectiveTechnique` reference ranges.
- **`TechniqueAssessment`**: Complete session record linking video metadata, `PhysicalVenue`, `CourtConfiguration`, `PracticeProtocol`, extracted `MovementObservation[]`, detected `TechniqueFault[]` (or `DiagnosticAbstention`), ranked `CausalHypothesis[]`, and selected `CorrectiveIntervention`.
- **`MovementObservation`**: Frame-indexed and repetition-segmented kinematic time series (33 3D/2D landmarks, joint angles, angular velocities, DTW warp paths, per-joint visibility confidence, and empirical camera-perspective quality flags).
- **`TechniqueFault`**: Structured deviation record specifying the stroke category, movement phase, body part, target metric, observed distribution across repetitions, active heuristic threshold and provenance, 6-factor priority score, and `EvidenceProvenance`.
- **`CausalHypothesis`**: Connects a primary `TechniqueFault` to upstream root causes and downstream symptoms, recording supporting observations, **competing hypotheses**, confidence score, human-coach confirmation status (`'UNREVIEWED' | 'COACH_CONFIRMED' | 'COACH_AMENDED' | 'COACH_REJECTED'`), and disambiguation tests.
- **`CorrectiveIntervention`**: Single-variable coaching prescription (`targetVariable`, `targetDirection`, `targetHeuristicRange`, `drillProtocol`, `coachingCue`, `visualTargetPose3D`, and adaptation notes).
- **`PracticeAttempt` & `CorrectionOutcome`**: Captures post-intervention retest repetitions, DTW delta comparison against pre-intervention observations, evaluation of (`targetVariableChanged`, `executionQualityImproved`, `repeatabilityRatio`, `newCompensationsDetected`), and next-step decision (`'PROCEED_TO_RETENTION' | 'CONTINUE_DRILL' | 'PIVOT_HYPOTHESIS' | 'ABSTAIN_REQUEST_BETTER_VIDEO'`).
- **`RetentionAssessment`**: Evaluates whether a correction persists in unprompted conditions (no live voice cadence, delayed session, or varied feeds), distinguishing **Immediate Coached Performance** from **Retained Motor Learning**.
- **Optional Future Hardware & Commercial Interfaces**:
  - `BallLauncherFeedCommand` & `ObservedBallTrajectory`: Hardware-independent interface for an optional DIY ESP32 squash ball launcher, separating commanded feed settings from observed trajectories with independent physical E-stop requirements.
  - `IdentityBillingAdapter`: Clean provider interface compatible with future BIDLR/BIDLLER centralized authentication and tier entitlements.

---

## 6. Realistic Assessment of Smartphone Video Observability & Empirical Validation Plan (Deliverable 6)

SwingF/X avoids unsupported claims of fixed angular or millisecond precision and requires **empirical validation** across camera perspectives and frame rates:

| Biomechanical Feature | Observability Classification | Empirical Factors Governing Reliability | SwingF/X v0.1 Handling & Abstention Strategy |
| :--- | :--- | :--- | :--- |
| **Trunk Inclination, Lunge Posture & Stance Width** | **Directly Observable (`OBSERVED`)** under appropriate framing | Depends on full-body visibility, lighting contrast, and sagittal/diagonal camera perspective; degrades under severe foreshortening or back-wall glass reflections. | Computed from hip, knee, ankle, and shoulder landmarks normalized by torso length; triggers perspective warning or abstention if landmark visibility drops. |
| **Racket-Prep Elbow Elevation & Wrist-to-Shoulder Height Ratio** | **Directly Observable (`OBSERVED`)** during preparation phase | Preparation phase involves lower limb velocity than downswing, reducing motion blur at 30–60 fps; requires unobstructed view of dominant arm. | Primary v0.1 metric for `FH-PREP-UL-01` and `BH-PREP-UL-01`; verified across multiple repetitions before flagging a fault. |
| **Transverse Shoulder-to-Pelvis Coil & Spacing** | **Model-Derived (`INFERRED`)** | Monocular 3D world landmarks and 2D projections sensitive to camera azimuth/elevation angle. | Tagged as `INFERRED`; includes camera-angle sensitivity metadata and requires multi-rep consistency. |
| **Relative Phase Sequence & Recovery Initiation** | **Frame-Quantized (`OBSERVED` / `INFERRED`)** | Bounded by video frame interval ($\Delta t = 1/f_s$, plus rolling-shutter and motion-blur uncertainty during fast downswing). | Reported in frames and normalized phase percentages alongside frame-rate metadata; validated against manually annotated keyframes on reference clips. |
| **Exact Racket-Face Orientation (Open/Closed) at Impact** | **Unobservable in Standard 30–60 fps Pose (`UNRESOLVED`)** | High racket-head speed through a brief impact window causes severe motion blur; standard body-pose models lack racket-frame keypoints. | **Never claimed as measured.** Marked `UNRESOLVED` unless dedicated high-speed racket tracking is added; only explored as a conditional hypothesis if user reports tin/out outcomes. |
| **Subtle Wrist Snap, Forearm Pronation & Grip Pressure** | **Unobservable (`UNRESOLVED`)** | Distal hand keypoints blur during downswing; grip tension is kinetic/internal. | Never fabricated as a numeric metric; coaching cues may suggest grip relaxation as a behavioral experiment. |
| **Internal Joint Forces, Tissue Loads & Injury Diagnosis** | **Strictly Out of Scope** | Requires laboratory force plates, inverse dynamics, and clinical exam. | **Hard architectural block**: never output force/torque numbers, metabolic estimates, or medical diagnoses. |

### Empirical Validation Protocol for v0.1
1. **Annotated Reference Events**: Each built-in reference swing sequence includes human-annotated frame indices for `Split-Step`, `Peak Backswing`, `Impact Window`, and `Recovery Initiation` so the automated segmenter's frame discrepancy can be inspected directly in the Evidence Drawer.
2. **Camera-Perspective Sensitivity Checks**: The CV pipeline computes torso aspect-ratio and landmark confidence diagnostics on every video to detect when camera perspective invalidates planar angle comparisons, automatically triggering diagnostic abstention when out of bounds.

---

## 7. Revised Implementation Milestone Sequence — CV-First Vertical Slice (Deliverable 7)

1. **Milestone 1 — Central Dogma Specifications (`DOCS/ARCHITECTURE.md` & `CHECKLIST.md`)**
   - Author the authoritative specification in `DOCS/ARCHITECTURE.md` and the frozen, dependency-ordered task recipe in `CHECKLIST.md` with machine-readable YAML frontmatter (`project_id: "swingfx"`, artifact revisions, `kstore` references, stateless `GLM-5.3` worker profiles with reasoning disabled, and verification gates).
   - Update `metadata.json` and `index.html` with canonical **SwingF/X** branding.

2. **Milestone 2 — Technical Gate 1: Real Video Processing, Pose Extraction & Quantitative Biomechanics (Local-First)**
   - Stand up the React + TypeScript application and implement the deterministic client-side computer-vision pipeline (`@mediapipe/tasks-vision` Pose Landmarker, temporal smoothing, repetition/phase segmenter, body-relative kinematic extractor, and DTW phase alignment).
   - Bundle real multi-repetition squash footage / testable reference sequences with ground-truth phase annotations so pose extraction, repetition segmentation, heuristic fault evaluation (with Coach Override UI), and **Diagnostic Abstention** can be empirically verified before any cloud or LLM dependency is invoked.

3. **Milestone 3 — 2D Annotated Video Overlay, 3D Skeleton Inspector & Before/After Retest Loop**
   - Build the 6-stage **SwingF/X** Corrective Learning Loop UI (`Show Me Your Swing` $\rightarrow$ `Here's What I Notice` $\rightarrow$ `Here's What Might Be Causing It` $\rightarrow$ `Let's Fix That` $\rightarrow$ `Try Again` $\rightarrow$ `Did It Stick?`).
   - Implement the synchronized 2D Canvas overlay, the Three.js 3D Skeleton Inspector with collapsible bottom HUD dock, the expandable Biomechanics Evidence Drawer (with heuristic threshold override controls), and the Before/After DTW Retest comparator with local persistence.

4. **Milestone 4 — Technical Gate 2: Gemini 4 Argon Diagnostic Interpretation & Multi-Turn Coaching**
   - Configure paid Gemini model access (`gemini-4-argon` with `ThinkingLevel.HIGH`) and Express server proxy routes (`/api/diagnose`, `/api/retest-compare`, `/api/chat`, `/api/live`).
   - Connect structured kinematic observations and phase keyframes to `gemini-4-argon` for evidence-grounded hypothesis ranking, abstention-aware coaching explanations, multi-turn Coach Chat (`gemini-4-argon` / `gemini-3.8-flash` / `gemini-3.1-flash-lite`), and hands-free `gemini-3.8-live` drill audio cues.

5. **Milestone 5 — Technical Gate 3: Firebase Auth, Firestore Longitudinal Persistence & Final Verification**
   - Provision Firebase Authentication (Google Sign-In) and Firestore (`firebase-blueprint.json` + hardened `firestore.rules`), syncing local assessments, custom coach heuristic overrides, retest outcomes, and unprompted retention tests to the cloud while maintaining full offline/local fallback.

---

## 8. Architecture & Checklist Creation and Verification Plan (Deliverable 8)

### Central Dogma Workflow (`Specification → DOCS/ARCHITECTURE.md → CHECKLIST.md → Implementation`)
- **`DOCS/ARCHITECTURE.md`**:
  - Machine-readable YAML frontmatter with `project_id: "swingfx"`, `canonical_name: "SwingF/X"`, `artifact_id: "arch-swingfx-v0.1"`, `architecture_revision`, `source_commit`, `kstore_refs`, `agent_execution_profile` (`model: "glm-5.3"`, `reasoning_enabled: false`, `temperature: 0.0`, `stateless_worker: true`), and formal `invariants`.
  - Complete specification of the 10 core data entities (including `HeuristicThresholdConfig` and `DiagnosticAbstention`), epistemic provenance state machine (`OBSERVED | INFERRED | SIMULATED | UNRESOLVED`), hierarchical stroke-to-phase fault taxonomy, empirical validation protocol, and hardware/commercial extensibility interfaces.
- **`CHECKLIST.md`**:
  - Machine-readable YAML frontmatter linking to `arch-swingfx-v0.1` with a topological DAG of stateless tasks ordered strictly by the CV-First gate sequence (`GATE-0: Spec Freeze` $\rightarrow$ `GATE-1: Video & Pose Extraction` $\rightarrow$ `GATE-2: Corrective Loop UI & 3D Inspector` $\rightarrow$ `GATE-3: Gemini Diagnostic & Live Proxy` $\rightarrow$ `GATE-4: Firebase Persistence & Rules Audit`).

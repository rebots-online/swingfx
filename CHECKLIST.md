---
project_id: "swingfx"
canonical_name: "SwingF/X"
artifact_id: "checklist-swingfx-v0.1.0"
artifact_type: "frozen_implementation_checklist"
document_revision: "2"
architecture_revision: "swingfx-architecture-r2"
parent_architecture_artifact: "arch-swingfx-v0.1.0"
source_commit_id: "5f134ad89fb7336c52445db0fb58c8cf45b5737f"
updated_at: "2026-10-14T11:20:20-04:00"
change_request: "SWINGFX-VERSION-001"
application_version_source: "version.txt"
application_version_runtime_mirror: "version.json"
allowed_change_scope: ["versioning", "release_badge", "assessment_build_identity"]
verification_evidence: "Recorded below after execution; original task statuses are inherited, not re-certified."
created_at: "2026-10-13T22:34:00-07:00"
status: "FROZEN_FOR_EXECUTION"
kstore_refs:
  - "kstore://swingfx/biomechanics/mediapipe-pose-33-topology-v1"
  - "kstore://swingfx/taxonomy/squash-stroke-phase-fault-heuristics-v0.1"
  - "kstore://swingfx/learning/corrective-motor-learning-loop-v1"
  - "kstore://swingfx/epistemology/evidence-provenance-abstention-v1"
agent_execution_profile:
  worker_model: "glm-5.3"
  reasoning_enabled: false
  temperature: 0.0
  stateless_task_isolation: true
  orchestrator_protocol: "ACP-1.0"
tasks:
  - task_id: "TASK-008-VERSION"
    gate: "GATE-VERSION-IDENTITY"
    title: "Adopt canonical build stamping and bottom-right application version"
    depends_on: ["TASK-005"]
    owner_role: "stateless_glm_worker_agent"
    status: "READY"
    inputs:
      - "DOCS/ARCHITECTURE.md#6-canonical-build-identity-and-bottom-right-version-display"
      - "Admin-Manual/versioning/update-version.sh (blob 638f18c47064bd6a7a96405ded7b82eee26de306)"
    outputs:
      - "scripts/update-version.sh"
      - "version.txt"
      - "version.json"
      - "package.json"
      - "tsconfig.json"
      - "src/App.tsx"
      - "src/index.css"
      - "src/services/diagnosticEngine.ts"
    execution_recipe:
      - "Read frozen architecture section 6; copy the existing stamper and fill in SwingF/X product identity."
      - "Add a preflight jq dependency check without changing the canonical version algorithm."
      - "Seed version.txt at major 1/minor 0; connect predev/prebuild and explicit version:update."
      - "Enable JSON imports and bind the badge and assessment build metadata to version.json."
      - "Remove hardcoded app-release labels; reserve bottom spacing and safe-area offsets."
      - "Run scoped verification; record evidence and commit only documented changes."
    acceptance_criteria:
      - "Each unlocked stamper invocation increments MINOR; BUILD has exactly five digits."
      - "version.txt, version.json.version, and package.json.version agree after stamping."
      - "release.lock preserves one identity across repeated stamps."
      - "The visible label reads vMAJOR.MINOR.BUILD at the viewport bottom right on desktop/mobile."
      - "CV assessment build identity comes from version.json; diagnostic calculations remain unchanged."
    verification_procedure: "bash -n scripts/update-version.sh; isolated stamper increment/lock check; npm run lint; npm run build; desktop/mobile render inspection"

  - task_id: "TASK-001"
    gate: "GATE-0-DOGMA"
    title: "Initialize SwingF/X project metadata, dependencies, and TypeScript domain contracts"
    depends_on: []
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "DOCS/ARCHITECTURE.md"
      - "metadata.json"
      - "index.html"
    outputs:
      - "metadata.json"
      - "index.html"
      - "src/types/swingfx.ts"
      - "src/config/heuristics.ts"
    acceptance_criteria:
      - "Canonical name SwingF/X is reflected in metadata.json and index.html."
      - "All 12 core entities and EvidenceProvenance states are strictly typed in src/types/swingfx.ts."
      - "Hierarchical fault taxonomy (Forehand, Backhand, Volley, Drop/Boast -> Phase/Body Part) is defined with PROVISIONAL_COACH_HEURISTIC_V0.1 provenance and runtime Coach Override support."
    verification_procedure: "npx tsc --noEmit"

  - task_id: "TASK-002"
    gate: "GATE-1-CV-EXTRACTION"
    title: "Implement deterministic squash video synthesis/loader, MediaPipe Pose Landmarker wrapper, and empirical perspective gate"
    depends_on: ["TASK-001"]
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "src/types/swingfx.ts"
      - "src/config/heuristics.ts"
    outputs:
      - "src/services/videoReferenceGenerator.ts"
      - "src/services/poseEngine.ts"
    acceptance_criteria:
      - "Supports live camera stream, uploaded video file decoding, and real canvas-rendered squash swing video sequences with ground-truth phase annotations for immediate empirical verification."
      - "MediaPipe Pose Landmarker extracts 2D normalized and 3D world landmarks per frame with graceful fallback and zero fabricated unobservable metrics."
      - "Computes empirical perspective diagnostics (landmark visibility, torso aspect ratio, foreshortening check) and triggers DiagnosticAbstention when footage is insufficient."
    verification_procedure: "npx tsc --noEmit"

  - task_id: "TASK-003"
    gate: "GATE-1-CV-EXTRACTION"
    title: "Implement repetition segmentation, body-relative kinematic extraction, DTW alignment, and heuristic fault evaluator"
    depends_on: ["TASK-002"]
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "src/types/swingfx.ts"
      - "src/config/heuristics.ts"
      - "src/services/poseEngine.ts"
    outputs:
      - "src/services/kinematicsEngine.ts"
      - "src/services/dtwEngine.ts"
      - "src/services/diagnosticEngine.ts"
    acceptance_criteria:
      - "Segments multi-repetition squash footage into individual repetitions and 5 movement phases (PREP, BACKSWING_PEAK, DOWNSWING, IMPACT_WINDOW, RECOVERY) and computes residuals against annotated reference keyframes."
      - "Normalizes linear measurements by torso length, shoulder width, or hip width without requiring regulation court calibration."
      - "Evaluates configurable heuristics, ranks faults via the 6-factor rubric, preserves competing causal hypotheses, and returns ABSTAINED_INSUFFICIENT_EVIDENCE when warranted."
    verification_procedure: "npx tsc --noEmit"

  - task_id: "TASK-004"
    gate: "GATE-2-CORRECTIVE-LOOP-UI"
    title: "Build 2D Synchronized Video Overlay Canvas and 3D Three.js Skeleton Inspector with collapsible bottom dock"
    depends_on: ["TASK-003"]
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "src/types/swingfx.ts"
      - "src/services/kinematicsEngine.ts"
    outputs:
      - "src/components/VideoPoseCanvas.tsx"
      - "src/components/SkeletonInspector3D.tsx"
    acceptance_criteria:
      - "2D canvas renders synchronized video frames, MediaPipe bone connections, wrist preparation trajectory trail, and joint-angle callouts."
      - "3D Three.js viewport uses RoomEnvironment PBR lighting, renders habitual vs. corrective target 3D skeletons, and consolidates 3D camera/playback controls in a collapsible bottom dock."
    verification_procedure: "npx tsc --noEmit"

  - task_id: "TASK-005"
    gate: "GATE-2-CORRECTIVE-LOOP-UI"
    title: "Build 6-stage SwingF/X CorrectiveLearningLoop workspace, Coach Heuristic Override drawer, and Extensibility Adapters"
    depends_on: ["TASK-004"]
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "src/types/swingfx.ts"
      - "src/components/VideoPoseCanvas.tsx"
      - "src/components/SkeletonInspector3D.tsx"
    outputs:
      - "src/services/storageRepository.ts"
      - "src/services/extensibilityAdapters.ts"
      - "src/components/EvidenceDrawer.tsx"
      - "src/App.tsx"
    acceptance_criteria:
      - "Home screen prominently features 'Diagnose My Swing. / And Fix It!' and guides the player through all 6 stages: Show Me Your Swing -> Here's What I Notice -> Here's What Might Be Causing It -> Let's Fix That -> Try Again -> Did It Stick?"
      - "Expandable Biomechanics Evidence Drawer allows inspecting OBSERVED/INFERRED/SIMULATED/UNRESOLVED provenance, empirical reference-frame residuals, and overriding heuristic thresholds."
      - "Includes hardware-independent ESP32 Ball Launcher interface and BIDLR/BIDLLER identity/entitlement adapter."
    verification_procedure: "npm run lint && npm run build"

  - task_id: "TASK-006"
    gate: "GATE-3-AI-REASONING-PROXY"
    title: "Implement Express backend proxy for Gemini 4 Argon (ThinkingLevel.HIGH), multi-turn coaching chat, and Gemini 3.8 Live WebSocket"
    depends_on: ["TASK-005"]
    owner_role: "stateless_glm_worker_agent"
    status: "COMPLETED"
    inputs:
      - "src/types/swingfx.ts"
    outputs:
      - "server.ts"
      - "src/components/VoiceDrillCoach.tsx"
      - "src/components/CoachChatPanel.tsx"
    acceptance_criteria:
      - "Server-side @google/genai endpoints (/api/diagnose, /api/retest-compare, /api/chat) use gemini-4-argon with ThinkingLevel.HIGH for complex diagnostic interpretation, gemini-3.8-flash for general coaching, and gemini-3.1-flash-lite for fast intent routing."
      - "WebSocket /api/live bridges real-time audio cues with gemini-3.8-live during corrective drills."
      - "Gracefully degrades to deterministic local diagnostic output if API key or network is unavailable."
    verification_procedure: "npm run lint && npm run build"

  - task_id: "TASK-007"
    gate: "GATE-4-PERSISTENCE"
    title: "Provision Firebase Auth & Firestore and synchronize longitudinal assessments and retention records"
    depends_on: ["TASK-006"]
    owner_role: "stateless_glm_worker_agent"
    status: "PENDING"
    inputs:
      - "DOCS/ARCHITECTURE.md"
      - "src/services/storageRepository.ts"
    outputs:
      - "firebase-blueprint.json"
      - "firestore.rules"
      - "src/services/firebaseClient.ts"
    acceptance_criteria:
      - "Firebase Auth (Google Sign-In) and Firestore persist TechniqueAssessment, PracticeAttempt, CorrectionOutcome, RetentionAssessment, PlayerTechniqueBaseline, and HeuristicThresholdConfig overrides."
      - "Security rules enforce strict owner isolation, schema validation, and size limits."
    verification_procedure: "npm run lint && npm run build"
---

# SwingF/X (`swingfx`) — Frozen Implementation Checklist

## Execution Discipline & Gate Order

This checklist is derived directly from `DOCS/ARCHITECTURE.md` (`arch-swingfx-v0.1.0`) and is frozen prior to application code changes. Each task is designed for deterministic, stateless execution (`GLM-5.3` with `reasoning_enabled: false`) and must pass its verification gate in strict topological order:

1. **GATE-0 (`TASK-001`)**: Specification freeze, canonical `SwingF/X` metadata, and core TypeScript domain & heuristic taxonomy contracts.
2. **GATE-1 (`TASK-002`, `TASK-003`)**: Genuine client-side video decoding, MediaPipe Pose Landmarker extraction, empirical perspective quality checks, diagnostic abstention, repetition/phase segmentation, body-relative kinematics, DTW alignment, and configurable heuristic evaluation.
3. **GATE-2 (`TASK-004`, `TASK-005`)**: Full 6-stage Corrective Learning Loop UI, 2D synchronized overlay, 3D Three.js Skeleton Inspector with collapsible bottom dock, Before/After retest comparison, Coach Override drawer, and unprompted retention testing.
4. **GATE-3 (`TASK-006`)**: Server-side Gemini 4 Argon (`ThinkingLevel.HIGH`) diagnostic & video interpretation proxy, multi-turn Coach Chat, and Gemini 3.8 Live hands-free drill cadence coach.
5. **GATE-4 (`TASK-007`)**: Firebase Authentication and Firestore longitudinal persistence with hardened security rules.

## Release-Identity Amendment

`TASK-008-VERSION` implements architecture revision `swingfx-architecture-r2`, section 6. Application versions come from `version.txt` / `version.json`; the inherited artifact IDs and heuristic schema revisions are not release labels. This task does not re-certify the original CV/coaching completion claims.

Verification evidence: pending execution.

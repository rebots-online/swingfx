import React, { useEffect, useRef, useState } from 'react';
import buildVersion from '../version.json';
import {
  CoachReviewStatus,
  CorrectionOutcome,
  CourtConfiguration,
  Handedness,
  HeuristicThresholdConfig,
  LearningLoopStage,
  PhysicalVenue,
  PracticeProtocol,
  RetentionAssessment,
  ShotSubType,
  StrokeCategory,
  TechniqueAssessment,
} from './types/swingfx';
import { INITIAL_HEURISTIC_TAXONOMY } from './config/heuristics';
import {
  REFERENCE_SQUASH_CLIPS,
  ReferenceSquashClipSpec,
} from './services/videoReferenceGenerator';
import {
  extractPoseFromReferenceClip,
  extractPoseFromVideoElement,
} from './services/poseEngine';
import {
  evaluateCorrectionOutcome,
  evaluateRetentionOutcome,
  evaluateTechniqueAssessment,
} from './services/diagnosticEngine';
import {
  loadAssessmentsFromStorage,
  loadHeuristicsFromStorage,
  loadOrCreatePlayerBaseline,
  loadOutcomesFromStorage,
  loadRetentionsFromStorage,
  saveAssessmentToStorage,
  saveHeuristicsToStorage,
  saveOutcomeToStorage,
  saveRetentionToStorage,
} from './services/storageRepository';
import { VideoPoseCanvas } from './components/VideoPoseCanvas';
import { SkeletonInspector3D } from './components/SkeletonInspector3D';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { VoiceDrillCoach } from './components/VoiceDrillCoach';
import { CoachChatPanel } from './components/CoachChatPanel';
import {
  DEFAULT_IDENTITY_ADAPTER,
  Esp32BallLauncherPanel,
} from './services/extensibilityAdapters';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  FileVideo,
  History,
  Layers,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
} from 'lucide-react';

type ActiveWorkspaceView = 'LOOP' | 'BEFORE_AFTER' | 'RETENTION_LOG' | 'COACH_CHAT';

export const App: React.FC = () => {
  // Navigation & 6-Stage CorrectiveLearningLoop State
  const [activeNavView, setActiveNavView] = useState<ActiveWorkspaceView>('LOOP');
  const [loopStage, setLoopStage] = useState<LearningLoopStage>('OBSERVE');
  const [visualizerMode, setVisualizerMode] = useState<'2D_VIDEO' | '3D_SKELETON'>('2D_VIDEO');

  // Configurable Heuristics & Player Baseline
  const [heuristics, setHeuristics] = useState<HeuristicThresholdConfig[]>(() =>
    loadHeuristicsFromStorage()
  );
  const [playerBaseline] = useState(() =>
    loadOrCreatePlayerBaseline(DEFAULT_IDENTITY_ADAPTER.actorId)
  );

  // Player Intent & Recording Environment State (Stage 1)
  const [strokeCategory, setStrokeCategory] = useState<StrokeCategory>('FOREHAND');
  const [shotSubType, setShotSubType] = useState<ShotSubType>('FOREHAND_DRIVE');
  const [handedness, setHandedness] = useState<Handedness>('RIGHT');
  const [subjectiveFeel, setSubjectiveFeel] = useState<string>(
    'Late on the ball and rushed when balls come deep to the back right'
  );
  const [venueType, setVenueType] =
    useState<PhysicalVenue['venueType']>('INTERNATIONAL_SINGLES');
  const [selectedRefClipId, setSelectedRefClipId] = useState<string>(
    'REF-FH-LATE-PREP-5REPS'
  );

  // Active Assessment, Retest & Retention State
  const [baselineAssessment, setBaselineAssessment] =
    useState<TechniqueAssessment | null>(null);
  const [retestAssessment, setRetestAssessment] =
    useState<TechniqueAssessment | null>(null);
  const [correctionOutcome, setCorrectionOutcome] =
    useState<CorrectionOutcome | null>(null);
  const [retentionHistory, setRetentionHistory] = useState<RetentionAssessment[]>(() =>
    loadRetentionsFromStorage()
  );
  const [pastAssessments, setPastAssessments] = useState<TechniqueAssessment[]>(() =>
    loadAssessmentsFromStorage()
  );
  const [selectedRepIndex, setSelectedRepIndex] = useState<number>(0);

  // Video Upload / Live Camera / Gemini Argon State
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [cvProgressPct, setCvProgressPct] = useState<number | null>(null);
  const [isRunningArgon, setIsRunningArgon] = useState<boolean>(false);
  const [isRecordingWebcam, setIsRecordingWebcam] = useState<boolean>(false);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Retention Form State (Stage 6)
  const [sessionGapHours, setSessionGapHours] = useState<number>(48);
  const [feedVariationDesc, setFeedVariationDesc] = useState<string>(
    'Unprompted rally feeds alternating deep forehand drive and boast recovery'
  );

  // Initialize default vertical-slice assessment on first load so all views have immediate real data
  useEffect(() => {
    const initialClip = REFERENCE_SQUASH_CLIPS[0];
    runReferenceClipAssessment(initialClip, 'BASELINE', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildVenueAndProtocol = (
    clipSpec?: ReferenceSquashClipSpec,
    isRetention = false
  ): {
    venue: PhysicalVenue;
    courtConfig: CourtConfiguration;
    protocol: PracticeProtocol;
  } => ({
    venue: {
      venueId: 'venue-current',
      venueType,
      calibrationState: 'BODY_RELATIVE_ONLY',
      cameraMountDescription:
        clipSpec?.cameraMountDescription ||
        'Rear-diagonal tripod at 1.3m height (no regulation court calibration required)',
    },
    courtConfig: {
      configId: 'cfg-current',
      tinHeightMeters: venueType === 'INTERNATIONAL_SINGLES' ? 0.48 : null,
      courtLinesVisible: true,
      wallMaterial: 'GLASS_BACK',
      lightingCondition: 'CLUB_LED',
    },
    protocol: {
      protocolId: 'proto-current',
      strokeCategory: clipSpec?.strokeCategory || strokeCategory,
      shotSubType: clipSpec?.shotSubType || shotSubType,
      feedType: 'PARTNER_MANUAL_FEED',
      promptingMode: isRetention ? 'UNPROMPTED_RETENTION' : 'COACHED_WITH_CUES',
      targetRepetitionCount: clipSpec?.repetitionCount || 5,
    },
  });

  const runReferenceClipAssessment = (
    clip: ReferenceSquashClipSpec,
    role: 'BASELINE' | 'RETEST' | 'RETENTION',
    advanceStage = true,
    customHeuristics?: HeuristicThresholdConfig[]
  ) => {
    const activeHeuristics = customHeuristics || heuristics;
    const { frames, fps } = extractPoseFromReferenceClip(clip);
    const { venue, courtConfig, protocol } = buildVenueAndProtocol(
      clip,
      role === 'RETENTION'
    );

    const assessment = evaluateTechniqueAssessment({
      assessmentId: `asmt-${role.toLowerCase()}-${Date.now()}`,
      userId: DEFAULT_IDENTITY_ADAPTER.actorId,
      clipTitle: clip.title,
      videoSourceType: 'REFERENCE_SQUASH_CLIP',
      referenceClip: clip,
      frames,
      fps,
      strokeCategory: clip.strokeCategory,
      shotSubType: clip.shotSubType,
      handedness: clip.handedness,
      subjectiveFeel: clip.subjectiveFeel,
      venue,
      courtConfig,
      protocol,
      heuristics: activeHeuristics,
    });

    if (role === 'BASELINE') {
      setUploadedVideoUrl(null);
      setStrokeCategory(clip.strokeCategory);
      setShotSubType(clip.shotSubType);
      setHandedness(clip.handedness);
      setSubjectiveFeel(clip.subjectiveFeel);
      setSelectedRefClipId(clip.clipId);
      setBaselineAssessment(assessment);
      setSelectedRepIndex(0);
      saveAssessmentToStorage(assessment);
      setPastAssessments(loadAssessmentsFromStorage());
      if (advanceStage) {
        setLoopStage('DETECT');
      }
    } else if (role === 'RETEST' && baselineAssessment && baselineAssessment.selectedIntervention) {
      setRetestAssessment(assessment);
      const outcome = evaluateCorrectionOutcome({
        baseline: baselineAssessment,
        retest: assessment,
        intervention: baselineAssessment.selectedIntervention,
      });
      setCorrectionOutcome(outcome);
      saveOutcomeToStorage(outcome);
      if (advanceStage) {
        setLoopStage('RETEST');
      }
    } else if (role === 'RETENTION' && baselineAssessment && correctionOutcome) {
      const retRecord = evaluateRetentionOutcome({
        userId: DEFAULT_IDENTITY_ADAPTER.actorId,
        baseline: baselineAssessment,
        coachedOutcome: correctionOutcome,
        retentionAssessment: assessment,
        sessionGapHours,
        promptingWithdrawn: true,
        feedVariationApplied: true,
        feedVariationDescription: feedVariationDesc,
      });
      saveRetentionToStorage(retRecord);
      setRetentionHistory(loadRetentionsFromStorage());
      if (advanceStage) {
        setLoopStage('RETAIN');
      }
    }
  };

  const handleVideoFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    role: 'BASELINE' | 'RETEST'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(objectUrl);
    setCvProgressPct(5);

    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;

    await new Promise<void>((resolve) => {
      tempVideo.onloadedmetadata = () => resolve();
      tempVideo.onerror = () => resolve();
    });

    const { frames, fps } = await extractPoseFromVideoElement(tempVideo, 24, (pct) =>
      setCvProgressPct(pct)
    );
    setCvProgressPct(null);

    const { venue, courtConfig, protocol } = buildVenueAndProtocol();
    const assessment = evaluateTechniqueAssessment({
      assessmentId: `asmt-upload-${Date.now()}`,
      userId: DEFAULT_IDENTITY_ADAPTER.actorId,
      clipTitle: `Uploaded Clip: ${file.name}`,
      videoSourceType: 'UPLOADED_VIDEO',
      frames,
      fps,
      strokeCategory,
      shotSubType,
      handedness,
      subjectiveFeel,
      venue,
      courtConfig,
      protocol,
      heuristics,
    });

    if (role === 'BASELINE') {
      setBaselineAssessment(assessment);
      setSelectedRepIndex(0);
      saveAssessmentToStorage(assessment);
      setPastAssessments(loadAssessmentsFromStorage());
      setLoopStage('DETECT');
    } else if (baselineAssessment && baselineAssessment.selectedIntervention) {
      setRetestAssessment(assessment);
      const outcome = evaluateCorrectionOutcome({
        baseline: baselineAssessment,
        retest: assessment,
        intervention: baselineAssessment.selectedIntervention,
      });
      setCorrectionOutcome(outcome);
      saveOutcomeToStorage(outcome);
      setLoopStage('RETEST');
    }
  };

  const toggleLiveWebcamCapture = async () => {
    if (isRecordingWebcam) {
      mediaRecorderRef.current?.stop();
      setIsRecordingWebcam(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setUploadedVideoUrl(url);
        setCvProgressPct(10);

        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.muted = true;
        await new Promise<void>((r) => {
          tempVideo.onloadedmetadata = () => r();
          setTimeout(r, 500);
        });

        const { frames, fps } = await extractPoseFromVideoElement(tempVideo, 20, (pct) =>
          setCvProgressPct(pct)
        );
        setCvProgressPct(null);

        const { venue, courtConfig, protocol } = buildVenueAndProtocol();
        const assessment = evaluateTechniqueAssessment({
          assessmentId: `asmt-cam-${Date.now()}`,
          userId: DEFAULT_IDENTITY_ADAPTER.actorId,
          clipTitle: `Live Camera Capture (${new Date().toLocaleTimeString()})`,
          videoSourceType: 'LIVE_CAMERA',
          frames,
          fps,
          strokeCategory,
          shotSubType,
          handedness,
          subjectiveFeel,
          venue,
          courtConfig,
          protocol,
          heuristics,
        });
        setBaselineAssessment(assessment);
        saveAssessmentToStorage(assessment);
        setPastAssessments(loadAssessmentsFromStorage());
        setLoopStage('DETECT');
      };

      recorder.start();
      setIsRecordingWebcam(true);
    } catch {
      // If camera hardware unavailable in preview sandbox, run the selected reference clip
      const clip =
        REFERENCE_SQUASH_CLIPS.find((c) => c.clipId === selectedRefClipId) ||
        REFERENCE_SQUASH_CLIPS[0];
      runReferenceClipAssessment(clip, 'BASELINE', true);
    }
  };

  const requestArgonDeepDiagnosis = async () => {
    if (!baselineAssessment || isRunningArgon) return;
    setIsRunningArgon(true);
    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentSummary: {
            clipTitle: baselineAssessment.clipTitle,
            outcomeStatus: baselineAssessment.outcomeStatus,
            abstentionDetails: baselineAssessment.abstentionDetails,
            playerIntent: baselineAssessment.playerIntent,
            repetitionCount: baselineAssessment.observations.length,
            detectedFaults: baselineAssessment.detectedFaults,
            hypotheses: baselineAssessment.hypotheses,
            selectedIntervention: baselineAssessment.selectedIntervention,
          },
        }),
      });
      const data = await response.json();
      if (response.ok && data.summaryNotice) {
        setBaselineAssessment((prev) =>
          prev
            ? {
                ...prev,
                aiCoachingNarrative: data,
              }
            : prev
        );
      }
    } catch {
      // Keep deterministic coaching output
    } finally {
      setIsRunningArgon(false);
    }
  };

  const handleOverrideHeuristic = (
    faultId: string,
    newThreshold: number,
    coachName: string,
    rationale: string
  ) => {
    const updated = heuristics.map((h) =>
      h.faultId === faultId
        ? {
            ...h,
            activeThresholdValue: newThreshold,
            provenance: 'COACH_OVERRIDE' as const,
            overriddenByCoach: coachName,
            coachOverrideRationale: rationale,
            updatedAt: new Date().toISOString(),
          }
        : h
    );
    setHeuristics(updated);
    saveHeuristicsToStorage(updated);

    // Re-evaluate current reference clip with updated heuristic threshold immediately
    const activeClip = REFERENCE_SQUASH_CLIPS.find(
      (c) => c.clipId === (baselineAssessment?.referenceClipId || selectedRefClipId)
    );
    if (activeClip) {
      runReferenceClipAssessment(activeClip, 'BASELINE', false, updated);
    }
  };

  const handleResetHeuristics = () => {
    setHeuristics(INITIAL_HEURISTIC_TAXONOMY);
    saveHeuristicsToStorage(INITIAL_HEURISTIC_TAXONOMY);
    const activeClip = REFERENCE_SQUASH_CLIPS.find(
      (c) => c.clipId === (baselineAssessment?.referenceClipId || selectedRefClipId)
    );
    if (activeClip) {
      runReferenceClipAssessment(
        activeClip,
        'BASELINE',
        false,
        INITIAL_HEURISTIC_TAXONOMY
      );
    }
  };

  const handleUpdateHypothesisStatus = (
    hypothesisId: string,
    status: CoachReviewStatus,
    note: string
  ) => {
    setBaselineAssessment((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        hypotheses: prev.hypotheses.map((h) =>
          h.hypothesisId === hypothesisId
            ? { ...h, coachReviewStatus: status, coachAmendmentNote: note }
            : h
        ),
      };
    });
  };

  const primaryFault = baselineAssessment?.detectedFaults[0] || null;
  const primaryHypothesis = baselineAssessment?.hypotheses[0] || null;
  const activeIntervention = baselineAssessment?.selectedIntervention || null;
  const currentObservation =
    baselineAssessment?.observations[selectedRepIndex] ||
    baselineAssessment?.observations[0];

  const allFramesForCanvas = baselineAssessment
    ? baselineAssessment.observations.flatMap((o) => o.frames)
    : [];

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#FBF9F5] text-[#18181B]">
      {/* ====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT (Per Frontend-Design Skill Section 2)
          [Zone 1: Single-line Brand Wordmark] — [Zone 2: 4 Nav Links] — [Zone 3: 1 Primary CTA]
         ==================================================================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E2DDD2]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveNavView('LOOP');
            setLoopStage('OBSERVE');
          }}
          className="text-xl font-extrabold tracking-tight text-[#18181B] font-display whitespace-nowrap shrink-0"
        >
          SwingF/X
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52525B]">
          <button
            onClick={() => setActiveNavView('LOOP')}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 ${
              activeNavView === 'LOOP'
                ? 'text-[#18181B] font-semibold underline decoration-[#C84B31] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Coaching Loop
          </button>
          <button
            onClick={() => setActiveNavView('BEFORE_AFTER')}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 ${
              activeNavView === 'BEFORE_AFTER'
                ? 'text-[#18181B] font-semibold underline decoration-[#C84B31] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Before & After
          </button>
          <button
            onClick={() => setActiveNavView('RETENTION_LOG')}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 ${
              activeNavView === 'RETENTION_LOG'
                ? 'text-[#18181B] font-semibold underline decoration-[#C84B31] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Retention Log
          </button>
          <button
            onClick={() => setActiveNavView('COACH_CHAT')}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 ${
              activeNavView === 'COACH_CHAT'
                ? 'text-[#18181B] font-semibold underline decoration-[#C84B31] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Coach Chat
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setActiveNavView('LOOP');
              setLoopStage('OBSERVE');
            }}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#C84B31] rounded-lg hover:bg-[#B03E26] transition-colors whitespace-nowrap shrink-0"
          >
            New Swing Check
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE CONTAINER (1440px Desktop Baseline, Responsive)
         ==================================================================== */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HERO BANNER: "Diagnose My Swing. / And Fix It!" */}
        <section className="pb-8 border-b border-[#E2DDD2] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#52525B]">
              <span>STANDALONE AI SQUASH TECHNIQUE COACH</span>
              <span aria-hidden="true">·</span>
              <span>BODY-RELATIVE POSE KINEMATICS</span>
              <span aria-hidden="true">·</span>
              <span>PROVISIONAL HEURISTICS</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#18181B] leading-[1.08]">
              Diagnose My Swing.{' '}
              <span className="text-[#C84B31]">And Fix It!</span>
            </h1>
            <p className="text-base text-[#52525B] leading-relaxed mt-1">
              Show SwingF/X 3–6 repetitions of a stroke. We extract body-relative joint kinematics,
              isolate the single most consequential correctable fault (or abstain honestly if the
              camera view is inadequate), prescribe one testable drill, and verify whether the
              change holds on retest and unprompted retention.
            </p>
          </div>

          {/* 6-Step CorrectiveLearningLoop Stage Stepper */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F3EFE6] rounded-xl border border-[#E2DDD2]">
            {(
              [
                { id: 'OBSERVE', num: '1', label: 'Show Me Your Swing' },
                { id: 'DETECT', num: '2', label: "Here's What I Notice" },
                { id: 'DIAGNOSE', num: '3', label: 'What Might Cause It' },
                { id: 'INTERVENE', num: '4', label: "Let's Fix That" },
                { id: 'RETEST', num: '5', label: 'Try Again' },
                { id: 'RETAIN', num: '6', label: 'Did It Stick?' },
              ] as const
            ).map((step) => {
              const isActive = activeNavView === 'LOOP' && loopStage === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setActiveNavView('LOOP');
                    setLoopStage(step.id);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#18181B] text-white font-semibold shadow-xs'
                      : 'text-[#52525B] hover:text-[#18181B] hover:bg-white/60'
                  }`}
                >
                  {step.num}. {step.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ====================================================================
            VIEW A: PRIMARY 6-STAGE CORRECTIVE LEARNING LOOP
           ==================================================================== */}
        {activeNavView === 'LOOP' && (
          <div className="mt-8 flex flex-col gap-8">
            {/* STAGE 1: SHOW ME YOUR SWING (OBSERVE) */}
            {loopStage === 'OBSERVE' && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Column: Video Capture / Upload / Calibrated Reference Clips */}
                <div className="lg:col-span-7 p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-mono text-[#52525B]">
                      STAGE 01 · OBSERVE · ZERO-CONFIGURATION ENTRY
                    </div>
                    <h2 className="text-2xl font-bold text-[#18181B]">
                      1. Show Me Your Swing
                    </h2>
                    <p className="text-sm text-[#52525B] leading-relaxed">
                      Record directly with your smartphone camera, upload an existing clip of 3–6
                      repetitions, or load one of our calibrated multi-repetition squash footage
                      sets to inspect the full MediaPipe Pose + DTW + Heuristic pipeline right away.
                    </p>
                  </div>

                  {/* Calibrated Squash Reference Footage Selector */}
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-mono font-semibold text-[#18181B]">
                      SELECT REPRESENTATIVE SQUASH FOOTAGE (WITH ANNOTATED REFERENCE KEYFRAMES):
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {REFERENCE_SQUASH_CLIPS.map((clip) => {
                        const isSelected = selectedRefClipId === clip.clipId;
                        return (
                          <button
                            key={clip.clipId}
                            onClick={() => {
                              setSelectedRefClipId(clip.clipId);
                              runReferenceClipAssessment(clip, 'BASELINE', true);
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-4 ${
                              isSelected
                                ? 'border-[#C84B31] bg-[#FBF9F5]'
                                : 'border-[#E2DDD2] bg-white hover:bg-[#F3EFE6]/50'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2 text-xs font-mono text-[#52525B]">
                                <span>{clip.strokeCategory}</span>
                                <span aria-hidden="true">·</span>
                                <span>{clip.repetitionCount} Reps</span>
                                <span aria-hidden="true">·</span>
                                <span>{clip.fps} fps</span>
                              </div>
                              <div className="text-sm font-bold text-[#18181B]">{clip.title}</div>
                              <div className="text-xs text-[#52525B]">{clip.subtitle}</div>
                            </div>
                            <span className="px-3 py-1.5 rounded-lg bg-[#C84B31] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                              <Play className="w-3.5 h-3.5" />
                              Analyze Clip
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Smartphone Camera & File Upload Controls */}
                  <div className="pt-4 border-t border-[#E2DDD2] flex flex-wrap items-center gap-3">
                    <button
                      onClick={toggleLiveWebcamCapture}
                      className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                        isRecordingWebcam
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-[#18181B] text-white hover:bg-[#27272A]'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      {isRecordingWebcam ? 'Stop & Analyze Recording' : 'Record Live Camera (3–6 Reps)'}
                    </button>

                    <label className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E2DDD2] bg-[#F3EFE6] hover:bg-[#E5DFD2] text-xs font-semibold text-[#18181B] flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0">
                      <Upload className="w-4 h-4 text-[#C84B31]" />
                      Upload Swing Video (.mp4 / .webm / .mov)
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoFileUpload(e, 'BASELINE')}
                        className="hidden"
                      />
                    </label>

                    {cvProgressPct !== null && (
                      <span className="text-xs font-mono text-[#C84B31]">
                        Extracting MediaPipe Pose Landmarks: {cvProgressPct}%
                      </span>
                    )}
                  </div>

                  {isRecordingWebcam && (
                    <div className="rounded-xl overflow-hidden bg-black aspect-video">
                      <video ref={webcamVideoRef} className="w-full h-full object-cover" muted />
                    </div>
                  )}
                </div>

                {/* Right Column: Player Intent, Court Context & Camera Placement Guide */}
                <div className="lg:col-span-5 p-6 rounded-2xl border border-[#E2DDD2] bg-[#F3EFE6]/60 flex flex-col justify-between gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="text-xs font-mono text-[#52525B]">
                      OPTIONAL CONTEXT & CAMERA FRAMING GUIDE
                    </div>
                    <h3 className="text-lg font-bold text-[#18181B]">
                      What Are You Practicing & What Feels Wrong?
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[#52525B]">Stroke Category</label>
                        <select
                          value={strokeCategory}
                          onChange={(e) => setStrokeCategory(e.target.value as StrokeCategory)}
                          className="px-3 py-2 rounded-lg border border-[#E2DDD2] bg-white font-medium text-[#18181B]"
                        >
                          <option value="FOREHAND">Forehand Drive / Lunge</option>
                          <option value="BACKHAND">Backhand Drive / Lunge</option>
                          <option value="VOLLEY">Mid-Court Volley</option>
                          <option value="DROP_BOAST">Front Drop / Recovery Boast</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[#52525B]">Handedness</label>
                        <select
                          value={handedness}
                          onChange={(e) => setHandedness(e.target.value as Handedness)}
                          className="px-3 py-2 rounded-lg border border-[#E2DDD2] bg-white font-medium text-[#18181B]"
                        >
                          <option value="RIGHT">Right-Handed Player</option>
                          <option value="LEFT">Left-Handed Player</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-mono text-[#52525B]">
                        Recording Space (`PhysicalVenue` — Regulation Court Not Required)
                      </label>
                      <select
                        value={venueType}
                        onChange={(e) =>
                          setVenueType(e.target.value as PhysicalVenue['venueType'])
                        }
                        className="px-3 py-2 rounded-lg border border-[#E2DDD2] bg-white font-medium text-[#18181B]"
                      >
                        <option value="INTERNATIONAL_SINGLES">
                          International Singles Court (Body-Relative Mode)
                        </option>
                        <option value="NORTH_AMERICAN_HARDBALL">
                          North American Hardball Court
                        </option>
                        <option value="CONVERTED_RACQUETBALL_HANDBALL">
                          Converted Racquetball / Handball Court
                        </option>
                        <option value="SOLO_PRACTICE_WALL">
                          Solo Rebound Wall / Garage Shadow Space
                        </option>
                        <option value="UNCALIBRATED_SPACE">
                          Uncalibrated Home / Gym Space
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-mono text-[#52525B]">
                        What Feels Wrong? (Subjective Symptom)
                      </label>
                      <input
                        type="text"
                        value={subjectiveFeel}
                        onChange={(e) => setSubjectiveFeel(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E2DDD2] bg-white text-[#18181B]"
                      />
                    </div>
                  </div>

                  {/* Camera Placement Guide Card */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2DDD2] flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#18181B]">
                      <Compass className="w-4 h-4 text-[#C84B31]" />
                      <span>Optimal Smartphone Camera Placement</span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Place your phone at <strong>1.1 m – 1.4 m height</strong> (back-wall shelf or
                      rear-diagonal tripod) so your head, both shoulders, hitting elbow, and lead
                      ankle remain inside the frame. Avoid steep high-balcony overhead angles, which
                      cause planar foreshortening and trigger automatic Diagnostic Abstention.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* STAGES 2, 3, 4: DETECT, DIAGNOSE, INTERVENE */}
            {(loopStage === 'DETECT' ||
              loopStage === 'DIAGNOSE' ||
              loopStage === 'INTERVENE') &&
              baselineAssessment && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column (7 cols): Synchronized 2D Video / 3D Skeleton Inspector */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-[#52525B]">
                          {baselineAssessment.clipTitle} · {baselineAssessment.observations.length}{' '}
                          Usable Reps · {baselineAssessment.observations[0]?.fps ?? 30} fps
                        </span>
                        <h2 className="text-lg font-bold text-[#18181B]">
                          Synchronized Pose & Trajectory Evidence
                        </h2>
                      </div>

                      {/* 2D Annotated Video vs. 3D Skeleton Studio Switcher */}
                      <div className="flex items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg border border-[#E2DDD2]">
                        <button
                          onClick={() => setVisualizerMode('2D_VIDEO')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                            visualizerMode === '2D_VIDEO'
                              ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                              : 'text-[#52525B] hover:text-[#18181B]'
                          }`}
                        >
                          2D Video + Trajectory
                        </button>
                        <button
                          onClick={() => setVisualizerMode('3D_SKELETON')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                            visualizerMode === '3D_SKELETON'
                              ? 'bg-white text-[#18181B] font-semibold shadow-xs'
                              : 'text-[#52525B] hover:text-[#18181B]'
                          }`}
                        >
                          3D Skeleton Studio
                        </button>
                      </div>
                    </div>

                    {visualizerMode === '2D_VIDEO' ? (
                      <VideoPoseCanvas
                        frames={allFramesForCanvas}
                        fps={baselineAssessment.observations[0]?.fps ?? 30}
                        observations={baselineAssessment.observations}
                        selectedRepIndex={selectedRepIndex}
                        onSelectRep={setSelectedRepIndex}
                        primaryFault={primaryFault}
                        videoUrl={uploadedVideoUrl}
                      />
                    ) : (
                      currentObservation && (
                        <SkeletonInspector3D
                          observation={currentObservation}
                          showTargetOverlayByDefault={loopStage === 'INTERVENE'}
                        />
                      )
                    )}
                  </div>

                  {/* Right Column (5 cols): Stage-Specific Coaching Intelligence Card */}
                  <div className="lg:col-span-5 flex flex-col gap-5">
                    {/* CASE 1: DIAGNOSTIC ABSTENTION OUTCOME */}
                    {baselineAssessment.outcomeStatus === 'ABSTAINED_INSUFFICIENT_EVIDENCE' &&
                      baselineAssessment.abstentionDetails && (
                        <div className="p-6 rounded-2xl border border-[#B45309]/40 bg-[#FEF3C7]/40 flex flex-col gap-4">
                          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#B45309]">
                            <AlertTriangle className="w-4 h-4" />
                            <span>
                              FIRST-CLASS DIAGNOSTIC ABSTENTION ·{' '}
                              {baselineAssessment.abstentionDetails.provenance}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-[#18181B]">
                            {baselineAssessment.abstentionDetails.headline}
                          </h3>
                          <p className="text-sm text-[#18181B] leading-relaxed">
                            {baselineAssessment.abstentionDetails.explanation}
                          </p>
                          <div className="p-3.5 rounded-xl bg-white border border-[#E2DDD2] text-xs font-mono text-[#52525B]">
                            {baselineAssessment.abstentionDetails.observedEvidenceSummary}
                          </div>
                          <div className="p-4 rounded-xl bg-white border border-[#E2DDD2] flex flex-col gap-1.5">
                            <span className="text-xs font-bold text-[#18181B]">
                              How to Re-Record for Reliable Measurement:
                            </span>
                            <p className="text-xs text-[#52525B] leading-relaxed">
                              {baselineAssessment.abstentionDetails.recommendedCameraPlacement}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                              onClick={() => setLoopStage('OBSERVE')}
                              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] transition-colors whitespace-nowrap shrink-0"
                            >
                              Select Clean Rear-Diagonal Clip
                            </button>
                            <button
                              onClick={() => setActiveNavView('COACH_CHAT')}
                              className="min-h-[42px] px-4 py-2 rounded-xl border border-[#E2DDD2] bg-white text-xs font-semibold text-[#18181B] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
                            >
                              Ask Coach Chat for Setup Help
                            </button>
                          </div>
                        </div>
                      )}

                    {/* CASE 2: VALIDATED EVIDENCE — STAGE 2 ("HERE'S WHAT I NOTICE") */}
                    {baselineAssessment.outcomeStatus === 'DIAGNOSIS_READY' &&
                      loopStage === 'DETECT' && (
                        <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-5">
                          <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                            <span>STAGE 02 · HERE&apos;S WHAT I NOTICE</span>
                            <span>
                              PROVENANCE: {primaryFault?.provenance || 'OBSERVED'}
                            </span>
                          </div>

                          {primaryFault ? (
                            <>
                              <div className="flex flex-col gap-1.5">
                                <div className="text-xs font-mono text-[#C84B31] font-semibold">
                                  PRINCIPAL RECURRING DEVIATION ({primaryFault.faultId} ·{' '}
                                  {primaryFault.movementPhase})
                                </div>
                                <h3 className="text-2xl font-bold text-[#18181B]">
                                  {primaryFault.title}
                                </h3>
                                <p className="text-sm text-[#52525B] leading-relaxed">
                                  {primaryFault.description}
                                </p>
                              </div>

                              {/* Quantitative Metric Summary Box */}
                              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#F3EFE6]/70 border border-[#E2DDD2] font-mono tabular-nums">
                                <div>
                                  <div className="text-[11px] text-[#52525B]">Observed Mean</div>
                                  <div className="text-lg font-bold text-[#C84B31]">
                                    {primaryFault.observedMean} {primaryFault.unit}
                                  </div>
                                  <div className="text-[11px] text-[#52525B]">
                                    ±{primaryFault.observedStdDev} SD
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-[#52525B]">Heuristic Target</div>
                                  <div className="text-lg font-bold text-[#15803D]">
                                    [{primaryFault.heuristicSnapshot.targetEffectiveRange[0]},{' '}
                                    {primaryFault.heuristicSnapshot.targetEffectiveRange[1]}]
                                  </div>
                                  <div className="text-[11px] text-[#52525B]">
                                    {primaryFault.heuristicSnapshot.provenance === 'COACH_OVERRIDE'
                                      ? 'Coach Override'
                                      : 'Provisional heuristic'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-[#52525B]">Rep Consistency</div>
                                  <div className="text-lg font-bold text-[#18181B]">
                                    {primaryFault.affectedRepetitionIndices.length} /{' '}
                                    {primaryFault.totalRepetitions} Reps
                                  </div>
                                  <div className="text-[11px] text-[#52525B]">
                                    Reps {primaryFault.affectedRepetitionIndices.join(', ')}
                                  </div>
                                </div>
                              </div>

                              {baselineAssessment.detectedFaults.length > 1 && (
                                <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E2DDD2] text-xs text-[#52525B]">
                                  <strong className="text-[#18181B]">
                                    Why we focus on one issue first:
                                  </strong>{' '}
                                  We also detected{' '}
                                  {baselineAssessment.detectedFaults
                                    .slice(1)
                                    .map((f) => f.title)
                                    .join(' and ')}
                                  , but {primaryFault.title} occurs earlier in the movement chain
                                  (Priority Score {primaryFault.priorityScore.compositeScore}).
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <h3 className="text-xl font-bold text-[#15803D]">
                                Mechanics Within Provisional Target Ranges
                              </h3>
                              <p className="text-sm text-[#52525B]">
                                Across all {baselineAssessment.observations.length} repetitions,
                                preparation elevation, spacing, and lunge inclination remained
                                within the active coaching heuristics.
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={requestArgonDeepDiagnosis}
                              disabled={isRunningArgon}
                              className="px-3.5 py-2 rounded-lg border border-[#E2DDD2] bg-[#F3EFE6] hover:bg-[#E5DFD2] text-xs font-medium text-[#18181B] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#C84B31]" />
                              {isRunningArgon
                                ? 'Analyzing with Argon 4...'
                                : 'Enrich with Gemini 4 Argon'}
                            </button>

                            <button
                              onClick={() => setLoopStage('DIAGNOSE')}
                              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                            >
                              <span>3. Here&apos;s What Might Cause It</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                    {/* STAGE 3: HERE'S WHAT MIGHT BE CAUSING IT (DIAGNOSE) */}
                    {baselineAssessment.outcomeStatus === 'DIAGNOSIS_READY' &&
                      loopStage === 'DIAGNOSE' &&
                      primaryHypothesis && (
                        <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-5">
                          <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                            <span>STAGE 03 · DIAGNOSTIC HYPOTHESES</span>
                            <span>
                              PROVENANCE: {primaryHypothesis.provenance} · CONFIDENCE:{' '}
                              {(primaryHypothesis.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="text-xs font-mono text-[#C84B31] font-semibold">
                              PRIMARY ROOT-CAUSE HYPOTHESIS (NOT DIRECTLY MEASURED FACT)
                            </div>
                            <h3 className="text-xl font-bold text-[#18181B]">
                              {primaryHypothesis.statement}
                            </h3>
                            <p className="text-sm text-[#52525B] leading-relaxed">
                              {primaryHypothesis.biomechanicalMechanism}
                            </p>
                          </div>

                          {/* Downstream Symptoms */}
                          <div className="p-4 rounded-xl bg-[#F3EFE6]/60 border border-[#E2DDD2] flex flex-col gap-1.5">
                            <span className="text-xs font-mono font-semibold text-[#18181B]">
                              DOWNSTREAM SYMPTOMS LINKED TO THIS ROOT CAUSE:
                            </span>
                            <ul className="list-disc list-inside text-xs text-[#52525B] space-y-1">
                              {primaryHypothesis.downstreamEffects.map((eff) => (
                                <li key={eff}>{eff}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Competing Explanations & Disambiguation */}
                          {primaryHypothesis.competingHypotheses.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-mono font-semibold text-[#52525B]">
                                COMPETING EXPLANATIONS PRESERVED:
                              </span>
                              {primaryHypothesis.competingHypotheses.map((comp) => (
                                <div
                                  key={comp.id}
                                  className="p-3.5 rounded-xl border border-[#E2DDD2] bg-[#FBF9F5] flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between text-xs font-semibold text-[#18181B]">
                                    <span>{comp.title}</span>
                                    <span className="font-mono text-[#52525B]">
                                      Plausibility: {(comp.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#52525B]">{comp.mechanism}</p>
                                  <div className="text-[11px] font-mono text-[#B45309] mt-0.5">
                                    Disambiguation Test: {comp.disambiguationTest}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={() => setLoopStage('DETECT')}
                              className="px-3.5 py-2 rounded-lg border border-[#E2DDD2] text-xs font-medium text-[#52525B] hover:text-[#18181B]"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                setVisualizerMode('3D_SKELETON');
                                setLoopStage('INTERVENE');
                              }}
                              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                            >
                              <span>4. Let&apos;s Fix That</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                    {/* STAGE 4: LET'S FIX THAT (INTERVENE) */}
                    {baselineAssessment.outcomeStatus === 'DIAGNOSIS_READY' &&
                      loopStage === 'INTERVENE' &&
                      activeIntervention && (
                        <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-5">
                          <div className="flex items-center justify-between text-xs font-mono text-[#52525B]">
                            <span>STAGE 04 · SINGLE-VARIABLE INTERVENTION</span>
                            <span>MODALITY: {activeIntervention.drillModality}</span>
                          </div>

                          {/* Memorable On-Court Coaching Cue */}
                          <div className="p-4 rounded-xl bg-[#18181B] text-white flex flex-col gap-1.5">
                            <span className="text-[11px] font-mono text-[#FBBF24]">
                              ON-COURT MOVEMENT CUE (REMEMBER THIS WHILE PRACTICING):
                            </span>
                            <p className="text-lg font-bold font-display">
                              &ldquo;{activeIntervention.onCourtCue}&rdquo;
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <h3 className="text-lg font-bold text-[#18181B]">
                              Prescribed Drill: {activeIntervention.drillTitle}
                            </h3>
                            <p className="text-xs text-[#52525B]">
                              {activeIntervention.plainLanguageExplanation}
                            </p>
                            <ol className="mt-1 space-y-2 text-xs text-[#18181B] list-decimal list-inside bg-[#F3EFE6]/60 p-4 rounded-xl border border-[#E2DDD2]">
                              {activeIntervention.drillProtocolSteps.map((step, i) => (
                                <li key={i} className="leading-relaxed">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Hands-Free Live Voice Drill Coach */}
                          <VoiceDrillCoach intervention={activeIntervention} />

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={() => setLoopStage('DIAGNOSE')}
                              className="px-3.5 py-2 rounded-lg border border-[#E2DDD2] text-xs font-medium text-[#52525B] hover:text-[#18181B]"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                const retestClip = REFERENCE_SQUASH_CLIPS.find(
                                  (c) => c.clipId === 'REF-FH-RETEST-IMPROVED-5REPS'
                                )!;
                                setVisualizerMode('2D_VIDEO');
                                runReferenceClipAssessment(retestClip, 'RETEST', true);
                              }}
                              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                            >
                              <span>5. Try Again (Run 5-Rep Retest)</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Optional Gemini 4 Argon Narrative Card if Requested */}
                    {baselineAssessment.aiCoachingNarrative && (
                      <div className="p-5 rounded-2xl border border-[#C84B31]/30 bg-[#FBF9F5] flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-mono text-[#C84B31]">
                          <span>
                            {baselineAssessment.aiCoachingNarrative.generatedByModel}
                          </span>
                          <span>EVIDENCE-GROUNDED</span>
                        </div>
                        <p className="text-sm font-semibold text-[#18181B]">
                          {baselineAssessment.aiCoachingNarrative.summaryNotice}
                        </p>
                        <p className="text-xs text-[#52525B] leading-relaxed">
                          {baselineAssessment.aiCoachingNarrative.causalExplanation}
                        </p>
                        <p className="text-[11px] font-mono text-[#52525B]">
                          Caveat: {baselineAssessment.aiCoachingNarrative.uncertaintyCaveat}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

            {/* STAGE 5: TRY AGAIN — BEFORE / AFTER DTW RETEST & VALIDATION */}
            {loopStage === 'RETEST' && baselineAssessment && (
              <section className="flex flex-col gap-6">
                <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DDD2] pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-mono text-[#52525B]">
                        STAGE 05 · TRY AGAIN · BEFORE VS. AFTER RETEST VALIDATION
                      </div>
                      <h2 className="text-2xl font-bold text-[#18181B]">
                        Did the Target Mechanical Variable Change Without New Compensations?
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const improvedClip = REFERENCE_SQUASH_CLIPS.find(
                            (c) => c.clipId === 'REF-FH-RETEST-IMPROVED-5REPS'
                          )!;
                          runReferenceClipAssessment(improvedClip, 'RETEST', false);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
                      >
                        Load Post-Drill Retest Set (5 Reps)
                      </button>

                      <label className="px-3.5 py-2 rounded-lg border border-[#E2DDD2] bg-[#F3EFE6] hover:bg-[#E5DFD2] text-xs font-semibold text-[#18181B] cursor-pointer transition-colors whitespace-nowrap shrink-0">
                        Upload Custom Retest Video
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoFileUpload(e, 'RETEST')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {correctionOutcome && retestAssessment && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Left: Dual-Skeleton Ghost Overlay Video Canvas */}
                      <div className="lg:col-span-7">
                        <VideoPoseCanvas
                          frames={retestAssessment.observations.flatMap((o) => o.frames)}
                          fps={retestAssessment.observations[0]?.fps ?? 30}
                          observations={retestAssessment.observations}
                          selectedRepIndex={selectedRepIndex}
                          onSelectRep={setSelectedRepIndex}
                          primaryFault={retestAssessment.detectedFaults[0] || null}
                          comparisonFrames={baselineAssessment.observations.flatMap(
                            (o) => o.frames
                          )}
                          comparisonLabel="Pre-Drill Habitual Ghost"
                        />
                      </div>

                      {/* Right: Quantitative Before/After Validation Scorecard */}
                      <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="p-5 rounded-2xl bg-[#F3EFE6]/70 border border-[#E2DDD2] flex flex-col gap-4">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#52525B]">VALIDATION OUTCOME</span>
                            <span
                              className={
                                correctionOutcome.executionQualityImproved
                                  ? 'text-[#15803D] font-bold'
                                  : 'text-[#B45309] font-bold'
                              }
                            >
                              {correctionOutcome.recommendation}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-[#18181B]">
                            {correctionOutcome.targetVariableLabel}
                          </h3>

                          <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
                            <div className="p-3 rounded-xl bg-white border border-[#E2DDD2]">
                              <div className="text-[11px] text-[#52525B]">Before (Habitual)</div>
                              <div className="text-base font-bold text-[#18181B]">
                                {correctionOutcome.beforeMean} {correctionOutcome.unit}
                              </div>
                              <div className="text-[10px] text-[#52525B]">
                                ±{correctionOutcome.beforeStdDev}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-[#E2DDD2]">
                              <div className="text-[11px] text-[#52525B]">After (Retest)</div>
                              <div className="text-base font-bold text-[#15803D]">
                                {correctionOutcome.afterMean} {correctionOutcome.unit}
                              </div>
                              <div className="text-[10px] text-[#52525B]">
                                ±{correctionOutcome.afterStdDev}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-[#E2DDD2]">
                              <div className="text-[11px] text-[#52525B]">Repeatability</div>
                              <div className="text-base font-bold text-[#C84B31]">
                                {(correctionOutcome.repeatabilityRatio * 100).toFixed(0)}%
                              </div>
                              <div className="text-[10px] text-[#52525B]">Reps in Target</div>
                            </div>
                          </div>

                          <p className="text-xs text-[#18181B] leading-relaxed">
                            {correctionOutcome.coachingSummary}
                          </p>

                          {/* DTW Timing Alignment Summary */}
                          <div className="p-3.5 rounded-xl bg-white border border-[#E2DDD2] flex flex-col gap-1 text-xs font-mono">
                            <div className="text-[#52525B]">
                              DTW PHASE ALIGNMENT (WARP DISTANCE:{' '}
                              {correctionOutcome.dtwAlignment.normalizedDistance})
                            </div>
                            <div>
                              Prep Duration Shift:{' '}
                              <strong>
                                {correctionOutcome.dtwAlignment.phaseTimingShiftsMs.prepDurationDeltaMs} ms
                              </strong>{' '}
                              · Recovery Shift:{' '}
                              <strong>
                                {
                                  correctionOutcome.dtwAlignment.phaseTimingShiftsMs
                                    .recoveryLatencyDeltaMs
                                }{' '}
                                ms
                              </strong>
                            </div>
                          </div>

                          {/* Compensatory Fault Check */}
                          <div className="text-xs">
                            <strong className="text-[#18181B]">
                              Secondary Compensation Check:{' '}
                            </strong>
                            {correctionOutcome.newCompensationsDetected.length === 0 ? (
                              <span className="text-[#15803D] font-medium">
                                Zero new compensatory faults induced. Lunge trunk inclination also
                                improved to{' '}
                                {retestAssessment.observations[0]?.metrics.lungeTrunkInclinationDeg
                                  .value ?? 27}
                                °.
                              </span>
                            ) : (
                              <span className="text-[#B45309] font-medium">
                                New compensation detected:{' '}
                                {correctionOutcome.newCompensationsDetected
                                  .map((f) => f.title)
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setLoopStage('INTERVENE')}
                            className="px-3.5 py-2 rounded-lg border border-[#E2DDD2] text-xs font-medium text-[#52525B] hover:text-[#18181B]"
                          >
                            Back to Drill
                          </button>
                          <button
                            onClick={() => {
                              const retClip = REFERENCE_SQUASH_CLIPS.find(
                                (c) => c.clipId === 'REF-FH-RETENTION-UNPROMPTED-5REPS'
                              )!;
                              runReferenceClipAssessment(retClip, 'RETENTION', true);
                            }}
                            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>6. Did It Stick? (Unprompted Retention Test)</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* STAGE 6: DID IT STICK? — UNPROMPTED RETENTION & VARIATION TESTING */}
            {loopStage === 'RETAIN' && baselineAssessment && (
              <section className="flex flex-col gap-6">
                <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DDD2] pb-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-mono text-[#52525B]">
                        STAGE 06 · DID IT STICK? · MOTOR LEARNING RETENTION VS. IMMEDIATE COACHING
                      </div>
                      <h2 className="text-2xl font-bold text-[#18181B]">
                        Unprompted Retention & Task Variation Assessment
                      </h2>
                      <p className="text-sm text-[#52525B]">
                        An immediate coached swing change is not yet a retained habit. Test without
                        continuous audio cues and under varied ball feeds to verify true motor
                        retention.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span>Session Gap (hrs):</span>
                        <input
                          type="number"
                          value={sessionGapHours}
                          onChange={(e) => setSessionGapHours(Number(e.target.value))}
                          className="w-20 px-2.5 py-1.5 rounded border border-[#E2DDD2] bg-[#FBF9F5] text-right"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const retClip = REFERENCE_SQUASH_CLIPS.find(
                            (c) => c.clipId === 'REF-FH-RETENTION-UNPROMPTED-5REPS'
                          )!;
                          runReferenceClipAssessment(retClip, 'RETENTION', false);
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Run Unprompted Retention Check
                      </button>
                    </div>
                  </div>

                  {/* Longitudinal Habitual -> Coached -> Retained Progression */}
                  {retentionHistory.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-[#F3EFE6]/60 border border-[#E2DDD2] flex flex-col gap-1 font-mono tabular-nums">
                        <span className="text-xs text-[#52525B]">1. HABITUAL BASELINE</span>
                        <span className="text-2xl font-bold text-[#18181B]">
                          {retentionHistory[0].habitualBaselineValue} {retentionHistory[0].unit}
                        </span>
                        <span className="text-xs font-sans text-[#52525B]">
                          Pre-intervention motor pattern (consistent but flawed)
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F3EFE6]/60 border border-[#E2DDD2] flex flex-col gap-1 font-mono tabular-nums">
                        <span className="text-xs text-[#52525B]">2. IMMEDIATE COACHED RETEST</span>
                        <span className="text-2xl font-bold text-[#C84B31]">
                          {retentionHistory[0].immediateCoachedValue} {retentionHistory[0].unit}
                        </span>
                        <span className="text-xs font-sans text-[#52525B]">
                          With active 3-count drill & external cue
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F3EFE6]/60 border border-[#E2DDD2] flex flex-col gap-1 font-mono tabular-nums">
                        <span className="text-xs text-[#52525B]">
                          3. UNPROMPTED RETENTION (+{retentionHistory[0].sessionGapHours}H)
                        </span>
                        <span className="text-2xl font-bold text-[#15803D]">
                          {retentionHistory[0].unpromptedRetentionValue} {retentionHistory[0].unit}
                        </span>
                        <span className="text-xs font-sans text-[#15803D] font-semibold">
                          {retentionHistory[0].retentionStatus} (
                          {(retentionHistory[0].retentionRatio * 100).toFixed(0)}% reps held)
                        </span>
                      </div>
                    </div>
                  )}

                  {retentionHistory[0] && (
                    <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E2DDD2] flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-bold text-[#18181B]">
                          Motor Learning Retention Verdict:
                        </span>
                        <span className="text-[#52525B] leading-relaxed">
                          {retentionHistory[0].coachTakeaway}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Optional DIY ESP32 Squash Ball Launcher Feed Interface */}
                  <Esp32BallLauncherPanel
                    onSelectVariationFeed={(desc) => setFeedVariationDesc(desc)}
                  />
                </div>
              </section>
            )}

            {/* Expandable Biomechanics Evidence & Heuristic Override Drawer */}
            {baselineAssessment && (
              <EvidenceDrawer
                assessment={baselineAssessment}
                heuristics={heuristics}
                onOverrideHeuristic={handleOverrideHeuristic}
                onResetHeuristics={handleResetHeuristics}
                onUpdateHypothesisStatus={handleUpdateHypothesisStatus}
              />
            )}
          </div>
        )}

        {/* ====================================================================
            VIEW B: DEDICATED BEFORE & AFTER COMPARISON STUDIO
           ==================================================================== */}
        {activeNavView === 'BEFORE_AFTER' && baselineAssessment && (
          <section className="mt-8 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#52525B]">
                  SYNCHRONIZED DTW PHASE ALIGNMENT & DELTA STUDIO
                </div>
                <h2 className="text-2xl font-bold text-[#18181B]">
                  Before vs. After Swing Comparison
                </h2>
              </div>
              {!retestAssessment && (
                <button
                  onClick={() => {
                    const improvedClip = REFERENCE_SQUASH_CLIPS.find(
                      (c) => c.clipId === 'REF-FH-RETEST-IMPROVED-5REPS'
                    )!;
                    runReferenceClipAssessment(improvedClip, 'RETEST', false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C84B31] text-white text-xs font-semibold hover:bg-[#B03E26]"
                >
                  Load 5-Rep Post-Intervention Retest Set
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono font-semibold text-[#52525B]">
                  BASELINE (HABITUAL SWING): {baselineAssessment.clipTitle}
                </span>
                <VideoPoseCanvas
                  frames={baselineAssessment.observations.flatMap((o) => o.frames)}
                  fps={baselineAssessment.observations[0]?.fps ?? 30}
                  observations={baselineAssessment.observations}
                  selectedRepIndex={selectedRepIndex}
                  onSelectRep={setSelectedRepIndex}
                  primaryFault={baselineAssessment.detectedFaults[0] || null}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono font-semibold text-[#15803D]">
                  POST-INTERVENTION RETEST:{' '}
                  {retestAssessment ? retestAssessment.clipTitle : 'Run Retest to Compare'}
                </span>
                {retestAssessment ? (
                  <VideoPoseCanvas
                    frames={retestAssessment.observations.flatMap((o) => o.frames)}
                    fps={retestAssessment.observations[0]?.fps ?? 30}
                    observations={retestAssessment.observations}
                    selectedRepIndex={selectedRepIndex}
                    onSelectRep={setSelectedRepIndex}
                    primaryFault={retestAssessment.detectedFaults[0] || null}
                    comparisonFrames={baselineAssessment.observations.flatMap((o) => o.frames)}
                    comparisonLabel="Baseline Ghost"
                  />
                ) : (
                  <div className="aspect-video rounded-2xl border border-[#E2DDD2] bg-[#F3EFE6] flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <FileVideo className="w-8 h-8 text-[#52525B]" />
                    <p className="text-sm font-semibold text-[#18181B]">
                      No Retest Recording Loaded Yet
                    </p>
                    <button
                      onClick={() => {
                        const improvedClip = REFERENCE_SQUASH_CLIPS.find(
                          (c) => c.clipId === 'REF-FH-RETEST-IMPROVED-5REPS'
                        )!;
                        runReferenceClipAssessment(improvedClip, 'RETEST', false);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C84B31] text-white text-xs font-semibold"
                    >
                      Load Post-Drill Retest Set
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ====================================================================
            VIEW C: LONGITUDINAL RETENTION LOG & PLAYER BASELINE
           ==================================================================== */}
        {activeNavView === 'RETENTION_LOG' && (
          <section className="mt-8 flex flex-col gap-6">
            <div className="p-6 rounded-2xl border border-[#E2DDD2] bg-white flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#52525B]">
                    HABITUAL BASELINE VS. EFFECTIVE TECHNIQUE & RETENTION HISTORY
                  </div>
                  <h2 className="text-2xl font-bold text-[#18181B]">
                    Player Technique Baseline & Longitudinal Retention Log
                  </h2>
                </div>
                <History className="w-5 h-5 text-[#C84B31]" />
              </div>

              <p className="text-xs text-[#52525B] bg-[#F3EFE6] p-3.5 rounded-xl border border-[#E2DDD2]">
                <strong className="text-[#18181B]">Architectural Note:</strong>{' '}
                {playerBaseline.noteOnHabitualVsEffective}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-[#E2DDD2] text-[#52525B]">
                      <th className="py-2.5 pr-4">Session</th>
                      <th className="py-2.5 px-3">Target Variable</th>
                      <th className="py-2.5 px-3 text-right">Habitual Baseline</th>
                      <th className="py-2.5 px-3 text-right">Immediate Coached</th>
                      <th className="py-2.5 px-3 text-right">Unprompted Retention</th>
                      <th className="py-2.5 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD2]/60">
                    {retentionHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center font-sans text-[#52525B]">
                          No unprompted retention tests recorded yet. Complete Stage 6 (&ldquo;Did It
                          Stick?&rdquo;) to log a retention check.
                        </td>
                      </tr>
                    ) : (
                      retentionHistory.map((r) => (
                        <tr key={r.retentionId}>
                          <td className="py-3 pr-4 font-sans font-semibold text-[#18181B]">
                            {r.sessionLabel}
                          </td>
                          <td className="py-3 px-3 font-sans">{r.targetVariableLabel}</td>
                          <td className="py-3 px-3 text-right">
                            {r.habitualBaselineValue} {r.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-[#C84B31] font-semibold">
                            {r.immediateCoachedValue} {r.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-[#15803D] font-bold">
                            {r.unpromptedRetentionValue} {r.unit}
                          </td>
                          <td className="py-3 pl-3 font-semibold">{r.retentionStatus}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pastAssessments.length > 0 && (
                <div className="pt-4 border-t border-[#E2DDD2] flex flex-col gap-2">
                  <span className="text-xs font-mono text-[#52525B]">
                    RECENT RECORDED TECHNIQUE ASSESSMENTS ({pastAssessments.length}):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pastAssessments.slice(0, 6).map((a) => (
                      <div
                        key={a.assessmentId}
                        className="p-3.5 rounded-xl border border-[#E2DDD2] bg-[#FBF9F5] flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-[#18181B]">{a.clipTitle}</span>
                          <span className="text-[11px] font-mono text-[#52525B]">
                            {a.outcomeStatus} · {a.observations.length} Reps ·{' '}
                            {a.detectedFaults[0]?.title || 'No Fault / Abstained'}
                          </span>
                        </div>
                        <Target className="w-4 h-4 text-[#C84B31] shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ====================================================================
            VIEW D: MULTI-TURN GEMINI SQUASH BIOMECHANICS COACH CHAT
           ==================================================================== */}
        {activeNavView === 'COACH_CHAT' && baselineAssessment && (
          <section className="mt-8">
            <CoachChatPanel
              assessment={baselineAssessment}
              outcome={correctionOutcome}
              retentions={retentionHistory}
            />
          </section>
        )}
      </main>

      {/* Quiet Editorial Footer (No Fake Telemetry Tickers per Frontend-Design Skill) */}
      <footer className="mt-16 border-t border-[#E2DDD2] py-6 px-6 text-xs text-[#52525B]">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#C84B31]" />
            <span className="font-semibold text-[#18181B]">SwingF/X</span>
            <span aria-hidden="true">·</span>
            <span>Diagnose My Swing — and Fix It!</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Architecture Specification: DOCS/ARCHITECTURE.md</span>
            <span aria-hidden="true">·</span>
            <span>BIDLR / Tauri 2 Compatible</span>
          </div>
        </div>
      </footer>
      <span className="app-version" aria-label={`SwingF/X version ${buildVersion.version}`}>
        v{buildVersion.version}
      </span>
    </div>
  );
};

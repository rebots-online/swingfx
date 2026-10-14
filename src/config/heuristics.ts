import { HeuristicThresholdConfig, StrokeCategory } from '../types/swingfx';

/**
 * SwingF/X Hierarchical Squash Technique-Fault Taxonomy (v0.1)
 *
 * IMPORTANT ARCHITECTURAL INVARIANT:
 * All numerical thresholds below are provisional, configurable coaching heuristics
 * (provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1'), NOT universal biomechanical laws.
 * They are normalized to player body proportions where applicable and support
 * runtime Coach Override with full provenance tracking.
 */

export const INITIAL_HEURISTIC_TAXONOMY: HeuristicThresholdConfig[] = [
  // ============================================================================
  // 1. FOREHAND STROKE (FOREHAND)
  // ============================================================================
  {
    faultId: 'FH-PREP-UL-01',
    strokeCategory: 'FOREHAND',
    movementPhase: 'PREPARATION',
    bodyPart: 'UPPER_LIMB',
    title: 'Late / Low Racket Preparation',
    briefDescription:
      'Dominant wrist remains below elbow height and upper-arm elevation stays pinned low during the first half of the forehand preparation phase.',
    metricKey: 'prepWristAboveElbowRatio',
    metricLabel: 'Prep Wrist-to-Elbow Elevation Ratio',
    operator: '<',
    defaultThresholdValue: 0.05,
    activeThresholdValue: 0.05,
    targetEffectiveRange: [0.12, 0.42],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Directly observable at 30–60 fps during the slower preparation phase when the hitting arm is not occluded by the torso.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-PREP-1',
        title: 'Delayed split-step and late visual cue pickup',
        mechanism:
          'Initiating the shoulder turn and arm lift only after the ball bounces forces a rushed, low loop to get the racket back in time.',
        defaultConfidence: 0.81,
        disambiguationTest:
          'Test with an auditory bounce-call cue: if calling "Set!" as the ball leaves the front wall immediately restores high wrist preparation, timing/cue recognition is the primary driver.',
      },
      {
        id: 'RC-FH-PREP-2',
        title: 'Habitual low "pancake" backswing path',
        mechanism:
          'Motor habit of sweeping the racket straight back below waist level rather than hinging the elbow and cocking the wrist upward.',
        defaultConfidence: 0.64,
        disambiguationTest:
          'Check shadow swings without a ball: if the wrist still drops below the elbow with zero time pressure, the pattern is a structural motor habit.',
      },
      {
        id: 'RC-FH-PREP-3',
        title: 'Rushed approach footwork from the T',
        mechanism:
          'Running toward the side wall with the racket down for balance instead of preparing the upper body on the first stride.',
        defaultConfidence: 0.48,
        disambiguationTest:
          'Compare stationary self-drop feeds vs. movement ghosting feeds.',
      },
    ],
    downstreamSymptoms: [
      'Rushed downswing acceleration with late contact behind the lead hip',
      'Compensatory wrist flick at impact resulting in inconsistent length',
      'Loss of hold and deception between straight drive and front-court drop',
    ],
    defaultDrill: {
      drillTitle: '3-Count Early-Set Pause Forehand Drill',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Count 1 (Split & Lift): As the feed leaves the front wall, cock the dominant wrist above elbow height and lift the hitting elbow clear of the ribs.',
        'Count 2 (Stride & Hold Set): Move into the lunge position while holding the high-wrist diamond frame steady for a perceptible beat.',
        'Count 3 (Release Through Target): Sweep smoothly through the impact zone and rebound to the T. Repeat for 5 controlled repetitions.',
      ],
      onCourtCue: 'Show the butt-cap to the front wall before your lead foot plants.',
      targetVariableDescription:
        'Increase Prep Wrist-to-Elbow Elevation Ratio above +0.12 × torso length during the preparation phase.',
    },
  },
  {
    faultId: 'FH-BACK-TC-01',
    strokeCategory: 'FOREHAND',
    movementPhase: 'BACKSWING',
    bodyPart: 'TRUNK_CORE',
    title: 'Insufficient Shoulder-Pelvis Coil',
    briefDescription:
      'Upper torso fails to rotate toward the side wall relative to the pelvis during backswing set, producing an arm-dominated forehand swing.',
    metricKey: 'backswingShoulderPelvisCoilDeg',
    metricLabel: 'Backswing Shoulder-Pelvis Separation',
    operator: '<',
    defaultThresholdValue: 16,
    activeThresholdValue: 16,
    targetEffectiveRange: [22, 45],
    unit: 'deg',
    normalizationBasis: 'DEGREES',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Model-derived (INFERRED) from 3D world landmarks and transverse shoulder/hip projection; sensitive to extreme camera azimuth angles.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-COIL-1',
        title: 'Approaching with chest squared to the front wall',
        mechanism:
          'Moving laterally toward the right wall while keeping the sternum facing forward prevents thoracic rotation.',
        defaultConfidence: 0.76,
        disambiguationTest:
          'Have player point non-dominant hand across body toward the side wall during approach.',
      },
      {
        id: 'RC-FH-COIL-2',
        title: 'Passive non-dominant balance arm dropped at hip',
        mechanism:
          'Without the non-dominant arm counter-balancing and guiding the shoulder turn, the upper trunk stays uncoiled.',
        defaultConfidence: 0.58,
        disambiguationTest:
          'Observe left/non-dominant wrist height during backswing peak.',
      },
    ],
    downstreamSymptoms: [
      'Low ball speed despite high perceived arm effort',
      'Ball drifting into the middle of the court instead of hugging the side wall',
    ],
    defaultDrill: {
      drillTitle: 'Guide-Hand Side-Wall Coil & Drive',
      drillModality: 'SELF_DROP_FEED',
      drillProtocolSteps: [
        'Start on the T and reach the non-dominant guide hand across toward the side wall as you turn your shoulders.',
        'Verify your back number/shoulder is visible to the front wall at the top of the backswing.',
        'Uncoil the torso smoothly into the ball for 5 repetitions.',
      ],
      onCourtCue: 'Point your free hand at the side wall to wind the spring.',
      targetVariableDescription:
        'Achieve at least 22° of projected shoulder-to-pelvis coil at peak backswing.',
    },
  },
  {
    faultId: 'FH-CONT-SP-01',
    strokeCategory: 'FOREHAND',
    movementPhase: 'CONTACT',
    bodyPart: 'SPACING_WRIST',
    title: 'Cramped Lateral Ball Spacing',
    briefDescription:
      'Player over-runs the ball laterally, pinning the hitting elbow close to the ribcage during the impact window.',
    metricKey: 'contactLateralWristHipRatio',
    metricLabel: 'Impact Lateral Wrist-to-Hip Spacing',
    operator: '<',
    defaultThresholdValue: 0.36,
    activeThresholdValue: 0.36,
    targetEffectiveRange: [0.44, 0.72],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Reliable from rear-diagonal or back-wall camera view; degraded if camera is strictly side-on.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-SPACE-1',
        title: 'Over-striding directly toward the ball line without a braking spacer step',
        mechanism:
          'Tracking the ball with the body center of mass rather than maintaining a racket-length hitting corridor.',
        defaultConfidence: 0.79,
        disambiguationTest:
          'Place a floor target marker 1 racket-length inside the ball bounce line and check if spacing normalizes.',
      },
      {
        id: 'RC-FH-SPACE-2',
        title: 'Late racket preparation encouraging close body proximity',
        mechanism:
          'When the racket is not prepared early, players subconsciously step closer to the ball to shorten the reach distance.',
        defaultConfidence: 0.52,
        disambiguationTest:
          'Check if FH-PREP-UL-01 co-occurs on the same repetitions.',
      },
    ],
    downstreamSymptoms: [
      'Jammed elbow path at contact',
      'Scooping upward follow-through lacking crisp flat pace',
    ],
    defaultDrill: {
      drillTitle: 'Racket-Corridor Spacer Step Drive',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Visualize a 60 cm hitting lane between your lead hip and the side-wall ball line.',
        'Plant your lead heel inside the lane and extend the forearm cleanly through the impact zone.',
        'Complete 5 repetitions focusing on comfortable arm extension at contact.',
      ],
      onCourtCue: 'Leave a full racket-length corridor between your front hip and the ball.',
      targetVariableDescription:
        'Maintain lateral wrist-to-hip spacing between 0.44 and 0.72 × torso length through the impact window.',
    },
  },
  {
    faultId: 'FH-CONT-TM-02',
    strokeCategory: 'FOREHAND',
    movementPhase: 'CONTACT',
    bodyPart: 'SPACING_WRIST',
    title: 'Trailing Contact Point Behind Lead Hip',
    briefDescription:
      'Peak wrist velocity (estimated impact window) occurs while the hitting hand trails behind the lead hip/knee plane.',
    metricKey: 'contactLongitudinalLeadKneeOffsetRatio',
    metricLabel: 'Impact Wrist-to-Lead-Hip Longitudinal Offset',
    operator: '<',
    defaultThresholdValue: -0.02,
    activeThresholdValue: -0.02,
    targetEffectiveRange: [0.05, 0.30],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Estimated at peak wrist velocity frame (INFERRED impact window); best observed from side-gallery or diagonal perspective.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-CONT-1',
        title: 'Downstream consequence of late racket preparation',
        mechanism:
          'Delayed backswing leaves insufficient time to bring the racket head level with the lead knee before the ball passes.',
        defaultConfidence: 0.83,
        disambiguationTest:
          'Resolve preparation timing first and observe whether contact point automatically shifts forward.',
      },
      {
        id: 'RC-FH-CONT-2',
        title: 'Waiting for the ball to drop too low after the bounce',
        mechanism:
          'Allowing the ball to decay behind the back foot rather than striking at the top of the bounce arc.',
        defaultConfidence: 0.59,
        disambiguationTest:
          'Call "Bounce-Hit" cadence to strike at the apex of the bounce.',
      },
    ],
    downstreamSymptoms: [
      'Shots pushed cross-court into the middle',
      'Difficulty disguising front-court drop vs. deep drive',
    ],
    defaultDrill: {
      drillTitle: 'Top-of-Bounce Lead-Knee Strike Drill',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Say "Bounce" aloud as the ball hits the floor and "Hit" at the very top of the bounce arc.',
        'Ensure the racket meets the ball slightly in front of your lead knee pocket.',
        'Perform 5 repetitions and verify forward contact plane.',
      ],
      onCourtCue: 'Meet the ball out in front of your lead knee pocket.',
      targetVariableDescription:
        'Shift longitudinal wrist-to-lead-hip offset at peak velocity above +0.05 × torso length.',
    },
  },
  {
    faultId: 'FH-FOOT-LL-01',
    strokeCategory: 'FOREHAND',
    movementPhase: 'FOOTWORK_LUNGE',
    bodyPart: 'LOWER_LIMB_FOOTWORK',
    title: 'Excessive Forward Trunk Collapse on Lunge',
    briefDescription:
      'Upper torso pitches steeply forward over the lead knee at the bottom of the lunge rather than maintaining a stable, tall spine.',
    metricKey: 'lungeTrunkInclinationDeg',
    metricLabel: 'Lunge Trunk Forward Inclination',
    operator: '>',
    defaultThresholdValue: 42,
    activeThresholdValue: 42,
    targetEffectiveRange: [15, 34],
    unit: 'deg',
    normalizationBasis: 'DEGREES',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Directly observable (OBSERVED) from side or diagonal-back camera perspectives.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-LUNGE-1',
        title: 'Stopping one step short and bending at the waist to reach',
        mechanism:
          'Substituting spinal flexion for the final adjustment step and hip drop.',
        defaultConfidence: 0.80,
        disambiguationTest:
          'Add a mandatory micro-adjustment step before the final lunge plant.',
      },
      {
        id: 'RC-FH-LUNGE-2',
        title: 'Insufficient lead-leg heel plant and glute/quad deceleration',
        mechanism:
          'Landing on the forefoot rather than the heel causes forward momentum to tip the trunk over the knee.',
        defaultConfidence: 0.65,
        disambiguationTest:
          'Perform a 2-second freeze at the bottom of the lunge with heel planted first.',
      },
    ],
    downstreamSymptoms: [
      'Delayed, multi-step recovery back to the T',
      'Head dropping rapidly during the impact window',
    ],
    defaultDrill: {
      drillTitle: 'Tall-Chest Heel-Plant Lunge & 2s Freeze',
      drillModality: 'GHOSTING',
      drillProtocolSteps: [
        'Ghost from the T into the forehand corner, planting the lead heel first to absorb momentum through the hips.',
        'Freeze for 2 seconds at the bottom of the lunge with your chest badge visible to the front wall.',
        'Push smoothly off the lead heel back to the T for 5 repetitions.',
      ],
      onCourtCue: 'Sink your hips down, keep your chest badge tall.',
      targetVariableDescription:
        'Keep lunge trunk inclination below 34° from vertical at minimum hip height.',
    },
  },
  {
    faultId: 'FH-REC-FW-01',
    strokeCategory: 'FOREHAND',
    movementPhase: 'FOLLOW_THROUGH_RECOVERY',
    bodyPart: 'LOWER_LIMB_FOOTWORK',
    title: 'Delayed Post-Shot T-Recovery Impulse',
    briefDescription:
      'Player lingers in the hitting stance after contact instead of using the follow-through and lead-leg rebound to return immediately to the T.',
    metricKey: 'recoveryInitiationLatencySec',
    metricLabel: 'Post-Impact Recovery Initiation Latency',
    operator: '>',
    defaultThresholdValue: 0.75,
    activeThresholdValue: 0.75,
    targetEffectiveRange: [0.28, 0.58],
    unit: 's',
    normalizationBasis: 'SECONDS',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Measured in frame-quantized seconds from peak wrist velocity to 20% center-of-mass return displacement.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-FH-REC-1',
        title: 'Downstream result of forward trunk collapse in the lunge',
        mechanism:
          'When the torso collapses past the lead knee, the player must first lift their upper body before pushing off the floor.',
        defaultConfidence: 0.78,
        disambiguationTest:
          'Inspect lunge trunk inclination (FH-FOOT-LL-01) on the same repetitions.',
      },
      {
        id: 'RC-FH-REC-2',
        title: 'Admiring the shot / ball-watching until front-wall rebound',
        mechanism:
          'Pausing in the corner to watch the ball strike the front wall before initiating the first recovery step.',
        defaultConfidence: 0.62,
        disambiguationTest:
          'Cue immediate push-off before the ball reaches the front wall.',
      },
    ],
    downstreamSymptoms: [
      'Arriving late at the T and getting caught flat-footed on opponent reply',
    ],
    defaultDrill: {
      drillTitle: 'Strike-and-Rebound T-Touch Drill',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Execute the forehand drive and immediately push off the lead heel as the racket finishes its follow-through.',
        'Aim to have your first recovery foot land back toward the T before your shot hits the front wall.',
        'Complete 5 consecutive strike-and-rebound repetitions.',
      ],
      onCourtCue: 'Let your follow-through pull your front foot straight back to the T.',
      targetVariableDescription:
        'Reduce post-impact recovery initiation latency below 0.58 s.',
    },
  },

  // ============================================================================
  // 2. BACKHAND STROKE (BACKHAND)
  // ============================================================================
  {
    faultId: 'BH-PREP-UL-01',
    strokeCategory: 'BACKHAND',
    movementPhase: 'PREPARATION',
    bodyPart: 'UPPER_LIMB',
    title: 'Collapsed Across-Chest Elbow Preparation',
    briefDescription:
      'Hitting elbow is pinned tight against the lower chest with the wrist dropped during backhand preparation rather than forming a raised backhand diamond.',
    metricKey: 'backhandElbowChestSpacingRatio',
    metricLabel: 'Backhand Prep Elbow-to-Chest Spacing',
    operator: '<',
    defaultThresholdValue: 0.28,
    activeThresholdValue: 0.28,
    targetEffectiveRange: [0.34, 0.58],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Observable from back-wall or left-diagonal camera angles.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-BH-PREP-1',
        title: 'Pulling the arm across the body without turning the shoulders first',
        mechanism:
          'Adducting the shoulder across an unrotated chest pins the humerus against the ribcage.',
        defaultConfidence: 0.82,
        disambiguationTest:
          'Initiate preparation by turning the lead shoulder under the chin before folding the elbow.',
      },
    ],
    downstreamSymptoms: [
      'Weak, sliced backhand drives that die before the back wall',
      'Difficulty generating leverage on high backhand volleys',
    ],
    defaultDrill: {
      drillTitle: 'Backhand High-Diamond Frame Set Drill',
      drillModality: 'SELF_DROP_FEED',
      drillProtocolSteps: [
        'Turn your lead shoulder toward the side wall and create a Fist-Width space between your hitting elbow and ribs.',
        'Cock the wrist so the racket head points above your rear shoulder.',
        'Hit 5 clean backhand drives maintaining the diamond frame on setup.',
      ],
      onCourtCue: 'Build a tall window under your front armpit on the backswing.',
      targetVariableDescription:
        'Maintain backhand prep elbow-to-chest spacing above 0.34 × torso length.',
    },
  },
  {
    faultId: 'BH-CONT-TC-01',
    strokeCategory: 'BACKHAND',
    movementPhase: 'CONTACT',
    bodyPart: 'TRUNK_CORE',
    title: 'Premature Chest Opening Before Impact',
    briefDescription:
      'Player yanks the rear shoulder and chest open toward the front wall before the racket reaches the backhand impact zone.',
    metricKey: 'backhandEarlyChestOpeningDeg',
    metricLabel: 'Pre-Impact Chest Opening Angle',
    operator: '>',
    defaultThresholdValue: 45,
    activeThresholdValue: 45,
    targetEffectiveRange: [10, 32],
    unit: 'deg',
    normalizationBasis: 'DEGREES',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Model-derived (INFERRED) from transverse shoulder orientation prior to peak wrist speed.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-BH-OPEN-1',
        title: 'Attempting to generate power by heaving the trunk open',
        mechanism:
          'Replacing sequential forearm/shoulder release with early torso rotation pulls the swing path off-line toward the middle.',
        defaultConfidence: 0.77,
        disambiguationTest:
          'Keep rear hand extending back toward the back corner during impact.',
      },
    ],
    downstreamSymptoms: [
      'Backhand drives spraying loose into the center of the court',
    ],
    defaultDrill: {
      drillTitle: 'Rear-Arm Counterbalance Backhand Rail Drill',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'As you swing through the backhand, extend your non-hitting arm backward toward the rear corner as a counterbalance.',
        'Keep your chest facing the side wall through the entire impact window.',
        'Repeat for 5 straight backhand drives.',
      ],
      onCourtCue: 'Keep your chest facing the side wall and spread your wings through contact.',
      targetVariableDescription:
        'Keep pre-impact chest opening angle below 32° so the swing stays on the rail.',
    },
  },
  {
    faultId: 'BH-FOOT-LL-01',
    strokeCategory: 'BACKHAND',
    movementPhase: 'FOOTWORK_LUNGE',
    bodyPart: 'LOWER_LIMB_FOOTWORK',
    title: 'Over-Blocked / Crossed Lead Foot Stance',
    briefDescription:
      'Lead foot steps excessively across toward the side wall with inward knee projection, locking the hips during follow-through and recovery.',
    metricKey: 'backhandLeadFootCrossOffsetRatio',
    metricLabel: 'Lead-to-Rear Ankle Lateral Cross Ratio',
    operator: '>',
    defaultThresholdValue: 0.55,
    activeThresholdValue: 0.55,
    targetEffectiveRange: [0.10, 0.42],
    unit: '× hip width',
    normalizationBasis: 'HIP_WIDTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Observable from rear camera view when both ankles and knees are visible.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-BH-FOOT-1',
        title: 'Entering the backhand corner on a single long cross-step',
        mechanism:
          'Skipping the penultimate adjustment step forces an over-crossed final lunge stride.',
        defaultConfidence: 0.75,
        disambiguationTest:
          'Use a 2-step shuffle-and-lunge rhythm into the backhand corner.',
      },
    ],
    downstreamSymptoms: [
      'Blocked follow-through and awkward twisting exit from the backhand corner',
    ],
    defaultDrill: {
      drillTitle: 'Open-Hip Alignment Backhand Lunge Drill',
      drillModality: 'GHOSTING',
      drillProtocolSteps: [
        'Approach the backhand corner using a small penultimate adjustment step before lunging.',
        'Point the lead toe at a 45° angle toward the front-left corner so the knee tracks cleanly over the foot.',
        'Complete 5 ghosting + feed repetitions.',
      ],
      onCourtCue: 'Step toward the front corner, not across into the side wall.',
      targetVariableDescription:
        'Reduce lateral ankle cross offset below 0.42 × hip width.',
    },
  },

  // ============================================================================
  // 3. VOLLEY STROKE (VOLLEY)
  // ============================================================================
  {
    faultId: 'VL-PREP-UL-01',
    strokeCategory: 'VOLLEY',
    movementPhase: 'PREPARATION',
    bodyPart: 'UPPER_LIMB',
    title: 'Overswinging Backswing on Volley',
    briefDescription:
      'Dominant wrist retracts deep behind the posterior shoulder plane when preparing for a fast mid-court volley.',
    metricKey: 'volleyBackswingRetractionRatio',
    metricLabel: 'Volley Backswing Posterior Retraction',
    operator: '>',
    defaultThresholdValue: 0.30,
    activeThresholdValue: 0.30,
    targetEffectiveRange: [0.05, 0.22],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Observable from side or diagonal camera perspective during T-zone volley interception.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-VL-PREP-1',
        title: 'Using full groundstroke backswing mechanics on a time-pressured volley',
        mechanism:
          'Failing to compact the preparation in front of the shoulder plane when intercepting in mid-court.',
        defaultConfidence: 0.84,
        disambiguationTest:
          'Practice volleying with back close to a wall or barrier so the racket cannot swing behind the body.',
      },
    ],
    downstreamSymptoms: [
      'Late contact behind the body on fast crosscourt balls',
      'Frequent mishits or framed volleys',
    ],
    defaultDrill: {
      drillTitle: 'In-Front-of-Glass Compact Volley Punch',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Set the racket out in front of your chest where you can see both the strings and the ball in the same field of view.',
        'Use a compact 20 cm shoulder turn and punch cleanly through the volley.',
        'Complete 5 rapid volley interceptions.',
      ],
      onCourtCue: 'Keep your hands in your peripheral vision—punch, do not wind up.',
      targetVariableDescription:
        'Limit posterior wrist retraction to less than 0.22 × torso length on volleys.',
    },
  },
  {
    faultId: 'VL-FOOT-LL-01',
    strokeCategory: 'VOLLEY',
    movementPhase: 'FOOTWORK_LUNGE',
    bodyPart: 'LOWER_LIMB_FOOTWORK',
    title: 'Static / Flat-Footed Volley Strike',
    briefDescription:
      'Player reaches for the volley with the arm alone while the center of mass remains static without forward weight transfer.',
    metricKey: 'volleyForwardComTransferRatio',
    metricLabel: 'Volley Center-of-Mass Weight Transfer',
    operator: '<',
    defaultThresholdValue: 0.08,
    activeThresholdValue: 0.08,
    targetEffectiveRange: [0.12, 0.28],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Computed from pelvis centroid displacement across prep-to-impact frames.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-VL-FOOT-1',
        title: 'Omitting the pre-volley split-step on the T',
        mechanism:
          'Flat heels on the T prevent a quick crossover step into the volley line.',
        defaultConfidence: 0.79,
        disambiguationTest:
          'Cue an audible split-step hop as the feeder strikes the ball.',
      },
    ],
    downstreamSymptoms: [
      'Floating volleys that sit up in the middle of the court',
    ],
    defaultDrill: {
      drillTitle: 'Split-and-Step-Across Volley Interception',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Perform a light split-step on the balls of your feet as the feed is struck.',
        'Step across with the lead foot into the shot line as you punch the volley deep.',
        'Repeat for 5 repetitions.',
      ],
      onCourtCue: 'Split, step across, and transfer your belt buckle through the volley.',
      targetVariableDescription:
        'Increase forward/lateral COM transfer above 0.12 × torso length during volley execution.',
    },
  },

  // ============================================================================
  // 4. DROP & BOAST (DROP_BOAST)
  // ============================================================================
  {
    faultId: 'DB-PREP-UL-01',
    strokeCategory: 'DROP_BOAST',
    movementPhase: 'PREPARATION',
    bodyPart: 'UPPER_LIMB',
    title: 'Telegraphed Low Preparation on Drop Shot',
    briefDescription:
      'Player lowers the racket head early during the approach to a front-court drop shot, giving away the shot intention immediately.',
    metricKey: 'dropPrepElevationRetentionRatio',
    metricLabel: 'Drop Shot Prep Elevation vs. Drive Baseline',
    operator: '<',
    defaultThresholdValue: 0.75,
    activeThresholdValue: 0.75,
    targetEffectiveRange: [0.85, 1.10],
    unit: 'ratio',
    normalizationBasis: 'PHASE_RATIO',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Compares preparation wrist height on drop shots against standard drive preparation.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-DB-PREP-1',
        title: 'Separating "power setup" from "touch setup" too early',
        mechanism:
          'Preparing with a low, passive hand when planning a drop shot instead of showing an identical drive preparation.',
        defaultConfidence: 0.82,
        disambiguationTest:
          'Call "Drive" or "Drop" only after the player has completed their backswing set.',
      },
    ],
    downstreamSymptoms: [
      'Opponent reads the drop shot before impact and counter-drops easily',
    ],
    defaultDrill: {
      drillTitle: 'Late-Call Drive-or-Drop Deception Drill',
      drillModality: 'PARTNER_MANUAL_FEED',
      drillProtocolSteps: [
        'Approach every front-court feed with the exact same high-wrist drive preparation.',
        'Soften the hand and shape the drop only in the final downswing phase.',
        'Complete 5 deceptive drop repetitions.',
      ],
      onCourtCue: 'Sell the drive with your setup, whisper the drop with your fingers.',
      targetVariableDescription:
        'Maintain drop-shot preparation elevation at ≥0.85 of standard drive preparation height.',
    },
  },
  {
    faultId: 'DB-CONT-LL-01',
    strokeCategory: 'DROP_BOAST',
    movementPhase: 'CONTACT',
    bodyPart: 'LOWER_LIMB_FOOTWORK',
    title: 'Rising Out of Lunge During Delicate Contact',
    briefDescription:
      'Pelvis and head lift upward during the downswing-to-impact window of a drop shot or boast, causing the ball to pop up or clip the tin.',
    metricKey: 'dropLungePelvisRiseRatio',
    metricLabel: 'Impact-Window Pelvis Vertical Rise',
    operator: '>',
    defaultThresholdValue: 0.08,
    activeThresholdValue: 0.08,
    targetEffectiveRange: [0.0, 0.04],
    unit: '× torso',
    normalizationBasis: 'TORSO_LENGTH',
    provenance: 'PROVISIONAL_COACH_HEURISTIC_V0.1',
    observabilityNotes:
      'Directly observable (OBSERVED) from hip vertical trajectory through the impact window.',
    updatedAt: '2026-10-13T00:00:00Z',
    plausibleRootCauses: [
      {
        id: 'RC-DB-RISE-1',
        title: 'Rushing to exit toward the T before finishing the touch stroke',
        mechanism:
          'Extending the lead knee during contact lifts the entire arm-racket system upward.',
        defaultConfidence: 0.80,
        disambiguationTest:
          'Hold the low lunge posture until the ball touches the front wall.',
      },
    ],
    downstreamSymptoms: [
      'Drop shots floating high above the tin or catching the top of the tin',
    ],
    defaultDrill: {
      drillTitle: 'Stay-Down Until Front-Wall Touch Drop Drill',
      drillModality: 'SELF_DROP_FEED',
      drillProtocolSteps: [
        'Lunge low behind the ball and keep your head and hips at a constant height through impact.',
        'Hold your low lunge level until you hear the ball kiss the front wall, then push back.',
        'Repeat for 5 controlled front-court drops.',
      ],
      onCourtCue: 'Keep your eyes and hips level with the ball until it kisses the front wall.',
      targetVariableDescription:
        'Keep vertical pelvis rise during the impact window below 0.04 × torso length.',
    },
  },
];

export function getHeuristicsByStroke(
  heuristics: HeuristicThresholdConfig[],
  stroke: StrokeCategory
): HeuristicThresholdConfig[] {
  return heuristics.filter((h) => h.strokeCategory === stroke);
}

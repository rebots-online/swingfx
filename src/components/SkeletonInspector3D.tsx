import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FramePoseSample, MovementObservation } from '../types/swingfx';
import { ChevronDown, ChevronUp, Eye, Play, Pause } from 'lucide-react';

interface SkeletonInspector3DProps {
  observation: MovementObservation;
  showTargetOverlayByDefault?: boolean;
}

const BONE_PAIRS: Array<[number, number]> = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

const KEY_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

// Module-scope reusable math helpers (Zero GC in render loop per Three.js skill)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 0.05, 0);

type CameraPreset = 'REAR_DIAGONAL' | 'SIDE_SAGITTAL' | 'OVERHEAD_COIL' | 'FRONT_WALL';

const CAMERA_PRESETS: Record<CameraPreset, [number, number, number]> = {
  REAR_DIAGONAL: [0.95, 0.55, 1.55],
  SIDE_SAGITTAL: [1.65, 0.25, 0.05],
  OVERHEAD_COIL: [0.05, 1.85, 0.45],
  FRONT_WALL: [0.0, 0.35, -1.65],
};

export const SkeletonInspector3D: React.FC<SkeletonInspector3DProps> = ({
  observation,
  showTargetOverlayByDefault = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('REAR_DIAGONAL');
  const [showCorrectiveTarget, setShowCorrectiveTarget] = useState<boolean>(
    showTargetOverlayByDefault
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [frameCursor, setFrameCursor] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const stateRef = useRef({
    cameraPreset,
    showCorrectiveTarget,
    isPlaying,
    frameCursor,
    frames: observation.frames,
  });

  useEffect(() => {
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.showCorrectiveTarget = showCorrectiveTarget;
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.frameCursor = frameCursor;
    stateRef.current.frames = observation.frames;
  }, [cameraPreset, showCorrectiveTarget, isPlaying, frameCursor, observation.frames]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setFrameCursor((prev) => (prev + 1) % Math.max(1, observation.frames.length));
    }, 60);
    return () => window.clearInterval(timer);
  }, [isPlaying, observation.frames.length]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(...CAMERA_PRESETS.REAR_DIAGONAL);
    camera.lookAt(0, 0.05, 0);

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment per Three.js skill)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Balanced 3-Point Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(2.2, 3.5, 2.0);
    keyLight.castShadow = !isHeadless;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-2.0, 1.8, -1.5);
    scene.add(fillLight);

    // Squash court floor plane + radial contact shadow grounding
    const floorGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f26,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.62;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(2.8, 14, 0xc84b31, 0x2e3440);
    gridHelper.position.y = -0.618;
    scene.add(gridHelper);

    // Build Habitual Player 3D Skeleton Meshes
    const jointGeo = new THREE.SphereGeometry(0.026, 20, 20);
    const boneGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 14);

    const habitualJointMat = new THREE.MeshPhysicalMaterial({
      color: 0xc84b31,
      roughness: 0.25,
      metalness: 0.35,
      clearcoat: 0.6,
    });
    const habitualBoneMat = new THREE.MeshStandardMaterial({
      color: 0xfbf9f5,
      roughness: 0.35,
      metalness: 0.2,
    });

    const targetJointMat = new THREE.MeshPhysicalMaterial({
      color: 0x22c55e,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.65,
    });
    const targetBoneMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
    });

    const habitualGroup = new THREE.Group();
    const targetGroup = new THREE.Group();
    scene.add(habitualGroup);
    scene.add(targetGroup);

    const habitualJoints = new Map<number, THREE.Mesh>();
    const targetJoints = new Map<number, THREE.Mesh>();

    for (const idx of KEY_JOINTS) {
      const hj = new THREE.Mesh(jointGeo, habitualJointMat);
      habitualGroup.add(hj);
      habitualJoints.set(idx, hj);

      const tj = new THREE.Mesh(jointGeo, targetJointMat);
      targetGroup.add(tj);
      targetJoints.set(idx, tj);
    }

    const habitualBones = BONE_PAIRS.map(() => {
      const m = new THREE.Mesh(boneGeo, habitualBoneMat);
      habitualGroup.add(m);
      return m;
    });
    const targetBones = BONE_PAIRS.map(() => {
      const m = new THREE.Mesh(boneGeo, targetBoneMat);
      targetGroup.add(m);
      return m;
    });

    const clock = new THREE.Clock();
    let animId = 0;

    const updateSkeletonGroup = (
      lm3D: FramePoseSample['landmarks3D'],
      jointMap: Map<number, THREE.Mesh>,
      boneList: THREE.Mesh[],
      isCorrectiveTarget: boolean
    ) => {
      for (const idx of KEY_JOINTS) {
        const pt = lm3D[idx];
        const mesh = jointMap.get(idx);
        if (!pt || !mesh) continue;

        let x = pt.x;
        let y = pt.y;
        let z = pt.z;

        if (isCorrectiveTarget) {
          // SIMULATED Corrective Target Posture: elevated right elbow (14) & cocked wrist (16) + taller spine
          if (idx === 14) {
            y += 0.08;
            x += 0.04;
          } else if (idx === 16) {
            y += 0.22;
            x += 0.05;
          } else if (idx === 11 || idx === 12 || idx === 0) {
            y += 0.04;
          }
        }

        mesh.position.set(x, y, z);
      }

      BONE_PAIRS.forEach(([a, b], bIdx) => {
        const meshA = jointMap.get(a);
        const meshB = jointMap.get(b);
        const cyl = boneList[bIdx];
        if (!meshA || !meshB || !cyl) return;

        _vecA.copy(meshA.position);
        _vecB.copy(meshB.position);
        const len = _vecA.distanceTo(_vecB);
        _mid.addVectors(_vecA, _vecB).multiplyScalar(0.5);
        _dir.subVectors(_vecB, _vecA).normalize();
        _quat.setFromUnitVectors(_up, _dir);

        cyl.position.copy(_mid);
        cyl.quaternion.copy(_quat);
        cyl.scale.set(1, Math.max(0.01, len), 1);
      });
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;

      // Smooth exponential camera damping
      const presetCoords = CAMERA_PRESETS[st.cameraPreset];
      _targetCamPos.set(presetCoords[0], presetCoords[1], presetCoords[2]);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5, delta);
      camera.lookAt(_targetLookAt);

      const sample =
        st.frames[Math.min(st.frames.length - 1, Math.max(0, st.frameCursor))];
      if (sample) {
        updateSkeletonGroup(sample.landmarks3D, habitualJoints, habitualBones, false);
        targetGroup.visible = st.showCorrectiveTarget;
        if (st.showCorrectiveTarget) {
          updateSkeletonGroup(sample.landmarks3D, targetJoints, targetBones, true);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      jointGeo.dispose();
      boneGeo.dispose();
      habitualJointMat.dispose();
      habitualBoneMat.dispose();
      targetJointMat.dispose();
      targetBoneMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-[#111318] rounded-2xl overflow-hidden border border-[#E2DDD2]">
      {/* Minimal Top-Left Spec Legend (Unobstructed 3D Center) */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#111318]/80 backdrop-blur-md border border-white/10 text-xs text-[#E2DDD2]">
        <span className="font-semibold text-white">3D Kinematic Studio</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#C84B31] font-mono">Habitual Pose (OBSERVED)</span>
        {showCorrectiveTarget && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#4ADE80] font-mono">Corrective Target (SIMULATED)</span>
          </>
        )}
      </div>

      {/* 3D WebGL Viewport */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Unified Collapsible Bottom Control Dock (Per Three.js Skill Section 5) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-[820px] flex flex-col items-center">
        <button
          onClick={() => setDockCollapsed((c) => !c)}
          className="px-3 py-1 rounded-t-lg bg-[#181B22]/90 backdrop-blur-md border border-b-0 border-white/15 text-[11px] font-mono text-[#E2DDD2] hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show 3D Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Hide 3D Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full px-4 py-2.5 rounded-xl bg-[#181B22]/90 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
            {/* Play/Pause & Frame Slider */}
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="min-h-[34px] min-w-[34px] rounded-lg bg-[#C84B31] text-white flex items-center justify-center hover:bg-[#B03E26] transition-colors shrink-0"
                aria-label={isPlaying ? 'Pause 3D' : 'Play 3D'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(1, observation.frames.length - 1)}
                value={frameCursor}
                onChange={(e) => {
                  setIsPlaying(false);
                  setFrameCursor(Number(e.target.value));
                }}
                className="flex-1 accent-[#C84B31] cursor-pointer"
              />
              <span className="font-mono text-[11px] text-[#A1A1AA] w-12 text-right">
                f{frameCursor}
              </span>
            </div>

            {/* Camera Angle Presets */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
              {(
                [
                  { id: 'REAR_DIAGONAL', label: 'Rear Diagonal' },
                  { id: 'SIDE_SAGITTAL', label: 'Side Lunge' },
                  { id: 'OVERHEAD_COIL', label: 'Overhead Coil' },
                  { id: 'FRONT_WALL', label: 'Front Wall' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCameraPreset(preset.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === preset.id
                      ? 'bg-white text-[#111318] font-semibold'
                      : 'text-[#E2DDD2] hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Corrective Target Ghost Toggle */}
            <button
              onClick={() => setShowCorrectiveTarget((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                showCorrectiveTarget
                  ? 'bg-[#15803D] text-white'
                  : 'bg-white/10 text-[#E2DDD2] hover:bg-white/15'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showCorrectiveTarget ? 'Target Pose: On' : 'Target Pose: Off'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

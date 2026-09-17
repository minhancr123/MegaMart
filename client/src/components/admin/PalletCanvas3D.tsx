"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export interface CanvasBox {
  id: string;
  boxCode: string;
  level: number;
  slotIndex?: number | null;
  length?: number | null; // mm
  width?: number | null; // mm
  height?: number | null; // mm
  sealedBy?: string | null;
}

export type PalletViewPreset = "perspective" | "front" | "top";

interface PalletCanvas3DProps {
  boxes: CanvasBox[];
  maxLevels?: number;
  selectedBoxId?: string | null;
  onSelectBox?: (boxId: string) => void;
  view?: PalletViewPreset;
  autoRotate?: boolean;
  height?: number;
}

const MM = 0.0012; // mm -> scene units
const DEFAULT_SIZE = { l: 400, w: 300, h: 250 };

function boxColor(box: CanvasBox, selected: boolean): string {
  if (selected) return "#ff4d00";
  if (box.sealedBy) return "#f5b942";
  return "#d9a066";
}

/** Xếp thùng theo tầng, mỗi tầng tối đa 4 ô theo slotIndex/boxCode. */
function useLayout(boxes: CanvasBox[], maxLevels: number) {
  return useMemo(() => {
    const byLevel = new Map<number, CanvasBox[]>();
    for (const b of boxes) {
      const list = byLevel.get(b.level) || [];
      list.push(b);
      byLevel.set(b.level, list);
    }
    const placed: Array<{ box: CanvasBox; pos: [number, number, number]; size: [number, number, number] }> = [];
    const gap = 0.06;
    for (const [level, list] of byLevel) {
      const sorted = [...list].sort(
        (a, b) => (a.slotIndex ?? 999) - (b.slotIndex ?? 999) || a.boxCode.localeCompare(b.boxCode),
      );
      const cols = Math.min(4, Math.max(1, sorted.length));
      sorted.forEach((box, i) => {
        const l = (box.length || DEFAULT_SIZE.l) * MM;
        const w = (box.width || DEFAULT_SIZE.w) * MM;
        const h = (box.height || DEFAULT_SIZE.h) * MM;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * (0.55 + gap);
        const z = row * (0.45 + gap);
        const y = (level - 1) * 0.62 + h / 2 + 0.1;
        placed.push({ box, pos: [x, y, z], size: [Math.min(l, 0.5), h, Math.min(w, 0.4)] });
      });
    }
    void maxLevels;
    return placed;
  }, [boxes, maxLevels]);
}

function BoxMesh({
  box,
  pos,
  size,
  selected,
  onSelect,
}: {
  box: CanvasBox;
  pos: [number, number, number];
  size: [number, number, number];
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(box.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={boxColor(box, selected)}
        emissive={selected || hovered ? "#ff4d00" : "#000000"}
        emissiveIntensity={selected ? 0.35 : hovered ? 0.15 : 0}
      />
      <Edges color={selected ? "#7a2000" : "#8a5a2b"} />
    </mesh>
  );
}

function PalletBase() {
  return (
    <group position={[0, 0.02, 0]}>
      {/* Mặt pallet */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.3, 0.05, 0.9]} />
        <meshStandardMaterial color="#b08954" />
      </mesh>
      {/* Chân pallet */}
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.02, 0]}>
          <boxGeometry args={[0.12, 0.09, 0.9]} />
          <meshStandardMaterial color="#8a6238" />
        </mesh>
      ))}
      <gridHelper args={[6, 24, "#d6c9b8", "#e8e0d2"]} position={[0, -0.07, 0]} />
    </group>
  );
}

function CameraRig({ view }: { view: PalletViewPreset }) {
  const { camera, controls, gl } = useThree((s: any) => ({
    camera: s.camera,
    controls: s.controls,
    gl: s.gl,
  }));
  const target = useMemo(() => {
    if (view === "top") return new THREE.Vector3(0, 5.2, 0.01);
    if (view === "front") return new THREE.Vector3(0, 1.1, 4.6);
    return new THREE.Vector3(3.4, 2.8, 3.8);
  }, [view]);
  // Chỉ bay camera ~1.2s sau khi đổi góc nhìn; user vừa chạm là nhả ngay
  // để OrbitControls không bị giằng co (giật hình).
  const flyUntil = useRef(0);
  useEffect(() => {
    flyUntil.current = performance.now() + 1200;
  }, [view]);
  useEffect(() => {
    const el = gl.domElement;
    const cancel = () => {
      flyUntil.current = 0;
    };
    el.addEventListener("pointerdown", cancel);
    el.addEventListener("wheel", cancel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", cancel);
      el.removeEventListener("wheel", cancel);
    };
  }, [gl]);
  useFrame(() => {
    if (performance.now() < flyUntil.current && camera.position.distanceTo(target) > 0.02) {
      camera.position.lerp(target, 0.12);
    }
    const ctl = controls as unknown as OrbitControlsImpl | null;
    ctl?.update();
  });
  return null;
}

function Scene({
  boxes,
  maxLevels,
  selectedBoxId,
  onSelectBox,
  view,
  autoRotate,
}: Omit<PalletCanvas3DProps, "height"> & { view: PalletViewPreset }) {
  const placed = useLayout(boxes, maxLevels);
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -4]} intensity={0.35} />
      <PalletBase />
      {placed.map(({ box, pos, size }) => (
        <BoxMesh
          key={box.id}
          box={box}
          pos={pos}
          size={size}
          selected={box.id === selectedBoxId}
          onSelect={onSelectBox}
        />
      ))}
      <CameraRig view={view} />
      <OrbitControls
        makeDefault
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        minDistance={1.5}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export default function PalletCanvas3D({
  boxes,
  maxLevels = 4,
  selectedBoxId,
  onSelectBox,
  view = "perspective",
  autoRotate = false,
  height = 420,
}: PalletCanvas3DProps) {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#101014]" style={{ height }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [3.4, 2.8, 3.8], fov: 45 }}
        onCreated={() => setReady(true)}
      >
        <color attach="background" args={["#101014"]} />
        <Scene
          boxes={boxes}
          maxLevels={maxLevels}
          selectedBoxId={selectedBoxId}
          onSelectBox={onSelectBox}
          view={view}
          autoRotate={autoRotate && ready}
        />
      </Canvas>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-xs text-zinc-400">
          Đang tải mô hình 3D...
        </div>
      )}
    </div>
  );
}

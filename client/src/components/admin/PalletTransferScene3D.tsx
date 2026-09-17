"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { CanvasBox } from "./PalletCanvas3D";

interface PalletTransferScene3DProps {
  sourceBoxes: CanvasBox[];
  sourceCode: string;
  destBoxes: CanvasBox[];
  destCode: string;
  destMaxLevels: number;
  /** ID thùng đang di dời (chỉ thùng này kéo được). */
  dragBoxId: string | null;
  /** Gọi khi thả thùng lên pallet đích (level đã snap). */
  onDrop: (boxId: string, targetLevel: number) => void;
  height?: number;
}

const MM = 0.0012;
const LEVEL_H = 0.62;
const BASE_Y = 0.1;
// Hai pallet đặt cách nhau theo trục X
const SOURCE_X = -1.35;
const DEST_X = 1.35;

function boxSize(b: CanvasBox): [number, number, number] {
  const l = (b.length || 400) * MM;
  const w = (b.width || 300) * MM;
  const h = (b.height || 250) * MM;
  return [Math.min(l, 0.5), h, Math.min(w, 0.4)];
}

function levelOfY(y: number, maxLevels: number): number {
  const lv = Math.floor((y - BASE_Y) / LEVEL_H) + 1;
  return Math.min(maxLevels, Math.max(1, lv));
}

function PalletBase({ x, label }: { x: number; label: string }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.3, 0.05, 0.9]} />
        <meshStandardMaterial color="#b08954" />
      </mesh>
      {[-0.55, 0, 0.55].map((lx) => (
        <mesh key={lx} position={[lx, -0.02, 0]}>
          <boxGeometry args={[0.12, 0.09, 0.9]} />
          <meshStandardMaterial color="#8a6238" />
        </mesh>
      ))}
      <Html position={[0, -0.35, 0]} center distanceFactor={8}>
        <div className="rounded-lg bg-black/70 px-2.5 py-1 font-mono text-[10px] font-bold whitespace-nowrap text-white">
          {label}
        </div>
      </Html>
    </group>
  );
}

function DraggableBox({
  box,
  pos,
  size,
  draggable,
  dragging,
  onDragStart,
}: {
  box: CanvasBox;
  pos: [number, number, number];
  size: [number, number, number];
  draggable: boolean;
  dragging: boolean;
  onDragStart: (id: string, startPos: [number, number, number]) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={pos}
      onPointerDown={(e) => {
        if (!draggable || dragging) return;
        e.stopPropagation();
        onDragStart(box.id, pos);
      }}
      onPointerOver={(e) => {
        if (!draggable) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={dragging ? "#ff4d00" : hovered && draggable ? "#f5b942" : "#d9a066"}
        emissive={dragging || hovered ? "#ff4d00" : "#000000"}
        emissiveIntensity={dragging ? 0.4 : hovered ? 0.15 : 0}
        transparent
        opacity={dragging ? 0.9 : 1}
      />
      <Edges color={dragging ? "#7a2000" : "#8a5a2b"} />
      {draggable && !dragging && (
        <Html position={[0, size[1] / 2 + 0.12, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-primary-foreground shadow select-none">
            Kéo tôi đi
          </div>
        </Html>
      )}
    </mesh>
  );
}

function StaticBox({ pos, size, dimmed }: { pos: [number, number, number]; size: [number, number, number]; dimmed?: boolean }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d9a066" transparent opacity={dimmed ? 0.45 : 1} />
      <Edges color="#8a5a2b" />
    </mesh>
  );
}

function layoutBoxes(boxes: CanvasBox[], cx: number) {
  const byLevel = new Map<number, CanvasBox[]>();
  for (const b of boxes) {
    const list = byLevel.get(b.level) || [];
    list.push(b);
    byLevel.set(b.level, list);
  }
  const out: Array<{ box: CanvasBox; pos: [number, number, number]; size: [number, number, number] }> = [];
  for (const [, list] of byLevel) {
    const sorted = [...list].sort(
      (a, b) => (a.slotIndex ?? 999) - (b.slotIndex ?? 999) || a.boxCode.localeCompare(b.boxCode),
    );
    const cols = Math.min(4, Math.max(1, sorted.length));
    sorted.forEach((box, i) => {
      const size = boxSize(box);
      const col = i % cols;
      const row = Math.floor(i / cols);
      out.push({
        box,
        pos: [cx + (col - (cols - 1) / 2) * 0.61, (box.level - 1) * LEVEL_H + size[1] / 2 + BASE_Y, row * 0.51],
        size,
      });
    });
  }
  return out;
}

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function Scene({
  sourceBoxes,
  sourceCode,
  destBoxes,
  destCode,
  destMaxLevels,
  dragBoxId,
  onDrop,
}: Omit<PalletTransferScene3DProps, "height">) {
  const [dragPos, setDragPos] = useState<[number, number, number] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);
  const raycaster = useThree((s) => s.raycaster);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  // Mirror state mới nhất cho window listener (tránh closure cũ)
  const live = useRef({ dragging: false, destMaxLevels, dragBoxId, onDrop });
  live.current = { dragging, destMaxLevels, dragBoxId, onDrop };
  // Tọa độ thả mới nhất (đọc trực tiếp, không qua setState updater)
  const lastDrop = useRef<{ x: number; y: number } | null>(null);

  // Window listener: chuột rời khỏi thùng/canvas khi kéo vẫn theo được
  useEffect(() => {
    const el = gl.domElement;
    const toNDC = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    const onMove = (e: PointerEvent) => {
      if (!live.current.dragging) return;
      raycaster.setFromCamera(toNDC(e.clientX, e.clientY), camera);
      // Mặt phẳng đứng Z=0: hit.y biến thiên theo độ cao chuột -> snap đúng tầng
      dragPlane.set(new THREE.Vector3(0, 0, 1), 0);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, hit)) return;
      // Kẹp Z trong khoảng pallet để thùng không bay ra sau/trước quá xa
      const p: [number, number, number] = [hit.x, hit.y, Math.max(-0.8, Math.min(0.8, hit.z))];
      lastDrop.current = { x: p[0], y: p[1] };
      setDragPos(p);
      setHoverLevel(p[0] > 0.4 ? levelOfY(p[1], live.current.destMaxLevels) : null);
    };
    const onUp = () => {
      const st = live.current;
      if (!st.dragging) return;
      const drop = lastDrop.current;
      if (drop && drop.x > 0.4 && st.dragBoxId) {
        st.onDrop(st.dragBoxId, levelOfY(drop.y, st.destMaxLevels));
      }
      lastDrop.current = null;
      setDragging(false);
      setDragPos(null);
      setHoverLevel(null);
      document.body.style.cursor = "auto";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "auto";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, raycaster, camera]);

  const handleDragStart = (id: string, startPos: [number, number, number]) => {
    if (id !== dragBoxId) return;
    lastDrop.current = { x: startPos[0], y: startPos[1] };
    setDragPos(startPos);
    setDragging(true);
    document.body.style.cursor = "grabbing";
  };

  const sourcePlaced = useMemo(() => layoutBoxes(sourceBoxes, SOURCE_X), [sourceBoxes]);
  const destPlaced = useMemo(() => layoutBoxes(destBoxes, DEST_X), [destBoxes]);
  const dragBox = useMemo(
    () => sourcePlaced.find((p) => p.box.id === dragBoxId)?.box || null,
    [sourcePlaced, dragBoxId],
  );
  const dragSize: [number, number, number] = useMemo(
    () => (dragBox ? boxSize(dragBox) : [0.4, 0.25, 0.3]),
    [dragBox],
  );

  // Vùng highlight tầng đang ngắm trên pallet đích
  const hoverMarkers = useMemo(() => {
    if (hoverLevel == null) return [];
    const y = (hoverLevel - 1) * LEVEL_H + BASE_Y;
    return [{ y }];
  }, [hoverLevel]);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -4]} intensity={0.35} />
      <gridHelper args={[10, 30, "#d6c9b8", "#e8e0d2"]} position={[0, -0.07, 0]} />
      <PalletBase x={SOURCE_X} label={`Nguồn: ${sourceCode}`} />
      <PalletBase x={DEST_X} label={`Đích: ${destCode}`} />

      {sourcePlaced.map(({ box, pos, size }) =>
        box.id === dragBoxId && dragging ? null : (
          <DraggableBox
            key={box.id}
            box={box}
            pos={pos}
            size={size}
            draggable={box.id === dragBoxId}
            dragging={false}
            onDragStart={handleDragStart}
          />
        ),
      )}
      {destPlaced.map(({ box, pos, size }) => (
        <StaticBox key={box.id} pos={pos} size={size} />
      ))}

      {/* Thùng đang kéo bay theo chuột */}
      {dragging && dragPos && (
        <mesh position={dragPos}>
          <boxGeometry args={dragSize} />
          <meshStandardMaterial color="#ff4d00" emissive="#ff4d00" emissiveIntensity={0.4} transparent opacity={0.92} />
          <Edges color="#7a2000" />
        </mesh>
      )}

      {/* Highlight tầng ngắm */}
      {hoverMarkers.map((m, i) => (
        <mesh key={i} position={[DEST_X, m.y + 0.02, 0]}>
          <boxGeometry args={[1.5, 0.04, 1.1]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      ))}

      <OrbitControls makeDefault enableDamping enabled={!dragging} minDistance={2} maxDistance={14} maxPolarAngle={Math.PI / 2.05} />
    </>
  );
}

export default function PalletTransferScene3D(props: PalletTransferScene3DProps) {
  const { height = 380 } = props;
  const [ready, setReady] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#101014]" style={{ height }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3.4, 6.2], fov: 45 }} onCreated={() => setReady(true)}>
        <color attach="background" args={["#101014"]} />
        <Scene {...props} />
      </Canvas>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-xs text-zinc-400">
          Đang tải mô phỏng 3D...
        </div>
      )}
      <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] text-white">
        Kéo thùng cam sang pallet đích • Xoay: kéo nền • Zoom: cuộn chuột
      </div>
    </div>
  );
}

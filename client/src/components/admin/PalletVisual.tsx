"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Box, Cuboid, Minus, Package, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VisualBox {
  id: string;
  boxCode: string;
  level: number;
  quantity: number;
  sku?: string;
  productName?: string;
  imageUrl?: string;
  notes?: string;
}

const PALLET_CSS = `
@keyframes pallet-drop-in { from { opacity: 0; transform: translateY(-18px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
.pallet-drop-in { animation: pallet-drop-in .4s cubic-bezier(.22,1,.36,1) both; }
.box-3d-root { transform-style: preserve-3d; }
.box-3d-side { position:absolute; border:1px solid rgba(120,74,20,.35); backface-visibility:hidden; }
.box-3d-front { transform:rotateY(0deg) translateZ(30px); width:100%; height:100%; }
.box-3d-back { transform:rotateY(180deg) translateZ(30px); width:100%; height:100%; }
.box-3d-right { transform:rotateY(90deg) translateZ(60px); width:60px; height:100%; left:50%; margin-left:-30px; }
.box-3d-left { transform:rotateY(-90deg) translateZ(60px); width:60px; height:100%; left:50%; margin-left:-30px; }
.box-3d-top { transform:rotateX(90deg) translateZ(30px); width:100%; height:60px; top:50%; margin-top:-30px; }
.box-3d-bottom { transform:rotateX(-90deg) translateZ(30px); width:100%; height:60px; top:50%; margin-top:-30px; }
`;

function levelsOf(boxes: VisualBox[], maxLevels: number) {
  const validLevels = boxes.map((box) => Number(box.level)).filter((level) => Number.isInteger(level) && level >= 1);
  const configuredLevels = Number(maxLevels);
  const top = Math.max(Number.isInteger(configuredLevels) && configuredLevels >= 1 ? configuredLevels : 1, ...validLevels, 1);
  return Array.from({ length: top }, (_, index) => top - index);
}

function Carton({ box, actions, is3d, delay }: { box: VisualBox; actions?: ReactNode; is3d: boolean; delay: number }) {
  return (
    <div
      className={cn("group/carton pallet-drop-in relative shrink-0 transition-all", is3d ? "box-3d-root h-20 w-[120px]" : "w-[140px] hover:z-10 hover:-translate-y-1 sm:w-[164px]")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {is3d ? (
        <div className="box-3d-root relative h-full w-full">
          <div className="box-3d-side box-3d-front bg-amber-200 p-1.5 text-amber-950">
            <div className="flex h-full flex-col items-center justify-center overflow-hidden border border-amber-700/20 bg-white/60 px-1 text-center">
              <span className="w-full truncate font-mono text-[8px] font-black">{box.boxCode}</span>
              <span className="w-full truncate text-[7px] font-semibold">{box.sku || "THÙNG TRỐNG"}</span>
              <span className="mt-1 rounded bg-amber-700 px-1 text-[7px] font-bold text-white">×{box.quantity}</span>
            </div>
          </div>
          <div className="box-3d-side box-3d-back bg-amber-300" />
          <div className="box-3d-side box-3d-right bg-amber-400" />
          <div className="box-3d-side box-3d-left bg-amber-300" />
          <div className="box-3d-side box-3d-top bg-amber-100"><span className="mx-auto block h-full w-3 bg-amber-300/70" /></div>
          <div className="box-3d-side box-3d-bottom bg-amber-500" />
        </div>
      ) : (
        <>
          <div className="relative h-3 rounded-t-md border border-b-0 border-amber-700/35 bg-gradient-to-b from-amber-300 to-amber-400"><span className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-amber-100/50" /></div>
          <div className="relative overflow-hidden rounded-b-md border border-amber-700/35 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 shadow-[0_8px_18px_rgba(120,74,20,.12)] dark:from-amber-950 dark:via-stone-900 dark:to-amber-950">
            <span className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 border-x border-amber-500/20 bg-amber-300/30" aria-hidden />
            <div className="relative flex items-center gap-2 p-2 pb-1.5">
              {box.imageUrl ? <img src={box.imageUrl} alt={box.productName || box.sku || "Sản phẩm"} loading="lazy" className="h-10 w-10 shrink-0 rounded-md border bg-white object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-dashed bg-background/60 text-amber-800 dark:text-amber-300"><Package className="h-4 w-4" /></span>}
              <div className="min-w-0 flex-1"><p className="truncate font-mono text-[10px] font-black text-amber-950 dark:text-amber-100">{box.boxCode}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-amber-900/80 dark:text-amber-200/80">{box.productName || box.sku || "Thùng trống"}</p></div>
            </div>
            <div className="relative flex items-center justify-between border-t border-amber-700/10 px-2 py-1.5"><span className="max-w-[95px] truncate font-mono text-[9px] text-amber-900/70 dark:text-amber-200/70">{box.sku || "CHƯA GÁN SKU"}</span><span className="rounded bg-amber-700 px-1.5 py-0.5 text-[9px] font-black text-white dark:bg-amber-500 dark:text-stone-950">×{box.quantity}</span></div>
          </div>
        </>
      )}
      {actions && <div draggable={false} className={cn("absolute z-30 flex gap-1 transition-opacity", is3d ? "-top-3 right-0 [transform:translateZ(38px)]" : "-top-3 right-1 opacity-100 sm:opacity-0 sm:group-hover/carton:opacity-100 sm:group-focus-within/carton:opacity-100")} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}>{actions}</div>}
    </div>
  );
}

export function PalletStack({ boxes, maxLevels, renderActions, onAddBox, onMoveBox }: { boxes: VisualBox[]; maxLevels: number; renderActions?: (box: VisualBox) => ReactNode; onAddBox?: (level: number) => void; onMoveBox?: (boxId: string, toLevel: number) => void }) {
  const levels = levelsOf(boxes, maxLevels);
  const [mode3d, setMode3d] = useState(false);
  const [rotX, setRotX] = useState(54);
  const [rotY, setRotY] = useState(-16);
  const [zoom, setZoom] = useState(.86);
  const [isRotating, setIsRotating] = useState(false);
  const [dragLevel, setDragLevel] = useState<number | null>(null);
  const [dragBoxId, setDragBoxId] = useState<string | null>(null);
  const rotating = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const draggable = !mode3d && Boolean(onMoveBox);

  const setView = (x: number, y: number, scale: number) => { setRotX(x); setRotY(y); setZoom(scale); };
  const startRotate = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mode3d) return;
    rotating.current = true;
    setIsRotating(true);
    lastPoint.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const rotate = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mode3d || !rotating.current) return;
    const dx = event.clientX - lastPoint.current.x;
    const dy = event.clientY - lastPoint.current.y;
    lastPoint.current = { x: event.clientX, y: event.clientY };
    setRotY((value) => value + dx * .45);
    setRotX((value) => Math.max(15, Math.min(75, value - dy * .35)));
  };
  const stopRotate = (event: React.PointerEvent<HTMLDivElement>) => {
    rotating.current = false;
    setIsRotating(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="space-y-4">
      <style>{PALLET_CSS}</style>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold">Mô phỏng xếp tầng</p><p className="mt-0.5 text-xs text-muted-foreground">{mode3d ? "Kéo theo mọi hướng để xoay góc nhìn" : "Kéo thùng và thả vào tầng cần chuyển"}</p></div>
        <div className="flex rounded-lg border bg-muted/50 p-1" aria-label="Chế độ hiển thị">
          <button type="button" onClick={() => setMode3d(false)} className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold", !mode3d ? "bg-background shadow-sm" : "text-muted-foreground")} aria-pressed={!mode3d}><Box className="h-3.5 w-3.5" />2D</button>
          <button type="button" onClick={() => setMode3d(true)} className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold", mode3d ? "bg-background shadow-sm" : "text-muted-foreground")} aria-pressed={mode3d}><Cuboid className="h-3.5 w-3.5" />3D</button>
        </div>
      </div>

      {mode3d && <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Góc nhìn</span>
        <button type="button" onClick={() => setView(54, -16, .86)} className="h-8 rounded-lg border bg-background px-2.5 text-xs hover:bg-muted">Phối cảnh</button>
        <button type="button" onClick={() => setView(15, 0, .86)} className="h-8 rounded-lg border bg-background px-2.5 text-xs hover:bg-muted">Chính diện</button>
        <button type="button" onClick={() => setView(75, 0, .76)} className="h-8 rounded-lg border bg-background px-2.5 text-xs hover:bg-muted">Từ trên</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(.55, value - .1))} className="grid h-8 w-8 place-items-center rounded-lg border bg-background" aria-label="Thu nhỏ"><Minus className="h-3.5 w-3.5" /></button>
        <span className="min-w-10 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.15, value + .1))} className="grid h-8 w-8 place-items-center rounded-lg border bg-background" aria-label="Phóng to"><Plus className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => setView(54, -16, .86)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg border bg-background" aria-label="Đặt lại"><RotateCcw className="h-3.5 w-3.5" /></button>
      </div>}

      <div
        className={cn("relative min-h-[280px] rounded-2xl border bg-muted/20 p-4 sm:p-7", mode3d ? "min-h-[520px] overflow-visible cursor-grab touch-none select-none active:cursor-grabbing" : "overflow-auto")}
        style={mode3d ? { perspective: "1400px" } : undefined}
        onPointerDown={startRotate}
        onPointerMove={rotate}
        onPointerUp={stopRotate}
        onPointerCancel={stopRotate}
      >
        <div className="mx-auto min-w-[320px] max-w-5xl space-y-4" style={mode3d ? { transform: `scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`, transformStyle: "preserve-3d", transition: isRotating ? "none" : "transform .2s ease-out", transformOrigin: "center bottom" } : undefined}>
          {levels.map((level) => {
            const levelBoxes = boxes.filter((box) => box.level === level);
            const quantity = levelBoxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
            const isDropTarget = draggable && dragLevel === level;
            return <section key={level} className="space-y-2" style={mode3d ? { transform: `translateZ(${level * 52}px)`, transformStyle: "preserve-3d" } : undefined} aria-label={`Tầng ${level}, ${levelBoxes.length} thùng`}>
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-6 min-w-6 place-items-center rounded-md bg-foreground px-1.5 text-[10px] font-black text-background">T{level}</span><p className="text-xs font-semibold">{levelBoxes.length} thùng <span className="font-normal text-muted-foreground">· {quantity} SP</span></p></div>{onAddBox && !mode3d && <button type="button" onClick={() => onAddBox(level)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" />Thêm thùng</button>}</div>
              <div
                className={cn("relative rounded-xl border bg-gradient-to-b from-stone-50 to-stone-100 p-3 shadow-sm transition-all dark:from-stone-900 dark:to-stone-950 sm:p-4", isDropTarget && "border-primary ring-4 ring-primary/15")}
                style={mode3d ? { transformStyle: "preserve-3d" } : undefined}
                onDragOver={draggable ? (event) => { event.preventDefault(); setDragLevel(level); } : undefined}
                onDragLeave={draggable ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragLevel((current) => current === level ? null : current); } : undefined}
                onDrop={draggable ? (event) => { event.preventDefault(); const boxId = event.dataTransfer.getData("text/plain") || dragBoxId; setDragLevel(null); setDragBoxId(null); if (boxId) onMoveBox?.(boxId, level); } : undefined}
              >
                {isDropTarget && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center rounded-xl bg-primary/10"><span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-lg">Thả vào tầng {level}</span></div>}
                {levelBoxes.length === 0 ? <button type="button" onClick={() => onAddBox?.(level)} disabled={!onAddBox || mode3d} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-7 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-background hover:text-primary disabled:pointer-events-none"><Package className="h-4 w-4" />Tầng trống · Thêm thùng</button> : <div className="flex min-h-[88px] flex-wrap items-end gap-3" style={mode3d ? { transformStyle: "preserve-3d" } : undefined}>{levelBoxes.map((box) => {
                  const animationOrder = boxes.findIndex((item) => item.id === box.id) + 1;
                  return <div key={box.id} draggable={draggable} style={mode3d ? { transformStyle: "preserve-3d" } : undefined} onDragStart={draggable ? (event) => { event.dataTransfer.setData("text/plain", box.id); setDragBoxId(box.id); } : undefined} onDragEnd={draggable ? () => { setDragBoxId(null); setDragLevel(null); } : undefined} className={cn(draggable && "cursor-grab active:cursor-grabbing", dragBoxId === box.id && "opacity-40")}><Carton box={box} actions={renderActions?.(box)} is3d={mode3d} delay={Math.min(animationOrder * 55, 550)} /></div>;
                })}</div>}
                <div className="mt-3 flex h-3 gap-1.5 rounded-sm bg-stone-800 p-0.5 shadow-md" aria-hidden>{Array.from({ length: 9 }).map((_, index) => <span key={index} className="flex-1 rounded-[1px] bg-gradient-to-b from-amber-600 to-amber-800" />)}</div>
              </div>
            </section>;
          })}
          <div className="px-3" aria-hidden><div className="flex h-5 gap-2 rounded-sm bg-stone-900 p-1 shadow-lg">{Array.from({ length: 7 }).map((_, index) => <span key={index} className="flex-1 bg-gradient-to-b from-amber-600 to-amber-900" />)}</div><div className="mx-5 h-2 rounded-b bg-stone-950" /></div>
        </div>
      </div>
    </div>
  );
}

export function PalletMiniMap({ boxes, maxLevels }: { boxes?: VisualBox[]; maxLevels?: number }) {
  const list = boxes || [];
  const validLevels = list.map((box) => Number(box.level)).filter((level) => Number.isInteger(level) && level >= 1);
  const configuredLevels = Number(maxLevels);
  const top = Math.max(Number.isInteger(configuredLevels) && configuredLevels >= 1 ? configuredLevels : 1, ...validLevels, 1);
  const levels = Array.from({ length: top }, (_, index) => top - index);
  const maxBoxes = Math.max(1, ...levels.map((level) => list.filter((box) => box.level === level).length));
  return <div className="w-28 space-y-1 rounded-xl border bg-muted/30 p-2" title={`${list.length} thùng / ${top} tầng`}>
    {levels.map((level) => { const levelBoxes = list.filter((box) => box.level === level); const quantity = levelBoxes.reduce((sum, box) => sum + box.quantity, 0); return <div key={level} className="flex items-center gap-1.5" title={`Tầng ${level}: ${levelBoxes.length} thùng · ${quantity} SP`}><span className="w-4 text-[8px] font-bold text-muted-foreground">T{level}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${levelBoxes.length / maxBoxes * 100}%` }} /></span><span className="w-3 text-right text-[8px] font-black">{levelBoxes.length}</span></div>; })}
    <div className="flex h-1.5 gap-1 rounded-sm bg-stone-800 p-px" aria-hidden>{Array.from({ length: 5 }).map((_, index) => <span key={index} className="flex-1 bg-amber-700" />)}</div>
  </div>;
}

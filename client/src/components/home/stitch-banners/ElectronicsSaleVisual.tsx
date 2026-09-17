import Image from "next/image";

interface ElectronicsSaleVisualProps {
  className?: string;
}

/** Banner Động 1 (Stitch 09/2026): dark premium, ảnh TV thật + badge -50% kính. */
export function ElectronicsSaleVisual({ className = "" }: ElectronicsSaleVisualProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-[#120b08] via-[#1a1210] to-[#0a0d16] ${className}`}
    >
      <div className="mm-banner-glow pointer-events-none absolute -right-20 -top-20 h-[340px] w-[340px] rounded-full bg-gradient-to-br from-[#ff4d00]/30 to-[#ff8c00]/10 blur-[70px]" data-mm-motion />
      <div className="pointer-events-none absolute bottom-[-60px] right-[30%] h-[260px] w-[260px] rounded-full bg-blue-600/15 blur-[70px]" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-[220px] w-[220px] rounded-full bg-[#ff4d00]/10 blur-[60px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />

      <svg className="pointer-events-none absolute right-[62%] top-[14%] h-6 w-6 fill-amber-400 mm-banner-twinkle" data-mm-motion viewBox="0 0 24 24">
        <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
      </svg>
      <svg className="pointer-events-none absolute bottom-[22%] right-[12%] h-5 w-5 fill-orange-400 mm-banner-twinkle-delayed" data-mm-motion viewBox="0 0 24 24">
        <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
      </svg>
      <svg className="pointer-events-none absolute right-[38%] top-[28%] h-4 w-4 fill-yellow-300 mm-banner-twinkle" data-mm-motion style={{ animationDelay: "0.7s" }} viewBox="0 0 24 24">
        <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
      </svg>

      <div className="mm-banner-float absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10" data-mm-motion>
        <div className="group relative h-[190px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl sm:h-[230px]">
          <Image
            src="/images/stitch/banner-99-tv.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
        </div>

        <div className="mm-banner-badge absolute -top-4 left-2 z-10 flex items-center gap-2 rounded-2xl border border-white/40 bg-gradient-to-br from-[#ff3d00]/90 to-[#ff7b00]/90 px-4 py-2 text-white shadow-2xl backdrop-blur-md sm:left-4" data-mm-motion>
          <span className="text-2xl font-black leading-none sm:text-3xl">-50%</span>
          <span className="flex flex-col text-left leading-tight">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-200">Siêu sale</span>
            <span className="text-[11px] font-extrabold uppercase tracking-wide">Điện máy</span>
          </span>
        </div>

        <div className="absolute -bottom-4 right-2 z-10 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md sm:right-4">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="tracking-wide text-slate-200">4K OLED HDR • INVERTER AI</span>
        </div>
      </div>
    </div>
  );
}

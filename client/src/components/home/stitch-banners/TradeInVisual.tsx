import Image from "next/image";

interface TradeInVisualProps {
  className?: string;
}

/** Banner Động 3 (Stitch 09/2026): tối + ảnh thẻ titan/phone/khiên + pill chính hãng. */
export function TradeInVisual({ className = "" }: TradeInVisualProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-[#0a1526] via-[#0f1f38] to-[#050a14] ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-[340px] w-[340px] rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[-60px] right-[30%] h-[280px] w-[280px] rounded-full bg-blue-600/15 blur-[80px]" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-[220px] w-[220px] rounded-full bg-amber-500/10 blur-[60px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="mm-banner-float absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10" data-mm-motion>
        <div className="group relative flex items-center justify-center overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/40 p-3 backdrop-blur-md sm:p-4">
          <Image
            src="/images/stitch/banner-tradein-lux.jpg"
            alt=""
            width={512}
            height={286}
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 90vw"
            className="h-auto max-h-[210px] w-full rounded-xl object-contain transition-transform duration-700 group-hover:scale-105 sm:max-h-[250px]"
          />
          <div className="mm-banner-pulse absolute right-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-slate-900/80 px-3 py-1.5 shadow-lg backdrop-blur-md" data-mm-motion>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold tracking-wide text-amber-300">CHÍNH HÃNG 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

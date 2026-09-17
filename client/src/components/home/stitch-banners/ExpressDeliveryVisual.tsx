import Image from "next/image";

interface ExpressDeliveryVisualProps {
  className?: string;
}

/** Banner Động 2 (Stitch 09/2026): navy tối + ảnh xe van thật + pill Giao 2H. */
export function ExpressDeliveryVisual({ className = "" }: ExpressDeliveryVisualProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-[#06182c] via-[#0b2444] to-[#040b17] ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-[340px] w-[340px] rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/10 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-[-40px] right-[25%] h-[280px] w-[280px] rounded-full bg-[#ff4d00]/15 blur-[70px]" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-[220px] w-[220px] rounded-full bg-sky-500/10 blur-[60px]" />

      <svg className="mm-banner-speed pointer-events-none absolute inset-0 h-full w-full opacity-20" data-mm-motion viewBox="0 0 720 500" preserveAspectRatio="xMidYMid slice" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none">
        <line x1="700" y1="150" x2="560" y2="150" strokeOpacity="0.6" />
        <line x1="720" y1="230" x2="560" y2="230" strokeOpacity="0.4" />
        <line x1="660" y1="320" x2="520" y2="320" strokeOpacity="0.5" />
      </svg>

      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10">
        <div className="group relative overflow-hidden rounded-2xl shadow-2xl">
          <Image
            src="/images/stitch/banner-express-van.jpg"
            alt=""
            width={512}
            height={286}
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 90vw"
            className="h-auto w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[#06182c]/80 via-transparent to-transparent" />
        </div>

        <div className="mm-banner-badge absolute -top-4 right-2 z-10 flex items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-2xl backdrop-blur-md sm:right-4" data-mm-motion>
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Giao 2H</span>
          <span className="rounded border border-orange-500/40 bg-[#ff4d00]/15 px-1.5 py-0.5 text-[11px] font-extrabold text-orange-400">SIÊU TỐC</span>
        </div>
      </div>
    </div>
  );
}

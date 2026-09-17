interface LogoMarkProps {
  className?: string;
}

/**
 * Logo MegaMart: Khối lục giác công nghệ (Hexagon) biểu trưng cho Điện máy & Đồ gia dụng thông minh,
 * kết hợp tia chớp tốc độ (giao hàng nhanh & năng lượng điện máy) với gradient cam rực rỡ.
 */
export function LogoMark({ className = "h-9 w-9" }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="MegaMart">
      <defs>
        <linearGradient id="mm-logo-hex-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7a1a" />
          <stop offset="50%" stopColor="#ff4d00" />
          <stop offset="100%" stopColor="#c53b00" />
        </linearGradient>
        <linearGradient id="mm-logo-bolt-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fff2eb" />
        </linearGradient>
        <filter id="mm-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Khối lục giác bo tròn viền công nghệ */}
      <path
        d="M24 3.8
           L40.2 13.1
           A3 3 0 0 1 41.7 15.7
           L41.7 32.3
           A3 3 0 0 1 40.2 34.9
           L24 44.2
           A3 3 0 0 1 21 44.2
           L7.8 34.9
           A3 3 0 0 1 6.3 32.3
           L6.3 15.7
           A3 3 0 0 1 7.8 13.1
           L21 3.8
           A3 3 0 0 1 24 3.8 Z"
        fill="url(#mm-logo-hex-g)"
      />

      {/* Viền sáng công nghệ bên trong lục giác */}
      <path
        d="M24 6.8
           L38 14.9
           L38 31.1
           L24 39.2
           L10 31.1
           L10 14.9 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.28"
      />

      {/* Tia chớp năng lượng / điện máy ở trung tâm */}
      <path
        d="M26.5 11 
           L14.8 26.2 
           h8.4 
           L20.5 37 
           L33.2 21.8 
           h-8.4 
           Z"
        fill="url(#mm-logo-bolt-g)"
        filter="url(#mm-glow)"
      />
    </svg>
  );
}

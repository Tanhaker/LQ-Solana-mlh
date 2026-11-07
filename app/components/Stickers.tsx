/**
 * Flat, outlined stickers with a solid "thickness" offset. Each one is a
 * self-contained SVG so it can be dropped anywhere and sized with className.
 */

type S = { className?: string; style?: React.CSSProperties };
const K = "#000";
const W = 3;

const TICKET =
  "M18 6H118a12 12 0 0 1 12 12V32a9 9 0 0 0 0 18V64a12 12 0 0 1-12 12H18A12 12 0 0 1 6 64V50a9 9 0 0 0 0-18V18A12 12 0 0 1 18 6Z";

export function TicketSticker({ className, style, color = "#ffd731", label = "PASS" }: S & { color?: string; label?: string }) {
  return (
    <svg viewBox="0 0 142 92" className={className} style={style} aria-hidden>
      <path d={TICKET} transform="translate(5 7)" fill={K} />
      <path d={TICKET} fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <path d="M98 14V68" stroke={K} strokeWidth="2.5" strokeDasharray="5 5" />
      <text
        x="52"
        y="54"
        textAnchor="middle"
        fontSize="30"
        fill={K}
        style={{ fontFamily: "var(--ff-display)", letterSpacing: "0.02em" }}
      >
        {label}
      </text>
      <circle cx="114" cy="41" r="6" fill="#fff" stroke={K} strokeWidth="2.5" />
    </svg>
  );
}

export function CoinSticker({ className, style, color = "#55db9c" }: S & { color?: string }) {
  return (
    <svg viewBox="0 0 110 104" className={className} style={style} aria-hidden>
      <ellipse cx="57" cy="60" rx="44" ry="36" fill={K} />
      <rect x="9" y="44" width="92" height="16" fill={K} />
      <ellipse cx="53" cy="48" rx="44" ry="36" fill={color} stroke={K} strokeWidth={W} />
      <ellipse cx="53" cy="48" rx="33" ry="26" fill="none" stroke={K} strokeWidth="2.5" />
      <text x="53" y="64" textAnchor="middle" fontSize="44" fill={K} style={{ fontFamily: "var(--ff-display)" }}>
        $
      </text>
      <Sparkle x={92} y={14} />
    </svg>
  );
}

export function HourglassSticker({ className, style }: S) {
  return (
    <svg viewBox="0 0 92 120" className={className} style={style} aria-hidden>
      <g transform="translate(5 6)" fill={K}>
        <rect x="8" y="4" width="70" height="16" rx="6" />
        <rect x="8" y="94" width="70" height="16" rx="6" />
        <path d="M18 20h50c0 22-18 28-18 37s18 15 18 37H18c0-22 18-28 18-37S18 42 18 20Z" />
      </g>
      <path
        d="M18 20h50c0 22-18 28-18 37s18 15 18 37H18c0-22 18-28 18-37S18 42 18 20Z"
        fill="#e9ccff"
        stroke={K}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <path d="M27 30h32c-3 9-12 13-16 18-4-5-13-9-16-18Z" fill="#ffd731" stroke={K} strokeWidth="2" strokeLinejoin="round" />
      <path d="M43 60v14M28 92c3-9 9-12 15-12s12 3 15 12Z" fill="#ffd731" stroke={K} strokeWidth="2" strokeLinejoin="round" />
      <rect x="8" y="4" width="70" height="16" rx="6" fill="#4da2ff" stroke={K} strokeWidth={W} />
      <rect x="8" y="94" width="70" height="16" rx="6" fill="#4da2ff" stroke={K} strokeWidth={W} />
    </svg>
  );
}

const TAG = "M42 8H110a8 8 0 0 1 8 8V68a8 8 0 0 1-8 8H42L8 42Z";

export function TagSticker({ className, style, label = "-20%" }: S & { label?: string }) {
  return (
    <svg viewBox="0 0 130 92" className={className} style={style} aria-hidden>
      <path d={TAG} transform="translate(5 7)" fill={K} />
      <path d={TAG} fill="#fb4903" stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <circle cx="34" cy="42" r="7" fill="#fff" stroke={K} strokeWidth="2.5" />
      <text x="80" y="56" textAnchor="middle" fontSize="36" fill="#fff" style={{ fontFamily: "var(--ff-display)" }}>
        {label}
      </text>
    </svg>
  );
}

const BOLT = "M58 4 14 64h32L36 114l52-66H56L66 4Z";

export function BoltSticker({ className, style }: S) {
  return (
    <svg viewBox="0 0 100 124" className={className} style={style} aria-hidden>
      <path d={BOLT} transform="translate(6 6)" fill={K} />
      <path d={BOLT} fill="#ffd731" stroke={K} strokeWidth={W} strokeLinejoin="round" />
    </svg>
  );
}

export function ClockSticker({ className, style }: S) {
  return (
    <svg viewBox="0 0 110 110" className={className} style={style} aria-hidden>
      <circle cx="58" cy="60" r="44" fill={K} />
      <circle cx="52" cy="52" r="44" fill="#4da2ff" stroke={K} strokeWidth={W} />
      <circle cx="52" cy="52" r="33" fill="#fff" stroke={K} strokeWidth="2.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={r2(52 + Math.sin(a) * 27)}
            y1={r2(52 - Math.cos(a) * 27)}
            x2={r2(52 + Math.sin(a) * 31)}
            y2={r2(52 - Math.cos(a) * 31)}
            stroke={K}
            strokeWidth={i % 3 === 0 ? 3 : 1.5}
            strokeLinecap="round"
          />
        );
      })}
      <path d="M52 52V30M52 52l14 9" stroke={K} strokeWidth="4" strokeLinecap="round" />
      <circle cx="52" cy="52" r="4" fill="#fb4903" stroke={K} strokeWidth="2" />
    </svg>
  );
}

/** Round so server and client render identical attribute strings. */
const r2 = (n: number) => Math.round(n * 100) / 100;

function burst(cx: number, cy: number, points: number, r1: number, r2: number) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function BurstSticker({ className, style, color = "#5c4ade", label = "NEW", ink = "#fff" }: S & { color?: string; label?: string; ink?: string }) {
  return (
    <svg viewBox="0 0 112 112" className={className} style={style} aria-hidden>
      <polygon points={burst(59, 60, 14, 50, 40)} fill={K} />
      <polygon points={burst(54, 54, 14, 50, 40)} fill={color} stroke={K} strokeWidth={W} strokeLinejoin="round" />
      <text x="54" y="66" textAnchor="middle" fontSize="32" fill={ink} style={{ fontFamily: "var(--ff-display)" }}>
        {label}
      </text>
    </svg>
  );
}

export function CardSticker({ className, style }: S) {
  return (
    <svg viewBox="0 0 130 100" className={className} style={style} aria-hidden>
      <g transform="rotate(-14 65 50)">
        <rect x="16" y="22" width="96" height="62" rx="12" transform="translate(5 7)" fill={K} />
        <rect x="16" y="22" width="96" height="62" rx="12" fill="#5c4ade" stroke={K} strokeWidth={W} />
        <rect x="28" y="38" width="20" height="15" rx="3" fill="#ffd731" stroke={K} strokeWidth="2" />
        <path d="M28 68h40M76 68h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - 11}c1.5 7 3.5 9 11 11-7.5 2-9.5 4-11 11-1.5-7-3.5-9-11-11 7.5-2 9.5-4 11-11Z`}
      fill="#fff"
      stroke={K}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}

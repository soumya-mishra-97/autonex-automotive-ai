import { useId } from "react";

export function XuvArtwork({ color, name }: { color: string; name: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="car-artwork"
      viewBox="0 0 900 380"
      role="img"
      aria-label={`Boxy adventure concept illustration of ${name}`}
    >
      <defs>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f3dadc" />
          <stop offset=".25" stopColor={color} />
          <stop offset="1" stopColor="#26131e" />
        </linearGradient>
      </defs>
      <ellipse cx="454" cy="331" rx="365" ry="25" fill="#211019" opacity=".2" />
      <rect x="768" y="145" width="42" height="144" rx="19" fill="#242127" />
      <path
        d="M110 279V188Q110 178 127 178H261L279 76Q282 64 300 64H736Q753 64 753 81L768 278Z"
        fill={`url(#${id}-paint)`}
        stroke={color}
        strokeWidth="8"
      />
      <path
        d="M286 165 300 86H405V165ZM421 86H563V165H421ZM580 86H730L735 165H580Z"
        fill="#152b36"
        stroke="#b9b2ae"
        strokeWidth="3"
      />
      <path d="M289 56H743M315 46H703" stroke="#29242a" strokeWidth="9" strokeLinecap="round" />
      <path d="M275 177H753M406 174V276M570 174V276" stroke="#351521" strokeWidth="3" />
      <path d="M367 190H394M529 190H556" stroke="#d3c9bd" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M132 269a66 66 0 0 1 132 0M621 269a66 66 0 0 1 132 0"
        stroke="#29252c"
        strokeWidth="18"
        fill="none"
      />
      <rect x="95" y="271" width="90" height="22" rx="5" fill="#29252c" />
      <rect x="268" y="280" width="350" height="13" rx="4" fill="#29252c" />
      {[199, 688].map((cx) => (
        <g key={cx} transform={`translate(${cx} 280)`}>
          <circle r="56" fill="#17181d" />
          <circle r="39" fill="#82838b" />
          <circle r="30" fill="#22262e" />
          {[0, 60, 120].map((angle) => (
            <rect
              key={angle}
              x="-4"
              y="-33"
              width="8"
              height="66"
              rx="2"
              fill="#c7c3bd"
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r="10" fill={color} />
        </g>
      ))}
      <circle cx="131" cy="211" r="17" fill="#d5efff" stroke="#1e2530" strokeWidth="6" />
      <rect x="109" y="240" width="47" height="13" rx="3" fill="#1c2028" />
      <rect x="741" y="221" width="17" height="14" fill="#e44361" />
      <rect
        x="266"
        y="161"
        width="31"
        height="20"
        rx="5"
        fill={color}
        stroke="#927078"
        strokeWidth="2"
      />
    </svg>
  );
}

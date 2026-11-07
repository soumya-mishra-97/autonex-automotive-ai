import { useId } from "react";
import { XuvArtwork } from "./XuvArtwork";

interface Props {
  color: string;
  bodyType: string;
  name: string;
}

/** Pure, lightweight concept illustration. Configuration enters through props. */
export function CarArtwork({ color, bodyType, name }: Props) {
  const id = useId().replace(/:/g, "");
  const suv = bodyType === "suv";
  if (bodyType === "xuv") return <XuvArtwork color={color} name={name} />;
  return (
    <svg
      className="car-artwork"
      viewBox="0 0 900 380"
      role="img"
      aria-label={`Concept illustration of ${name}`}
    >
      <defs>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor="#fff" stopOpacity=".75" />
          <stop offset=".35" stopColor={color} />
          <stop offset=".8" stopColor={color} />
          <stop offset="1" stopColor="#111e29" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.6" y2="1">
          <stop stopColor="#b9d4d4" />
          <stop offset=".5" stopColor="#34464c" />
          <stop offset="1" stopColor="#15232b" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#edf0eb" />
          <stop offset=".5" stopColor="#788384" />
          <stop offset="1" stopColor="#263133" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#122621" stopOpacity=".28" />
          <stop offset="1" stopColor="#122621" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="465" cy="315" rx="392" ry="38" fill={`url(#${id}-shadow)`} />
      <g transform={suv ? "translate(0,-8)" : undefined}>
        <path
          d={
            suv
              ? "M109 245 131 172 214 152 274 81Q300 66 342 67L598 72Q624 75 654 107L716 169 806 185 835 220 830 270 789 289 159 286 105 270Z"
              : "M107 249 139 210 248 184 326 117Q347 103 387 102L540 110Q576 113 613 142L675 186 794 204 833 236 830 270 789 289 159 286 105 270Z"
          }
          fill={color}
        />
        <path
          d={
            suv
              ? "M135 177 215 160 280 89Q300 77 342 77L595 83 655 118 701 168 790 190 820 220 808 257 159 270 116 252Z"
              : "M136 215 251 191 332 125Q349 113 387 113L541 121Q570 123 603 149L672 194 789 212 818 237 807 257 159 270 116 252Z"
          }
          fill={`url(#${id}-paint)`}
        />
        <path
          d={
            suv
              ? "M232 158 286 94 369 87 367 159Z"
              : "M265 187 337 131Q353 120 383 121L397 124 393 187Z"
          }
          fill={`url(#${id}-glass)`}
          stroke="#c1d0cb"
          strokeWidth="2"
        />
        <path
          d={
            suv
              ? "M385 87 501 88 510 160 383 159Z"
              : "M411 125 538 132Q562 134 588 155L629 188 409 187Z"
          }
          fill={`url(#${id}-glass)`}
          stroke="#b8c9c8"
          strokeWidth="2"
        />
        {suv && (
          <path
            d="M517 90 588 94 643 125 682 161 526 160Z"
            fill={`url(#${id}-glass)`}
            stroke="#b8c9c8"
            strokeWidth="2"
          />
        )}
        <path
          d="M137 220Q449 207 793 220"
          fill="none"
          stroke="#fff"
          strokeOpacity=".5"
          strokeWidth="2"
        />
        <path d="M299 225 638 222 652 274 284 274Z" fill={color} fillOpacity=".5" />
        <path
          d="M398 197 397 270M640 201 659 266"
          stroke="#172c35"
          strokeOpacity=".45"
          fill="none"
        />
        <path d="M420 208h25M608 208h24" stroke="#bdced0" strokeWidth="4" strokeLinecap="round" />
        <path d="M282 277h367l-8 9H294Z" fill="#172b32" />
        <path d="M112 246 174 249 170 265 110 258Z" fill="#172b32" />
        <path d="M783 244 824 239 825 259 778 267Z" fill="#15262e" />
        <path d="M128 216 193 208 183 220 119 230Z" fill="#e5fcff" />
        <path d="m790 213 28 20-24 1-28-20Z" fill="#e98475" />
        <path d="M120 234 166 233M117 239l48-1" stroke="#bdd7d7" strokeWidth="2" />
        <path d="m623 184 18-8 21 6-2 13-23 1Z" fill={color} stroke="#8da4a8" />
        {[235, 711].map((cx) => (
          <g key={cx} transform={`translate(${cx} 275)`}>
            <circle r="56" fill="#131c20" />
            <circle r="47" fill="#253033" stroke="#394448" strokeWidth="2" />
            <circle r="39" fill={`url(#${id}-metal)`} />
            <circle r="31" fill="#243034" />
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <path
                key={angle}
                transform={`rotate(${angle})`}
                d="m-5-6-5-31 8-1L7-7 10 32 2 35Z"
                fill={`url(#${id}-metal)`}
              />
            ))}
            <circle r="11" fill="#9faba9" />
            <circle r="7" fill="#304d46" />
            <circle r="3" fill="#d5ded8" />
          </g>
        ))}
        <path
          d="M177 278a59 59 0 0 1 116 0M653 278a59 59 0 0 1 116 0"
          fill="none"
          stroke={color}
          strokeWidth="7"
        />
        <path d="m337 139 38-11M434 136l98 7" stroke="#e2f0e8" strokeOpacity=".3" strokeWidth="3" />
      </g>
    </svg>
  );
}

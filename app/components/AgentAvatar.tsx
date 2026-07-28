"use client";

export type AgentState = "active" | "thinking" | "sleeping";

interface AgentAvatarProps {
  /** Color base del agente (el PM es verde #1FA855). */
  color?: string;
  state?: AgentState;
  /** Lado del avatar en px. */
  size?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amt > 0 ? 255 : 0;
  const a = Math.abs(amt);
  const mix = (x: number) => Math.round(x + (target - x) * a);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * M agent avatar: solid green circle with "00" dot-matrix brand mark.
 * States: active (bob), thinking (floating dots), sleeping (zzz).
 */
export default function AgentAvatar({
  color = "#1FA855",
  state = "active",
  size = 40,
}: AgentAvatarProps) {
  const dark = shade(color, -0.15);

  return (
    <span
      style={{ width: size, height: size }}
      className="relative inline-block shrink-0"
      role="img"
      aria-label="M agent avatar"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={state === "active" ? "animate-bob" : ""}
        style={{ overflow: "visible" }}
      >
        {/* Circle base */}
        <circle cx="50" cy="50" r="46" fill={color} />

        {/* "00" dot-matrix brand mark */}
        <text
          x="50"
          y="64"
          textAnchor="middle"
          fill="white"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight="700"
          fontSize="34"
          opacity="0.92"
        >
          00
        </text>

        {/* Thinking: three floating dots above */}
        {state === "thinking" && (
          <g fill={dark}>
            <circle cx="38" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "0ms" }} />
            <circle cx="50" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "180ms" }} />
            <circle cx="62" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "360ms" }} />
          </g>
        )}

        {/* Sleeping: zzz rising */}
        {state === "sleeping" && (
          <g
            fill={dark}
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontWeight={700}
          >
            <text x="74" y="22" fontSize="11" className="animate-zzz-rise" style={{ animationDelay: "0ms" }}>
              z
            </text>
            <text x="82" y="14" fontSize="14" className="animate-zzz-rise" style={{ animationDelay: "800ms" }}>
              z
            </text>
          </g>
        )}
      </svg>
    </span>
  );
}

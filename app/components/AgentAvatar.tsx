"use client";

import { useId } from "react";

export type AgentState = "active" | "thinking" | "sleeping";

interface AgentAvatarProps {
  /** Color base del agente (el PM es índigo #4F46E5). */
  color?: string;
  state?: AgentState;
  /** Lado del avatar en px. */
  size?: number;
}

/* --- Helpers de color: derivar los dos tonos de la cara desde el color base. --- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amt > 0 aclara hacia blanco, amt < 0 oscurece hacia negro. */
function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amt > 0 ? 255 : 0;
  const a = Math.abs(amt);
  const mix = (x: number) => Math.round(x + (target - x) * a);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * Personaje blob original según DESIGN.md: cabeza redonda dominante, cuerpo mínimo,
 * ojos de punto negros, cara dividida verticalmente en dos tonos del color del agente.
 */
export default function AgentAvatar({
  color = "#4F46E5",
  state = "active",
  size = 40,
}: AgentAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const headClip = `head-${uid}`;

  const light = shade(color, 0.42); // tono claro (mitad izquierda)
  const dark = shade(color, -0.1); // tono oscuro (mitad derecha + cuerpo)

  const eyeLeftX = 39;
  const eyeRightX = 61;
  const eyeY = 50;

  return (
    <span
      style={{ width: size, height: size }}
      className="relative inline-block shrink-0"
      role="img"
      aria-label="Avatar del agente PM"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={state === "active" ? "animate-bob" : ""}
        style={{ overflow: "visible" }}
      >
        <defs>
          <clipPath id={headClip}>
            <ellipse cx="50" cy="47" rx="33" ry="34" />
          </clipPath>
        </defs>

        {/* Cuerpo mínimo: una base redondeada detrás de la cabeza. */}
        <ellipse cx="50" cy="83" rx="15" ry="11" fill={dark} />

        {/* Cabeza con cara dividida verticalmente en dos tonos. */}
        <g clipPath={`url(#${headClip})`}>
          <rect x="0" y="0" width="50" height="100" fill={light} />
          <rect x="50" y="0" width="50" height="100" fill={dark} />
          {/* Brillo suave tipo vinilo (no es gradiente: elipse translúcida). */}
          <ellipse cx="38" cy="30" rx="16" ry="10" fill="#ffffff" opacity="0.16" />
        </g>

        {/* Ojos / expresión según estado. */}
        {state === "sleeping" ? (
          <g stroke="#0a0a0a" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d={`M${eyeLeftX - 4} ${eyeY} q4 3.5 8 0`} />
            <path d={`M${eyeRightX - 4} ${eyeY} q4 3.5 8 0`} />
          </g>
        ) : (
          <g
            className={state === "active" ? "animate-blink" : ""}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            fill="#0a0a0a"
          >
            {state === "thinking" ? (
              <>
                {/* Ojos entrecerrados. */}
                <ellipse cx={eyeLeftX} cy={eyeY} rx="4.2" ry="1.9" />
                <ellipse cx={eyeRightX} cy={eyeY} rx="4.2" ry="1.9" />
              </>
            ) : (
              <>
                {/* Ojos abiertos. */}
                <circle cx={eyeLeftX} cy={eyeY} r="4.2" />
                <circle cx={eyeRightX} cy={eyeY} r="4.2" />
              </>
            )}
          </g>
        )}

        {/* Pensando: tres puntos suspensivos flotando encima. */}
        {state === "thinking" && (
          <g fill={dark}>
            <circle cx="38" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "0ms" }} />
            <circle cx="50" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "180ms" }} />
            <circle cx="62" cy="9" r="3.2" className="animate-dot-float" style={{ animationDelay: "360ms" }} />
          </g>
        )}

        {/* Dormido: zzz subiendo. */}
        {state === "sleeping" && (
          <g fill={light} fontFamily="Inter, sans-serif" fontWeight={700}>
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

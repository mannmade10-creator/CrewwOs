// components/ui/CrewwOSLogo.tsx
// Creww OS SVG logo mark — pure inline SVG, no external assets
// Usage: <CrewwOSLogo size={32} /> or <CrewwOSLogo size={48} variant="full" />
"use client";

interface CrewwOSLogoProps {
  /** Size of the hex mark in px (default 32) */
  size?: number;
  /** "mark" = hex only; "full" = hex + wordmark (default "mark") */
  variant?: "mark" | "full";
  /** Extra class name */
  className?: string;
}

export function CrewwOSLogo({ size = 32, variant = "mark", className }: CrewwOSLogoProps) {
  // Unique gradient IDs per instance to avoid SVG id collisions
  const gid = `cog-${size}`;

  const HexMark = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-label="Creww OS"
      role="img"
    >
      {/* Hexagon body */}
      <polygon
        points="48,4 88,26 88,70 48,92 8,70 8,26"
        fill={`url(#${gid}-fill)`}
        stroke={`url(#${gid}-stroke)`}
        strokeWidth="2"
      />
      {/* Inner hex ring */}
      <polygon
        points="48,14 78,30 78,66 48,82 18,66 18,30"
        fill="none"
        stroke="rgba(0,212,255,0.18)"
        strokeWidth="0.8"
      />
      {/* C letterform — crew initial */}
      <path
        d="M58 35 C52 30 38 30 34 38 C30 46 34 58 42 62 C50 66 60 62 62 56"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cyan dot accent */}
      <circle cx="63" cy="56" r="3" fill="#00D4FF" />
      <circle cx="63" cy="56" r="6" fill="none" stroke="#00D4FF" strokeWidth="1" opacity="0.4" />

      <defs>
        <linearGradient id={`${gid}-fill`} x1="8" y1="4" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#111A2E" />
          <stop offset="100%" stopColor="#0A0F1C" />
        </linearGradient>
        <linearGradient id={`${gid}-stroke`} x1="8" y1="4" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#7B5FFF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === "full") {
    return (
      <div
        className={className}
        style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.35) }}
      >
        <HexMark />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              fontFamily: "'Syne', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: Math.round(size * 0.5),
              lineHeight: 1,
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #fff 30%, #00D4FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Creww
          </span>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: Math.round(size * 0.22),
              letterSpacing: "0.4em",
              color: "#00D4FF",
              textTransform: "uppercase",
            }}
          >
            OS
          </span>
        </div>
      </div>
    );
  }

  return <HexMark />;
}

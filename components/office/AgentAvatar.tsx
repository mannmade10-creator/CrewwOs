// components/office/AgentAvatar.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentDef } from "@/types";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF",
  Sales: "#FF6B35",
  Marketing: "#A855F7",
  Operations: "#10B981",
};

const DEPT_SKIN: Record<string, string> = {
  Engineering: "#FFD5A8",
  Sales: "#F4A261",
  Marketing: "#C9A0DC",
  Operations: "#A8D5A2",
};

// Layout positions — kept out of lib/agents.ts since that file is shared
// with the backend and shouldn't carry UI-only data.
export const AGENT_POSITIONS: Record<string, { x: number; y: number }> = {
  // Nia — reception desk at the top center
  nia:      { x: 440, y: 40 },
  // Engineering row
  cto:      { x: 120, y: 200 },
  pm:       { x: 220, y: 200 },
  frontend: { x: 320, y: 200 },
  backend:  { x: 420, y: 200 },
  devops:   { x: 520, y: 200 },
  qa:       { x: 620, y: 200 },
  designer: { x: 720, y: 200 },
  // Sales row
  vpsales:  { x: 120, y: 380 },
  sdr:      { x: 240, y: 380 },
  csm:      { x: 360, y: 380 },
  // Marketing row
  cmo:      { x: 120, y: 540 },
  content:  { x: 240, y: 540 },
  ads:      { x: 360, y: 540 },
  email:    { x: 480, y: 540 },
  scout:    { x: 580, y: 540 },
  // Operations row
  coo:      { x: 120, y: 700 },
  cfo:      { x: 240, y: 700 },
  hr:       { x: 360, y: 700 },
  legal:    { x: 480, y: 700 },
};

// Deterministic "hair color" per slug so each agent looks unique
const HAIR_COLORS: Record<string, string> = {
  nia: "#C8A96E",  // warm gold — the face of the company
  cto: "#1a1a2e", pm: "#8B4513", frontend: "#FFD700", backend: "#2F4F4F",
  devops: "#696969", qa: "#8B0000", designer: "#FF69B4",
  vpsales: "#000080", sdr: "#006400", csm: "#4B0082",
  cmo: "#FF4500", content: "#20B2AA", ads: "#B8860B", email: "#800000", scout: "#2E8B57",
  coo: "#1C1C1C", cfo: "#556B2F", hr: "#C71585", legal: "#191970",
};

// SVG human character — a proper little person
function HumanCharacter({
  color,
  skinTone,
  hairColor,
  isActive,
  isBusy,
  walkFrame,
  dir,
  scale = 1,
}: {
  color: string;
  skinTone: string;
  hairColor: string;
  isActive: boolean;
  isBusy: boolean;
  walkFrame: number; // 0–3 for walk cycle
  dir: number; // 1 = right, -1 = left
  scale?: number;
}) {
  // Walk cycle: alternate leg/arm positions
  const legLeft  = walkFrame % 2 === 0 ? -8 : 8;
  const legRight = walkFrame % 2 === 0 ? 8 : -8;
  const armLeft  = walkFrame % 2 === 0 ? 10 : -10;
  const armRight = walkFrame % 2 === 0 ? -10 : 10;

  const glowFilter = isActive
    ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`
    : isBusy
    ? `drop-shadow(0 0 4px ${color}88)`
    : "none";

  return (
    <svg
      width={40 * scale}
      height={64 * scale}
      viewBox="0 0 40 64"
      style={{
        filter: glowFilter,
        transition: "filter 0.3s ease",
        transform: `scaleX(${dir})`,
      }}
    >
      {/* Shadow on floor */}
      <ellipse cx={20} cy={62} rx={10} ry={2.5} fill="#00000033" />

      {/* Left leg */}
      <g transform={`rotate(${legLeft}, 17, 44)`}>
        <rect x={13} y={44} width={7} height={16} rx={3.5} fill={color} />
        {/* shoe */}
        <ellipse cx={16.5} cy={60} rx={5} ry={2.5} fill="#1a1a2e" />
      </g>

      {/* Right leg */}
      <g transform={`rotate(${legRight}, 23, 44)`}>
        <rect x={20} y={44} width={7} height={16} rx={3.5} fill={color} />
        {/* shoe */}
        <ellipse cx={23.5} cy={60} rx={5} ry={2.5} fill="#1a1a2e" />
      </g>

      {/* Body / torso */}
      <rect x={11} y={28} width={18} height={18} rx={4} fill={color} />

      {/* Collar / neck */}
      <rect x={17} y={22} width={6} height={8} rx={3} fill={skinTone} />

      {/* Left arm */}
      <g transform={`rotate(${armLeft}, 11, 30)`}>
        <rect x={4} y={30} width={7} height={13} rx={3.5} fill={color} />
        {/* hand */}
        <circle cx={7.5} cy={43} r={3} fill={skinTone} />
      </g>

      {/* Right arm */}
      <g transform={`rotate(${armRight}, 29, 30)`}>
        <rect x={29} y={30} width={7} height={13} rx={3.5} fill={color} />
        {/* hand */}
        <circle cx={32.5} cy={43} r={3} fill={skinTone} />
      </g>

      {/* Head */}
      <circle cx={20} cy={18} r={11} fill={skinTone} />

      {/* Hair */}
      <path
        d={`M9,14 Q10,4 20,4 Q30,4 31,14 Q28,8 20,8 Q12,8 9,14Z`}
        fill={hairColor}
      />

      {/* Eyes */}
      <circle cx={16} cy={17} r={1.8} fill="#1a1a2e" />
      <circle cx={24} cy={17} r={1.8} fill="#1a1a2e" />
      {/* Eye shine */}
      <circle cx={16.7} cy={16.3} r={0.6} fill="white" />
      <circle cx={24.7} cy={16.3} r={0.6} fill="white" />

      {/* Smile / expression */}
      {isActive ? (
        // Big smile when active
        <path d="M15,21 Q20,26 25,21" stroke="#1a1a2e" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      ) : isBusy ? (
        // Focused look when busy
        <path d="M16,21 Q20,23 24,21" stroke="#1a1a2e" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      ) : (
        // Neutral small smile
        <path d="M16.5,21 Q20,24 23.5,21" stroke="#1a1a2e" strokeWidth={1} fill="none" strokeLinecap="round" />
      )}

      {/* ID badge on chest */}
      <rect x={16} y={31} width={8} height={6} rx={1} fill="white" opacity={0.85} />
      <rect x={17} y={32.5} width={6} height={1} rx={0.5} fill={color} />
      <rect x={17} y={34} width={4} height={1} rx={0.5} fill="#aaa" />

      {/* Busy lightning bolt */}
      {isBusy && !isActive && (
        <g>
          <circle cx={33} cy={5} r={6} fill="#FFD700" opacity={0.95} />
          <text x={33} y={9} textAnchor="middle" fontSize={8} fill="#000">⚡</text>
        </g>
      )}

      {/* Active glow ring at feet */}
      {isActive && (
        <ellipse cx={20} cy={62} rx={13} ry={3} fill={color} opacity={0.25} />
      )}
    </svg>
  );
}

export default function AgentAvatar({
  agent,
  onClick,
  isActive,
  isBusy,
  isLocked,
}: {
  agent: AgentDef;
  onClick: (a: AgentDef) => void;
  isActive: boolean;
  isBusy: boolean;
  isLocked?: boolean;
}) {
  const isNia = agent.slug === "nia";
  const origin = AGENT_POSITIONS[agent.slug] ?? { x: 100, y: 100 };
  const [pos, setPos] = useState(origin);
  const [dir, setDir] = useState<1 | -1>(1);
  const [walkFrame, setWalkFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const moveRef = useRef<ReturnType<typeof setTimeout>>();
  const walkRef = useRef<ReturnType<typeof setInterval>>();

  // Nia uses gold as her color — she's above department silos
  const color = isNia ? "#F5C842" : (DEPT_COLORS[agent.dept] ?? "#00D4FF");
  const skinTone = isNia ? "#C68642" : (DEPT_SKIN[agent.dept] ?? "#FFD5A8");
  const hairColor = HAIR_COLORS[agent.slug] ?? "#1a1a2e";

  // Walk animation cycle
  useEffect(() => {
    if (isWalking) {
      walkRef.current = setInterval(() => {
        setWalkFrame(f => (f + 1) % 4);
      }, 180);
    } else {
      clearInterval(walkRef.current);
      setWalkFrame(0);
    }
    return () => clearInterval(walkRef.current);
  }, [isWalking]);

  // Wandering movement — Nia stays near her reception desk
  useEffect(() => {
    const wander = () => {
      if (!isBusy && !isActive) {
        const dx = (Math.random() - 0.5) * (isNia ? 30 : 50);
        setPos(p => {
          const nx = Math.max(origin.x - (isNia ? 30 : 50), Math.min(origin.x + (isNia ? 30 : 50), p.x + dx));
          const actualDx = nx - p.x;
          if (Math.abs(actualDx) > 3) {
            setDir(actualDx > 0 ? 1 : -1);
            setIsWalking(true);
            setTimeout(() => setIsWalking(false), 900);
          }
          return { x: nx, y: p.y };
        });
      }
      moveRef.current = setTimeout(wander, 2000 + Math.random() * 3000);
    };
    moveRef.current = setTimeout(wander, Math.random() * 2000);
    return () => clearTimeout(moveRef.current);
  }, [isBusy, isActive, origin.x, isNia]);

  return (
    <div
      onClick={() => onClick(agent)}
      style={{
        position: "absolute",
        left: pos.x - 20,
        top: pos.y - 20,
        cursor: "pointer",
        transition: "left 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.9s ease",
        zIndex: isActive ? 30 : isNia ? 20 : 10,
        opacity: isLocked ? 0.4 : 1,
        filter: isLocked ? "grayscale(0.9)" : "none",
        userSelect: "none",
      }}
    >
      <HumanCharacter
        color={color}
        skinTone={skinTone}
        hairColor={hairColor}
        isActive={isActive}
        isBusy={isBusy}
        walkFrame={walkFrame}
        dir={dir}
        scale={isNia ? 1.2 : 1}
      />

      {/* Name tag below character */}
      <div style={{
        textAlign: "center",
        marginTop: -4,
        lineHeight: 1.2,
      }}>
        <div style={{
          fontSize: isNia ? 11 : 10,
          fontWeight: 700,
          color,
          textShadow: `0 0 8px ${color}`,
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}>
          {agent.name}
          {isNia && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.8 }}>★</span>}
        </div>
        <div style={{
          fontSize: 8,
          color: "#ffffff66",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}>
          {agent.role}
        </div>
      </div>

      {/* Lock badge */}
      {isLocked && (
        <div style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: "#ffffff22",
          borderRadius: "50%",
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          backdropFilter: "blur(4px)",
        }}>
          🔒
        </div>
      )}

      {/* Active pulse ring */}
      {isActive && (
        <div style={{
          position: "absolute",
          inset: -6,
          borderRadius: "50%",
          border: `2px solid ${color}`,
          animation: "pulseRing 1.5s ease-out infinite",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

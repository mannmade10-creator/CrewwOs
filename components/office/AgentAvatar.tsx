// components/office/AgentAvatar.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentDef } from "@/types";

/** Returns viewport width, updating on resize. */
function useWindowWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

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

// Mobile (≤767px) positions — fits within 430px wide
const AGENT_POSITIONS_MOBILE: Record<string, { x: number; y: number }> = {
  nia:      { x: 215, y: 30 },
  cto:      { x: 38,  y: 145 },
  pm:       { x: 96,  y: 145 },
  frontend: { x: 154, y: 145 },
  backend:  { x: 212, y: 145 },
  devops:   { x: 270, y: 145 },
  qa:       { x: 316, y: 145 },
  designer: { x: 374, y: 145 },
  vpsales:  { x: 80,  y: 265 },
  sdr:      { x: 200, y: 265 },
  csm:      { x: 320, y: 265 },
  cmo:      { x: 60,  y: 375 },
  content:  { x: 145, y: 375 },
  ads:      { x: 230, y: 375 },
  email:    { x: 315, y: 375 },
  scout:    { x: 390, y: 375 },
  coo:      { x: 80,  y: 480 },
  cfo:      { x: 175, y: 480 },
  hr:       { x: 270, y: 480 },
  legal:    { x: 365, y: 480 },
};

// Desktop (≥768px) positions — spread across ~860px wide
const AGENT_POSITIONS_DESKTOP: Record<string, { x: number; y: number }> = {
  nia:      { x: 430, y: 55 },
  cto:      { x: 75,  y: 290 },
  pm:       { x: 185, y: 290 },
  frontend: { x: 295, y: 290 },
  backend:  { x: 405, y: 290 },
  devops:   { x: 515, y: 290 },
  qa:       { x: 625, y: 290 },
  designer: { x: 735, y: 290 },
  vpsales:  { x: 155, y: 530 },
  sdr:      { x: 390, y: 530 },
  csm:      { x: 625, y: 530 },
  cmo:      { x: 115, y: 750 },
  content:  { x: 280, y: 750 },
  ads:      { x: 445, y: 750 },
  email:    { x: 610, y: 750 },
  scout:    { x: 775, y: 750 },
  coo:      { x: 155, y: 960 },
  cfo:      { x: 345, y: 960 },
  hr:       { x: 535, y: 960 },
  legal:    { x: 725, y: 960 },
};

export function useAgentPositions() {
  const w = useWindowWidth();
  return w >= 768 ? AGENT_POSITIONS_DESKTOP : AGENT_POSITIONS_MOBILE;
}

// Legacy export for backward compat — returns mobile positions by default
export const AGENT_POSITIONS = AGENT_POSITIONS_MOBILE;

const HAIR_COLORS: Record<string, string> = {
  nia: "#C8A96E",
  cto: "#1a1a2e", pm: "#8B4513", frontend: "#FFD700", backend: "#2F4F4F",
  devops: "#696969", qa: "#8B0000", designer: "#FF69B4",
  vpsales: "#000080", sdr: "#006400", csm: "#4B0082",
  cmo: "#FF4500", content: "#20B2AA", ads: "#B8860B", email: "#800000", scout: "#2E8B57",
  coo: "#1C1C1C", cfo: "#556B2F", hr: "#C71585", legal: "#191970",
};

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
  walkFrame: number;
  dir: number;
  scale?: number;
}) {
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
      <ellipse cx={20} cy={62} rx={10} ry={2.5} fill="#00000033" />
      <g transform={`rotate(${legLeft}, 17, 44)`}>
        <rect x={13} y={44} width={7} height={16} rx={3.5} fill={color} />
        <ellipse cx={16.5} cy={60} rx={5} ry={2.5} fill="#1a1a2e" />
      </g>
      <g transform={`rotate(${legRight}, 23, 44)`}>
        <rect x={20} y={44} width={7} height={16} rx={3.5} fill={color} />
        <ellipse cx={23.5} cy={60} rx={5} ry={2.5} fill="#1a1a2e" />
      </g>
      <rect x={11} y={28} width={18} height={18} rx={4} fill={color} />
      <rect x={17} y={22} width={6} height={8} rx={3} fill={skinTone} />
      <g transform={`rotate(${armLeft}, 11, 30)`}>
        <rect x={4} y={30} width={7} height={13} rx={3.5} fill={color} />
        <circle cx={7.5} cy={43} r={3} fill={skinTone} />
      </g>
      <g transform={`rotate(${armRight}, 29, 30)`}>
        <rect x={29} y={30} width={7} height={13} rx={3.5} fill={color} />
        <circle cx={32.5} cy={43} r={3} fill={skinTone} />
      </g>
      <circle cx={20} cy={18} r={11} fill={skinTone} />
      <path d={`M9,14 Q10,4 20,4 Q30,4 31,14 Q28,8 20,8 Q12,8 9,14Z`} fill={hairColor} />
      <circle cx={16} cy={17} r={1.8} fill="#1a1a2e" />
      <circle cx={24} cy={17} r={1.8} fill="#1a1a2e" />
      <circle cx={16.7} cy={16.3} r={0.6} fill="white" />
      <circle cx={24.7} cy={16.3} r={0.6} fill="white" />
      {isActive ? (
        <path d="M15,21 Q20,26 25,21" stroke="#1a1a2e" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      ) : isBusy ? (
        <path d="M16,21 Q20,23 24,21" stroke="#1a1a2e" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      ) : (
        <path d="M16.5,21 Q20,24 23.5,21" stroke="#1a1a2e" strokeWidth={1} fill="none" strokeLinecap="round" />
      )}
      <rect x={16} y={31} width={8} height={6} rx={1} fill="white" opacity={0.85} />
      <rect x={17} y={32.5} width={6} height={1} rx={0.5} fill={color} />
      <rect x={17} y={34} width={4} height={1} rx={0.5} fill="#aaa" />
      {isBusy && !isActive && (
        <g>
          <circle cx={33} cy={5} r={6} fill="#FFD700" opacity={0.95} />
          <text x={33} y={9} textAnchor="middle" fontSize={8} fill="#000">⚡</text>
        </g>
      )}
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
  const positions = useAgentPositions();
  const w = useWindowWidth();
  const isMobile = w < 768;

  const isNia = agent.slug === "nia";
  const origin = positions[agent.slug] ?? { x: 100, y: 100 };
  const [pos, setPos] = useState(origin);
  const [dir, setDir] = useState<1 | -1>(1);
  const [walkFrame, setWalkFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const moveRef = useRef<ReturnType<typeof setTimeout>>();
  const walkRef = useRef<ReturnType<typeof setInterval>>();

  // Reset position when switching between mobile/desktop
  useEffect(() => {
    setPos(positions[agent.slug] ?? { x: 100, y: 100 });
  }, [isMobile, agent.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const color = isNia ? "#F5C842" : (DEPT_COLORS[agent.dept] ?? "#00D4FF");
  const skinTone = isNia ? "#C68642" : (DEPT_SKIN[agent.dept] ?? "#FFD5A8");
  const hairColor = HAIR_COLORS[agent.slug] ?? "#1a1a2e";

  // SVG scale: desktop gets full 40×64 viewBox, mobile gets 28×44
  const avatarScale = isMobile ? 0.7 : 1.0;
  const wanderRange = isMobile ? 20 : 40;

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

  useEffect(() => {
    const wander = () => {
      if (!isBusy && !isActive) {
        const dx = (Math.random() - 0.5) * (isNia ? wanderRange * 0.67 : wanderRange);
        setPos(p => {
          const range = isNia ? wanderRange * 0.67 : wanderRange;
          const nx = Math.max(origin.x - range, Math.min(origin.x + range, p.x + dx));
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
  }, [isBusy, isActive, origin.x, isNia, wanderRange]);

  const svgW = 40 * avatarScale * (isNia ? 1.2 : 1);
  const halfW = svgW / 2;

  return (
    <div
      onClick={() => onClick(agent)}
      style={{
        position: "absolute",
        left: pos.x - halfW,
        top: pos.y - halfW,
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
        scale={avatarScale * (isNia ? 1.2 : 1)}
      />

      {/* Name tag below character */}
      <div style={{
        textAlign: "center",
        marginTop: -2,
        lineHeight: 1.1,
      }}>
        <div style={{
          fontSize: isMobile ? (isNia ? 9 : 8) : (isNia ? 13 : 11),
          fontWeight: 700,
          color,
          textShadow: `0 0 8px ${color}`,
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}>
          {agent.name}
          {isNia && <span style={{ marginLeft: 4, fontSize: isMobile ? 7 : 10, opacity: 0.8 }}>★</span>}
        </div>
        <div style={{
          fontSize: isMobile ? 7 : 9,
          color: "#ffffff66",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}>
          {agent.role}
        </div>
      </div>

      {isLocked && (
        <div style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: "#ffffff22",
          borderRadius: "50%",
          width: isMobile ? 14 : 20,
          height: isMobile ? 14 : 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isMobile ? 8 : 12,
          backdropFilter: "blur(4px)",
        }}>
          🔒
        </div>
      )}

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


// components/office/OfficeIsometric.tsx
// Isometric 3D office view — responsive for desktop & mobile
"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentDef, Dept } from "@/types";

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
  "Real Estate": "#F59E0B",
  Restaurant: "#EF4444",
  "Music & Entertainment": "#8B5CF6",
  "E-Commerce": "#EC4899",
  Trades: "#F59E0B",
  Business: "#6366F1",
};

const DEPT_LABELS: Record<string, string> = {
  Engineering: "⚙️ ENGINEERING",
  Sales: "💼 SALES",
  Marketing: "📢 MARKETING",
  Operations: "🏗️ OPERATIONS",
};

const DEPT_SKIN: Record<string, string> = {
  Engineering: "#FFD5A8",
  Sales: "#F4A261",
  Marketing: "#C9A0DC",
  Operations: "#A8D5A2",
};

const HAIR_COLORS: Record<string, string> = {
  nia: "#C8A96E",
  cto: "#1a1a2e", pm: "#8B4513", frontend: "#FFD700", backend: "#2F4F4F",
  devops: "#696969", qa: "#8B0000", designer: "#FF69B4",
  vpsales: "#000080", sdr: "#006400", csm: "#4B0082",
  cmo: "#FF4500", content: "#20B2AA", ads: "#B8860B", email: "#800000", scout: "#2E8B57",
  coo: "#1C1C1C", cfo: "#556B2F", hr: "#C71585", legal: "#191970",
};

function toIso(x: number, y: number): { sx: number; sy: number } {
  return { sx: (x - y) * 0.6, sy: (x + y) * 0.3 };
}

function IsoAgent({
  agent,
  color,
  skinTone,
  isActive,
  isBusy,
  isLocked,
  onSelect,
  scale = 1,
  nameFontSize = 9,
  roleFontSize = 7,
}: {
  agent: AgentDef;
  color: string;
  skinTone: string;
  isActive: boolean;
  isBusy: boolean;
  isLocked: boolean;
  onSelect: (a: AgentDef) => void;
  scale?: number;
  nameFontSize?: number;
  roleFontSize?: number;
}) {
  const [walkFrame, setWalkFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const walkRef = useRef<ReturnType<typeof setInterval>>();
  const moveRef = useRef<ReturnType<typeof setTimeout>>();
  const hairColor = HAIR_COLORS[agent.slug] ?? "#1a1a2e";

  useEffect(() => {
    if (isWalking) {
      walkRef.current = setInterval(() => setWalkFrame(f => (f + 1) % 4), 180);
    } else {
      clearInterval(walkRef.current);
      setWalkFrame(0);
    }
    return () => clearInterval(walkRef.current);
  }, [isWalking]);

  useEffect(() => {
    const wander = () => {
      if (!isBusy && !isActive) {
        const dx = (Math.random() - 0.5) * 20;
        setOffsetX(prev => {
          const next = Math.max(-14, Math.min(14, prev + dx));
          const actual = next - prev;
          if (Math.abs(actual) > 2) {
            setDir(actual > 0 ? 1 : -1);
            setIsWalking(true);
            setTimeout(() => setIsWalking(false), 900);
          }
          return next;
        });
      }
      moveRef.current = setTimeout(wander, 2500 + Math.random() * 3000);
    };
    moveRef.current = setTimeout(wander, Math.random() * 2000);
    return () => clearTimeout(moveRef.current);
  }, [isBusy, isActive]);

  const legLeft  = walkFrame % 2 === 0 ? -8 : 8;
  const legRight = walkFrame % 2 === 0 ? 8 : -8;
  const armLeft  = walkFrame % 2 === 0 ? 10 : -10;
  const armRight = walkFrame % 2 === 0 ? -10 : 10;
  const glowFilter = isActive
    ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`
    : isBusy ? `drop-shadow(0 0 4px ${color}88)` : "none";

  return (
    <div
      onClick={() => onSelect(agent)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer",
        opacity: isLocked ? 0.4 : 1,
        filter: isLocked ? "grayscale(0.9)" : "none",
        userSelect: "none",
        transform: `translateX(${offsetX}px)`,
        transition: "transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        position: "relative",
        zIndex: isActive ? 20 : 5,
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `2px solid ${color}`, animation: "pulseRing 1.5s ease-out infinite", pointerEvents: "none" }} />
      )}
      <svg
        width={24 * scale} height={38 * scale} viewBox="0 0 40 64"
        style={{ filter: glowFilter, transition: "filter 0.3s ease", transform: `scaleX(${dir})` }}
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
          <g><circle cx={33} cy={5} r={6} fill="#FFD700" opacity={0.95} /><text x={33} y={9} textAnchor="middle" fontSize={8} fill="#000">⚡</text></g>
        )}
        {isActive && <ellipse cx={20} cy={62} rx={13} ry={3} fill={color} opacity={0.25} />}
      </svg>
      <div style={{ textAlign: "center", marginTop: -2, lineHeight: 1.2 }}>
        <div style={{ fontSize: nameFontSize, fontWeight: 700, color, textShadow: `0 0 8px ${color}`, whiteSpace: "nowrap", fontFamily: "monospace" }}>
          {agent.name}
          {agent.slug === "nia" && <span style={{ marginLeft: 3, fontSize: roleFontSize, opacity: 0.8 }}>★</span>}
        </div>
        <div style={{ fontSize: roleFontSize, color: "#ffffff55", whiteSpace: "nowrap", fontFamily: "monospace" }}>{agent.role}</div>
      </div>
      {isLocked && (
        <div style={{ position: "absolute", top: 2, right: -4, background: "#ffffff22", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>🔒</div>
      )}
    </div>
  );
}

// Mobile flat-space positions (compact, fits 520px canvas)
const DEPT_FLAT_Y_MOBILE: Record<string, number> = {
  Engineering: 60,
  Sales: 170,
  Marketing: 275,
  Operations: 375,
};
const DEPT_AGENT_FLAT_X_MOBILE: Record<string, number[]> = {
  Engineering: [60, 110, 160, 210, 260, 310, 360],
  Sales:       [90, 200, 310],
  Marketing:   [70, 145, 220, 295, 365],
  Operations:  [90, 185, 275, 360],
};

// Desktop flat-space positions (larger, fits 1040px canvas)
const DEPT_FLAT_Y_DESKTOP: Record<string, number> = {
  Engineering: 120,
  Sales: 340,
  Marketing: 550,
  Operations: 750,
};
const DEPT_AGENT_FLAT_X_DESKTOP: Record<string, number[]> = {
  Engineering: [120, 220, 320, 420, 520, 620, 720],
  Sales:       [180, 400, 620],
  Marketing:   [140, 290, 440, 590, 730],
  Operations:  [180, 370, 550, 720],
};

const DEPT_AGENT_SLUGS: Record<string, string[]> = {
  Engineering: ["cto", "pm", "frontend", "backend", "devops", "qa", "designer"],
  Sales:       ["vpsales", "sdr", "csm"],
  Marketing:   ["cmo", "content", "ads", "email", "scout"],
  Operations:  ["coo", "cfo", "hr", "legal"],
};

function IsoRoom({
  dept,
  agents,
  isMobile,
}: {
  dept: Dept;
  agents: AgentDef[];
  isMobile: boolean;
}) {
  const color = DEPT_COLORS[dept];
  const label = DEPT_LABELS[dept];
  const flatY = isMobile ? DEPT_FLAT_Y_MOBILE[dept] : DEPT_FLAT_Y_DESKTOP[dept];
  const agentXs = isMobile ? DEPT_AGENT_FLAT_X_MOBILE[dept] : DEPT_AGENT_FLAT_X_DESKTOP[dept];

  const margin = isMobile ? 50 : 100;
  const endPad = isMobile ? 90 : 180;
  const minX = agentXs[0] - margin;
  const maxX = agentXs[agentXs.length - 1] + endPad;
  const roomW = maxX - minX;
  const roomD = isMobile ? 120 : 240;
  const wallH = isMobile ? 55 : 110;

  const corners = [
    { x: minX,        y: flatY },
    { x: minX + roomW, y: flatY },
    { x: minX + roomW, y: flatY + roomD },
    { x: minX,        y: flatY + roomD },
  ].map(c => toIso(c.x, c.y));

  const floorPoints = corners.map(c => `${c.sx},${c.sy}`).join(" ");
  const leftWall = [
    corners[0], corners[3],
    { sx: corners[3].sx, sy: corners[3].sy - wallH },
    { sx: corners[0].sx, sy: corners[0].sy - wallH },
  ].map(c => `${c.sx},${c.sy}`).join(" ");
  const frontWall = [
    corners[1], corners[2],
    { sx: corners[2].sx, sy: corners[2].sy - wallH },
    { sx: corners[1].sx, sy: corners[1].sy - wallH },
  ].map(c => `${c.sx},${c.sy}`).join(" ");
  const labelPos = { sx: corners[0].sx - 8, sy: corners[0].sy - wallH - 14 };
  const deskPositions = agentXs.map(ax => toIso(ax, flatY + (isMobile ? 50 : 100)));
  const deskRx = isMobile ? 15 : 30;
  const deskRy = isMobile ? 6 : 12;
  const labelFontSize = isMobile ? 9 : 13;

  return (
    <g>
      <polygon points={floorPoints} fill={`${color}12`} stroke={`${color}40`} strokeWidth={1} />
      {[0.25, 0.5, 0.75].map(t => {
        const lx = minX + roomW * t;
        const a = toIso(lx, flatY); const b = toIso(lx, flatY + roomD);
        return <line key={`v${t}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={`${color}20`} strokeWidth={0.5} />;
      })}
      {[0.33, 0.66].map(t => {
        const ly = flatY + roomD * t;
        const a = toIso(minX, ly); const b = toIso(minX + roomW, ly);
        return <line key={`h${t}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={`${color}20`} strokeWidth={0.5} />;
      })}
      <polygon points={leftWall} fill={`${color}08`} stroke={`${color}25`} strokeWidth={0.8} />
      <polygon points={frontWall} fill={`${color}05`} stroke={`${color}20`} strokeWidth={0.8} />
      {deskPositions.map((dp, i) => (
        <g key={i} transform={`translate(${dp.sx}, ${dp.sy})`}>
          <ellipse rx={deskRx} ry={deskRy} fill={`${color}22`} stroke={`${color}50`} strokeWidth={0.8} />
          <rect x={-7} y={-16} width={14} height={9} rx={2} fill={`${color}30`} stroke={`${color}55`} strokeWidth={0.7} />
          <rect x={-6} y={-15} width={12} height={7} rx={1} fill={`${color}15`} />
        </g>
      ))}
      <text x={labelPos.sx} y={labelPos.sy} fontSize={labelFontSize} fill={color} fontWeight={700} fontFamily="monospace" letterSpacing={1} opacity={0.9}>
        {label}
      </text>
    </g>
  );
}

function IsoReception({
  nia, activeAgent, busyAgents, allowedSlugs, onSelect, isoOffsetX, isoOffsetY, isMobile,
}: {
  nia: AgentDef;
  activeAgent: AgentDef | null;
  busyAgents: Set<string>;
  allowedSlugs: Set<string>;
  onSelect: (a: AgentDef) => void;
  isoOffsetX: number;
  isoOffsetY: number;
  isMobile: boolean;
}) {
  const color = "#F5C842";
  const rx = isMobile ? 180 : 360;
  const ry = isMobile ? -50 : -100;
  const rw = isMobile ? 130 : 260;
  const rd = isMobile ? 60 : 120;
  const wallH = isMobile ? 50 : 100;

  const corners = [
    toIso(rx, ry), toIso(rx + rw, ry),
    toIso(rx + rw, ry + rd), toIso(rx, ry + rd),
  ];
  const floorPts = corners.map(c => `${c.sx},${c.sy}`).join(" ");
  const backWall = [
    corners[0], corners[1],
    { sx: corners[1].sx, sy: corners[1].sy - wallH },
    { sx: corners[0].sx, sy: corners[0].sy - wallH },
  ].map(c => `${c.sx},${c.sy}`).join(" ");
  const labelPos = toIso(rx, ry);

  const niaFlatX = isMobile ? rx + 100 : rx + 200;
  const niaFlatY = isMobile ? ry + 50 : ry + 100;
  const niaFlat = toIso(niaFlatX, niaFlatY);
  const niaScreenX = isoOffsetX + niaFlat.sx;
  const niaScreenY = isoOffsetY + niaFlat.sy;
  const deskRx = isMobile ? 26 : 52;
  const deskRy = isMobile ? 10 : 20;
  const labelFontSize = isMobile ? 9 : 13;

  return {
    svgEl: (
      <g>
        <polygon points={floorPts} fill={`${color}15`} stroke={`${color}50`} strokeWidth={1} />
        <polygon points={backWall} fill={`${color}08`} stroke={`${color}30`} strokeWidth={0.8} />
        <g transform={`translate(${toIso(niaFlatX, niaFlatY - (isMobile ? 5 : 10)).sx}, ${toIso(niaFlatX, niaFlatY - (isMobile ? 5 : 10)).sy})`}>
          <ellipse rx={deskRx} ry={deskRy} fill={`${color}28`} stroke={`${color}60`} strokeWidth={1} />
          <rect x={-9} y={-20} width={18} height={12} rx={2} fill={`${color}35`} stroke={`${color}60`} strokeWidth={0.8} />
          <rect x={-8} y={-19} width={16} height={10} rx={1} fill={`${color}18`} />
        </g>
        <text x={labelPos.sx - 8} y={labelPos.sy - wallH - 12} fontSize={labelFontSize} fill={color} fontWeight={700} fontFamily="monospace" letterSpacing={1} opacity={0.9}>
          ★ RECEPTION
        </text>
      </g>
    ),
    niaScreenX,
    niaScreenY,
  };
}

const DEPTS: Dept[] = ["Engineering", "Sales", "Marketing", "Operations", "Real Estate", "Restaurant", "Music & Entertainment", "E-Commerce", "Trades", "Business"];

function getAgentIsoPos(dept: Dept, slugIndex: number, isMobile: boolean): { sx: number; sy: number } {
  const flatY = isMobile ? DEPT_FLAT_Y_MOBILE[dept] : DEPT_FLAT_Y_DESKTOP[dept];
  const xs = isMobile ? DEPT_AGENT_FLAT_X_MOBILE[dept] : DEPT_AGENT_FLAT_X_DESKTOP[dept];
  return toIso(xs[slugIndex] ?? 300, flatY - (isMobile ? 10 : 20));
}

export default function OfficeIsometric({
  agents,
  nia,
  activeAgent,
  busyAgents,
  allowedSlugs,
  onSelect,
}: {
  agents: AgentDef[];
  nia: AgentDef;
  activeAgent: AgentDef | null;
  busyAgents: Set<string>;
  allowedSlugs: Set<string>;
  onSelect: (a: AgentDef) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const w = useWindowWidth();
  const isMobile = w < 768;

  // Canvas and offset dimensions
  const ISO_CANVAS_WIDTH  = isMobile ? 520  : 1040;
  const ISO_OFFSET_X      = isMobile ? 230  : 460;
  const ISO_OFFSET_Y      = isMobile ? 130  : 260;
  const CANVAS_MIN_HEIGHT = isMobile ? 560  : 1100;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = (ISO_CANVAS_WIDTH - el.clientWidth) / 2;
    if (offset > 0) el.scrollLeft = offset;
  }, [ISO_CANVAS_WIDTH]);

  const reception = IsoReception({
    nia, activeAgent, busyAgents, allowedSlugs, onSelect,
    isoOffsetX: ISO_OFFSET_X, isoOffsetY: ISO_OFFSET_Y, isMobile,
  });

  const agentScale     = isMobile ? 1.0 : 2.0;
  const niaScale       = isMobile ? 1.15 : 2.3;
  const nameFontSize   = isMobile ? 9 : 13;
  const roleFontSize   = isMobile ? 7 : 10;
  const agentTopOffset = isMobile ? 45 : 90;
  const agentLeftOff  = isMobile ? 12 : 24;

  return (
    <div
      ref={scrollRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}
    >
      <div style={{ position: "relative", width: ISO_CANVAS_WIDTH, height: "100%", minHeight: CANVAS_MIN_HEIGHT }}>
        <div style={{
          position: "absolute", inset: 0, minHeight: CANVAS_MIN_HEIGHT,
          background: `repeating-linear-gradient(120deg, transparent, transparent 29px, #ffffff04 29px, #ffffff04 30px),
                       repeating-linear-gradient(60deg, transparent, transparent 29px, #ffffff04 29px, #ffffff04 30px), #060612`,
        }} />

        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", width: "100%", height: `${CANVAS_MIN_HEIGHT}px` }}>
          <g transform={`translate(${ISO_OFFSET_X}, ${ISO_OFFSET_Y})`}>
            {reception.svgEl}
            {DEPTS.map(dept => (
              <IsoRoom
                key={dept}
                dept={dept}
                agents={agents.filter(a => a.dept === dept)}
                isMobile={isMobile}
              />
            ))}
          </g>
        </svg>

        {/* Nia avatar over reception */}
        <div style={{
          position: "absolute",
          left: reception.niaScreenX - agentLeftOff,
          top: reception.niaScreenY - agentTopOffset,
          zIndex: 20,
        }}>
          <IsoAgent
            agent={nia}
            color="#F5C842"
            skinTone="#C68642"
            isActive={activeAgent?.slug === nia.slug}
            isBusy={busyAgents.has(nia.slug)}
            isLocked={!allowedSlugs.has(nia.slug)}
            onSelect={onSelect}
            scale={niaScale}
            nameFontSize={nameFontSize}
            roleFontSize={roleFontSize}
          />
        </div>

        {/* Dept agent avatars */}
        {DEPTS.map(dept => {
          const slugs = DEPT_AGENT_SLUGS[dept];
          const skinTone = DEPT_SKIN[dept] ?? "#FFD5A8";
          const color = DEPT_COLORS[dept];
          return slugs.map((slug, idx) => {
            const agent = agents.find(a => a.slug === slug);
            if (!agent) return null;
            const isoPos = getAgentIsoPos(dept, idx, isMobile);
            return (
              <div
                key={slug}
                style={{
                  position: "absolute",
                  left: ISO_OFFSET_X + isoPos.sx - agentLeftOff,
                  top: ISO_OFFSET_Y + isoPos.sy - agentTopOffset,
                  zIndex: activeAgent?.slug === slug ? 15 : 5,
                }}
              >
                <IsoAgent
                  agent={agent}
                  color={color}
                  skinTone={skinTone}
                  isActive={activeAgent?.slug === slug}
                  isBusy={busyAgents.has(slug)}
                  isLocked={!allowedSlugs.has(slug)}
                  onSelect={onSelect}
                  scale={agentScale}
                  nameFontSize={nameFontSize}
                  roleFontSize={roleFontSize}
                />
              </div>
            );
          });
        })}

        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", color: "#ffffff22", fontSize: isMobile ? 10 : 13, fontFamily: "monospace", letterSpacing: 2, pointerEvents: "none" }}>
          ISOMETRIC VIEW · Click any agent to chat
        </div>
      </div>
    </div>
  );
}

// components/office/OfficeSkyscraper.tsx
// Floor-by-floor building cross-section view — responsive for desktop & mobile
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
};

const DEPT_ICONS: Record<string, string> = {
  Engineering: "⚙️",
  Sales: "💼",
  Marketing: "📢",
  Operations: "🏗️",
};

const DEPT_FLOOR: Record<string, number> = {
  Engineering: 4,
  Sales: 3,
  Marketing: 2,
  Operations: 1,
};

const HAIR_COLORS: Record<string, string> = {
  nia: "#C8A96E",
  cto: "#1a1a2e", pm: "#8B4513", frontend: "#FFD700", backend: "#2F4F4F",
  devops: "#696969", qa: "#8B0000", designer: "#FF69B4",
  vpsales: "#000080", sdr: "#006400", csm: "#4B0082",
  cmo: "#FF4500", content: "#20B2AA", ads: "#B8860B", email: "#800000", scout: "#2E8B57",
  coo: "#1C1C1C", cfo: "#556B2F", hr: "#C71585", legal: "#191970",
};

const DEPT_SKIN: Record<string, string> = {
  Engineering: "#FFD5A8",
  Sales: "#F4A261",
  Marketing: "#C9A0DC",
  Operations: "#A8D5A2",
};

function FloorAgent({
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
        const dx = (Math.random() - 0.5) * 28;
        setOffsetX(prev => {
          const next = Math.max(-18, Math.min(18, prev + dx));
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
        zIndex: isActive ? 10 : 1,
      }}
    >
      {isActive && (
        <div style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: `2px solid ${color}`,
          animation: "pulseRing 1.5s ease-out infinite",
          pointerEvents: "none", top: 0,
        }} />
      )}

      <svg
        width={26 * scale} height={42 * scale} viewBox="0 0 40 64"
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
          <g>
            <circle cx={33} cy={5} r={6} fill="#FFD700" opacity={0.95} />
            <text x={33} y={9} textAnchor="middle" fontSize={8} fill="#000">⚡</text>
          </g>
        )}
        {isActive && <ellipse cx={20} cy={62} rx={13} ry={3} fill={color} opacity={0.25} />}
      </svg>

      <div style={{ textAlign: "center", marginTop: -2, lineHeight: 1.2 }}>
        <div style={{ fontSize: nameFontSize, fontWeight: 700, color, textShadow: `0 0 8px ${color}`, whiteSpace: "nowrap", fontFamily: "monospace" }}>
          {agent.name}
        </div>
        <div style={{ fontSize: roleFontSize, color: "#ffffff55", whiteSpace: "nowrap", fontFamily: "monospace" }}>
          {agent.role}
        </div>
      </div>

      {isLocked && (
        <div style={{ position: "absolute", top: 2, right: -4, background: "#ffffff22", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>
          🔒
        </div>
      )}
    </div>
  );
}

function BuildingFloor({
  dept, agents, floorNum, totalFloors, activeAgent, busyAgents, allowedSlugs, onSelect,
  floorHeight, buildingLeft, buildingWidth, ceilingHeight, agentScale,
  nameFontSize, roleFontSize, isMobile,
}: {
  dept: Dept;
  agents: AgentDef[];
  floorNum: number;
  totalFloors: number;
  activeAgent: AgentDef | null;
  busyAgents: Set<string>;
  allowedSlugs: Set<string>;
  onSelect: (a: AgentDef) => void;
  floorHeight: number;
  buildingLeft: number;
  buildingWidth: number;
  ceilingHeight: number;
  agentScale: number;
  nameFontSize: number;
  roleFontSize: number;
  isMobile: boolean;
}) {
  const color = DEPT_COLORS[dept];
  const icon = DEPT_ICONS[dept];
  const skinTone = DEPT_SKIN[dept] ?? "#FFD5A8";
  const lobbyHeight = isMobile ? 80 : 160;

  const deskW = isMobile ? 52 : 90;
  const deskH = isMobile ? 14 : 24;
  const monitorW = isMobile ? 22 : 38;
  const monitorH = isMobile ? 15 : 26;
  const monitorTop = isMobile ? -20 : -36;
  const monitorStalkH = isMobile ? 6 : 12;

  return (
    <div style={{
      position: "absolute",
      left: buildingLeft,
      top: (totalFloors - floorNum) * floorHeight + lobbyHeight,
      width: buildingWidth,
      height: floorHeight,
    }}>
      {/* Ceiling strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: ceilingHeight,
        background: `linear-gradient(180deg, #0d0d1e 0%, #080814 100%)`,
        borderTop: `1px solid ${color}35`, borderBottom: `1px solid #ffffff0e`,
        display: "flex", alignItems: "center", paddingLeft: isMobile ? 16 : 24, zIndex: 2,
      }}>
        {[0.18, 0.38, 0.58, 0.78].map(t => (
          <div key={t} style={{
            position: "absolute", left: `${t * 100}%`, top: isMobile ? 5 : 8,
            width: isMobile ? 28 : 50, height: isMobile ? 9 : 16,
            background: color, borderRadius: 3,
            boxShadow: `0 2px 24px ${color}70, 0 0 50px ${color}30`, opacity: 0.85,
          }} />
        ))}
        <span style={{ fontSize: isMobile ? 9 : 13, color: `${color}bb`, fontFamily: "monospace", letterSpacing: 2, fontWeight: 700, zIndex: 1 }}>
          {icon} {dept.toUpperCase()} · FLOOR {floorNum}
        </span>
        <span style={{ fontSize: isMobile ? 8 : 11, color: "#ffffff22", fontFamily: "monospace", marginLeft: "auto", paddingRight: isMobile ? 16 : 24, zIndex: 1 }}>
          {agents.length} AGENTS
        </span>
      </div>

      {/* Floor interior */}
      <div style={{
        position: "absolute", top: ceilingHeight, left: 0, right: 0,
        height: floorHeight - ceilingHeight,
        background: `linear-gradient(180deg, ${color}07 0%, ${color}02 70%, #060612 100%)`,
        overflow: "visible",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(90deg, ${color}09 1px, transparent 1px), linear-gradient(0deg, ${color}06 1px, transparent 1px)`,
          backgroundSize: `${isMobile ? 80 : 160}px ${isMobile ? 44 : 88}px`,
        }} />

        {/* Side windows left */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: isMobile ? 50 : 90, background: `linear-gradient(90deg, #0a0a1a 0%, transparent 100%)`, borderRight: `1px solid ${color}18` }}>
          {[0, 1].map(i => (
            <div key={i} style={{ position: "absolute", top: `${20 + i * 44}%`, left: 6, width: isMobile ? 32 : 60, height: isMobile ? 38 : 70, background: `linear-gradient(135deg, ${color}14 0%, #1a2a4a 50%, ${color}09 100%)`, border: `1px solid ${color}22`, borderRadius: 3 }}>
              <div style={{ position: "absolute", top: 4, left: 4, width: "35%", height: "35%", background: "#ffffff09", borderRadius: 1 }} />
            </div>
          ))}
        </div>

        {/* Side windows right */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: isMobile ? 50 : 90, background: `linear-gradient(270deg, #0a0a1a 0%, transparent 100%)`, borderLeft: `1px solid ${color}18` }}>
          {[0, 1].map(i => (
            <div key={i} style={{ position: "absolute", top: `${20 + i * 44}%`, right: 6, width: isMobile ? 32 : 60, height: isMobile ? 38 : 70, background: `linear-gradient(135deg, ${color}14 0%, #1a2a4a 50%, ${color}09 100%)`, border: `1px solid ${color}22`, borderRadius: 3 }}>
              <div style={{ position: "absolute", top: 4, right: 4, width: "35%", height: "35%", background: "#ffffff09", borderRadius: 1 }} />
            </div>
          ))}
        </div>

        {/* Agents row */}
        <div style={{
          position: "absolute", bottom: 0,
          left: isMobile ? 60 : 100, right: isMobile ? 60 : 100,
          display: "flex", justifyContent: "space-evenly", alignItems: "flex-end",
        }}>
          {agents.map(agent => (
            <div key={agent.slug} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Desk */}
              <div style={{ width: deskW, height: deskH, background: `${color}1a`, border: `1px solid ${color}38`, borderRadius: 3, position: "relative" }}>
                {/* Monitor */}
                <div style={{ position: "absolute", top: monitorTop, left: "50%", transform: "translateX(-50%)", width: monitorW, height: monitorH, background: `${color}2a`, border: `1px solid ${color}55`, borderRadius: 2, boxShadow: `0 0 10px ${color}35` }}>
                  <div style={{ margin: "3px 3px 1px", height: 2, background: `${color}70`, borderRadius: 1 }} />
                  <div style={{ margin: "1px 3px", height: 2, width: "55%", background: `${color}45`, borderRadius: 1 }} />
                </div>
                <div style={{ position: "absolute", top: isMobile ? -6 : -12, left: "50%", transform: "translateX(-50%)", width: isMobile ? 4 : 7, height: monitorStalkH, background: `${color}30` }} />
              </div>
              <FloorAgent
                agent={agent}
                color={color}
                skinTone={skinTone}
                isActive={activeAgent?.slug === agent.slug}
                isBusy={busyAgents.has(agent.slug)}
                isLocked={!allowedSlugs.has(agent.slug)}
                onSelect={onSelect}
                scale={agentScale}
                nameFontSize={nameFontSize}
                roleFontSize={roleFontSize}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LobbyFloor({
  nia, activeAgent, busyAgents, allowedSlugs, onSelect,
  buildingLeft, buildingWidth, agentScale, nameFontSize, roleFontSize, isMobile,
}: {
  nia: AgentDef;
  activeAgent: AgentDef | null;
  busyAgents: Set<string>;
  allowedSlugs: Set<string>;
  onSelect: (a: AgentDef) => void;
  buildingLeft: number;
  buildingWidth: number;
  agentScale: number;
  nameFontSize: number;
  roleFontSize: number;
  isMobile: boolean;
}) {
  const color = "#F5C842";
  const lobbyH = isMobile ? 80 : 160;
  const ceilH  = isMobile ? 32 : 60;
  const deskW  = isMobile ? 160 : 300;
  const deskH  = isMobile ? 20 : 36;
  const monW   = isMobile ? 28 : 52;
  const monH   = isMobile ? 14 : 26;

  return (
    <div style={{ position: "absolute", left: buildingLeft, top: 0, width: buildingWidth, height: lobbyH }}>
      {/* Lobby ceiling */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: ceilH,
        background: "linear-gradient(180deg, #0c0c1e 0%, #080814 100%)",
        borderBottom: "1px solid #ffffff18",
        display: "flex", alignItems: "center", paddingLeft: isMobile ? 16 : 24,
      }}>
        {[0.28, 0.5, 0.72].map(t => (
          <div key={t} style={{ position: "absolute", left: `${t * 100}%`, top: isMobile ? 6 : 10, width: isMobile ? 36 : 65, height: isMobile ? 10 : 18, background: color, borderRadius: 3, boxShadow: `0 2px 28px ${color}90, 0 0 60px ${color}35`, opacity: 0.9 }} />
        ))}
        <span style={{ fontSize: isMobile ? 9 : 13, color: `${color}dd`, fontFamily: "monospace", letterSpacing: 2, fontWeight: 700, zIndex: 1 }}>
          ★ RECEPTION LOBBY · GROUND FLOOR
        </span>
        <span style={{ fontSize: isMobile ? 8 : 11, color: "#ffffff33", fontFamily: "monospace", marginLeft: "auto", paddingRight: isMobile ? 16 : 24, zIndex: 1 }}>ALL INBOUND → NIA</span>
      </div>

      {/* Lobby floor area */}
      <div style={{
        position: "absolute", top: ceilH, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, ${color}09 0%, ${color}03 100%)`,
        backgroundImage: `linear-gradient(90deg, ${color}10 1px, transparent 1px), linear-gradient(0deg, ${color}08 1px, transparent 1px)`,
        backgroundSize: `${isMobile ? 80 : 140}px ${isMobile ? 40 : 70}px`,
        overflow: "visible",
      }}>
        {/* Reception desk */}
        <div style={{ position: "absolute", bottom: isMobile ? 20 : 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: deskW, height: deskH, background: `${color}1e`, border: `1px solid ${color}55`, borderRadius: 8, boxShadow: `0 0 24px ${color}25`, position: "relative" }}>
            <div style={{ position: "absolute", top: isMobile ? -16 : -28, left: "28%", width: monW, height: monH, background: `${color}32`, border: `1px solid ${color}60`, borderRadius: 2, boxShadow: `0 0 10px ${color}50` }} />
            <div style={{ position: "absolute", top: 4, right: 16, width: isMobile ? 20 : 36, height: isMobile ? 10 : 18, background: `${color}1a`, border: `1px solid ${color}35`, borderRadius: 2 }} />
          </div>
        </div>

        {/* Nia centered */}
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" }}>
          <FloorAgent
            agent={nia}
            color="#F5C842"
            skinTone="#C68642"
            isActive={activeAgent?.slug === nia.slug}
            isBusy={busyAgents.has(nia.slug)}
            isLocked={!allowedSlugs.has(nia.slug)}
            onSelect={onSelect}
            scale={agentScale}
            nameFontSize={nameFontSize}
            roleFontSize={roleFontSize}
          />
        </div>

        {/* Left glass door */}
        <div style={{ position: "absolute", bottom: 0, left: 8, width: isMobile ? 34 : 60, height: isMobile ? 56 : 100, background: `${color}10`, border: `1px solid ${color}30`, borderRadius: "3px 3px 0 0" }}>
          <div style={{ position: "absolute", top: 6, left: 6, width: isMobile ? 10 : 18, height: isMobile ? 28 : 52, background: "#ffffff06", borderRadius: 1 }} />
        </div>
        {/* Right glass door */}
        <div style={{ position: "absolute", bottom: 0, right: 8, width: isMobile ? 34 : 60, height: isMobile ? 56 : 100, background: `${color}10`, border: `1px solid ${color}30`, borderRadius: "3px 3px 0 0" }}>
          <div style={{ position: "absolute", top: 6, right: 6, width: isMobile ? 10 : 18, height: isMobile ? 28 : 52, background: "#ffffff06", borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
}

const DEPTS: Dept[] = ["Engineering", "Sales", "Marketing", "Operations"];

export default function OfficeSkyscraper({
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
  const w = useWindowWidth();
  const isMobile = w < 768;

  // Responsive dimensions
  const FLOOR_HEIGHT    = isMobile ? 108 : 200;
  const BUILDING_LEFT   = isMobile ?  30 :  55;
  const BUILDING_WIDTH  = isMobile ? 380 : 760;
  const CEILING_HEIGHT  = isMobile ?  22 :  42;
  const CANVAS_WIDTH    = BUILDING_LEFT + BUILDING_WIDTH + BUILDING_LEFT;
  const LOBBY_HEIGHT    = isMobile ?  80 : 160;

  const agentScale    = isMobile ? 1.0 : 1.9;
  const nameFontSize  = isMobile ?   9 :  13;
  const roleFontSize  = isMobile ?   7 :  10;

  const totalFloors = DEPTS.length;
  const totalHeight = LOBBY_HEIGHT + totalFloors * FLOOR_HEIGHT + 60;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = (CANVAS_WIDTH - el.clientWidth) / 2;
    if (offset > 0) el.scrollLeft = offset;
  }, [CANVAS_WIDTH]);

  return (
    <div
      ref={scrollRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "auto" }}
    >
      <div style={{ position: "relative", width: CANVAS_WIDTH, minHeight: totalHeight + 60 }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, minHeight: totalHeight, background: "#060612" }} />

        {/* Building shell */}
        <div style={{
          position: "absolute",
          left: BUILDING_LEFT - 14,
          top: 0,
          width: BUILDING_WIDTH + 28,
          minHeight: totalHeight,
          border: "1px solid #ffffff14",
          borderRadius: "10px 10px 0 0",
          boxShadow: "0 0 80px #000000bb, inset 0 0 60px #00000050",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Elevator shaft */}
        <div style={{
          position: "absolute",
          left: BUILDING_LEFT + BUILDING_WIDTH - (isMobile ? 40 : 74),
          top: 0, width: isMobile ? 34 : 62, minHeight: totalHeight,
          background: "#0a0a1a",
          borderLeft: "1px solid #ffffff09", borderRight: "1px solid #ffffff09",
          zIndex: 1, pointerEvents: "none",
        }}>
          <div style={{ position: "sticky", top: 10, textAlign: "center", fontSize: isMobile ? 7 : 10, color: "#ffffff22", fontFamily: "monospace", letterSpacing: 1 }}>LIFT</div>
          <div style={{ position: "absolute", top: "38%", left: 4, right: 4, height: isMobile ? 40 : 72, background: "#14142e", border: "1px solid #ffffff18", borderRadius: 3 }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? 12 : 22, height: isMobile ? 12 : 22, border: "1px solid #ffffff22", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Floors */}
        <div style={{ position: "relative", zIndex: 2, minHeight: totalHeight + 60 }}>
          <LobbyFloor
            nia={nia} activeAgent={activeAgent} busyAgents={busyAgents}
            allowedSlugs={allowedSlugs} onSelect={onSelect}
            buildingLeft={BUILDING_LEFT} buildingWidth={BUILDING_WIDTH}
            agentScale={agentScale} nameFontSize={nameFontSize} roleFontSize={roleFontSize}
            isMobile={isMobile}
          />
          {DEPTS.map(dept => (
            <BuildingFloor
              key={dept}
              dept={dept}
              agents={agents.filter(a => a.dept === dept)}
              floorNum={DEPT_FLOOR[dept]}
              totalFloors={totalFloors}
              activeAgent={activeAgent}
              busyAgents={busyAgents}
              allowedSlugs={allowedSlugs}
              onSelect={onSelect}
              floorHeight={FLOOR_HEIGHT}
              buildingLeft={BUILDING_LEFT}
              buildingWidth={BUILDING_WIDTH}
              ceilingHeight={CEILING_HEIGHT}
              agentScale={agentScale}
              nameFontSize={nameFontSize}
              roleFontSize={roleFontSize}
              isMobile={isMobile}
            />
          ))}
        </div>

        <div style={{ position: "sticky", bottom: 12, textAlign: "center", fontSize: isMobile ? 10 : 13, color: "#ffffff22", fontFamily: "monospace", letterSpacing: 2, pointerEvents: "none", paddingBottom: 12 }}>
          BUILDING VIEW · Click any agent to chat
        </div>
      </div>
    </div>
  );
}

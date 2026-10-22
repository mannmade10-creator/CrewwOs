// components/office/OfficeSkyscraper.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentDef, Dept } from "@/types";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF",
  Sales: "#FF6B35",
  Marketing: "#A855F7",
  Operations: "#10B981",
};

const DEPT_ICONS: Record<string, string> = {
  Engineering: "⚙",
  Sales: "◈",
  Marketing: "♦",
  Operations: "▣",
};

const DEPT_FLOOR: Record<string, number> = {
  Engineering: 4,
  Sales: 3,
  Marketing: 2,
  Operations: 1,
};

const FLOOR_HEIGHT = 200;
const BUILDING_LEFT = 40;
const BUILDING_WIDTH = 880;
const CEILING_HEIGHT = 30;

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
  agent, color, skinTone, isActive, isBusy, isLocked, onSelect, scale = 1,
}: {
  agent: AgentDef; color: string; skinTone: string;
  isActive: boolean; isBusy: boolean; isLocked: boolean;
  onSelect: (a: AgentDef) => void; scale?: number;
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
          const next = Math.max(-15, Math.min(15, prev + dx));
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
        cursor: "pointer", opacity: isLocked ? 0.4 : 1,
        filter: isLocked ? "grayscale(0.9)" : "none",
        userSelect: "none",
        transform: `translateX(${offsetX}px)`,
        transition: "transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        position: "relative", zIndex: isActive ? 10 : 1,
      }}
    >
      {isActive && (
        <div style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: `2px solid ${color}`, animation: "pulseRing 1.5s ease-out infinite",
          pointerEvents: "none", top: 0,
        }} />
      )}
      <svg
        width={40 * scale} height={64 * scale} viewBox="0 0 40 64"
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
        <path d="M9,14 Q10,4 20,4 Q30,4 31,14 Q28,8 20,8 Q12,8 9,14Z" fill={hairColor} />
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
      <div style={{ textAlign: "center", marginTop: 2, lineHeight: 1.2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, textShadow: `0 0 8px ${color}`, whiteSpace: "nowrap", fontFamily: "monospace" }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 7, color: "#ffffff55", whiteSpace: "nowrap", fontFamily: "monospace" }}>
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

// Desk sits above the agent — agent stands in front of their desk
function AgentDesk({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 4 }}>
      {/* Monitor */}
      <div style={{
        width: 26, height: 18,
        background: `${color}22`,
        border: `1px solid ${color}60`,
        borderRadius: 3,
        boxShadow: `0 0 10px ${color}40`,
        position: "relative",
        marginBottom: 2,
      }}>
        <div style={{ margin: "3px 3px 1px", height: 2, background: `${color}80`, borderRadius: 1 }} />
        <div style={{ margin: "1px 3px", height: 2, width: "55%", background: `${color}50`, borderRadius: 1 }} />
        {/* Screen glow */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 3, boxShadow: `inset 0 0 6px ${color}25` }} />
      </div>
      {/* Monitor stand */}
      <div style={{ width: 3, height: 5, background: `${color}40` }} />
      {/* Desk surface */}
      <div style={{
        width: 56, height: 10,
        background: `linear-gradient(180deg, ${color}25 0%, ${color}12 100%)`,
        border: `1px solid ${color}45`,
        borderRadius: "3px 3px 6px 6px",
        boxShadow: `0 2px 8px ${color}20`,
      }} />
    </div>
  );
}

function BuildingFloor({
  dept, agents, floorNum, totalFloors, activeAgent, busyAgents, allowedSlugs, onSelect,
}: {
  dept: Dept; agents: AgentDef[]; floorNum: number; totalFloors: number;
  activeAgent: AgentDef | null; busyAgents: Set<string>;
  allowedSlugs: Set<string>; onSelect: (a: AgentDef) => void;
}) {
  const color = DEPT_COLORS[dept];
  const icon = DEPT_ICONS[dept];
  const skinTone = DEPT_SKIN[dept] ?? "#FFD5A8";
  const interiorH = FLOOR_HEIGHT - CEILING_HEIGHT;

  return (
    <div style={{
      position: "absolute",
      left: BUILDING_LEFT,
      top: (totalFloors - floorNum) * FLOOR_HEIGHT + 140,
      width: BUILDING_WIDTH,
      height: FLOOR_HEIGHT,
    }}>
      {/* Ceiling strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: CEILING_HEIGHT,
        background: `linear-gradient(180deg, #0d0d1e 0%, #080814 100%)`,
        borderTop: `2px solid ${color}50`,
        borderBottom: `1px solid #ffffff0e`,
        display: "flex", alignItems: "center", paddingLeft: 16, zIndex: 2,
      }}>
        {[0.15, 0.35, 0.55, 0.75].map(t => (
          <div key={t} style={{
            position: "absolute", left: `${t * 100}%`, top: 7,
            width: 30, height: 8, background: color, borderRadius: 3,
            boxShadow: `0 2px 20px ${color}90, 0 0 40px ${color}40`, opacity: 0.9,
          }} />
        ))}
        <span style={{ fontSize: 9, color: `${color}cc`, fontFamily: "monospace", letterSpacing: 2, fontWeight: 700, zIndex: 1 }}>
          {icon} {dept.toUpperCase()} · FLOOR {floorNum}
        </span>
        <span style={{ fontSize: 8, color: "#ffffff22", fontFamily: "monospace", marginLeft: "auto", paddingRight: 16, zIndex: 1 }}>
          {agents.length} AGENTS
        </span>
      </div>

      {/* Floor interior */}
      <div style={{
        position: "absolute", top: CEILING_HEIGHT, left: 0, right: 0,
        height: interiorH,
        background: `linear-gradient(180deg, ${color}08 0%, ${color}03 60%, #060612 100%)`,
      }}>
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(90deg, ${color}08 1px, transparent 1px), linear-gradient(0deg, ${color}06 1px, transparent 1px)`,
          backgroundSize: "80px 40px",
        }} />

        {/* Floor line */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
        }} />

        {/* Side columns */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 44, background: `linear-gradient(90deg, #0a0a1a 0%, transparent 100%)`, borderRight: `1px solid ${color}18` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 44, background: `linear-gradient(270deg, #0a0a1a 0%, transparent 100%)`, borderLeft: `1px solid ${color}18` }} />

        {/* Agent workstations — evenly spaced */}
        <div style={{
          position: "absolute", bottom: 0, left: 50, right: 50,
          display: "flex",
          justifyContent: "space-evenly",
          alignItems: "flex-end",
        }}>
          {agents.map(agent => (
            <div key={agent.slug} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              paddingBottom: 4,
            }}>
              <AgentDesk color={color} />
              <FloorAgent
                agent={agent} color={color} skinTone={skinTone}
                isActive={activeAgent?.slug === agent.slug}
                isBusy={busyAgents.has(agent.slug)}
                isLocked={!allowedSlugs.has(agent.slug)}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LobbyFloor({ nia, activeAgent, busyAgents, allowedSlugs, onSelect }: {
  nia: AgentDef; activeAgent: AgentDef | null;
  busyAgents: Set<string>; allowedSlugs: Set<string>; onSelect: (a: AgentDef) => void;
}) {
  const color = "#F5C842";
  return (
    <div style={{ position: "absolute", left: BUILDING_LEFT, top: 0, width: BUILDING_WIDTH, height: 140 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 30,
        background: "linear-gradient(180deg, #0c0c1e 0%, #080814 100%)",
        borderBottom: "1px solid #ffffff18",
        display: "flex", alignItems: "center", paddingLeft: 16,
      }}>
        {[0.25, 0.5, 0.75].map(t => (
          <div key={t} style={{ position: "absolute", left: `${t * 100}%`, top: 6, width: 36, height: 10, background: color, borderRadius: 3, boxShadow: `0 2px 28px ${color}90`, opacity: 0.9 }} />
        ))}
        <span style={{ fontSize: 9, color: `${color}dd`, fontFamily: "monospace", letterSpacing: 2, fontWeight: 700, zIndex: 1 }}>★ RECEPTION LOBBY · GROUND FLOOR</span>
        <span style={{ fontSize: 8, color: "#ffffff33", fontFamily: "monospace", marginLeft: "auto", paddingRight: 16, zIndex: 1 }}>ALL INBOUND → NIA</span>
      </div>

      <div style={{
        position: "absolute", top: 30, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(180deg, ${color}09 0%, ${color}03 100%)`,
        backgroundImage: `linear-gradient(90deg, ${color}10 1px, transparent 1px), linear-gradient(0deg, ${color}08 1px, transparent 1px)`,
        backgroundSize: "80px 36px",
        overflow: "visible",
      }}>
        {/* Reception desk */}
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          width: 180, height: 24,
          background: `${color}1e`, border: `1px solid ${color}55`,
          borderRadius: 8, boxShadow: `0 0 30px ${color}30`,
        }}>
          <div style={{ position: "absolute", top: -18, left: "25%", width: 32, height: 16, background: `${color}35`, border: `1px solid ${color}60`, borderRadius: 3, boxShadow: `0 0 12px ${color}60` }} />
        </div>

        {/* Nia */}
        <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }}>
          <FloorAgent
            agent={nia} color="#F5C842" skinTone="#C68642"
            isActive={activeAgent?.slug === nia.slug}
            isBusy={busyAgents.has(nia.slug)}
            isLocked={!allowedSlugs.has(nia.slug)}
            onSelect={onSelect} scale={1.2}
          />
        </div>

        {/* Glass doors */}
        {[-110, 110].map(x => (
          <div key={x} style={{
            position: "absolute", bottom: 0,
            left: `calc(50% + ${x}px)`,
            transform: "translateX(-50%)",
            width: 36, height: 60,
            background: `${color}10`, border: `1px solid ${color}30`,
            borderRadius: "3px 3px 0 0",
          }}>
            <div style={{ position: "absolute", top: 8, left: 6, width: 10, height: 30, background: "#ffffff06", borderRadius: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const DEPTS: Dept[] = ["Engineering", "Sales", "Marketing", "Operations"];

export default function OfficeSkyscraper({
  agents, nia, activeAgent, busyAgents, allowedSlugs, onSelect,
}: {
  agents: AgentDef[]; nia: AgentDef; activeAgent: AgentDef | null;
  busyAgents: Set<string>; allowedSlugs: Set<string>; onSelect: (a: AgentDef) => void;
}) {
  const totalFloors = DEPTS.length;
  const totalHeight = 140 + totalFloors * FLOOR_HEIGHT + 60;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", background: "#060612" }}>
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Building outer shell */}
      <div style={{
        position: "absolute", left: BUILDING_LEFT - 16, top: 0,
        width: BUILDING_WIDTH + 32, minHeight: totalHeight,
        border: "1px solid #ffffff14", borderRadius: "10px 10px 0 0",
        boxShadow: "0 0 80px #000000bb",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Elevator shaft */}
      <div style={{
        position: "absolute", left: BUILDING_LEFT + BUILDING_WIDTH - 44, top: 0,
        width: 38, minHeight: totalHeight,
        background: "#080814", borderLeft: "1px solid #ffffff09", borderRight: "1px solid #ffffff09",
        zIndex: 1, pointerEvents: "none",
      }}>
        <div style={{ position: "sticky", top: 10, textAlign: "center", fontSize: 7, color: "#ffffff22", fontFamily: "monospace", letterSpacing: 1, paddingTop: 8 }}>LIFT</div>
      </div>

      {/* All floors */}
      <div style={{ position: "relative", zIndex: 2, minHeight: totalHeight + 60 }}>
        <LobbyFloor nia={nia} activeAgent={activeAgent} busyAgents={busyAgents} allowedSlugs={allowedSlugs} onSelect={onSelect} />
        {DEPTS.map(dept => (
          <BuildingFloor
            key={dept} dept={dept}
            agents={agents.filter(a => a.dept === dept)}
            floorNum={DEPT_FLOOR[dept]} totalFloors={totalFloors}
            activeAgent={activeAgent} busyAgents={busyAgents}
            allowedSlugs={allowedSlugs} onSelect={onSelect}
          />
        ))}
      </div>

      <div style={{ position: "sticky", bottom: 8, textAlign: "center", fontSize: 10, color: "#ffffff22", fontFamily: "monospace", letterSpacing: 2, pointerEvents: "none", paddingBottom: 8 }}>
        BUILDING VIEW · Click any agent to chat
      </div>
    </div>
  );
}

// components/office/DeptZone.tsx
import type { Dept } from "@/types";
import { AGENT_POSITIONS } from "./AgentAvatar";
import type { AgentDef } from "@/types";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF", Sales: "#FF6B35", Marketing: "#A855F7", Operations: "#10B981",
};

const DEPT_Y: Record<string, number> = {
  Engineering: 110, Sales: 290, Marketing: 450, Operations: 610,
};

const DEPT_ICONS: Record<string, string> = {
  Engineering: "⚙️", Sales: "💼", Marketing: "📢", Operations: "🏗️",
};

// Draw little desk SVGs at agent positions
function Desk({ x, color }: { x: number; color: string }) {
  return (
    <svg
      style={{ position: "absolute", left: x - 14, top: 52, pointerEvents: "none" }}
      width={48}
      height={28}
      viewBox="0 0 48 28"
    >
      {/* Desk surface */}
      <rect x={2} y={0} width={44} height={16} rx={3} fill={`${color}22`} stroke={`${color}55`} strokeWidth={1} />
      {/* Monitor */}
      <rect x={14} y={-10} width={20} height={12} rx={2} fill={`${color}33`} stroke={`${color}66`} strokeWidth={1} />
      <rect x={22} y={2} width={4} height={3} rx={1} fill={`${color}55`} />
      {/* Screen glow */}
      <rect x={15} y={-9} width={18} height={10} rx={1} fill={`${color}18`} />
      {/* Desk legs */}
      <rect x={4}  y={16} width={3} height={10} rx={1} fill={`${color}33`} />
      <rect x={41} y={16} width={3} height={10} rx={1} fill={`${color}33`} />
    </svg>
  );
}

export default function DeptZone({ dept, agents }: { dept: Dept; agents: AgentDef[] }) {
  const positions = agents.map(a => AGENT_POSITIONS[a.slug]).filter(Boolean);
  const minX = Math.min(...positions.map(p => p.x)) - 30;
  const maxX = Math.max(...positions.map(p => p.x)) + 90;
  const color = DEPT_COLORS[dept];
  const icon = DEPT_ICONS[dept];

  return (
    <div style={{
      position: "absolute",
      left: minX,
      top: DEPT_Y[dept],
      width: maxX - minX,
      height: 140,
      border: `1px solid ${color}30`,
      borderRadius: 16,
      background: `linear-gradient(180deg, ${color}08 0%, ${color}03 100%)`,
      boxShadow: `inset 0 0 30px ${color}06`,
      overflow: "visible",
    }}>
      {/* Room label */}
      <div style={{
        position: "absolute",
        top: -13,
        left: 14,
        background: "#060612",
        padding: "2px 10px",
        fontSize: 10,
        color,
        fontWeight: 700,
        letterSpacing: 1.5,
        border: `1px solid ${color}30`,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 5,
      }} className="mono">
        <span>{icon}</span>
        <span>{dept.toUpperCase()}</span>
      </div>

      {/* Floor tiles pattern */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15, pointerEvents: "none", borderRadius: 16, overflow: "hidden" }}
        viewBox={`0 0 ${maxX - minX} 140`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={`tile-${dept}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#tile-${dept})`} />
      </svg>

      {/* Desks at each agent's x position */}
      {positions.map((p, i) => (
        <Desk key={i} x={p.x - minX} color={color} />
      ))}

      {/* Corner accent */}
      <div style={{
        position: "absolute",
        bottom: 8,
        right: 12,
        fontSize: 9,
        color: `${color}44`,
        fontFamily: "monospace",
        letterSpacing: 1,
      }}>
        {agents.length} AGENTS
      </div>
    </div>
  );
}

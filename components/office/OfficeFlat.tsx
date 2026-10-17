// components/office/OfficeFlat.tsx
// Top-down flat office floor view — the original layout
"use client";
import type { AgentDef, Dept } from "@/types";
import AgentAvatar from "./AgentAvatar";
import DeptZone from "./DeptZone";

const DEPTS: Dept[] = ["Engineering", "Sales", "Marketing", "Operations"];

export default function OfficeFlat({
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
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%", overflow: "auto",
      background: `repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff06 39px, #ffffff06 40px),
                   repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff06 39px, #ffffff06 40px), #060612`,
    }}>
      {/* ── Reception Area (Nia) ── */}
      <div style={{
        position: "absolute",
        left: 280,
        top: 8,
        width: 320,
        height: 110,
        border: "1px solid #F5C84240",
        borderRadius: 16,
        background: "linear-gradient(180deg, #F5C84210 0%, #F5C84205 100%)",
        boxShadow: "inset 0 0 40px #F5C84208, 0 0 20px #F5C84210",
      }}>
        <div style={{
          position: "absolute", top: -13, left: 14,
          background: "#060612", padding: "2px 10px", fontSize: 10,
          color: "#F5C842", fontWeight: 700, letterSpacing: 1.5,
          border: "1px solid #F5C84230", borderRadius: 6,
          display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace",
        }}>
          <span>★</span><span>RECEPTION</span>
        </div>
        <svg
          style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 48, pointerEvents: "none" }}
          width={100} height={36} viewBox="0 0 100 36"
        >
          <rect x={2} y={0} width={96} height={20} rx={6} fill="#F5C84218" stroke="#F5C84240" strokeWidth={1} />
          <rect x={36} y={-14} width={28} height={16} rx={3} fill="#F5C84225" stroke="#F5C84250" strokeWidth={1} />
          <rect x={48} y={5} width={4} height={4} rx={1} fill="#F5C84255" />
          <rect x={37} y={-13} width={26} height={14} rx={2} fill="#F5C84212" />
          <rect x={68} y={2} width={14} height={10} rx={2} fill="#F5C84220" stroke="#F5C84240" strokeWidth={0.8} />
          <rect x={6}  y={20} width={4} height={14} rx={2} fill="#F5C84222" />
          <rect x={90} y={20} width={4} height={14} rx={2} fill="#F5C84222" />
        </svg>
        <div style={{
          position: "absolute", bottom: 6, right: 10, fontSize: 8,
          color: "#F5C84244", fontFamily: "monospace", letterSpacing: 1,
        }}>
          ALL INBOUND → NIA
        </div>
      </div>

      {/* Nia's avatar */}
      <AgentAvatar
        agent={nia}
        onClick={onSelect}
        isActive={activeAgent?.slug === nia.slug}
        isBusy={busyAgents.has(nia.slug)}
        isLocked={!allowedSlugs.has(nia.slug)}
      />

      {/* Department Rooms */}
      {DEPTS.map(dept => (
        <DeptZone key={dept} dept={dept} agents={agents.filter(a => a.dept === dept)} />
      ))}

      {/* Department agents */}
      {agents.map(agent => (
        <AgentAvatar
          key={agent.slug}
          agent={agent}
          onClick={onSelect}
          isActive={activeAgent?.slug === agent.slug}
          isBusy={busyAgents.has(agent.slug)}
          isLocked={!allowedSlugs.has(agent.slug)}
        />
      ))}

      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", color: "#ffffff33", fontSize: 11, textAlign: "center", pointerEvents: "none" }}>
        Click any agent to chat · All inbound goes through Nia first
      </div>
    </div>
  );
}

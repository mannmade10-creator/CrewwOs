// components/office/OfficeFlat.tsx
// Top-down flat office floor view — responsive for desktop & mobile
"use client";
import { useEffect, useState } from "react";
import type { AgentDef, Dept } from "@/types";
import AgentAvatar from "./AgentAvatar";
import DeptZone from "./DeptZone";

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

// Only the 4 core departments have desk zones and fixed positions in the flat view.
// Vertical-specific agents (Real Estate, Restaurant, etc.) appear in the AgentRoster
// panel and the isometric/skyscraper views — not the flat office floor.
const DEPTS: Dept[] = ["Engineering", "Sales", "Marketing", "Operations"];

// Slugs that have a defined position in AgentAvatar's position tables.
// Agents NOT in this set are vertical-specific and hidden from the flat view.
const FLAT_VIEW_SLUGS = new Set([
  "nia",
  "cto", "pm", "frontend", "backend", "devops", "qa", "designer",
  "vpsales", "sdr", "csm",
  "cmo", "content", "ads", "email", "scout",
  "coo", "cfo", "hr", "legal",
]);

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
  const w = useWindowWidth();
  const isMobile = w < 768;

  // Reception area layout
  const recLeft   = isMobile ? 105 : 210;
  const recTop    = isMobile ?   6 :  12;
  const recWidth  = isMobile ? 220 : 440;
  const recHeight = isMobile ?  80 : 160;
  const recFontSm = isMobile ?   9 :  13;
  const recFontXs = isMobile ?   7 :  11;
  const labelFont = isMobile ?   9 :  13;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "auto",
      minWidth: isMobile ? 430 : 860,
      background: `repeating-linear-gradient(0deg, transparent, transparent 29px, #ffffff06 29px, #ffffff06 30px),
                   repeating-linear-gradient(90deg, transparent, transparent 29px, #ffffff06 29px, #ffffff06 30px), #060612`,
    }}>
      {/* ── Reception Area (Nia) ── */}
      <div style={{
        position: "absolute",
        left: recLeft,
        top: recTop,
        width: recWidth,
        height: recHeight,
        border: "1px solid #F5C84240",
        borderRadius: isMobile ? 12 : 20,
        background: "linear-gradient(180deg, #F5C84210 0%, #F5C84205 100%)",
        boxShadow: "inset 0 0 30px #F5C84208, 0 0 16px #F5C84210",
      }}>
        <div style={{
          position: "absolute",
          top: isMobile ? -10 : -14,
          left: isMobile ? 10 : 16,
          background: "#060612",
          padding: isMobile ? "2px 8px" : "3px 12px",
          fontSize: labelFont,
          color: "#F5C842",
          fontWeight: 700,
          letterSpacing: 1.5,
          border: "1px solid #F5C84230",
          borderRadius: isMobile ? 5 : 8,
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "monospace",
        }}>
          <span>★</span><span>RECEPTION</span>
        </div>
        <svg
          style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: isMobile ? 34 : 68, pointerEvents: "none" }}
          width={isMobile ? 70 : 140}
          height={isMobile ? 26 : 52}
          viewBox="0 0 100 36"
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
          position: "absolute",
          bottom: 5,
          right: 8,
          fontSize: recFontXs,
          color: "#F5C84244",
          fontFamily: "monospace",
          letterSpacing: 1,
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

      {/* Department Rooms — only core agents with flat-view positions */}
      {DEPTS.map(dept => (
        <DeptZone key={dept} dept={dept} agents={agents.filter(a => a.dept === dept && FLAT_VIEW_SLUGS.has(a.slug))} />
      ))}

      {/* Department agents — only core agents with flat-view positions */}
      {agents.filter(a => FLAT_VIEW_SLUGS.has(a.slug)).map(agent => (
        <AgentAvatar
          key={agent.slug}
          agent={agent}
          onClick={onSelect}
          isActive={activeAgent?.slug === agent.slug}
          isBusy={busyAgents.has(agent.slug)}
          isLocked={!allowedSlugs.has(agent.slug)}
        />
      ))}

      <div style={{
        position: "absolute",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#ffffff33",
        fontSize: isMobile ? 10 : 13,
        textAlign: "center",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}>
        Click any agent to chat
      </div>
    </div>
  );
}

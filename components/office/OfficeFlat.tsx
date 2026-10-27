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

const DEPTS: Dept[] = [
  "Engineering", "Sales", "Marketing", "Operations",
  "Real Estate", "Restaurant", "Music & Entertainment",
  "E-Commerce", "Trades", "Business",
];

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

  // Reception area constants — must match AgentAvatar DEPT_Y values for "Reception"
  const recTop    = isMobile ?   6 :  12;
  const recLeft   = isMobile ? 105 : 210;
  const recWidth  = isMobile ? 220 : 440;
  const recHeight = isMobile ?  80 : 160;
  const labelFont = isMobile ?   9 :  13;
  const recFontXs = isMobile ?   7 :  11;

  // Total canvas height: last dept zone bottom = Business zone top + zone height
  // Business desktop: y=2175, zone height 200 → need at least 2400. Add 60px padding.
  // Business mobile:  y=1065, zone height 100 → need at least 1180. Add 40px padding.
  const canvasH = isMobile ? 1220 : 2460;

  return (
    // Outer wrapper: fills the parent area and enables scrolling
    <div style={{
      width: "100%",
      height: "100%",
      overflow: "auto",
      background: "#060612",
    }}>
      {/* Inner canvas: fixed pixel dimensions so absolute children are positioned correctly */}
      <div style={{
        position: "relative",
        width: isMobile ? 430 : 860,
        height: canvasH,
        margin: "0 auto",
        background: `
          repeating-linear-gradient(0deg,  transparent, transparent 29px, #ffffff06 29px, #ffffff06 30px),
          repeating-linear-gradient(90deg, transparent, transparent 29px, #ffffff06 29px, #ffffff06 30px)
        `,
      }}>

        {/* ── Reception Area box ── */}
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
          {/* RECEPTION label */}
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

          {/* Desk SVG */}
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

        {/* ── Nia's avatar — forced into "Reception" dept so she positions at the top ── */}
        <AgentAvatar
          agent={{ ...nia, dept: "Reception" as any }}
          onClick={() => onSelect(nia)}
          isActive={activeAgent?.slug === nia.slug}
          isBusy={busyAgents.has(nia.slug)}
          isLocked={!allowedSlugs.has(nia.slug)}
          deptIndex={0}
        />

        {/* ── Department zone boxes (all 10) ── */}
        {DEPTS.map(dept => (
          <DeptZone
            key={dept}
            dept={dept}
            agents={agents.filter(a => a.dept === dept)}
          />
        ))}

        {/* ── Department agent avatars — deptIndex positions each within its zone ── */}
        {agents.map(agent => {
          const deptAgents = agents.filter(a => a.dept === agent.dept);
          const deptIndex = deptAgents.indexOf(agent);
          return (
            <AgentAvatar
              key={agent.slug}
              agent={agent}
              onClick={onSelect}
              isActive={activeAgent?.slug === agent.slug}
              isBusy={busyAgents.has(agent.slug)}
              isLocked={!allowedSlugs.has(agent.slug)}
              deptIndex={deptIndex}
            />
          );
        })}

        {/* Footer hint */}
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
          fontFamily: "monospace",
        }}>
          Scroll down to see all departments · Click any agent to chat
        </div>

      </div>
    </div>
  );
}

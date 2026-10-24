// components/office/DeptZone.tsx
"use client";
import { useEffect, useState } from "react";
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

// Mobile dept zone Y positions
const DEPT_Y_MOBILE: Record<string, number> = {
  Engineering: 75,
  Sales: 185,
  Marketing: 290,
  Operations: 390,
};

// Desktop dept zone Y positions (2× mobile + proportional)
const DEPT_Y_DESKTOP: Record<string, number> = {
  Engineering: 150,
  Sales: 375,
  Marketing: 595,
  Operations: 810,
};

export default function DeptZone({
  dept,
  agents,
}: {
  dept: Dept;
  agents: AgentDef[];
}) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const color = DEPT_COLORS[dept] ?? "#ffffff";

  const zoneY = isMobile ? DEPT_Y_MOBILE[dept] : DEPT_Y_DESKTOP[dept];
  const zoneH = isMobile ? 100 : 200;

  // Zone width: mobile uses 430-wide layout, desktop uses 860-wide
  const zoneLeft   = isMobile ? 10 : 20;
  const zoneRight  = isMobile ? 10 : 20;

  const deskW = isMobile ? 34 : 68;
  const deskH = isMobile ? 20 : 40;
  const minX  = isMobile ? -22 : -44;
  const maxX  = isMobile ?  60 : 120;

  const labelFontSize = isMobile ? 7 : 11;
  const countFontSize = isMobile ? 7 : 10;

  return (
    <div style={{
      position: "absolute",
      left: zoneLeft,
      right: zoneRight,
      top: zoneY,
      height: zoneH,
      border: `1px solid ${color}22`,
      borderRadius: isMobile ? 10 : 16,
      background: `linear-gradient(180deg, ${color}08 0%, ${color}04 100%)`,
      boxShadow: `inset 0 0 ${isMobile ? 20 : 40}px ${color}06`,
      overflow: "visible",
    }}>
      {/* Zone label */}
      <div style={{
        position: "absolute",
        top: isMobile ? -9 : -12,
        left: isMobile ? 10 : 16,
        background: "#060612",
        padding: isMobile ? "1px 6px" : "2px 10px",
        fontSize: labelFontSize,
        color,
        fontWeight: 700,
        letterSpacing: 1.5,
        border: `1px solid ${color}30`,
        borderRadius: isMobile ? 4 : 6,
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 4 : 6,
      }}>
        <span style={{ width: isMobile ? 4 : 6, height: isMobile ? 4 : 6, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 ${isMobile ? 4 : 6}px ${color}` }} />
        {dept.toUpperCase()}
        <span style={{ fontSize: countFontSize, opacity: 0.6, fontWeight: 400 }}>({agents.length})</span>
      </div>

      {/* Desk SVGs */}
      {agents.map((agent, i) => {
        const spacing = isMobile ? 58 : 116;
        const startX = isMobile ? 28 : 55;
        const cx = startX + (i % 7) * spacing;
        const row = Math.floor(i / 7);
        const cy = (isMobile ? 68 : 136) + row * (isMobile ? 30 : 60);
        return (
          <svg
            key={agent.slug}
            style={{ position: "absolute", left: cx + minX, top: cy - (isMobile ? 8 : 16), pointerEvents: "none" }}
            width={deskW}
            height={deskH}
            viewBox="0 0 34 20"
          >
            <rect x={0} y={4} width={34} height={12} rx={3} fill={`${DEPT_COLORS[dept]}18`} stroke={`${DEPT_COLORS[dept]}35`} strokeWidth={0.8} />
            <rect x={2} y={0} width={10} height={8} rx={2} fill={`${DEPT_COLORS[dept]}25`} stroke={`${DEPT_COLORS[dept]}50`} strokeWidth={0.6} />
            <rect x={14} y={6} width={8} height={5} rx={1} fill={`${DEPT_COLORS[dept]}20`} stroke={`${DEPT_COLORS[dept]}40`} strokeWidth={0.5} />
            <rect x={4} y={14} width={3} height={6} rx={1.5} fill={`${DEPT_COLORS[dept]}22`} />
            <rect x={27} y={14} width={3} height={6} rx={1.5} fill={`${DEPT_COLORS[dept]}22`} />
          </svg>
        );
      })}
    </div>
  );
}

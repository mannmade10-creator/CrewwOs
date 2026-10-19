// components/office/VirtualOffice.tsx
"use client";
import { useState, useEffect } from "react";
import { AGENTS } from "@/lib/agents";
import { agentsAllowedForPlan } from "@/lib/plans";
import type { AgentDef, Dept, TaskLogEntry } from "@/types";
import ActivityFeed from "./ActivityFeed";
import AgentRoster from "../dashboard/AgentRoster";
import BroadcastBar from "../dashboard/BroadcastBar";
import ChatWindow from "../chat/ChatWindow";
import OfficeFlat from "./OfficeFlat";
import OfficeIsometric from "./OfficeIsometric";
import OfficeSkyscraper from "./OfficeSkyscraper";

type ViewStyle = "flat" | "isometric" | "skyscraper";

const VIEW_LABELS: Record<ViewStyle, { icon: string; label: string; desc: string }> = {
  flat:       { icon: "⊞", label: "Floor Plan",   desc: "Top-down office view" },
  isometric:  { icon: "◈", label: "Isometric",    desc: "Angled 3D perspective" },
  skyscraper: { icon: "▦", label: "Building",     desc: "Cross-section floors" },
};

export default function VirtualOffice({ workspaceSlug, workspaceName, plan }: {
  workspaceSlug: string; workspaceName: string; plan: string;
}) {
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null);
  const [busyAgents, setBusyAgents] = useState<Set<string>>(new Set());
  const [taskLog, setTaskLog] = useState<TaskLogEntry[]>([
    { agent: "System", text: `CrewOS online. Agents deployed to ${workspaceName}.`, time: "Now" },
  ]);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("flat");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Persist view style per workspace
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`crewos:view:${workspaceSlug}`) as ViewStyle | null;
      if (saved && VIEW_LABELS[saved]) setViewStyle(saved);
    } catch {}
  }, [workspaceSlug]);

  const changeView = (v: ViewStyle) => {
    setViewStyle(v);
    setPickerOpen(false);
    try { localStorage.setItem(`crewos:view:${workspaceSlug}`, v); } catch {}
  };

  const allowedSlugs = agentsAllowedForPlan(plan, AGENTS.map(a => a.slug));
  const nia = AGENTS.find(a => a.slug === "nia")!;
  const teamAgents = AGENTS.filter(a => a.slug !== "nia");

  const handleSelect = (agent: AgentDef) => {
    setActiveAgent(agent);
    if (allowedSlugs.has(agent.slug)) setBusyAgents(p => new Set([...p, agent.slug]));
  };
  const handleClose = () => {
    if (activeAgent) setBusyAgents(p => { const n = new Set(p); n.delete(activeAgent.slug); return n; });
    setActiveAgent(null);
  };
  const addLog = (agent: string, text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTaskLog(l => [{ agent, text, time }, ...l].slice(0, 50));
  };
  const handleBroadcastReplies = (replies: { name: string; reply: string }[], sentMessage: string) => {
    addLog("CEO (You)", `All-hands: "${sentMessage}"`);
    replies.forEach(r => addLog(r.name, r.reply));
  };

  const officeProps = {
    agents: teamAgents,
    nia,
    activeAgent,
    busyAgents,
    allowedSlugs,
    onSelect: handleSelect,
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
      {/* Office Floor */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {viewStyle === "flat"       && <OfficeFlat       {...officeProps} />}
        {viewStyle === "isometric"  && <OfficeIsometric  {...officeProps} />}
        {viewStyle === "skyscraper" && <OfficeSkyscraper {...officeProps} />}

        {/* ── View Style Picker ── */}
        <div style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}>
          {/* Expanded picker panel */}
          {pickerOpen && (
            <div style={{
              background: "#0d0d20",
              border: "1px solid #ffffff18",
              borderRadius: 14,
              padding: "10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 8px 32px #000000cc, 0 0 0 1px #ffffff08",
              backdropFilter: "blur(12px)",
              minWidth: 190,
            }}>
              <div style={{ fontSize: 8, color: "#ffffff33", fontFamily: "monospace", letterSpacing: 2, paddingLeft: 10, marginBottom: 4 }}>
                OFFICE VIEW STYLE
              </div>
              {(Object.keys(VIEW_LABELS) as ViewStyle[]).map(v => {
                const { icon, label, desc } = VIEW_LABELS[v];
                const active = v === viewStyle;
                return (
                  <button
                    key={v}
                    onClick={() => changeView(v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px",
                      background: active ? "#ffffff0f" : "transparent",
                      border: active ? "1px solid #ffffff22" : "1px solid transparent",
                      borderRadius: 10,
                      cursor: "pointer",
                      color: active ? "#fff" : "#ffffff88",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22, textAlign: "center" }}>{icon}</span>
                    <span>
                      <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "monospace" }}>{label}</div>
                      <div style={{ fontSize: 9, color: "#ffffff44", marginTop: 1 }}>{desc}</div>
                    </span>
                    {active && <span style={{ marginLeft: "auto", fontSize: 10, color: "#00D4FF" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setPickerOpen(o => !o)}
            title="Change office view"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: pickerOpen ? "#ffffff18" : "#0d0d20cc",
              border: `1px solid ${pickerOpen ? "#ffffff40" : "#ffffff18"}`,
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px #000000aa",
              transition: "all 0.15s",
            }}
          >
            {VIEW_LABELS[viewStyle].icon}
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        width: activeAgent ? 0 : 300,
        overflow: "hidden",
        transition: "width 0.3s ease",
        background: "#0a0a1a",
        borderLeft: "1px solid #ffffff11",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <BroadcastBar workspaceSlug={workspaceSlug} onReplies={handleBroadcastReplies} />
        <ActivityFeed log={taskLog} />
        <AgentRoster agents={AGENTS} busyIds={busyAgents} onSelect={handleSelect} allowedSlugs={allowedSlugs} plan={plan} />
      </div>

      {activeAgent && (
        <ChatWindow
          key={activeAgent.slug}
          agent={activeAgent}
          workspaceSlug={workspaceSlug}
          workspaceName={workspaceName}
          onClose={handleClose}
          onLog={addLog}
          locked={!allowedSlugs.has(activeAgent.slug)}
          plan={plan}
        />
      )}
    </div>
  );
}





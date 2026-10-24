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
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Track mobile with JS for drawer logic — but CSS handles the layout switch
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-close drawer when agent chat opens on mobile
  useEffect(() => {
    if (activeAgent && isMobile) setDrawerOpen(false);
  }, [activeAgent, isMobile]);

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

  const ViewPicker = () => (
    <div style={{
      position: "absolute", bottom: 20, right: 16,
      zIndex: 100, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
    }}>
      {pickerOpen && (
        <div style={{
          background: "#0d0d20", border: "1px solid #ffffff18", borderRadius: 14,
          padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4,
          boxShadow: "0 8px 32px #000000cc, 0 0 0 1px #ffffff08", backdropFilter: "blur(12px)", minWidth: 190,
        }}>
          <div style={{ fontSize: 8, color: "#ffffff33", fontFamily: "monospace", letterSpacing: 2, paddingLeft: 10, marginBottom: 4 }}>
            OFFICE VIEW STYLE
          </div>
          {(Object.keys(VIEW_LABELS) as ViewStyle[]).map(v => {
            const { icon, label, desc } = VIEW_LABELS[v];
            const active = v === viewStyle;
            return (
              <button key={v} onClick={() => changeView(v)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                background: active ? "#ffffff0f" : "transparent",
                border: active ? "1px solid #ffffff22" : "1px solid transparent",
                borderRadius: 10, cursor: "pointer",
                color: active ? "#fff" : "#ffffff88", textAlign: "left", transition: "all 0.15s",
              }}>
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
      <button onClick={() => setPickerOpen(o => !o)} title="Change office view" style={{
        width: 44, height: 44, borderRadius: 12,
        background: pickerOpen ? "#ffffff18" : "#0d0d20cc",
        border: `1px solid ${pickerOpen ? "#ffffff40" : "#ffffff18"}`,
        color: "#fff", fontSize: 20, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(12px)", boxShadow: "0 4px 16px #000000aa", transition: "all 0.15s",
      }}>
        {VIEW_LABELS[viewStyle].icon}
      </button>
    </div>
  );

  return (
    <>
      {/* CSS media query controls layout — always correct regardless of SSR/hydration */}
      <style>{`
        .vo-root { display: flex; flex: 1; overflow: hidden; position: relative; }
        .vo-office { flex: 1; position: relative; overflow: hidden; }
        .vo-panel {
          width: 300px; overflow: hidden; transition: width 0.3s ease;
          background: #0a0a1a; border-left: 1px solid #ffffff11;
          display: flex; flex-direction: column; flex-shrink: 0;
        }
        .vo-panel.hidden { width: 0; }
        .vo-team-btn { display: none; }
        .vo-drawer {
          overflow: hidden; transition: height 0.3s ease;
          background: #0a0a1a; flex-shrink: 0;
          display: flex; flex-direction: column;
        }

        @media (max-width: 768px) {
          .vo-root { flex-direction: column; }
          .vo-office { flex: 1; min-height: 0; }
          .vo-panel { display: none !important; }
          .vo-team-btn { display: flex !important; }
        }
      `}</style>

      <div className="vo-root">
        {/* Office floor */}
        <div className="vo-office">
          {viewStyle === "flat"       && <OfficeFlat       {...officeProps} />}
          {viewStyle === "isometric"  && <OfficeIsometric  {...officeProps} />}
          {viewStyle === "skyscraper" && <OfficeSkyscraper {...officeProps} />}

          {/* Team button — only visible on mobile via CSS */}
          <button
            className="vo-team-btn"
            onClick={() => setDrawerOpen(o => !o)}
            style={{
              position: "absolute", bottom: 20, left: 16, zIndex: 100,
              background: drawerOpen ? "#00D4FF18" : "#0d0d20cc",
              border: `1px solid ${drawerOpen ? "#00D4FF55" : "#ffffff22"}`,
              borderRadius: 12, padding: "10px 16px",
              color: drawerOpen ? "#00D4FF" : "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              alignItems: "center", gap: 8,
              backdropFilter: "blur(12px)", boxShadow: "0 4px 16px #000000aa",
            }}
          >
            <span style={{ fontSize: 16 }}>👥</span>
            {drawerOpen ? "Close" : "Team"}
          </button>

          <ViewPicker />
        </div>

        {/* Desktop right panel — hidden via CSS on mobile */}
        <div className={`vo-panel${activeAgent ? " hidden" : ""}`}>
          <BroadcastBar workspaceSlug={workspaceSlug} onReplies={handleBroadcastReplies} />
          <ActivityFeed log={taskLog} />
          <AgentRoster agents={AGENTS} busyIds={busyAgents} onSelect={handleSelect} allowedSlugs={allowedSlugs} plan={plan} />
        </div>

        {/* Desktop chat window */}
        {activeAgent && !isMobile && (
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

        {/* Mobile drawer — slides up from bottom */}
        {isMobile && (
          <div
            className="vo-drawer"
            style={{
              height: drawerOpen ? "58vh" : 0,
              borderTop: drawerOpen ? "1px solid #00D4FF22" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px", flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#ffffff22" }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <BroadcastBar workspaceSlug={workspaceSlug} onReplies={handleBroadcastReplies} />
              <ActivityFeed log={taskLog} />
              <AgentRoster agents={AGENTS} busyIds={busyAgents} onSelect={handleSelect} allowedSlugs={allowedSlugs} plan={plan} />
            </div>
          </div>
        )}

        {/* Mobile chat overlay */}
        {activeAgent && isMobile && (
          <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
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
          </div>
        )}
      </div>
    </>
  );
}

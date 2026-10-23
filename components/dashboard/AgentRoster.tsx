// components/dashboard/AgentRoster.tsx
import type { AgentDef, Dept } from "@/types";
import { PLAN_LABELS } from "@/lib/plans";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF", Sales: "#FF6B35", Marketing: "#A855F7", Operations: "#10B981",
  "Real Estate": "#F59E0B", Restaurant: "#EF4444", "Music & Entertainment": "#8B5CF6",
};

export default function AgentRoster({ agents, busyIds, onSelect, allowedSlugs, plan }: {
  agents: AgentDef[]; busyIds: Set<string>; onSelect: (a: AgentDef) => void;
  allowedSlugs: Set<string>; plan: string;
}) {
  const depts: Dept[] = ["Engineering", "Sales", "Marketing", "Operations", "Real Estate", "Restaurant", "Music & Entertainment"];
  const unlockedCount = agents.filter(a => allowedSlugs.has(a.slug)).length;

  return (
    <div style={{ padding: 10, borderTop: "1px solid #ffffff11", maxHeight: 240, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ color: "#ffffff44", fontSize: 9, letterSpacing: 2 }} className="mono">
          TEAM ROSTER ({unlockedCount}/{agents.length})
        </div>
        <div style={{ color: "#00D4FF", fontSize: 9 }} className="mono">{PLAN_LABELS[plan]?.name ?? plan}</div>
      </div>
      {depts.map(dept => (
        <div key={dept} style={{ marginBottom: 8 }}>
          <div style={{ color: DEPT_COLORS[dept], fontSize: 9, marginBottom: 4, fontWeight: 700 }}>{dept.toUpperCase()}</div>
          {agents.filter(a => a.dept === dept).map(a => {
            const locked = !allowedSlugs.has(a.slug);
            return (
              <div key={a.slug} onClick={() => onSelect(a)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "3px 0", cursor: "pointer",
                opacity: locked ? 0.5 : 1,
              }}>
                <span style={{ fontSize: 12 }}>{a.emoji}</span>
                <span style={{ color: "#ffffff88", fontSize: 10 }}>{a.name}</span>
                <span style={{ color: "#ffffff44", fontSize: 9 }}>· {a.tools.length ? a.tools.join(", ") : "no tools"}</span>
                {locked && <span style={{ fontSize: 9 }}>🔒</span>}
                {busyIds.has(a.slug) && !locked && <span style={{ color: "#FFD700", fontSize: 9 }}>⚡</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

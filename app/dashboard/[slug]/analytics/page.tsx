"use client";
// app/dashboard/[slug]/analytics/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PLAN_LABELS } from "@/lib/plans";

interface AgentUsage { slug: string; name: string; count: number }
interface DayCount { date: string; count: number }
interface AnalyticsData {
  workspace: { id: string; name: string; slug: string; plan: string };
  agentUsage: AgentUsage[];
  niaTotalUsed: number;
  timeline: DayCount[];
}

const PLAN_NIA_LIMIT: Record<string, number | null> = {
  starter: 100,
  growth: 500,
  enterprise: null,
  agency: null,
  superadmin: null,
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 12,
      padding: "16px 20px", flex: "1 1 150px",
    }}>
      <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#ffffff55", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ background: "#ffffff0a", borderRadius: 4, height: 8, overflow: "hidden", flex: 1 }}>
      <div style={{ background: color, height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
  );
}

function MiniChart({ timeline }: { timeline: DayCount[] }) {
  const max = Math.max(...timeline.map(d => d.count), 1);
  const w = 100 / timeline.length;
  return (
    <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 2 }}>
      {timeline.map((d) => {
        const pct = d.count / max;
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        return (
          <div key={d.date} title={`${d.date}: ${d.count}`} style={{
            flex: 1, background: isToday ? "#00D4FF" : (d.count > 0 ? "#00D4FF66" : "#ffffff0a"),
            borderRadius: "2px 2px 0 0",
            height: `${Math.max(4, pct * 100)}%`,
            transition: "height 0.4s ease",
          }} />
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${slug}/analytics`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff44", fontSize: 13 }}>
      Loading analytics…
    </div>
  );
  if (error) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ff4d4d", fontSize: 13 }}>
      {error}
    </div>
  );
  if (!data) return null;

  const { workspace, agentUsage, niaTotalUsed, timeline } = data;
  const planLabel = PLAN_LABELS[workspace.plan]?.name ?? workspace.plan;
  const niaLimit = PLAN_NIA_LIMIT[workspace.plan];
  const niaDisplay = niaLimit == null ? "Unlimited" : `${niaTotalUsed} / ${niaLimit}`;
  const niaPct = niaLimit == null ? 0 : (niaTotalUsed / niaLimit) * 100;
  const totalEvents = timeline.reduce((s, d) => s + d.count, 0);
  const topAgent = agentUsage[0] ?? null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" }}>WORKSPACE ANALYTICS</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{workspace.name}</div>
        <div style={{ color: "#00D4FF", fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>{planLabel} plan · last 30 days</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Stat label="AGENT INTERACTIONS" value={totalEvents.toLocaleString()} sub="last 30 days" />
        <Stat
          label="NIA AI CREDITS"
          value={niaTotalUsed.toLocaleString()}
          sub={niaLimit == null ? "Unlimited plan" : `${niaLimit} monthly limit`}
        />
        <Stat label="ACTIVE AGENTS" value={agentUsage.length} sub={`across ${agentUsage.length} agent${agentUsage.length !== 1 ? "s" : ""}`} />
        <Stat label="CURRENT PLAN" value={planLabel} sub={workspace.plan === "superadmin" ? "All access" : ""} />
      </div>

      {/* Activity chart */}
      <div style={{ background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 12, padding: "20px" }}>
        <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 12 }}>DAILY ACTIVITY · 30-DAY TREND</div>
        <MiniChart timeline={timeline} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ color: "#ffffff33", fontSize: 10 }}>{timeline[0]?.date}</span>
          <span style={{ color: "#ffffff33", fontSize: 10 }}>Today</span>
        </div>
      </div>

      {/* Nia credits */}
      <div style={{ background: "#A855F710", border: "1px solid #A855F730", borderRadius: 12, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#A855F7", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" }}>👑 NIA AI CREDITS</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{niaDisplay}</div>
          </div>
          {niaLimit != null && (
            <div style={{ color: "#A855F7", fontSize: 22, fontWeight: 800 }}>{Math.round(niaPct)}%</div>
          )}
        </div>
        {niaLimit != null && (
          <div style={{ background: "#ffffff0a", borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{
              background: niaPct > 80 ? "#ef4444" : niaPct > 60 ? "#f59e0b" : "#A855F7",
              height: "100%", width: `${Math.min(100, niaPct)}%`, borderRadius: 6, transition: "width 0.6s ease",
            }} />
          </div>
        )}
        {niaLimit == null && (
          <div style={{ color: "#A855F788", fontSize: 12 }}>Your plan includes unlimited Nia AI conversations.</div>
        )}
        {niaLimit != null && niaPct > 80 && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>
            ⚠️ You&apos;re nearing your monthly Nia credit limit.
          </div>
        )}
      </div>

      {/* Agent leaderboard */}
      <div style={{ background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 12, padding: "20px" }}>
        <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 16 }}>AGENT USAGE · ALL TIME</div>
        {agentUsage.length === 0 ? (
          <div style={{ color: "#ffffff33", fontSize: 13 }}>No agent activity recorded yet. Start using your agents to see data here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {agentUsage.slice(0, 10).map((a, i) => {
              const pct = topAgent ? (a.count / topAgent.count) * 100 : 0;
              const colors = ["#00D4FF", "#A855F7", "#10b981", "#f59e0b", "#ef4444"];
              const color = colors[i % colors.length];
              return (
                <div key={a.slug} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "#ffffff33", fontSize: 11, fontFamily: "monospace", width: 18, flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{ color: "#fff", fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <Bar pct={pct} color={color} />
                  <div style={{ color, fontSize: 12, fontWeight: 700, width: 40, textAlign: "right", flexShrink: 0 }}>{a.count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing summary */}
      <div style={{ background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 12, padding: "20px" }}>
        <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 12 }}>BILLING SUMMARY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#ffffffaa", fontSize: 13 }}>Current plan</span>
            <span style={{ color: "#00D4FF", fontWeight: 700, fontSize: 13 }}>{planLabel}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#ffffffaa", fontSize: 13 }}>Data access</span>
            <span style={{ color: "#10b981", fontSize: 13 }}>🔒 Private — your data only</span>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #ffffff0a" }}>
          <a href={`/dashboard/${workspace.slug}/settings`} style={{
            background: "#ffffff0a", border: "1px solid #ffffff18", borderRadius: 8,
            padding: "8px 16px", color: "#ffffffaa", fontSize: 12, textDecoration: "none", display: "inline-block",
          }}>
            Manage billing & plan →
          </a>
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}

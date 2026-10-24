// components/reports/ReportsView.tsx
"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import MetricConfigForm from "./MetricConfigForm";
import type { TaskSummary } from "@/lib/reports";

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF", Sales: "#FF6B35", Marketing: "#A855F7", Operations: "#10B981",
  "Real Estate": "#F59E0B", Restaurant: "#EF4444", "Music & Entertainment": "#8B5CF6", "E-Commerce": "#EC4899", Trades: "#F59E0B", Business: "#6366F1", Unknown: "#666",
};

export default function ReportsView({ workspaceSlug }: { workspaceSlug: string }) {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [mrrSeries, setMrrSeries] = useState<{ point: string; value: number }[] | null>(null);
  const [mrrNeedsConfig, setMrrNeedsConfig] = useState(false);
  const [mrrError, setMrrError] = useState<string | null>(null);

  const loadTaskSummary = async () => {
    try {
      const res = await fetch(`/api/reports/tasks-summary?workspaceSlug=${encodeURIComponent(workspaceSlug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load task summary");
      setSummary(data);
    } catch (err: any) {
      setSummaryError(err.message);
    }
  };

  const loadMrr = async () => {
    setMrrError(null);
    try {
      const res = await fetch(`/api/reports/metric?workspaceSlug=${encodeURIComponent(workspaceSlug)}&metric=mrr`);
      const data = await res.json();
      if (data.needsConfig) { setMrrNeedsConfig(true); return; }
      if (!res.ok) throw new Error(data.error ?? "Failed to load MRR");
      setMrrNeedsConfig(false);
      setMrrSeries(data.series);
    } catch (err: any) {
      setMrrError(err.message);
    }
  };

  useEffect(() => { loadTaskSummary(); loadMrr(); }, [workspaceSlug]);

  const pieData = summary?.byDept.map(d => ({ name: d.dept, value: d.tasks, color: DEPT_COLORS[d.dept] ?? "#666" })) ?? [];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
      <div style={{ color: "#ffffff88", fontSize: 11, letterSpacing: 2, marginBottom: 4 }} className="mono">REPORTS</div>
      <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Workspace activity</div>

      {summaryError && (
        <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 16 }}>{summaryError}</div>
      )}

      {summary && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <StatCard label="Total tasks logged" value={summary.totalTasks} />
          <StatCard label="Failed tool calls" value={summary.failedTasks} accent={summary.failedTasks > 0 ? "#ff6666" : undefined} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20, height: 260 }}>
          <div style={{ color: "#10B981", fontSize: 12, fontWeight: 700, marginBottom: 10 }} className="mono">TASKS COMPLETED — LAST 14 DAYS</div>
          {summary && summary.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={summary.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#ffffff55" fontSize={10} tickFormatter={d => d.slice(5)} />
                <YAxis stroke="#ffffff55" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #10B98144" }} />
                <Bar dataKey="tasks" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No tasks logged yet — they show up here once agents start running tools." />
          )}
        </div>

        <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20, height: 260 }}>
          <div style={{ color: "#A855F7", fontSize: 12, fontWeight: 700, marginBottom: 10 }} className="mono">TASKS BY DEPARTMENT</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #A855F744" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Department breakdown appears once tasks are logged." />
          )}
        </div>
      </div>

      <div style={{ marginBottom: 8, color: "#ffffff88", fontSize: 12, fontWeight: 700 }} className="mono">MRR — CFO DANA</div>
      {mrrError && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 10 }}>{mrrError}</div>}
      {mrrNeedsConfig ? (
        <MetricConfigForm workspaceSlug={workspaceSlug} metric="mrr" label="MRR" onSaved={loadMrr} />
      ) : mrrSeries ? (
        <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mrrSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="point" stroke="#ffffff55" fontSize={10} />
              <YAxis stroke="#ffffff55" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid #00D4FF44" }} />
              <Line type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} dot={{ fill: "#00D4FF" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: "#ffffff44", fontSize: 12 }}>Loading...</div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: "14px 20px", minWidth: 160 }}>
      <div style={{ color: accent ?? "#fff", fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "#ffffff55", fontSize: 11 }}>{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff33", fontSize: 12, textAlign: "center", padding: "0 20px" }}>
      {text}
    </div>
  );
}

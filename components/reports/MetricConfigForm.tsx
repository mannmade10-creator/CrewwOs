// components/reports/MetricConfigForm.tsx
"use client";
import { useState } from "react";

export default function MetricConfigForm({ workspaceSlug, metric, label, onSaved }: {
  workspaceSlug: string; metric: string; label: string; onSaved: () => void;
}) {
  const [tableName, setTableName] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!tableName.trim() || !dateColumn.trim()) {
      setError("Table name and date column are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, metric, table_name: tableName, amount_column: amountColumn || null, date_column: dateColumn }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{label} isn't wired up yet</div>
      <div style={{ color: "#ffffff55", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
        Tell CrewOS which table in your connected Supabase project holds this data. Requires the Supabase integration to be connected first.
      </div>
      {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <input placeholder="Table name (e.g. subscriptions)" value={tableName} onChange={e => setTableName(e.target.value)}
          style={{ background: "#060612", border: "1px solid #ffffff22", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12 }} />
        <input placeholder="Amount column (optional, e.g. amount_cents)" value={amountColumn} onChange={e => setAmountColumn(e.target.value)}
          style={{ background: "#060612", border: "1px solid #ffffff22", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12 }} />
        <input placeholder="Date column (e.g. created_at)" value={dateColumn} onChange={e => setDateColumn(e.target.value)}
          style={{ background: "#060612", border: "1px solid #ffffff22", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12 }} />
      </div>
      <button onClick={save} disabled={saving} style={{
        background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 8,
        padding: "7px 16px", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: saving ? 0.6 : 1,
      }}>{saving ? "Saving..." : "Save mapping"}</button>
    </div>
  );
}

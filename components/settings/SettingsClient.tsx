"use client";
import { useState } from "react";
import BillingCard from "./BillingCard";
import { PLAN_LABELS } from "@/lib/plans";

const TABS = ["Workspace", "Billing", "Danger Zone"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }} className="mono">{children}</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#0d0d1a", border: "1px solid #ffffff14", borderRadius: 14, padding: "20px 24px", marginBottom: 16, ...style }}>{children}</div>;
}

function InputRow({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: "#ffffff88", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", boxSizing: "border-box", background: disabled ? "#ffffff05" : "#ffffff08", border: "1px solid #ffffff18", borderRadius: 8, padding: "10px 14px", color: disabled ? "#ffffff44" : "#fff", fontSize: 13, outline: "none" }} />
    </div>
  );
}

function SaveButton({ loading, onClick }: { loading?: boolean; onClick: () => void }) {
  return <button onClick={onClick} disabled={loading} style={{ background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", borderRadius: 8, padding: "9px 20px", color: "#000", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Saving..." : "Save changes"}</button>;
}

function WorkspaceTab({ workspaceName, workspaceSlug, currentPlan }: { workspaceName: string; workspaceSlug: string; currentPlan: string; }) {
  const [name, setName] = useState(workspaceName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!name.trim() || name === workspaceName) return;
    setSaving(true); setError(null);
    try {
      const url = "/api/workspaces/" + workspaceSlug;
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save"); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };
  return (
    <div>
      <SectionLabel>WORKSPACE INFO</SectionLabel>
      <Card>
        <InputRow label="Workspace name" value={name} onChange={setName} placeholder="My Company" />
        <InputRow label="Workspace slug" value={workspaceSlug} disabled />
        <InputRow label="Current plan" value={PLAN_LABELS[currentPlan]?.name ?? currentPlan} disabled />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <SaveButton loading={saving} onClick={save} />
          {saved && <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600 }}>Saved</span>}
          {error && <span style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</span>}
        </div>
      </Card>
      <SectionLabel>INTEGRATIONS OVERVIEW</SectionLabel>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {[{ name: "Brevo", desc: "Email & SMS", icon: "E" }, { name: "Vapi", desc: "Voice AI calls", icon: "V" }, { name: "Google Calendar", desc: "Scheduling", icon: "G" }, { name: "Retell AI", desc: "Voice workflows", icon: "R" }, { name: "Resend", desc: "Transactional email", icon: "S" }, { name: "Stripe", desc: "Payments", icon: "$" }].map(int => (
            <div key={int.name} style={{ background: "#ffffff05", border: "1px solid #ffffff10", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ffffff0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#00D4FF", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{int.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{int.name}</div>
                <div style={{ color: "#ffffff44", fontSize: 10, marginTop: 2 }}>{int.desc}</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffffff22", flexShrink: 0 }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <a href={"/dashboard/" + workspaceSlug + "/integrations"} style={{ color: "#00D4FF", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Manage integrations</a>
        </div>
      </Card>
    </div>
  );
}

function DangerTab({ workspaceSlug, workspaceName }: { workspaceSlug: string; workspaceName: string }) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmName === workspaceName;
  const deleteWorkspace = async () => {
    if (!canDelete) return;
    setDeleting(true); setError(null);
    try {
      const url = "/api/workspaces/" + workspaceSlug;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to delete"); }
      window.location.href = "/onboarding";
    } catch (err: any) { setError(err.message); setDeleting(false); }
  };
  return (
    <div>
      <SectionLabel>DANGER ZONE</SectionLabel>
      <Card style={{ border: "1px solid #ff444422" }}>
        <div style={{ color: "#ff6b6b", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Delete workspace</div>
        <div style={{ color: "#ffffff55", fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>This will permanently delete <strong style={{ color: "#fff" }}>{workspaceName}</strong> and all its data. This cannot be undone.</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: "#ffffff66", fontSize: 11, marginBottom: 6 }}>Type <strong style={{ color: "#fff" }}>{workspaceName}</strong> to confirm</label>
          <input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={workspaceName} style={{ width: "100%", maxWidth: 340, boxSizing: "border-box", background: "#ffffff08", border: "1px solid #ff444433", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none" }} />
        </div>
        {error && <div style={{ color: "#ff9999", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <button onClick={deleteWorkspace} disabled={!canDelete || deleting} style={{ background: canDelete ? "#ff4444" : "#ffffff08", border: "none", borderRadius: 8, padding: "9px 20px", color: canDelete ? "#fff" : "#ffffff33", fontSize: 12, fontWeight: 700, cursor: canDelete && !deleting ? "pointer" : "not-allowed" }}>
          {deleting ? "Deleting..." : "Delete workspace"}
        </button>
      </Card>
    </div>
  );
}

export default function SettingsClient({ workspaceSlug, workspaceName, currentPlan, stripeStatus, hasStripeCustomer, ownerId }: { workspaceSlug: string; workspaceName: string; currentPlan: string; stripeStatus: string | null; hasStripeCustomer: boolean; ownerId: string; }) {
  const [tab, setTab] = useState("Workspace");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid #ffffff10" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "transparent", border: "none", borderBottom: tab === t ? "2px solid #00D4FF" : "2px solid transparent", color: tab === t ? "#fff" : "#ffffff55", fontSize: 13, fontWeight: tab === t ? 700 : 500, padding: "8px 16px", cursor: "pointer", marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Workspace" && <WorkspaceTab workspaceName={workspaceName} workspaceSlug={workspaceSlug} currentPlan={currentPlan} />}
      {tab === "Billing" && <div><SectionLabel>BILLING &amp; PLAN</SectionLabel><BillingCard workspaceSlug={workspaceSlug} currentPlan={currentPlan} stripeStatus={stripeStatus} hasStripeCustomer={hasStripeCustomer} /></div>}
      {tab === "Danger Zone" && <DangerTab workspaceSlug={workspaceSlug} workspaceName={workspaceName} />}
    </div>
  );
}

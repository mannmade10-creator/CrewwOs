// components/integrations/IntegrationsView.tsx
"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { PROVIDERS, type Provider as Provider } from "@/lib/integration-fields";
import { PLAN_LABELS, integrationLimitForPlan } from "@/lib/plans";
import type { IntegrationMeta } from "@/lib/integrations";

type Status = Record<string, { is_connected: boolean; connected_at: string | null }>;

export default function IntegrationsView({ workspaceSlug, plan }: { workspaceSlug: string; plan: string }) {
  const { getToken } = useAuth(); // forces a fresh session token before any mutating request below
  const [status, setStatus] = useState<Status>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [openForm, setOpenForm] = useState<string | null>(null); // provider id with an open connect form
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [allowedTablesInput, setAllowedTablesInput] = useState("");
  const [editingTables, setEditingTables] = useState(false);
  const [tablesEditValue, setTablesEditValue] = useState("");
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limit = integrationLimitForPlan(plan);
  const connectedCount = Object.values(status).filter(s => s.is_connected).length;
  const atLimit = limit != null && connectedCount >= limit;

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/integrations?workspaceSlug=${encodeURIComponent(workspaceSlug)}`);
      const data = await res.json();
      const map: Status = {};
      (data.integrations as IntegrationMeta[] ?? []).forEach(i => {
        map[i.provider] = { is_connected: i.is_connected, connected_at: i.connected_at };
      });
      setStatus(map);
    } catch {
      setError("Couldn't load integration status.");
    }
    setLoadingStatus(false);
  };

  useEffect(() => { loadStatus(); }, [workspaceSlug]);

  const startConnect = (provider: Provider) => {
    setOpenForm(provider.id);
    setFormValues({});
    setAllowedTablesInput("");
    setError(null);
  };

  const startEditTables = async (provider: Provider) => {
    setError(null);
    setEditingTables(true);
    try {
      const res = await fetch(`/api/integrations/tables?workspaceSlug=${encodeURIComponent(workspaceSlug)}`);
      const data = await res.json();
      setTablesEditValue((data.tables ?? []).join(", "));
    } catch {
      setTablesEditValue("");
    }
  };

  const saveTables = async (provider: Provider) => {
    const tables = tablesEditValue.split(",").map(t => t.trim()).filter(Boolean);
    if (tables.length === 0) {
      setError("List at least one table â€” an empty list blocks all queries, which disconnecting would do anyway.");
      return;
    }
    setBusyProvider(provider.id);
    setError(null);
    try {
      // Session tokens are short-lived (~60s) and only refresh automatically
      // on GET/navigation â€” force a fresh one before this POST or a form
      // left open for a bit will 404 on submit.
      await getToken({ skipCache: true });
      const res = await fetch("/api/integrations/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, tables }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update tables");
      setEditingTables(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to update tables");
    }
    setBusyProvider(null);
  };

  const submitConnect = async (provider: Provider) => {
    const missing = provider.fields.filter(f => !formValues[f.key]?.trim());
    if (missing.length) {
      setError(`Fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    const allowedTables = allowedTablesInput.split(",").map(t => t.trim()).filter(Boolean);
    if (provider.id === "supabase" && allowedTables.length === 0) {
      setError("List at least one table agents are allowed to query â€” this can't be connected wide-open.");
      return;
    }
    setBusyProvider(provider.id);
    setError(null);
    try {
      await getToken({ skipCache: true });
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, provider: provider.id, credentials: formValues, allowedTables }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connect failed");
      setOpenForm(null);
      setFormValues({});
      setAllowedTablesInput("");
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? "Connect failed");
    }
    setBusyProvider(null);
  };

  const disconnect = async (provider: Provider) => {
    setBusyProvider(provider.id);
    setError(null);
    try {
      await getToken({ skipCache: true });
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, provider: provider.id }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? "Disconnect failed");
    }
    setBusyProvider(null);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ color: "#ffffff88", fontSize: 11, letterSpacing: 2 }} className="mono">INTEGRATIONS</div>
        <div style={{ color: atLimit ? "#FF6B35" : "#ffffff55", fontSize: 11 }} className="mono">
          {connectedCount}{limit != null ? `/${limit}` : ""} connected Â· {PLAN_LABELS[plan]?.name ?? plan} plan
        </div>
      </div>
      <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Connect your tools</div>
      <div style={{ color: "#ffffff55", fontSize: 12, marginBottom: 24, maxWidth: 560 }}>
        Credentials are encrypted before they're stored â€” this page never displays a saved value back to you. To rotate a key, disconnect and reconnect with the new one.
      </div>

      {atLimit && (
        <div style={{ background: "#FF6B3511", border: "1px solid #FF6B3555", color: "#FF6B35", borderRadius: 8, padding: "8px 14px", fontSize: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>You've used all {limit} integrations included in the {PLAN_LABELS[plan]?.name ?? plan} plan.</span>
          <a href={`/dashboard/${workspaceSlug}/settings`} style={{ color: "#FF6B35", fontWeight: 700, textDecoration: "underline" }}>Upgrade</a>
        </div>
      )}
      {error && (
        <div style={{ background: "#ff444411", border: "1px solid #ff444455", color: "#ff9999", borderRadius: 8, padding: "8px 14px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {PROVIDERS.map(provider => {
          const s = status[provider.id];
          const connected = !!s?.is_connected;
          const isOpen = openForm === provider.id;
          const isBusy = busyProvider === provider.id;
          const blockedByLimit = !connected && atLimit;

          return (
            <div key={provider.id} style={{
              background: "#0d0d1a", border: `1px solid ${connected ? "#10B98155" : "#ffffff18"}`,
              borderRadius: 12, padding: 16, opacity: blockedByLimit ? 0.55 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{provider.name}</div>
                <div style={{
                  fontSize: 9, padding: "3px 8px", borderRadius: 20,
                  background: connected ? "#10B98122" : "#ffffff0a", color: connected ? "#10B981" : "#ffffff55",
                }} className="mono">
                  {loadingStatus ? "Â·Â·Â·" : connected ? "â— CONNECTED" : "â—‹ NOT CONNECTED"}
                </div>
              </div>
              <div style={{ color: "#ffffff66", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>{provider.desc}</div>
              <div style={{ color: "#ffffff33", fontSize: 10, marginBottom: 14 }} className="mono">used by: {provider.usedBy}</div>

              {connected && provider.id === "supabase" && editingTables ? (
                <div style={{ marginBottom: 10 }}>
                  <input
                    placeholder="Allowed tables, comma-separated"
                    value={tablesEditValue}
                    onChange={e => setTablesEditValue(e.target.value)}
                    style={{ width: "100%", background: "#060612", border: "1px solid #FF6B3555", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ color: "#FF6B35", fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>
                    Replaces the current list entirely â€” not additive. Don't list tables with credentials, password hashes, or full payment details.
                  </div>
                </div>
              ) : null}

              {isOpen ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {provider.fields.map(f => (
                    <input
                      key={f.key}
                      type={f.secret ? "password" : "text"}
                      placeholder={f.placeholder ?? f.label}
                      value={formValues[f.key] ?? ""}
                      onChange={e => setFormValues(v => ({ ...v, [f.key]: e.target.value }))}
                      style={{ background: "#060612", border: "1px solid #ffffff22", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }}
                    />
                  ))}
                  {provider.id === "supabase" && (
                    <div>
                      <input
                        placeholder="Allowed tables, comma-separated (e.g. deals, leads, tasks)"
                        value={allowedTablesInput}
                        onChange={e => setAllowedTablesInput(e.target.value)}
                        style={{ width: "100%", background: "#060612", border: "1px solid #FF6B3555", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ color: "#FF6B35", fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>
                        Required. Agents can only query/write tables listed here â€” anything else is refused, even by a valid db_query call. Don't list tables with credentials, password hashes, or full payment details.
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8 }}>
                {connected && provider.id === "supabase" && editingTables ? (
                  <>
                    <button onClick={() => saveTables(provider)} disabled={isBusy} style={{
                      flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", color: "#000", opacity: isBusy ? 0.6 : 1,
                    }}>{isBusy ? "Saving..." : "Save tables"}</button>
                    <button onClick={() => { setEditingTables(false); setError(null); }} style={{
                      padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "transparent", border: "1px solid #ffffff22", color: "#ffffff88",
                    }}>Cancel</button>
                  </>
                ) : connected ? (
                  <>
                    {provider.id === "supabase" && (
                      <button onClick={() => startEditTables(provider)} style={{
                        flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: "transparent", border: "1px solid #00D4FF55", color: "#00D4FF",
                      }}>Manage tables</button>
                    )}
                    <button onClick={() => disconnect(provider)} disabled={isBusy} style={{
                      flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "transparent", border: "1px solid #ff444455", color: "#ff6666", opacity: isBusy ? 0.6 : 1,
                    }}>{isBusy ? "..." : "Disconnect"}</button>
                  </>
                ) : isOpen ? (
                  <>
                    <button onClick={() => submitConnect(provider)} disabled={isBusy} style={{
                      flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", color: "#000", opacity: isBusy ? 0.6 : 1,
                    }}>{isBusy ? "Saving..." : "Save & connect"}</button>
                    <button onClick={() => { setOpenForm(null); setError(null); }} style={{
                      padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: "transparent", border: "1px solid #ffffff22", color: "#ffffff88",
                    }}>Cancel</button>
                  </>
                ) : blockedByLimit ? (
                  <a href={`/dashboard/${workspaceSlug}/settings`} style={{
                    flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: "center",
                    background: "transparent", border: "1px solid #FF6B3555", color: "#FF6B35", textDecoration: "none",
                  }}>Upgrade to connect</a>
                ) : (
                  <button onClick={() => startConnect(provider)} style={{
                    flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: "linear-gradient(135deg, #00D4FF, #0066FF)", border: "none", color: "#000",
                  }}>Connect</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



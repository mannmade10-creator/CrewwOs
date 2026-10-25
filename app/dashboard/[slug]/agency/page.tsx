"use client";
// app/dashboard/[slug]/agency/page.tsx
// Agency client management — only visible/usable by agency plan workspaces.
// Shows all workspaces that signed up under this agency, lets agency owner
// ban, unban, or remove (soft-delete) clients. Cannot touch anyone else's accounts.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ClientWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  vertical?: string;
  owner_email?: string;
  banned_at: string | null;
  created_at: string;
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    starter: "#ffffff44",
    growth: "#00D4FF",
    enterprise: "#A855F7",
    agency: "#f59e0b",
    superadmin: "#10b981",
  };
  return (
    <span style={{
      background: (colors[plan] ?? "#ffffff44") + "22",
      border: `1px solid ${(colors[plan] ?? "#ffffff44")}55`,
      color: colors[plan] ?? "#ffffff88",
      borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: "monospace",
    }}>
      {plan.toUpperCase()}
    </span>
  );
}

export default function AgencyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [clients, setClients] = useState<ClientWorkspace[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // client slug being actioned
  const [confirm, setConfirm] = useState<{ slug: string; action: "ban" | "delete" } | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/workspaces/${slug}/agency`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setClients(d.clients ?? []);
      })
      .catch(() => setError("Failed to load clients"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [slug]);

  const doAction = async (clientSlug: string, action: "ban" | "unban" | "delete") => {
    setBusy(clientSlug);
    try {
      const res = await fetch(`/api/workspaces/${slug}/agency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientSlug }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Action failed");
      load();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff44", fontSize: 13 }}>
      Loading clients…
    </div>
  );

  if (error === "Agency plan required") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Agency Dashboard</div>
        <div style={{ color: "#ffffff66", fontSize: 13, lineHeight: 1.6 }}>
          Client management is available on the Agency plan. Upgrade to manage sub-accounts, ban or remove clients, and view client workspace details.
        </div>
        <a href={`/dashboard/${slug}/settings`} style={{
          display: "inline-block", marginTop: 20, background: "#f59e0b", borderRadius: 10,
          padding: "10px 24px", color: "#000", fontWeight: 800, fontSize: 13, textDecoration: "none",
        }}>
          Upgrade to Agency →
        </a>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ff4d4d", fontSize: 13 }}>
      {error}
    </div>
  );

  const active = (clients ?? []).filter(c => !c.banned_at);
  const banned = (clients ?? []).filter(c => !!c.banned_at);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Confirm dialog overlay */}
      {confirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#0d0d1e", border: "1px solid #ffffff22", borderRadius: 16,
            padding: 28, maxWidth: 360, width: "90%",
          }}>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {confirm.action === "delete" ? "Remove client?" : "Ban client?"}
            </div>
            <div style={{ color: "#ffffff88", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {confirm.action === "delete"
                ? `This will remove the workspace "${confirm.slug}" from your agency. Their account will be suspended but not permanently deleted.`
                : `This will ban workspace "${confirm.slug}". They will lose access to their dashboard. You can unban them at any time.`}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1, background: "#ffffff0a", border: "1px solid #ffffff22", borderRadius: 8,
                  color: "#ffffffaa", fontSize: 13, padding: "9px 0", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => doAction(confirm.slug, confirm.action)}
                disabled={!!busy}
                style={{
                  flex: 1,
                  background: confirm.action === "delete" ? "#ef4444" : "#f59e0b",
                  border: "none", borderRadius: 8,
                  color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 0",
                  cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? "Working…" : confirm.action === "delete" ? "Yes, remove" : "Yes, ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ color: "#f59e0b", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" }}>🏢 AGENCY DASHBOARD</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>Client Management</div>
        <div style={{ color: "#ffffff55", fontSize: 12, marginTop: 4 }}>
          {active.length} active · {banned.length} banned — only your sub-accounts are shown
        </div>
      </div>

      {/* Notice */}
      <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>
          🔒 You can only manage workspaces that signed up under your agency. You cannot view or modify any other accounts.
        </div>
      </div>

      {/* Active clients */}
      <div>
        <div style={{ color: "#ffffff44", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 12 }}>
          ACTIVE CLIENTS ({active.length})
        </div>
        {active.length === 0 ? (
          <div style={{ background: "#ffffff06", border: "1px solid #ffffff12", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#ffffff33", fontSize: 13 }}>
            No active client workspaces yet. Clients will appear here when they sign up under your agency.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {active.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                busy={busy === c.slug}
                onBan={() => setConfirm({ slug: c.slug, action: "ban" })}
                onRemove={() => setConfirm({ slug: c.slug, action: "delete" })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Banned clients */}
      {banned.length > 0 && (
        <div>
          <div style={{ color: "#ef444488", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 12 }}>
            BANNED CLIENTS ({banned.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {banned.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                busy={busy === c.slug}
                onUnban={() => doAction(c.slug, "unban")}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

function ClientCard({
  client,
  busy,
  onBan,
  onUnban,
  onRemove,
}: {
  client: ClientWorkspace;
  busy: boolean;
  onBan?: () => void;
  onUnban?: () => void;
  onRemove?: () => void;
}) {
  const isBanned = !!client.banned_at;
  const joined = new Date(client.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{
      background: isBanned ? "#ef444408" : "#ffffff06",
      border: `1px solid ${isBanned ? "#ef444430" : "#ffffff12"}`,
      borderRadius: 12, padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isBanned ? "#ef444422" : "#00D4FF22",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 800, color: isBanned ? "#ef4444" : "#00D4FF",
      }}>
        {client.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{client.name}</span>
          <PlanBadge plan={client.plan} />
          {isBanned && (
            <span style={{ background: "#ef444422", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
              BANNED
            </span>
          )}
        </div>
        <div style={{ color: "#ffffff55", fontSize: 11, marginTop: 3, fontFamily: "monospace" }}>
          {client.slug}{client.vertical ? ` · ${client.vertical}` : ""} · joined {joined}
        </div>
        {client.owner_email && (
          <div style={{ color: "#ffffff33", fontSize: 11, marginTop: 2 }}>
            {client.owner_email}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {!isBanned && onBan && (
          <button
            onClick={onBan}
            disabled={busy}
            style={{
              background: "#f59e0b18", border: "1px solid #f59e0b44", borderRadius: 8,
              color: "#f59e0b", fontSize: 11, fontWeight: 700, padding: "6px 12px",
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Ban"}
          </button>
        )}
        {isBanned && onUnban && (
          <button
            onClick={onUnban}
            disabled={busy}
            style={{
              background: "#10b98118", border: "1px solid #10b98144", borderRadius: 8,
              color: "#10b981", fontSize: 11, fontWeight: 700, padding: "6px 12px",
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Unban"}
          </button>
        )}
        {!isBanned && onRemove && (
          <button
            onClick={onRemove}
            disabled={busy}
            style={{
              background: "#ef444418", border: "1px solid #ef444444", borderRadius: 8,
              color: "#ef4444", fontSize: 11, fontWeight: 700, padding: "6px 12px",
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

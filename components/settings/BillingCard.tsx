// components/settings/BillingCard.tsx
"use client";
import { useState } from "react";
import { PLAN_LABELS } from "@/lib/plans";

const PLAN_ORDER = ["starter", "growth", "enterprise", "agency"];

export default function BillingCard({ workspaceSlug, currentPlan, stripeStatus, hasStripeCustomer }: {
  workspaceSlug: string; currentPlan: string; stripeStatus: string | null; hasStripeCustomer: boolean;
}) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = async (plan: string) => {
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    setLoadingPortal(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't open billing portal");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoadingPortal(false);
    }
  };

  const statusColor = stripeStatus === "active" || stripeStatus === "trialing" ? "#10B981"
    : stripeStatus === "past_due" ? "#FF6B35"
    : stripeStatus === "canceled" ? "#ff4444"
    : "#ffffff55";

  return (
    <div>
      <div style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{PLAN_LABELS[currentPlan]?.name ?? currentPlan}</div>
          {stripeStatus && (
            <div style={{ fontSize: 10, color: statusColor, fontWeight: 700 }} className="mono">{stripeStatus.toUpperCase()}</div>
          )}
        </div>
        <div style={{ color: "#ffffff66", fontSize: 12, marginBottom: 16 }}>
          {PLAN_LABELS[currentPlan]?.price} · {PLAN_LABELS[currentPlan]?.agents} · {PLAN_LABELS[currentPlan]?.integrations}
        </div>
        {hasStripeCustomer && (
          <button onClick={openPortal} disabled={loadingPortal} style={{
            background: "transparent", border: "1px solid #ffffff22", color: "#ffffff88",
            borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: loadingPortal ? 0.6 : 1,
          }}>{loadingPortal ? "Opening..." : "Manage billing"}</button>
        )}
      </div>

      {error && (
        <div style={{ background: "#ff444411", border: "1px solid #ff444455", color: "#ff9999", borderRadius: 8, padding: "8px 14px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ color: "#ffffff55", fontSize: 11, letterSpacing: 1, marginBottom: 10 }} className="mono">ALL PLANS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {PLAN_ORDER.map(plan => {
          const label = PLAN_LABELS[plan];
          const isCurrent = plan === currentPlan;
          return (
            <div key={plan} style={{
              background: "#0d0d1a", border: `1px solid ${isCurrent ? "#00D4FF55" : "#ffffff18"}`,
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{label.name}</div>
              <div style={{ color: "#00D4FF", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{label.price}</div>
              <div style={{ color: "#ffffff55", fontSize: 11, marginBottom: 14, lineHeight: 1.6 }}>{label.agents}<br />{label.integrations}</div>
              <button
                onClick={() => upgrade(plan)}
                disabled={isCurrent || loadingPlan === plan}
                style={{
                  width: "100%", padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: isCurrent ? "default" : "pointer",
                  background: isCurrent ? "#ffffff0a" : "linear-gradient(135deg, #00D4FF, #0066FF)",
                  border: "none", color: isCurrent ? "#ffffff44" : "#000",
                  opacity: loadingPlan === plan ? 0.6 : 1,
                }}
              >
                {isCurrent ? "Current plan" : loadingPlan === plan ? "Redirecting..." : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

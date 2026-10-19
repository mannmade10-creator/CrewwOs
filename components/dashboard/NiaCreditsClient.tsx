// components/dashboard/NiaCreditsClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreditPack = {
  key: "nia_setup" | "nia_credits_500" | "nia_credits_1500" | "nia_credits_5000";
  label: string;
  credits: number;
  price: string;
  priceNum: number;
  badge?: string;
  highlight?: boolean;
};

const PACKS: CreditPack[] = [
  {
    key: "nia_setup",
    label: "Starter Pack",
    credits: 100,
    price: "$49",
    priceNum: 49,
    badge: "Includes Setup",
    highlight: false,
  },
  {
    key: "nia_credits_500",
    label: "500 Credits",
    credits: 500,
    price: "$29",
    priceNum: 29,
  },
  {
    key: "nia_credits_1500",
    label: "1,500 Credits",
    credits: 1500,
    price: "$79",
    priceNum: 79,
    badge: "Best Value",
    highlight: true,
  },
  {
    key: "nia_credits_5000",
    label: "5,000 Credits",
    credits: 5000,
    price: "$199",
    priceNum: 199,
    badge: "Volume",
  },
];

function costPerCredit(pack: CreditPack) {
  return (pack.priceNum / pack.credits).toFixed(3);
}

export default function NiaCreditsClient({
  workspaceSlug,
  creditsRemaining,
  creditsUsed,
  lastUpdated,
  niaActive,
}: {
  workspaceSlug: string;
  creditsRemaining: number;
  creditsUsed: number;
  lastUpdated: string | null;
  niaActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const total = creditsRemaining + creditsUsed;
  const pct = total > 0 ? Math.round((creditsRemaining / total) * 100) : 0;

  // Colour thresholds for the credit meter
  const meterColor =
    creditsRemaining === 0
      ? "#ef4444"
      : creditsRemaining < 100
      ? "#f59e0b"
      : "#00D4FF";

  async function buyCredits(key: string) {
    setLoading(key);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey: key, mode: "payment" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 28px",
        background: "#080812",
        color: "#fff",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>👑</span>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              background: "linear-gradient(90deg, #00D4FF, #A855F7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Nia AI Receptionist
          </h1>
          <span
            style={{
              background: niaActive ? "#00D4FF22" : "#ffffff11",
              border: `1px solid ${niaActive ? "#00D4FF55" : "#ffffff22"}`,
              color: niaActive ? "#00D4FF" : "#ffffff44",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {niaActive ? "● Active" : "○ Inactive"}
          </span>
        </div>
        <p style={{ margin: 0, color: "#ffffff66", fontSize: 14 }}>
          Nia handles your calls, texts, and bookings 24/7. Credits are consumed
          as she works — 1 credit ≈ 1 minute of call handling.
        </p>
      </div>

      {/* Credit balance card */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d0d22, #13102a)",
          border: "1px solid #ffffff15",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 28,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
        }}
      >
        {/* Remaining */}
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#ffffff55", letterSpacing: 1, textTransform: "uppercase" }}>
            Credits Remaining
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 48,
              fontWeight: 900,
              color: meterColor,
              lineHeight: 1,
            }}
          >
            {creditsRemaining.toLocaleString()}
          </p>
          {lastUpdated && (
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#ffffff33" }}>
              Last updated{" "}
              {new Date(lastUpdated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Used */}
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#ffffff55", letterSpacing: 1, textTransform: "uppercase" }}>
            Credits Used
          </p>
          <p style={{ margin: 0, fontSize: 48, fontWeight: 900, color: "#A855F7", lineHeight: 1 }}>
            {creditsUsed.toLocaleString()}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "#ffffff33" }}>
            ≈ {creditsUsed.toLocaleString()} min of call handling
          </p>
        </div>

        {/* Meter */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#ffffff44",
              marginBottom: 8,
            }}
          >
            <span>Usage</span>
            <span>{pct}% remaining</span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "#ffffff10",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${meterColor}, #A855F7)`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          {creditsRemaining < 100 && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 11,
                color: creditsRemaining === 0 ? "#ef4444" : "#f59e0b",
                fontWeight: 600,
              }}
            >
              {creditsRemaining === 0
                ? "⚠ Out of credits — Nia is paused"
                : "⚠ Running low — top up soon"}
            </p>
          )}
        </div>
      </div>

      {/* Not set up yet */}
      {!niaActive && creditsRemaining === 0 && creditsUsed === 0 && (
        <div
          style={{
            background: "#A855F711",
            border: "1px solid #A855F733",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>💡</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
              Nia isn&apos;t set up yet
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#ffffff66" }}>
              Purchase the Starter Pack below to activate Nia for this workspace.
              Includes one-time setup + 100 credits to get going.
            </p>
          </div>
        </div>
      )}

      {/* Buy credits section */}
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 16,
          fontWeight: 700,
          color: "#ffffffcc",
        }}
      >
        Top Up Credits
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {PACKS.map((pack) => (
          <div
            key={pack.key}
            style={{
              background: pack.highlight ? "linear-gradient(135deg, #00D4FF12, #A855F712)" : "#ffffff06",
              border: `1px solid ${pack.highlight ? "#00D4FF33" : "#ffffff12"}`,
              borderRadius: 14,
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {pack.badge && (
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  right: 14,
                  background: pack.highlight ? "linear-gradient(90deg,#00D4FF,#A855F7)" : "#ffffff18",
                  color: pack.highlight ? "#000" : "#ffffffcc",
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 20,
                  letterSpacing: 0.5,
                }}
              >
                {pack.badge}
              </span>
            )}

            <p
              style={{
                margin: "0 0 4px",
                fontSize: 13,
                fontWeight: 700,
                color: pack.highlight ? "#00D4FF" : "#ffffffcc",
              }}
            >
              {pack.label}
            </p>

            <p
              style={{
                margin: "0 0 2px",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1.1,
                color: "#fff",
              }}
            >
              {pack.price}
            </p>

            <p style={{ margin: "0 0 12px", fontSize: 11, color: "#ffffff44" }}>
              {pack.credits.toLocaleString()} credits · ${costPerCredit(pack)}/credit
            </p>

            <button
              onClick={() => buyCredits(pack.key)}
              disabled={loading === pack.key}
              style={{
                marginTop: "auto",
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                cursor: loading === pack.key ? "not-allowed" : "pointer",
                background: pack.highlight
                  ? "linear-gradient(90deg,#00D4FF,#A855F7)"
                  : "#ffffff14",
                color: pack.highlight ? "#000" : "#fff",
                fontWeight: 700,
                fontSize: 13,
                opacity: loading === pack.key ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading === pack.key ? "Redirecting…" : pack.key === "nia_setup" ? "Activate Nia" : "Buy Credits"}
            </button>
          </div>
        ))}
      </div>

      {/* How credits work */}
      <div
        style={{
          background: "#ffffff04",
          border: "1px solid #ffffff0e",
          borderRadius: 14,
          padding: "20px 24px",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#ffffffaa" }}>
          How Nia Credits Work
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {[
            { icon: "📞", title: "1 credit = 1 min", desc: "Each minute of live call handling uses 1 credit" },
            { icon: "💬", title: "Texts & chats", desc: "Outbound texts and chat replies use fractional credits" },
            { icon: "📅", title: "Bookings", desc: "Scheduling a booking uses 2 credits per confirmed appointment" },
            { icon: "🔄", title: "Auto-refill soon", desc: "Set a low-balance threshold and auto-purchase coming soon" },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#ffffffcc" }}>
                  {item.title}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#ffffff44" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

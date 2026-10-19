// components/dashboard/DashboardShell.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AGENTS } from "@/lib/agents";
import { agentsAllowedForPlan, PLAN_LABELS } from "@/lib/plans";
import type { WorkspaceSummary } from "@/lib/workspaces";

const TABS = [
  { key: "", label: "Office" },
  { key: "/integrations", label: "Integrations" },
  { key: "/reports", label: "Reports" },
  { key: "/nia", label: "Nia Credits" },
  { key: "/settings", label: "Settings" },
];

// New CrewwOS mark: three connected nodes inside the same gradient square
// that was there before — reads as "a crew working together" rather than
// a plain letterform. Pure inline SVG, no external asset to manage, scales
// crisp at any size.
function CrewwOSMark() {
  return (
    <div style={{
      width: 32, height: 32, background: "linear-gradient(135deg, #00D4FF, #A855F7)",
      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="4.5" r="2.4" fill="#000" />
        <circle cx="4.5" cy="15" r="2.4" fill="#000" />
        <circle cx="15.5" cy="15" r="2.4" fill="#000" />
        <path d="M10 6.9 L4.9 12.9 M10 6.9 L15.1 12.9 M6.7 15 L13.3 15" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function DashboardShell({ workspaceName, workspaceSlug, plan, children }: {
  workspaceName: string; workspaceSlug: string; plan: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowedCount = agentsAllowedForPlan(plan, AGENTS.map(a => a.slug)).size;

  // Everything after /dashboard/{slug} — e.g. "/integrations" — so switching
  // workspaces keeps you on the same tab instead of always landing on Office.
  const currentTab = pathname.replace(`/dashboard/${workspaceSlug}`, "") || "";

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  useEffect(() => {
    if (!switcherOpen || workspaces) return;
    fetch("/api/workspaces").then(r => r.json()).then(data => setWorkspaces(data.workspaces ?? []));
  }, [switcherOpen]);

  const switchTo = (slug: string) => {
    setSwitcherOpen(false);
    router.push(`/dashboard/${slug}${currentTab}`);
  };

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#0a0a1a", borderBottom: "1px solid #00D4FF33", padding: "8px 20px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CrewwOSMark />
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 2 }} className="mono">CREWWOS</div>
            <div style={{ color: "#ffffff44", fontSize: 9 }}>Hire the team. Skip the overhead.</div>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: "#ffffff18" }} />

        {/* Workspace switcher */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <div>
              <div style={{ color: "#00D4FF", fontSize: 11, fontWeight: 700 }}>{workspaceName}</div>
              <div style={{ color: "#ffffff44", fontSize: 9 }} className="mono">{PLAN_LABELS[plan]?.name ?? plan}</div>
            </div>
            <span style={{ color: "#ffffff55", fontSize: 10 }}>▾</span>
          </button>

          {switcherOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 8, background: "#0d0d1a",
              border: "1px solid #ffffff22", borderRadius: 10, minWidth: 220, zIndex: 50,
              boxShadow: "0 8px 24px #00000088", overflow: "hidden",
            }}>
              {workspaces === null ? (
                <div style={{ padding: "10px 14px", fontSize: 12, color: "#ffffff55" }}>Loading...</div>
              ) : (
                <>
                  {workspaces.map(w => (
                    <button key={w.slug} onClick={() => switchTo(w.slug)} style={{
                      display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                      background: w.slug === workspaceSlug ? "#ffffff0a" : "transparent", border: "none",
                      color: "#fff", fontSize: 12, cursor: "pointer",
                    }}>
                      <div style={{ fontWeight: w.slug === workspaceSlug ? 700 : 400 }}>{w.name}</div>
                      <div style={{ color: "#ffffff44", fontSize: 10 }} className="mono">{PLAN_LABELS[w.plan]?.name ?? w.plan}</div>
                    </button>
                  ))}
                  <Link href="/onboarding" style={{
                    display: "block", padding: "10px 14px", borderTop: "1px solid #ffffff11",
                    color: "#00D4FF", fontSize: 12, fontWeight: 600, textDecoration: "none",
                  }}>
                    + New workspace
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          {TABS.map(t => {
            const href = `/dashboard/${workspaceSlug}${t.key}`;
            const active = currentTab === t.key;
            const isNia = t.key === "/nia";
            return (
              <Link key={t.key} href={href} style={{
                background: active ? (isNia ? "#A855F722" : "#ffffff10") : "transparent",
                border: "1px solid " + (active ? (isNia ? "#A855F744" : "#ffffff22") : "transparent"),
                color: active ? (isNia ? "#A855F7" : "#fff") : "#ffffff66",
                borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {isNia && <span style={{ fontSize: 11 }}>👑</span>}
                {t.label}
              </Link>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[`🟢 ${allowedCount}/${AGENTS.length} Agents Active`, "⚡ AI Powered", "🔒 Secure"].map(t => (
            <div key={t} style={{ background: "#ffffff08", border: "1px solid #ffffff11", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#ffffff88" }}>{t}</div>
          ))}

          {/* Sign out / profile via Clerk's built-in UserButton */}
          <div style={{ marginLeft: 8 }}>
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: { width: 30, height: 30 },
                },
              }}
            />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

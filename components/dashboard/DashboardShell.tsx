// components/dashboard/DashboardShell.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { AGENTS } from "@/lib/agents";
import { agentsAllowedForPlan, PLAN_LABELS } from "@/lib/plans";
import type { WorkspaceSummary } from "@/lib/workspaces";
import { CrewwOSLogo } from "@/components/ui/CrewwOSLogo";

const TABS = [
  { key: "",              label: "Office",       icon: "⊞" },
  { key: "/integrations", label: "Integrations", icon: "🔌" },
  { key: "/reports",      label: "Reports",      icon: "📊" },
  { key: "/nia",          label: "Nia Credits",  icon: "👑", isNia: true },
  { key: "/settings",     label: "Settings",     icon: "⚙️" },
];

export default function DashboardShell({ workspaceName, workspaceSlug, plan, children }: {
  workspaceName: string; workspaceSlug: string; plan: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowedCount = agentsAllowedForPlan(plan, AGENTS.map(a => a.slug)).size;
  const currentTab = pathname.replace(`/dashboard/${workspaceSlug}`, "") || "";

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  useEffect(() => {
    if (!switcherOpen || workspaces) return;
    fetch("/api/workspaces").then(r => r.json()).then(data => setWorkspaces(data.workspaces ?? []));
  }, [switcherOpen]);

  // Close mobile menu on navigation
  useEffect(() => { setMenuOpen(false); setSwitcherOpen(false); }, [pathname]);

  const switchTo = (slug: string) => {
    setSwitcherOpen(false);
    setMenuOpen(false);
    router.push(`/dashboard/${slug}${currentTab}`);
  };

  return (
    <>
      <style>{`
        .ds-desktop-tabs { display: none !important; }
        .ds-desktop-badges { display: none !important; }
        .ds-logo-text { display: none !important; }
        .ds-hamburger { display: flex !important; }
        .ds-mobile-nav { display: flex; }
        @media (min-width: 769px) {
          .ds-desktop-tabs { display: flex !important; }
          .ds-desktop-badges { display: flex !important; }
          .ds-logo-text { display: block !important; }
          .ds-hamburger { display: none !important; }
          .ds-mobile-nav { display: none !important; }
        }
      `}</style>

      <div style={{ width: "100%", height: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* ── Top Bar ── */}
        <div style={{
          background: "#0a0a1a",
          borderBottom: "1px solid #00D4FF33",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          position: "relative",
          zIndex: 200,
          minHeight: 52,
          overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <CrewwOSLogo size={28} />
            <div className="ds-logo-text">
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: 2 }} className="mono">CREWWOS</div>
              <div style={{ color: "#ffffff44", fontSize: 8 }}>Hire the team. Skip the overhead.</div>
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: "#ffffff18", flexShrink: 0 }} />

          {/* Workspace switcher */}
          <div style={{ position: "relative", flexShrink: 0, minWidth: 0 }}>
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: "#00D4FF", fontSize: 11, fontWeight: 700,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "38vw",
                }}>{workspaceName}</div>
                <div style={{ color: "#ffffff44", fontSize: 9 }} className="mono">{PLAN_LABELS[plan]?.name ?? plan}</div>
              </div>
              <span style={{ color: "#ffffff55", fontSize: 10, flexShrink: 0 }}>▾</span>
            </button>

            {switcherOpen && (
              <>
                <div onClick={() => setSwitcherOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0,
                  background: "#0d0d1a", border: "1px solid #ffffff22", borderRadius: 10,
                  minWidth: 200, zIndex: 300, boxShadow: "0 8px 24px #00000088", overflow: "hidden",
                }}>
                  {workspaces === null ? (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "#ffffff55" }}>Loading...</div>
                  ) : (
                    <>
                      {workspaces.map(w => (
                        <button key={w.slug} onClick={() => switchTo(w.slug)} style={{
                          display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                          background: w.slug === workspaceSlug ? "#ffffff0a" : "transparent",
                          border: "none", color: "#fff", fontSize: 12, cursor: "pointer",
                        }}>
                          <div style={{ fontWeight: w.slug === workspaceSlug ? 700 : 400 }}>{w.name}</div>
                          <div style={{ color: "#ffffff44", fontSize: 10 }} className="mono">{PLAN_LABELS[w.plan]?.name ?? w.plan}</div>
                        </button>
                      ))}
                      <Link href="/onboarding" onClick={() => setSwitcherOpen(false)} style={{
                        display: "block", padding: "10px 14px", borderTop: "1px solid #ffffff11",
                        color: "#00D4FF", fontSize: 12, fontWeight: 600, textDecoration: "none",
                      }}>
                        + New workspace
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Desktop nav tabs */}
          <div className="ds-desktop-tabs" style={{ gap: 4, marginLeft: 8, alignItems: "center" }}>
            {TABS.map(t => {
              const href = `/dashboard/${workspaceSlug}${t.key}`;
              const active = currentTab === t.key;
              return (
                <Link key={t.key} href={href} style={{
                  background: active ? (t.isNia ? "#A855F722" : "#ffffff10") : "transparent",
                  border: "1px solid " + (active ? (t.isNia ? "#A855F744" : "#ffffff22") : "transparent"),
                  color: active ? (t.isNia ? "#A855F7" : "#fff") : "#ffffff66",
                  borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                  textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                }}>
                  {t.icon} {t.label}
                </Link>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Desktop status badges */}
          <div className="ds-desktop-badges" style={{ gap: 6, alignItems: "center" }}>
            {[`🟢 ${allowedCount}/${AGENTS.length} Active`, "⚡ AI", "🔒"].map((t, i) => (
              <div key={i} style={{
                background: "#ffffff08", border: "1px solid #ffffff11",
                borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#ffffff88", whiteSpace: "nowrap",
              }}>{t}</div>
            ))}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="ds-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: menuOpen ? "#ffffff12" : "transparent",
              border: "1px solid #ffffff22",
              borderRadius: 8, width: 36, height: 36,
              color: "#fff", fontSize: 18, cursor: "pointer",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {/* Avatar always visible */}
          <div style={{ flexShrink: 0 }}>
            <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
          </div>
        </div>

        {/* ── Mobile slide-down nav ── */}
        {menuOpen && (
          <div className="ds-mobile-nav" style={{
            flexDirection: "column",
            background: "#0d0d1a",
            borderBottom: "1px solid #ffffff11",
            zIndex: 150,
          }}>
            {/* Status pills */}
            <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid #ffffff08", flexWrap: "wrap" }}>
              <div style={{ background: "#ffffff08", border: "1px solid #10B98133", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#10B981" }}>
                🟢 {allowedCount}/{AGENTS.length} Agents Active
              </div>
              <div style={{ background: "#ffffff08", border: "1px solid #ffffff11", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#ffffff88" }}>⚡ AI Powered</div>
              <div style={{ background: "#ffffff08", border: "1px solid #ffffff11", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#ffffff88" }}>🔒 Secure</div>
            </div>

            {/* Nav links */}
            {TABS.map(t => {
              const href = `/dashboard/${workspaceSlug}${t.key}`;
              const active = currentTab === t.key;
              return (
                <Link
                  key={t.key}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "15px 20px",
                    borderBottom: "1px solid #ffffff08",
                    background: active ? "#ffffff08" : "transparent",
                    color: active ? (t.isNia ? "#A855F7" : "#00D4FF") : "#ffffff88",
                    fontSize: 15, fontWeight: active ? 700 : 400,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{t.icon}</span>
                  {t.label}
                  {active && (
                    <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#00D4FF", display: "inline-block" }} />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Page content ── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </div>
      </div>
    </>
  );
}

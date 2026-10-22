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
  { key: "",              label: "Office",      icon: "🏢" },
  { key: "/integrations", label: "Integrations",icon: "🔌" },
  { key: "/reports",      label: "Reports",     icon: "📊" },
  { key: "/nia",          label: "Nia Credits", icon: "👑" },
  { key: "/settings",     label: "Settings",    icon: "⚙️" },
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

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const switchTo = (slug: string) => {
    setSwitcherOpen(false);
    router.push(`/dashboard/${slug}${currentTab}`);
  };

  const activeTab = TABS.find(t => t.key === currentTab);

  return (
    <>
      <style>{`
        .shell-nav-tabs { display: flex; gap: 4px; }
        .shell-hamburger { display: none; }
        .shell-mobile-menu {
          display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
          flex-direction: column;
        }
        .shell-mobile-menu.open { display: flex; }
        .shell-badges { display: flex; gap: 6px; }
        @media (max-width: 768px) {
          .shell-nav-tabs { display: none !important; }
          .shell-hamburger { display: flex !important; }
          .shell-badges { display: none !important; }
        }
      `}</style>

      <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{
          background: "#0a0a1a", borderBottom: "1px solid #00D4FF33",
          padding: "8px 14px", display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0, position: "relative", zIndex: 50,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <CrewwOSLogo size={26} />
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 2 }} className="mono">CREWWOS</div>
          </div>

          <div style={{ width: 1, height: 22, background: "#ffffff18", flexShrink: 0 }} />

          {/* Workspace switcher */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              <div>
                <div style={{ color: "#00D4FF", fontSize: 11, fontWeight: 700, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</div>
                <div style={{ color: "#ffffff44", fontSize: 9 }} className="mono">{PLAN_LABELS[plan]?.name ?? plan}</div>
              </div>
              <span style={{ color: "#ffffff55", fontSize: 10 }}>▾</span>
            </button>

            {switcherOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 8, background: "#0d0d1a",
                border: "1px solid #ffffff22", borderRadius: 10, minWidth: 200, zIndex: 100,
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

          {/* Desktop tabs */}
          <div className="shell-nav-tabs" style={{ marginLeft: 8 }}>
            {TABS.map(t => {
              const href = `/dashboard/${workspaceSlug}${t.key}`;
              const active = currentTab === t.key;
              const isNia = t.key === "/nia";
              return (
                <Link key={t.key} href={href} style={{
                  background: active ? (isNia ? "#A855F722" : "#ffffff10") : "transparent",
                  border: "1px solid " + (active ? (isNia ? "#A855F744" : "#ffffff22") : "transparent"),
                  color: active ? (isNia ? "#A855F7" : "#fff") : "#ffffff66",
                  borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ fontSize: 11 }}>{t.icon}</span>
                  {t.label}
                </Link>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Desktop badges */}
          <div className="shell-badges" style={{ alignItems: "center" }}>
            {[`🟢 ${allowedCount}/${AGENTS.length}`, "⚡ AI", "🔒"].map(t => (
              <div key={t} style={{ background: "#ffffff08", border: "1px solid #ffffff11", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#ffffff88" }}>{t}</div>
            ))}
          </div>

          {/* Mobile: current page label */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>{activeTab?.icon}</span>
            <span style={{ color: "#ffffffaa", fontWeight: 600, fontSize: 12 }}>{activeTab?.label ?? "Office"}</span>
          </div>

          {/* Hamburger */}
          <button
            className="shell-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: menuOpen ? "#ffffff15" : "transparent",
              border: "1px solid #ffffff22",
              borderRadius: 8, width: 34, height: 34,
              color: "#fff", fontSize: 17, cursor: "pointer",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            aria-label="Menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {/* Avatar */}
          <div style={{ marginLeft: 2, flexShrink: 0 }}>
            <UserButton appearance={{ elements: { avatarBox: { width: 26, height: 26 } } }} />
          </div>
        </div>

        {/* Mobile dropdown nav */}
        <div className={`shell-mobile-menu${menuOpen ? " open" : ""}`}>
          {/* Nav panel */}
          <div
            style={{
              background: "#0d0d1e", borderBottom: "1px solid #00D4FF22",
              padding: "8px 12px 16px",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 9, color: "#ffffff33", fontFamily: "monospace", letterSpacing: 2, marginBottom: 6, paddingLeft: 4 }}>NAVIGATE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {TABS.map(t => {
                const href = `/dashboard/${workspaceSlug}${t.key}`;
                const active = currentTab === t.key;
                const isNia = t.key === "/nia";
                return (
                  <Link
                    key={t.key}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      background: active ? (isNia ? "#A855F718" : "#ffffff0f") : "transparent",
                      border: `1px solid ${active ? (isNia ? "#A855F744" : "#ffffff22") : "transparent"}`,
                      color: active ? (isNia ? "#A855F7" : "#fff") : "#ffffffaa",
                      borderRadius: 10, padding: "11px 14px", fontSize: 14, fontWeight: active ? 700 : 400,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{t.icon}</span>
                    {t.label}
                    {active && <span style={{ marginLeft: "auto", color: "#00D4FF", fontSize: 12 }}>●</span>}
                  </Link>
                );
              })}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #ffffff0f", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[`🟢 ${allowedCount}/${AGENTS.length} Active`, "⚡ AI Powered", "🔒 Secure"].map(t => (
                <div key={t} style={{ background: "#ffffff08", border: "1px solid #ffffff11", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#ffffff77" }}>{t}</div>
              ))}
            </div>
          </div>
          {/* Tap outside overlay */}
          <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} onClick={() => setMenuOpen(false)} />
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </div>
      </div>
    </>
  );
}

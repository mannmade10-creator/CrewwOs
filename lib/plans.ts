// lib/plans.ts
// Static display data AND plan limits — safe to import from client
// components (no Stripe SDK, no secrets). The actual Stripe Price IDs
// (lib/stripe.ts's PLAN_PRICE_IDS) stay server-only; the client only ever
// sends a plan *slug* to the checkout route, which resolves the real price
// ID itself.

export const PLAN_LABELS: Record<string, { name: string; price: string; agents: string; integrations: string }> = {
  starter: { name: "Starter", price: "$97/mo", agents: "5 agents", integrations: "2 integrations" },
  growth: { name: "Growth", price: "$297/mo", agents: "12 agents", integrations: "5 integrations" },
  enterprise: { name: "Enterprise", price: "$997/mo", agents: "All agents", integrations: "Unlimited" },
  agency: { name: "Agency", price: "$2,497/mo", agents: "All agents × 5 workspaces", integrations: "Unlimited" },
};

// Priority order agents unlock in as a workspace moves up plans. Leadership/
// revenue-facing roles first, specialized support roles last. Enterprise and
// Agency unlock everything (see PLAN_AGENT_LIMITS), so their exact position
// in this list doesn't matter — it's kept complete mainly so the roster UI
// has a stable, sensible display order for locked agents too.
export const AGENT_PRIORITY_ORDER: string[] = [
  "cto", "coo", "vpsales", "cmo", "cfo",              // Starter (5) — one leader per core area
  "scout",                                              // Vertical agent — always unlocked on Starter
  "pm", "backend", "sdr", "csm", "content", "email", "devops", // Growth adds these
  "frontend", "qa", "designer", "ads", "hr", "legal", // Enterprise/Agency unlock the rest
];

// null = unlimited (all agents / all integrations).
export const PLAN_AGENT_LIMITS: Record<string, number | null> = {
  starter: 6, growth: 13, enterprise: null, agency: null,
};
export const PLAN_INTEGRATION_LIMITS: Record<string, number | null> = {
  starter: 2, growth: 5, enterprise: null, agency: null,
};

// Given a plan and the full set of agent slugs that exist, returns which
// ones this plan has access to. Enterprise/Agency get everything regardless
// of AGENT_PRIORITY_ORDER's length, so a new 19th/20th agent added later
// doesn't accidentally get locked out for paying customers.
export function agentsAllowedForPlan(plan: string, allSlugs: string[]): Set<string> {
  const limit = PLAN_AGENT_LIMITS[plan];
  if (limit == null) return new Set(allSlugs);
  const ordered = AGENT_PRIORITY_ORDER.filter(s => allSlugs.includes(s));
  // Any agent slug that exists but isn't in the priority list yet (e.g. a
  // brand new agent added to lib/agents.ts before this list is updated)
  // is treated as lowest priority — appended after the known ones.
  const rest = allSlugs.filter(s => !ordered.includes(s));
  return new Set([...ordered, ...rest].slice(0, limit));
}

export function isAgentAllowedForPlan(plan: string, agentSlug: string, allSlugs: string[]): boolean {
  return agentsAllowedForPlan(plan, allSlugs).has(agentSlug);
}

export function integrationLimitForPlan(plan: string): number | null {
  return PLAN_INTEGRATION_LIMITS[plan] ?? null;
}

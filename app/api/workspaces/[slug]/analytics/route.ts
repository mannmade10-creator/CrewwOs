// app/api/workspaces/[slug]/analytics/route.ts
// GET — returns agent activity, Nia usage, and billing summary for the workspace.
// Only the workspace owner (or superadmin) may call this.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace, supabaseAdmin, isSuperAdmin } from "@/lib/workspaces";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  // Authorization: owner check (superadmin bypass inside getWorkspace)
  const workspace = await getWorkspace(slug, userId);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = supabaseAdmin();

  // Agent activity: counts per agent_slug over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [agentRows, niaRows, agentTotals] = await Promise.all([
    // Daily conversation counts for chart (last 30 days)
    db
      .from("agent_activity")
      .select("agent_slug, agent_name, created_at")
      .eq("workspace_id", workspace.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),

    // Nia credit usage (last 30 days)
    db
      .from("nia_usage")
      .select("credits_used, created_at")
      .eq("workspace_id", workspace.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),

    // Total activity per agent (all time, for the leaderboard)
    db
      .from("agent_activity")
      .select("agent_slug, agent_name")
      .eq("workspace_id", workspace.id),
  ]);

  // Aggregate agent usage counts
  const agentCountMap: Record<string, { name: string; count: number }> = {};
  for (const row of agentTotals.data ?? []) {
    if (!agentCountMap[row.agent_slug]) {
      agentCountMap[row.agent_slug] = { name: row.agent_name ?? row.agent_slug, count: 0 };
    }
    agentCountMap[row.agent_slug].count++;
  }
  const agentUsage = Object.entries(agentCountMap)
    .map(([slug, { name, count }]) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate Nia credits used
  const niaTotalUsed = (niaRows.data ?? []).reduce((sum, r) => sum + (r.credits_used ?? 0), 0);

  // Build daily timeline (last 30 days)
  const dailyMap: Record<string, number> = {};
  for (const row of agentRows.data ?? []) {
    const day = row.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  const timeline = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: dailyMap[key] ?? 0 };
  });

  return NextResponse.json({
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, plan: workspace.plan },
    agentUsage,
    niaTotalUsed,
    timeline,
  });
}

// app/api/reports/metric/route.ts
// GET /api/reports/metric?workspaceSlug=boxflowos&metric=mrr
// Returns { needsConfig: true } if the metric hasn't been mapped yet,
// rather than erroring, so the frontend can show the inline config form.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getMetricSeries, getReportConfig } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  const metric = req.nextUrl.searchParams.get("metric");
  if (!workspaceSlug || !metric) return NextResponse.json({ error: "workspaceSlug and metric are required" }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const config = await getReportConfig(workspace.id, metric);
  if (!config) return NextResponse.json({ needsConfig: true });

  try {
    const series = await getMetricSeries(workspace.id, metric);
    return NextResponse.json({ needsConfig: false, series });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

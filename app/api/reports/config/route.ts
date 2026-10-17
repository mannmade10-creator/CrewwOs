// app/api/reports/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getReportConfig, setReportConfig } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  const metric = req.nextUrl.searchParams.get("metric");
  if (!workspaceSlug || !metric) return NextResponse.json({ error: "workspaceSlug and metric are required" }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const config = await getReportConfig(workspace.id, metric);
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug, metric, table_name, amount_column, date_column } = await req.json();
  if (!workspaceSlug || !metric || !table_name || !date_column) {
    return NextResponse.json({ error: "workspaceSlug, metric, table_name, and date_column are required" }, { status: 400 });
  }

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  await setReportConfig(workspace.id, { metric, table_name, amount_column: amount_column || null, date_column });
  return NextResponse.json({ saved: true });
}

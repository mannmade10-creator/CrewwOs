// app/api/reports/tasks-summary/route.ts
// GET /api/reports/tasks-summary?workspaceSlug=boxflowos

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { getTaskSummary } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  if (!workspaceSlug) return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const summary = await getTaskSummary(workspace.id);
  return NextResponse.json(summary);
}

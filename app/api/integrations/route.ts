// app/api/integrations/route.ts
// GET /api/integrations?workspaceSlug=boxflowos
// Returns connection status only — never credentials, encrypted or not.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { listIntegrations } from "@/lib/integrations";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  if (!workspaceSlug) return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const integrations = await listIntegrations(workspace.id);
  return NextResponse.json({ integrations });
}

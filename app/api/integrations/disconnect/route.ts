// app/api/integrations/disconnect/route.ts
// POST { workspaceSlug, provider }

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { disconnectIntegration } from "@/lib/integrations";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug, provider } = await req.json();
  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  await disconnectIntegration(workspace.id, provider);
  return NextResponse.json({ provider, connected: false });
}

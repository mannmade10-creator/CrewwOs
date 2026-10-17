// lib/route-helpers.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";

// Shared boilerplate for every /api/tools/* route: verify the Clerk session,
// resolve the workspace the request is scoped to, then run the executor.
export async function runTool(
  req: NextRequest,
  executor: (workspaceId: string, input: any) => Promise<any>
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { workspaceSlug, ...input } = body;

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const result = await executor(workspace.id, input);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

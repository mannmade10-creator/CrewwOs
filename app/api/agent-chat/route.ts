// app/api/agent-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspace } from "@/lib/supabase";
import { runAgentTurn } from "@/lib/agent-runtime";
import type { ImageAttachment } from "@/lib/agent-runtime";

export async function POST(req: NextRequest) {
  let agentSlug = "(unknown)";
  let workspaceSlug = "(unknown)";

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    agentSlug = body.agentSlug as string;
    workspaceSlug = body.workspaceSlug as string;
    const message: string = body.message;
    const images: ImageAttachment[] | undefined = body.images;
    const handoffNote: string | undefined = body.handoffNote;

    if (!agentSlug || !workspaceSlug || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Look up the workspace — scoped to the authenticated user so one user
    // cannot chat into another user's workspace.
    const workspace = await getWorkspace(workspaceSlug, userId);

    const { reply, newMessages } = await runAgentTurn({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      agentSlug,
      userId,
      message,
      images,
      handoffNote,
    });

    return NextResponse.json({ reply, newMessages });
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error(`agent-chat failed for ${agentSlug} in workspace ${workspaceSlug}:`, err);
    return NextResponse.json({ error: `Something went wrong: ${detail}` }, { status: 500 });
  }
}

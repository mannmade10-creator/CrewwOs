// app/api/agent-chat/history/route.ts
// GET /api/agent-chat/history?workspaceSlug=...&agentSlug=...
// Returns the signed-in user's stored message thread with one agent, in
// the raw Anthropic format ChatWindow.tsx parses into bubbles.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAgent } from "@/lib/agents";
import { getWorkspace } from "@/lib/supabase";
import { loadConversationMessages } from "@/lib/conversations";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceSlug = req.nextUrl.searchParams.get("workspaceSlug");
  const agentSlug = req.nextUrl.searchParams.get("agentSlug");
  if (!workspaceSlug || !agentSlug) {
    return NextResponse.json({ error: "workspaceSlug and agentSlug are required" }, { status: 400 });
  }
  if (!getAgent(agentSlug)) return NextResponse.json({ error: `Unknown agent: ${agentSlug}` }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const messages = await loadConversationMessages(workspace.id, agentSlug, userId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error(`agent-chat history failed for ${agentSlug} in workspace ${workspaceSlug}:`, err);
    return NextResponse.json({ error: "Couldn't load conversation history" }, { status: 500 });
  }
}

// app/api/broadcast/route.ts
// POST { workspaceSlug, message } — fans the message out to every active
// agent and returns each agent's short reply. Tool calls are intentionally
// skipped here (kept to 1-2 sentence acknowledgments); use agent-chat for
// anything that should actually execute a tool.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic, MODEL } from "@/lib/claude";
import { AGENTS, systemPromptFor } from "@/lib/agents";
import { getWorkspace } from "@/lib/supabase";
import { agentsAllowedForPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceSlug, message } = await req.json();
  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const allowed = agentsAllowedForPlan(workspace.plan, AGENTS.map(a => a.slug));

  const replies = await Promise.all(
    AGENTS.map(async (agent) => {
      if (!allowed.has(agent.slug)) {
        return { agent: agent.slug, name: agent.name, reply: `🔒 Not on the ${workspace.plan} plan — upgrade to unlock.`, locked: true };
      }
      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 150,
          system: systemPromptFor(agent, workspace.name) + " Respond to this all-hands message in 1-2 sentences, briefly and in character.",
          messages: [{ role: "user", content: message }],
        });
        const textBlock = response.content.find(b => b.type === "text");
        const text = textBlock?.type === "text" ? textBlock.text : "On it.";
        return { agent: agent.slug, name: agent.name, reply: text };
      } catch {
        return { agent: agent.slug, name: agent.name, reply: "Received. On it." };
      }
    })
  );

  return NextResponse.json({ replies });
}

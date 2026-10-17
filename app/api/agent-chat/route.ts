// app/api/agent-chat/route.ts
// Main chat endpoint: POST { workspaceSlug, agentSlug, message, images?, handoffNote? }
// Auth, plan-gating, and rate limiting live here; the actual Claude
// tool_use loop lives in lib/agent-runtime.ts (runAgentTurn), shared with
// the cron route for autonomous scheduled runs.
//
// images (optional): array of { media_type, data } — data is base64,
// already converted client-side by ChatWindow.tsx from whatever file the
// CEO picked. Passed straight through to runAgentTurn, which builds the
// correct multi-block message for Claude's vision API.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AGENTS, getAgent } from "@/lib/agents";
import { getWorkspace } from "@/lib/supabase";
import { isAgentAllowedForPlan } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { runAgentTurn, type ImageAttachment } from "@/lib/agent-runtime";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGES_PER_MESSAGE = 5;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`agent-chat:${userId}`, 30, 60_000); // 30 messages/minute
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "auth.rate_limited", target: "agent-chat" });
    return NextResponse.json({ error: "Too many messages — slow down a bit." }, { status: 429 });
  }

  const { workspaceSlug, agentSlug, message, images, handoffNote } = await req.json();

  const agent = getAgent(agentSlug);
  if (!agent) return NextResponse.json({ error: `Unknown agent: ${agentSlug}` }, { status: 400 });

  const workspace = await getWorkspace(workspaceSlug, userId);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const allSlugs = AGENTS.map(a => a.slug);
  if (!isAgentAllowedForPlan(workspace.plan, agentSlug, allSlugs)) {
    await logAuditEvent({
      req, workspaceId: workspace.id, actorId: userId, action: "auth.access_denied",
      target: agentSlug, metadata: { reason: "plan_gated", plan: workspace.plan },
    });
    return NextResponse.json({
      error: `${agent.name} (${agent.role}) isn't included on the ${workspace.plan} plan. Upgrade in Settings to unlock them.`,
      locked: true,
    }, { status: 403 });
  }

  let validatedImages: ImageAttachment[] | undefined;
  if (images) {
    if (!Array.isArray(images)) return NextResponse.json({ error: "images must be an array" }, { status: 400 });
    if (images.length > MAX_IMAGES_PER_MESSAGE) {
      return NextResponse.json({ error: `Too many images — max ${MAX_IMAGES_PER_MESSAGE} per message.` }, { status: 400 });
    }
    for (const img of images) {
      if (!img?.media_type || !ALLOWED_IMAGE_TYPES.has(img.media_type) || !img?.data) {
        return NextResponse.json({ error: "Each image needs a valid media_type (jpeg/png/gif/webp) and base64 data." }, { status: 400 });
      }
    }
    validatedImages = images;
  }

  // Everything below can genuinely fail in ways worth catching cleanly —
  // a malformed stored conversation, an Anthropic API error, a Supabase
  // hiccup. An uncaught exception escaping this route previously seemed to
  // put Next's dev server into a bad state (subsequent requests 404ing
  // until it recovered) — this guarantees a real JSON error response
  // instead, regardless of what goes wrong inside.
  try {
    const result = await runAgentTurn({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      agentSlug,
      userId,
      message,
      images: validatedImages,
      handoffNote,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`agent-chat failed for ${agentSlug} in workspace ${workspaceSlug}:`, err);
    return NextResponse.json({ error: "Something went wrong generating a response. Try again." }, { status: 500 });
  }
}

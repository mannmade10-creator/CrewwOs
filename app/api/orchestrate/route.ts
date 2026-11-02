// app/api/orchestrate/route.ts
//
// Nia calls this endpoint when she detects a multi-agent request.
// She sends a TaskPlan JSON (built by her own reasoning) and this route
// executes the full orchestration, returning a unified summary.
//
// Auth: Clerk session required — same as agent-chat.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { runOrchestration, TaskPlan } from "@/lib/orchestrator";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { workspaceId: string; plan: TaskPlan };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { workspaceId, plan } = body;

  if (!workspaceId || !plan?.original_request || !Array.isArray(plan?.steps) || plan.steps.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields: workspaceId, plan.original_request, plan.steps" },
      { status: 400 }
    );
  }

  // Resolve workspace name for agent system prompts
  const { data: wsRow } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const workspaceName = wsRow?.name ?? "Your Company";

  try {
    const result = await runOrchestration({
      workspaceId,
      workspaceName,
      userId,
      plan,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[orchestrate] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

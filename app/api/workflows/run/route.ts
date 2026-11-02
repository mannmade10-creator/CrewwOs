// app/api/workflows/run/route.ts
//
// POST /api/workflows/run
// Triggers a saved workflow definition. Called by:
//  - Dashboard "Run" button
//  - Nia when a user says "run the [workflow name] workflow"
//  - Scheduled cron triggers (future)
//  - Webhooks (future)

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { triggerWorkflow } from "@/lib/workflow-recorder";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { workflowId: string; workspaceId: string; inputData?: Record<string, any> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workflowId, workspaceId, inputData } = body;
  if (!workflowId || !workspaceId) {
    return NextResponse.json({ error: "workflowId and workspaceId required" }, { status: 400 });
  }

  // Resolve workspace name
  const { data: wsRow } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const workspaceName = wsRow?.name ?? "Your Company";

  try {
    const result = await triggerWorkflow({
      workflowId,
      workspaceId,
      workspaceName,
      userId,
      inputData,
      triggeredBy: "manual",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[workflows/run] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

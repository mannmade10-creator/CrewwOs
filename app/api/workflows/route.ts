// app/api/workflows/route.ts
//
// Teach-a-Task API — CRUD + trigger for workflow definitions.
//
// GET  /api/workflows?workspaceId=xxx         — list all workflows for workspace
// POST /api/workflows                          — create a new workflow definition
// PUT  /api/workflows                          — update an existing workflow
//
// Triggering a workflow run: POST /api/workflows/run

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  saveWorkflow,
  listWorkflows,
  WorkflowDefinition,
} from "@/lib/workflow-recorder";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const workflows = await listWorkflows(workspaceId);
  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<WorkflowDefinition>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.workspace_id || !body.name || !Array.isArray(body.steps) || body.steps.length === 0) {
    return NextResponse.json(
      { error: "Required: workspace_id, name, steps[]" },
      { status: 400 }
    );
  }

  try {
    const id = await saveWorkflow({ ...body, created_by: userId } as WorkflowDefinition);
    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<WorkflowDefinition> & { id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id required for update" }, { status: 400 });

  try {
    const id = await saveWorkflow({ ...body, created_by: userId } as WorkflowDefinition);
    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

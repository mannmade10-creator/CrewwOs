// lib/workflow-recorder.ts
//
// Teach-a-Task engine.
// Clients describe a business process in plain English (or step-by-step),
// and CrewwOS converts it into a structured WorkflowDefinition stored in
// Supabase, then triggers it via the orchestrator.
//
// Two modes:
//   1. "Describe" — client describes the process; Nia + GPT parse it into steps
//   2. "Record" — client walks through steps one at a time; system records them
//
// A saved workflow can be triggered manually, on a schedule, or via webhook.

import { createClient } from "@supabase/supabase-js";
import { runOrchestration } from "./orchestrator";
import type { TaskStep } from "./orchestrator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  step: number;
  agent: string;
  instruction: string;
  depends_on: number | number[] | null;
}

export interface WorkflowDefinition {
  id?: string;
  workspace_id: string;
  name: string;
  description?: string;
  trigger_type: "manual" | "scheduled" | "webhook" | "event";
  trigger_config?: Record<string, any>;
  steps: WorkflowStep[];
  is_active?: boolean;
  created_by: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  task_id: string | null;
  status: "pending" | "running" | "complete" | "failed" | "cancelled";
  result_summary: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// ── Save / Update ──────────────────────────────────────────────────────────────

export async function saveWorkflow(
  def: WorkflowDefinition
): Promise<string> {
  const row = {
    workspace_id: def.workspace_id,
    name: def.name,
    description: def.description ?? null,
    trigger_type: def.trigger_type,
    trigger_config: def.trigger_config ?? null,
    steps: def.steps,
    is_active: def.is_active ?? true,
    created_by: def.created_by,
  };

  if (def.id) {
    const { error } = await supabase
      .from("workflow_definitions")
      .update(row)
      .eq("id", def.id);
    if (error) throw new Error(`Failed to update workflow: ${error.message}`);
    return def.id;
  }

  const { data, error } = await supabase
    .from("workflow_definitions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to save workflow: ${error?.message}`);
  return data.id;
}

export async function listWorkflows(
  workspaceId: string
): Promise<{ id: string; name: string; description: string | null; trigger_type: string; is_active: boolean }[]> {
  const { data, error } = await supabase
    .from("workflow_definitions")
    .select("id, name, description, trigger_type, is_active")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list workflows: ${error.message}`);
  return data ?? [];
}

export async function getWorkflow(id: string): Promise<WorkflowDefinition | null> {
  const { data, error } = await supabase
    .from("workflow_definitions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as WorkflowDefinition;
}

// ── Trigger ────────────────────────────────────────────────────────────────────

export async function triggerWorkflow(params: {
  workflowId: string;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  inputData?: Record<string, any>;
  triggeredBy?: string;
}): Promise<{ runId: string; taskId: string; summary: string }> {
  const workflow = await getWorkflow(params.workflowId);
  if (!workflow) throw new Error(`Workflow ${params.workflowId} not found`);

  // Create the run record
  const { data: runRow, error: runErr } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflowId,
      workspace_id: params.workspaceId,
      triggered_by: params.triggeredBy ?? "manual",
      status: "running",
      input_data: params.inputData ?? null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr || !runRow) throw new Error(`Failed to create run: ${runErr?.message}`);
  const runId = runRow.id as string;

  try {
    // Merge any runtime input into step instructions
    const steps: TaskStep[] = workflow.steps.map((s) => ({
      ...s,
      instruction: params.inputData
        ? interpolateInstruction(s.instruction, params.inputData)
        : s.instruction,
    }));

    const result = await runOrchestration({
      workspaceId: params.workspaceId,
      workspaceName: params.workspaceName,
      userId: params.userId,
      plan: {
        original_request: `[Workflow: ${workflow.name}] ${workflow.description ?? ""}`,
        steps,
      },
    });

    await supabase
      .from("workflow_runs")
      .update({
        task_id: result.task_id,
        status: "complete",
        result_summary: result.summary,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return { runId, taskId: result.task_id, summary: result.summary };
  } catch (err: any) {
    await supabase
      .from("workflow_runs")
      .update({
        status: "failed",
        result_summary: `Error: ${err.message}`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    throw err;
  }
}

// ── Parse plain-English description into steps ─────────────────────────────────
// Called by Nia when a user uses the teach-a-task feature.
// Returns a structured WorkflowDefinition ready to be saved.

export function parseDescribedWorkflow(params: {
  workspaceId: string;
  userId: string;
  name: string;
  description: string;
  parsedSteps: WorkflowStep[];  // Nia parses these from the description using her agent routing knowledge
  triggerType?: "manual" | "scheduled" | "webhook" | "event";
  triggerConfig?: Record<string, any>;
}): WorkflowDefinition {
  return {
    workspace_id: params.workspaceId,
    name: params.name,
    description: params.description,
    trigger_type: params.triggerType ?? "manual",
    trigger_config: params.triggerConfig,
    steps: params.parsedSteps,
    is_active: true,
    created_by: params.userId,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function interpolateInstruction(
  instruction: string,
  inputData: Record<string, any>
): string {
  return instruction.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    inputData[key] !== undefined ? String(inputData[key]) : `{{${key}}}`
  );
}

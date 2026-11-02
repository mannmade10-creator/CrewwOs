// lib/orchestrator.ts
//
// Nia's orchestration engine. When a user request spans multiple agents,
// Nia calls the `orchestrate_task` tool which hits /api/orchestrate.
// That route calls runOrchestration() here, which:
//   1. Persists a task envelope + steps to Supabase
//   2. Executes steps in dependency order (parallel where possible)
//   3. Passes outputs from one step as context to dependent steps
//   4. Returns a unified summary back to Nia, who presents it to the user

import { createClient } from "@supabase/supabase-js";
import { runAgentTurn } from "./agent-runtime";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface TaskStep {
  step: number;
  agent: string;       // agent slug, e.g. "content", "email", "sdr"
  instruction: string;
  depends_on: number | number[] | null;
}

export interface TaskPlan {
  task_id?: string;    // filled in after DB insert
  original_request: string;
  steps: TaskStep[];
}

export interface OrchestrationParams {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  plan: TaskPlan;
}

export interface StepResult {
  step: number;
  agent: string;
  output: string;
  success: boolean;
}

export interface OrchestrationResult {
  task_id: string;
  results: StepResult[];
  summary: string;
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function runOrchestration(params: OrchestrationParams): Promise<OrchestrationResult> {
  const { workspaceId, workspaceName, userId, plan } = params;

  // 1. Create the task envelope
  const { data: taskRow, error: taskErr } = await supabase
    .from("agent_tasks")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      original_request: plan.original_request,
      status: "running",
    })
    .select("id")
    .single();

  if (taskErr || !taskRow) throw new Error(`Failed to create task: ${taskErr?.message}`);
  const taskId = taskRow.id as string;

  // 2. Insert all steps
  const stepRows = plan.steps.map(s => ({
    task_id: taskId,
    step_number: s.step,
    assigned_agent: s.agent,
    instruction: s.instruction,
    depends_on: Array.isArray(s.depends_on)
      ? s.depends_on
      : s.depends_on != null ? [s.depends_on] : [],
    status: "pending",
  }));

  const { error: stepsErr } = await supabase.from("agent_task_steps").insert(stepRows);
  if (stepsErr) throw new Error(`Failed to insert steps: ${stepsErr.message}`);

  // 3. Execute in waves (topological sort by depends_on)
  const completedOutputs: Record<number, string> = {}; // step → output text
  const results: StepResult[] = [];
  const remaining = new Set(plan.steps.map(s => s.step));

  while (remaining.size > 0) {
    // Find all steps whose dependencies are satisfied
    const ready = plan.steps.filter(s => {
      if (!remaining.has(s.step)) return false;
      const deps = Array.isArray(s.depends_on)
        ? s.depends_on
        : s.depends_on != null ? [s.depends_on] : [];
      return deps.every(d => !remaining.has(d));
    });

    if (ready.length === 0) {
      // Cycle or impossible dependency — mark remaining as failed
      for (const stepNum of remaining) {
        results.push({ step: stepNum, agent: "unknown", output: "Dependency deadlock — step skipped.", success: false });
      }
      break;
    }

    // Mark ready steps as running
    await supabase
      .from("agent_task_steps")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("task_id", taskId)
      .in("step_number", ready.map(s => s.step));

    // Execute ready steps in parallel
    const waveResults = await Promise.all(
      ready.map(async (s) => {
        // Build context from dependency outputs
        const deps = Array.isArray(s.depends_on)
          ? s.depends_on
          : s.depends_on != null ? [s.depends_on] : [];

        let contextNote = "";
        if (deps.length > 0) {
          const depOutputs = deps
            .map(d => `Step ${d} output:\n${completedOutputs[d] ?? "(no output)"}`)
            .join("\n\n");
          contextNote = `\n\n[CONTEXT FROM PRIOR STEPS]\n${depOutputs}\n[END CONTEXT]\n\n`;
        }

        const fullInstruction = `${contextNote}${s.instruction}`;

        // Log the handoff
        if (deps.length > 0) {
          await supabase.from("agent_handoffs").insert(
            deps.map(d => ({
              task_id: taskId,
              from_agent: plan.steps.find(x => x.step === d)?.agent ?? "nia",
              to_agent: s.agent,
              payload: { step: s.step, context_from_step: d, output_preview: completedOutputs[d]?.slice(0, 300) },
            }))
          );
        }

        try {
          const { reply } = await runAgentTurn({
            workspaceId,
            workspaceName,
            agentSlug: s.agent,
            userId,
            message: fullInstruction,
            autonomous: true,
          });

          await supabase
            .from("agent_task_steps")
            .update({
              status: "complete",
              output_data: { reply },
              completed_at: new Date().toISOString(),
            })
            .eq("task_id", taskId)
            .eq("step_number", s.step);

          return { step: s.step, agent: s.agent, output: reply, success: true } as StepResult;
        } catch (err: any) {
          await supabase
            .from("agent_task_steps")
            .update({
              status: "failed",
              output_data: { error: err.message },
              completed_at: new Date().toISOString(),
            })
            .eq("task_id", taskId)
            .eq("step_number", s.step);

          return { step: s.step, agent: s.agent, output: `Error: ${err.message}`, success: false } as StepResult;
        }
      })
    );

    for (const r of waveResults) {
      completedOutputs[r.step] = r.output;
      results.push(r);
      remaining.delete(r.step);
    }
  }

  // 4. Mark task complete
  const allSucceeded = results.every(r => r.success);
  await supabase
    .from("agent_tasks")
    .update({
      status: allSucceeded ? "complete" : "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  // 5. Build summary for Nia to present to the user
  const summary = buildSummary(plan.original_request, results);

  return { task_id: taskId, results, summary };
}

// ── Summary builder ────────────────────────────────────────────────────────

function buildSummary(originalRequest: string, results: StepResult[]): string {
  const lines = [
    `✅ Orchestration complete for: "${originalRequest}"`,
    ``,
    ...results.map(r => {
      const icon = r.success ? "✓" : "✗";
      const label = `${icon} Step ${r.step} · ${r.agent}`;
      const preview = r.output.slice(0, 400).replace(/\n/g, " ");
      return `**${label}**\n${preview}${r.output.length > 400 ? "…" : ""}`;
    }),
  ];
  return lines.join("\n\n");
}

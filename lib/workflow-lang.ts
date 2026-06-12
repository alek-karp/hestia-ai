/**
 * Serialises a derived workflow into OpenUI Lang for `<Renderer>`.
 *
 * The pipeline (steps) is emitted deterministically so the panel stays
 * traceable; AI-authored `insights` are appended to "add/expand" the view.
 */

import type { WorkflowStep } from "@/lib/workflow";

export interface WorkflowInsight {
  title: string;
  body: string;
  tone?: "info" | "success" | "warning";
}

/** Emit a safe double-quoted OpenUI Lang string literal. */
function lit(value: string): string {
  return JSON.stringify(value ?? "");
}

function panelStatus(
  steps: WorkflowStep[],
): "draft" | "running" | "succeeded" | "failed" {
  if (steps.some((s) => s.status === "failed")) return "failed";
  if (steps.some((s) => s.status === "running")) return "running";
  if (steps.length > 0 && steps.every((s) => s.status === "succeeded")) {
    return "succeeded";
  }
  return "draft";
}

function stepOutput(step: WorkflowStep): string {
  const out = step.outputs[0];
  if (!out) return "";
  return out.preview && out.preview !== "—" ? out.preview : out.label;
}

/** Sanitise a step id into a valid OpenUI Lang identifier. */
function varName(id: string): string {
  return `step_${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * Group steps into ordered rows by dependency rank (longest path from a root).
 * Steps that share a rank run in parallel and are emitted together. `steps` is
 * topologically ordered by `deriveWorkflow`, so a single forward pass suffices.
 */
function groupByRank(steps: WorkflowStep[]): WorkflowStep[][] {
  const rankById = new Map<string, number>();
  for (const step of steps) {
    const rank = step.dependsOn.length
      ? Math.max(...step.dependsOn.map((id) => rankById.get(id) ?? 0)) + 1
      : 0;
    rankById.set(step.id, rank);
  }

  const rows = new Map<number, WorkflowStep[]>();
  for (const step of steps) {
    const rank = rankById.get(step.id) ?? 0;
    const row = rows.get(rank);
    if (row) row.push(step);
    else rows.set(rank, [step]);
  }

  return [...rows.keys()]
    .sort((a, b) => a - b)
    .map((rank) => rows.get(rank) as WorkflowStep[]);
}

/**
 * Build the full OpenUI Lang program for the workflow sidebar.
 */
export function buildWorkflowLang({
  name,
  steps,
  insights = [],
}: {
  name: string;
  steps: WorkflowStep[];
  insights?: WorkflowInsight[];
}): string {
  const lines: string[] = [];

  lines.push(
    `root = WorkflowPanel(${lit(name)}, ${lit(panelStatus(steps))}, rows, insights)`,
  );

  const rows = groupByRank(steps);
  const rowVars: string[] = [];
  const groupDefs: string[] = [];
  const stepDefs: string[] = [];

  rows.forEach((row, rowIndex) => {
    const stepVars = row.map((step) => {
      const v = varName(step.id);
      stepDefs.push(
        `${v} = WorkflowStep(${lit(step.title)}, ${lit(step.status)}, ${lit(step.icon)}, ${lit(stepOutput(step))})`,
      );
      return v;
    });

    if (stepVars.length === 1) {
      rowVars.push(stepVars[0]);
    } else {
      const groupVar = `group${rowIndex}`;
      groupDefs.push(
        `${groupVar} = WorkflowParallelGroup([${stepVars.join(", ")}])`,
      );
      rowVars.push(groupVar);
    }
  });

  lines.push(`rows = [${rowVars.join(", ")}]`);
  lines.push(...groupDefs);
  lines.push(...stepDefs);

  lines.push(
    `insights = [${insights.map((_, i) => `insight${i}`).join(", ")}]`,
  );
  insights.forEach((insight, i) => {
    lines.push(
      `insight${i} = WorkflowInsight(${lit(insight.title)}, ${lit(insight.body)}, ${lit(insight.tone ?? "info")})`,
    );
  });

  return lines.join("\n");
}

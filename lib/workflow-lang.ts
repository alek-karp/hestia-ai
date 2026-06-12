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
    `root = WorkflowPanel(${lit(name)}, ${lit(panelStatus(steps))}, steps, insights)`,
  );

  lines.push(`steps = [${steps.map((_, i) => `step${i}`).join(", ")}]`);
  steps.forEach((step, i) => {
    lines.push(
      `step${i} = WorkflowStep(${lit(step.title)}, ${lit(step.status)}, ${lit(step.icon)}, ${lit(stepOutput(step))})`,
    );
  });

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

"use client";

/**
 * OpenUI (openui.com) component library for the workflow sidebar.
 *
 * These components are registered with OpenUI's `defineComponent` so the panel
 * can be rendered from OpenUI Lang via `<Renderer>`. The baseline pipeline is
 * emitted deterministically from `deriveWorkflow` (see `lib/workflow-lang.ts`),
 * and the AI can append `WorkflowInsight` blocks to "add/expand" the view.
 */

import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { z } from "zod/v4";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StepStatus } from "@/lib/workflow";
import { StatusBadge, StepIcon } from "./workflow-node";

const WorkflowStep = defineComponent({
  name: "WorkflowStep",
  description:
    "A single step in the event-planning pipeline, shown as a card with an icon, title, live status and its output.",
  props: z.object({
    title: z.string(),
    status: z.enum(["pending", "running", "succeeded", "failed"]),
    icon: z.string(),
    output: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2.5 border-b bg-secondary p-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <StepIcon className="size-4" name={props.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-sm leading-tight">
          {props.title}
        </span>
        <StatusBadge status={props.status as StepStatus} />
      </div>
      {props.output && (
        <div className="flex items-center justify-between gap-2 p-3">
          <span className="shrink-0 text-muted-foreground text-xs">Output</span>
          <Badge
            className="max-w-[60%] justify-start truncate font-normal"
            title={props.output}
            variant="secondary"
          >
            {props.output}
          </Badge>
        </div>
      )}
    </div>
  ),
});

const TONE_STYLES = {
  info: { icon: Info, className: "border-primary/30 bg-primary/5" },
  success: { icon: Lightbulb, className: "border-primary/30 bg-primary/5" },
  warning: {
    icon: TriangleAlert,
    className: "border-destructive/30 bg-destructive/5",
  },
} as const;

const WorkflowInsight = defineComponent({
  name: "WorkflowInsight",
  description:
    "An AI-authored note that annotates or expands the workflow: a tip, risk, or next-step suggestion the planner surfaces alongside the pipeline.",
  props: z.object({
    title: z.string(),
    body: z.string(),
    tone: z.enum(["info", "success", "warning"]).optional(),
  }),
  component: ({ props }) => {
    const tone = TONE_STYLES[props.tone ?? "info"];
    const Icon = tone.icon;
    return (
      <div className={cn("rounded-md border p-3", tone.className)}>
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-primary" />
          <span className="font-medium text-sm leading-tight">
            {props.title}
          </span>
        </div>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {props.body}
        </p>
      </div>
    );
  },
});

const WorkflowPanel = defineComponent({
  name: "WorkflowPanel",
  description:
    "Root container for the workflow sidebar. Renders the pipeline name, overall status, the ordered steps, and any AI insights.",
  props: z.object({
    title: z.string(),
    status: z.enum(["draft", "running", "succeeded", "failed"]),
    steps: z.array(WorkflowStep.ref),
    insights: z.array(WorkflowInsight.ref).optional(),
  }),
  component: ({ props, renderNode }) => (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-4 [&>*:not(:first-child)]:relative [&>*:not(:first-child)]:before:-top-4 [&>*:not(:first-child)]:before:absolute [&>*:not(:first-child)]:before:left-1/2 [&>*:not(:first-child)]:before:h-4 [&>*:not(:first-child)]:before:w-px [&>*:not(:first-child)]:before:bg-border">
        {renderNode(props.steps)}
      </div>
      {props.insights && props.insights.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Insights
          </span>
          {renderNode(props.insights)}
        </div>
      )}
    </div>
  ),
});

export const workflowLibrary = createLibrary({
  root: "WorkflowPanel",
  components: [WorkflowPanel, WorkflowStep, WorkflowInsight],
  componentGroups: [
    {
      name: "Workflow",
      components: ["WorkflowPanel", "WorkflowStep", "WorkflowInsight"],
      notes: [
        "- Every program must start with root = WorkflowPanel(title, status, steps, insights).",
        "- steps is the deterministic pipeline; do not invent or reorder steps.",
        "- Add WorkflowInsight entries to the insights array to annotate the plan with tips, risks, or next steps.",
      ],
    },
  ],
});

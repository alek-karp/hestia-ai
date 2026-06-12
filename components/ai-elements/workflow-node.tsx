"use client";

import { Handle, Position } from "@xyflow/react";
import {
  CalendarPlus,
  CheckCircle2,
  Circle,
  ClipboardList,
  DatabaseZap,
  FileCheck2,
  GitBranch,
  Globe,
  type LucideIcon,
  Sparkles,
  Store,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { StepStatus, WorkflowStep } from "@/lib/workflow";

export const WORKFLOW_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  ClipboardList,
  CalendarPlus,
  DatabaseZap,
  UtensilsCrossed,
  Store,
  FileCheck2,
  GitBranch,
  Globe,
};

export function StepIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = WORKFLOW_ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StepStatus;
  className?: string;
}) {
  if (status === "running") {
    return (
      <Badge className={cn("font-normal", className)} variant="secondary">
        <Spinner className="size-3" />
        {STATUS_LABEL.running}
      </Badge>
    );
  }
  if (status === "succeeded") {
    return (
      <Badge className={cn("font-normal", className)} variant="secondary">
        <CheckCircle2 className="size-3 text-primary" />
        {STATUS_LABEL.succeeded}
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className={cn("font-normal", className)} variant="destructive">
        <XCircle className="size-3" />
        {STATUS_LABEL.failed}
      </Badge>
    );
  }
  return (
    <Badge
      className={cn("font-normal text-muted-foreground", className)}
      variant="outline"
    >
      <Circle className="size-3" />
      {STATUS_LABEL.pending}
    </Badge>
  );
}

export type WorkflowNodeData = {
  step: WorkflowStep;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

/** Compact status indicator shown in the node header. */
function StatusDot({ status }: { status: StepStatus }) {
  if (status === "running") {
    return <Spinner className="size-4 text-muted-foreground" />;
  }
  if (status === "succeeded") {
    return <CheckCircle2 className="size-4 text-primary" />;
  }
  if (status === "failed") {
    return <XCircle className="size-4 text-destructive" />;
  }
  return <Circle className="size-4 text-muted-foreground/40" />;
}

/** React Flow custom node representing one step of the event-planning pipeline. */
export function WorkflowNode({ data }: { data: WorkflowNodeData }) {
  const { step, selected, onSelect } = data;
  const output = step.outputs[0];
  const isActive = step.status === "running";
  const isPending = step.status === "pending";
  const preview =
    output?.preview && output.preview !== "—" ? output.preview : output?.label;

  return (
    <div className="relative w-72">
      <Handle
        className={cn(
          "!h-1.5 !w-6 !rounded-full !border-0 transition-colors",
          isActive ? "!bg-primary" : "!bg-border",
        )}
        position={Position.Top}
        type="target"
      />

      <button
        className={cn(
          "w-full overflow-hidden rounded-md border bg-card text-left transition-shadow",
          "hover:shadow-md",
          isActive && "border-primary/50 ring-2 ring-primary/15",
          selected && "border-primary ring-2 ring-primary/20",
          isPending && "opacity-70",
        )}
        onClick={() => onSelect?.(step.id)}
        type="button"
      >
        <div className="flex items-center gap-2.5 border-b bg-secondary p-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <StepIcon className="size-4" name={step.icon} />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-sm leading-tight">
            {step.title}
          </span>
          <StatusDot status={step.status} />
        </div>

        {output && (
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="shrink-0 text-muted-foreground text-xs">
              Output
            </span>
            <Badge
              className="max-w-[60%] justify-start truncate font-normal"
              title={preview}
              variant="secondary"
            >
              {preview}
            </Badge>
          </div>
        )}
      </button>

      <Handle
        className={cn(
          "!h-1.5 !w-6 !rounded-full !border-0 transition-colors",
          isActive ? "!bg-primary" : "!bg-border",
        )}
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}

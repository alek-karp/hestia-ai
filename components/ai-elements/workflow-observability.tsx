"use client";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StepIO, WorkflowStep } from "@/lib/workflow";
import { ChevronRight } from "lucide-react";
import { StatusBadge, StepIcon } from "./workflow-node";

function IORow({ io, kind }: { io: StepIO; kind: "Input" | "Output" }) {
    const hasDetail = Boolean(io.value);

    return (
        <Collapsible className="rounded-md border bg-card">
            <CollapsibleTrigger
                className="group flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left disabled:cursor-default"
                disabled={!hasDetail}
            >
                <span className="flex min-w-0 items-center gap-2 text-xs">
                    <ChevronRight
                        className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90",
                            !hasDetail && "opacity-0",
                        )}
                    />
                    <span className="shrink-0 text-muted-foreground">{kind}</span>
                    <span className="truncate font-medium text-foreground">
                        {io.label}
                    </span>
                </span>
                {io.preview && (
                    <span className="max-w-[45%] shrink-0 truncate text-muted-foreground text-xs">
                        {io.preview}
                    </span>
                )}
            </CollapsibleTrigger>
            {hasDetail && (
                <CollapsibleContent>
                    <pre className="overflow-x-auto border-t bg-muted/40 px-3 py-2 font-mono text-muted-foreground text-xs whitespace-pre-wrap">
                        {io.value}
                    </pre>
                </CollapsibleContent>
            )}
        </Collapsible>
    );
}

function StepTrace({
    step,
    active,
    onSelect,
}: {
    step: WorkflowStep;
    active: boolean;
    onSelect: (id: string) => void;
}) {
    return (
        <div
            className={cn(
                "flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary bg-accent/50" : "hover:bg-accent/40",
            )}
        >
            <button
                className="flex w-full items-center gap-2 text-left"
                onClick={() => onSelect(step.id)}
                type="button"
            >
                <StepIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    name={step.icon}
                />
                <span className="flex-1 truncate font-medium text-sm leading-tight">
                    {step.title}
                </span>
                <StatusBadge className="shrink-0" status={step.status} />
            </button>

            <div className="flex flex-col gap-1.5">
                {step.inputs.map((io) => (
                    <IORow io={io} key={`in-${io.label}`} kind="Input" />
                ))}
                {step.outputs.map((io) => (
                    <IORow io={io} key={`out-${io.label}`} kind="Output" />
                ))}
            </div>
        </div>
    );
}

/**
 * Top-to-bottom trace of every step with status and expandable inputs/outputs.
 * Rendered inside the workflow panel's "Trace" tab.
 */
export function WorkflowObservability({
    steps,
    selectedId,
    onSelect,
}: {
    steps: WorkflowStep[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 p-3">
                {steps.map((step) => (
                    <StepTrace
                        active={selectedId === step.id}
                        key={step.id}
                        onSelect={onSelect}
                        step={step}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}

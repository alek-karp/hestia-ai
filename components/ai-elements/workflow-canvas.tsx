"use client";

import { Renderer } from "@openuidev/react-lang";
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { WorkflowIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkflowStep } from "@/lib/workflow";
import { buildWorkflowLang, type WorkflowInsight } from "@/lib/workflow-lang";
import { WorkflowNode } from "./workflow-node";
import { WorkflowObservability } from "./workflow-observability";
import { workflowLibrary } from "./workflow-openui";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = { workflow: WorkflowNode };

const NODE_WIDTH = 288;
const NODE_GAP_X = 56;
const NODE_GAP_Y = 176;

/**
 * Lay the DAG out in horizontal ranks: a step's rank is the longest dependency
 * path from a root, so steps that share the same dependencies land on the same
 * row and read as parallel branches. `steps` is already topologically ordered
 * (parents before children) by `deriveWorkflow`, so a single pass suffices.
 */
function layoutSteps(
  steps: WorkflowStep[],
): Map<string, { x: number; y: number }> {
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

  const positions = new Map<string, { x: number; y: number }>();
  for (const [rank, row] of rows) {
    const span = row.length * NODE_WIDTH + (row.length - 1) * NODE_GAP_X;
    row.forEach((step, i) => {
      const x = i * (NODE_WIDTH + NODE_GAP_X) - span / 2 + NODE_WIDTH / 2;
      positions.set(step.id, { x, y: rank * NODE_GAP_Y });
    });
  }
  return positions;
}

function Graph({
  steps,
  selectedId,
  onSelect,
}: {
  steps: WorkflowStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes: Node[] = useMemo(() => {
    const positions = layoutSteps(steps);
    return steps.map((step) => ({
      id: step.id,
      type: "workflow",
      position: positions.get(step.id) ?? { x: 0, y: 0 },
      data: { step, selected: selectedId === step.id, onSelect },
      draggable: false,
    }));
  }, [steps, selectedId, onSelect]);

  const edges: Edge[] = useMemo(() => {
    const statusById = new Map(steps.map((s) => [s.id, s.status]));
    return steps.flatMap((step) =>
      step.dependsOn.map((sourceId) => {
        // Animate the edge while the dependent (target) step is running.
        const animated = step.status === "running";
        const color = animated ? "var(--primary)" : "var(--border)";
        // Dim edges whose source has not completed yet.
        const sourceDone = statusById.get(sourceId) === "succeeded";
        return {
          id: `${sourceId}-${step.id}`,
          source: sourceId,
          target: step.id,
          type: "smoothstep",
          animated,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color,
          },
          style: {
            stroke: color,
            strokeWidth: 1.5,
            opacity: sourceDone || animated ? 1 : 0.6,
          },
        };
      }),
    );
  }, [steps]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
        nodes={nodes}
        nodesConnectable={false}
        nodeTypes={nodeTypes}
        panOnScroll
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
      >
        <Background
          bgColor="var(--sidebar)"
          gap={20}
          size={1.5}
          variant={BackgroundVariant.Dots}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

/**
 * The reactive workflow panel that lives to the right of the chat. It renders
 * the live pipeline derived from the conversation — a node graph plus a
 * step-by-step run trace — so the user can observe exactly what the AI is doing.
 */
export function WorkflowCanvas({
  name,
  steps,
  insights,
  active,
}: {
  name: string;
  steps: WorkflowStep[];
  /** AI-authored insights that annotate the workflow (OpenUI WorkflowInsight). */
  insights: WorkflowInsight[];
  /** Whether a workflow has started (≥1 message). */
  active: boolean;
}) {
  const [view, setView] = useState<"graph" | "steps" | "trace">("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  // Deterministic OpenUI Lang for the pipeline, with AI insights appended.
  const lang = useMemo(
    () => buildWorkflowLang({ name, steps, insights }),
    [name, steps, insights],
  );

  const completed = steps.filter((s) => s.status === "succeeded").length;
  const running = steps.some((s) => s.status === "running");
  const status = running
    ? "Running"
    : completed === steps.length
      ? "Succeeded"
      : active
        ? "In Progress"
        : "Idle";

  if (!active) {
    return (
      <aside className="flex w-72 shrink-0 flex-col items-center justify-center border-r bg-sidebar p-8 text-center lg:w-[26rem]">
        <WorkflowIcon className="size-8 text-muted-foreground/50" />
        <h2 className="mt-3 font-medium text-sm">Workflow</h2>
        <p className="mt-1 max-w-[16rem] text-muted-foreground text-xs">
          As you plan an event with Hestia, the live pipeline will build here so
          you can trace every step the AI takes.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-background sm:w-80 lg:w-[26rem]">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-semibold text-sm">{name}</h2>
          <Badge className="shrink-0" variant="outline">
            {status}
          </Badge>
        </div>
        <span className="shrink-0 text-muted-foreground text-xs">
          {completed}/{steps.length}
        </span>
      </div>

      <div className="border-b px-3 py-2">
        <Tabs
          onValueChange={(v) => setView(v as "graph" | "steps" | "trace")}
          value={view}
        >
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="graph">
              Graph
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="steps">
              Steps
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="trace">
              Trace
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1">
        {view === "graph" && (
          <Graph
            onSelect={handleSelect}
            selectedId={selectedId}
            steps={steps}
          />
        )}
        {view === "steps" && (
          <ScrollArea className="h-full">
            <Renderer
              isStreaming={false}
              library={workflowLibrary}
              response={lang}
            />
          </ScrollArea>
        )}
        {view === "trace" && (
          <WorkflowObservability
            onSelect={handleSelect}
            selectedId={selectedId}
            steps={steps}
          />
        )}
      </div>
    </aside>
  );
}

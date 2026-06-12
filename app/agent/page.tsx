"use client";

import {
  Bot,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Mail,
  Phone,
  Radar,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingStage, BookingTask } from "@/lib/orchestrator/types";
import { cn } from "@/lib/utils";

type Overview = {
  campaigns: number;
  tasks: BookingTask[];
  counts: Record<string, number>;
  active: number;
};

const STAGES: {
  key: BookingStage;
  label: string;
  className: string;
}[] = [
  {
    key: "contacted",
    label: "Contacted",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    key: "quote_received",
    label: "Quote received",
    className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    key: "booked",
    label: "Booked",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "declined",
    label: "Declined",
    className: "bg-muted text-muted-foreground",
  },
  {
    key: "needs_human",
    label: "Needs human",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
];

function stageMeta(stage: BookingStage) {
  return STAGES.find((s) => s.key === stage) ?? STAGES[0];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function StageIcon({ stage }: { stage: BookingStage }) {
  if (stage === "booked") return <CheckCircle2 className="size-3.5" />;
  if (stage === "declined") return <CircleSlash className="size-3.5" />;
  if (stage === "needs_human") return <TriangleAlert className="size-3.5" />;
  return <Loader2 className="size-3.5 animate-spin" />;
}

function TaskCard({ task }: { task: BookingTask }) {
  const [open, setOpen] = useState(false);
  const meta = stageMeta(task.stage);
  const lastDecision = task.decisions[task.decisions.length - 1];

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium truncate">
            {task.channel === "email" ? (
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {task.vendorName}
          </span>
          <Badge
            className={cn(
              "shrink-0 gap-1 border-0 text-[10px]",
              meta.className,
            )}
          >
            <StageIcon stage={task.stage} />
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{task.category}</span>
          <span className="shrink-0">{timeAgo(task.updatedAt)}</span>
        </div>
        {lastDecision && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground/80">
              {lastDecision.action.replace("_", " ")}
            </span>{" "}
            — {lastDecision.reason}
          </p>
        )}
      </button>

      {open && (
        <div className="border-t px-3 py-3 flex flex-col gap-3">
          {/* Conversation */}
          <div className="flex flex-col gap-2">
            {task.turns.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "rounded-md border p-2 text-xs whitespace-pre-wrap",
                  t.role === "hestia"
                    ? "bg-primary/5 border-primary/20"
                    : t.role === "vendor"
                      ? "bg-muted/40"
                      : "bg-muted/20 italic text-muted-foreground",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                  {t.role === "hestia" ? (
                    <Bot className="size-3" />
                  ) : t.role === "vendor" ? (
                    <User className="size-3" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  {t.role === "hestia"
                    ? "Hestia"
                    : t.role === "vendor"
                      ? task.vendorName
                      : "System"}
                </div>
                {t.text}
              </div>
            ))}
          </div>

          {/* Decision log */}
          {task.decisions.length > 0 && (
            <div className="flex flex-col gap-1 border-t pt-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Decision log
              </span>
              {task.decisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span className="font-medium text-foreground/80">
                    {d.action.replace("_", " ")}
                  </span>
                  <span className="truncate">— {d.reason}</span>
                  {!d.llm && (
                    <Badge
                      variant="outline"
                      className="ml-auto text-[9px] shrink-0"
                    >
                      heuristic
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [autopilot, setAutopilot] = useState(true);
  const [ticking, setTicking] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/orchestrator");
    setOverview((await res.json()) as Overview);
  }, []);

  const runTick = useCallback(async () => {
    setTicking(true);
    try {
      const res = await fetch("/api/orchestrator/tick", { method: "POST" });
      const data = (await res.json()) as { overview: Overview };
      setOverview(data.overview);
    } finally {
      setTicking(false);
    }
  }, []);

  const loadDemo = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/orchestrator/seed", { method: "POST" });
      const data = (await res.json()) as { overview: Overview };
      setOverview(data.overview);
      setAutopilot(true);
    } finally {
      setSeeding(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/orchestrator/reset", { method: "POST" });
      const data = (await res.json()) as { overview: Overview };
      setOverview(data.overview);
    } finally {
      setSeeding(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Autopilot: keep ticking the autonomous loop until no tasks are active.
  useEffect(() => {
    if (!autopilot || !overview) return;
    if (overview.active === 0) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      runTick();
    }, 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [autopilot, overview, runTick]);

  const tasks = overview?.tasks ?? [];
  const counts = overview?.counts ?? {};

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Radar className="size-5 text-primary" />
            Autonomous Booking Agent
          </h1>
          <p className="text-xs text-muted-foreground">
            Negotiates with vendors over email & phone with no human input —
            replying, booking, and escalating on its own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={loadDemo}
            disabled={seeding}
          >
            {seeding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Load demo
          </Button>
          {tasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={reset}
              disabled={seeding}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant={autopilot ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setAutopilot((v) => !v)}
          >
            <Zap className={cn("size-3.5", autopilot && "fill-current")} />
            Autopilot {autopilot ? "on" : "off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={runTick}
            disabled={ticking}
          >
            {ticking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Radar className="size-3.5" />
            )}
            Step
          </Button>
        </div>
      </div>

      {/* Stage summary */}
      <div className="shrink-0 border-b px-6 py-3 flex items-center gap-2 flex-wrap">
        {STAGES.map((s) => (
          <Badge
            key={s.key}
            className={cn("gap-1 border-0", s.className)}
            variant="secondary"
          >
            {s.label}
            <span className="font-semibold">{counts[s.key] ?? 0}</span>
          </Badge>
        ))}
        {overview && overview.active > 0 && (
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            {overview.active} task{overview.active === 1 ? "" : "s"} in progress
          </span>
        )}
      </div>

      {/* Task board */}
      <div className="flex-1 overflow-y-auto p-6">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Radar className="size-8" />
            <p className="text-sm">No active bookings yet.</p>
            <p className="text-xs max-w-sm text-center">
              Create an event plan in the Planner tab — or load a demo campaign
              of mock vendors and watch the agent negotiate, book, decline, and
              escalate entirely on its own.
            </p>
            <Button
              size="sm"
              className="gap-1.5 mt-2"
              onClick={loadDemo}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Load demo campaign
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

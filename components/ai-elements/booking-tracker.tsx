"use client";

import {
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  Inbox,
  ListChecks,
  Loader2,
  Mail,
  Phone,
  Send,
  TriangleAlert,
  User,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  BookingStage,
  BookingTask,
  ConversationTurn,
} from "@/lib/orchestrator/types";
import { cn } from "@/lib/utils";

type Overview = {
  tasks: BookingTask[];
  counts: Record<string, number>;
  active: number;
};

type FeedItem = ConversationTurn & { vendorName: string };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.round(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

const STAGE_LABEL: Record<BookingStage, string> = {
  contacted: "Reaching out",
  negotiating: "Negotiating",
  quote_received: "Quote in",
  booked: "Booked",
  declined: "Declined",
  needs_human: "Needs you",
};

const STAGE_STYLE: Record<BookingStage, string> = {
  contacted: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  negotiating: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  quote_received: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  booked: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  declined: "bg-muted text-muted-foreground",
  needs_human: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const ACTIVE_STAGES = new Set<BookingStage>([
  "contacted",
  "negotiating",
  "quote_received",
]);

const DONE_STAGES = new Set<BookingStage>([
  "booked",
  "declined",
  "needs_human",
]);

function StageIcon({ stage }: { stage: BookingStage }) {
  if (stage === "booked") return <CheckCircle2 className="size-3" />;
  if (stage === "declined") return <CircleSlash className="size-3" />;
  if (stage === "needs_human") return <TriangleAlert className="size-3" />;
  return <Loader2 className="size-3 animate-spin" />;
}

/** One message in the live activity feed: an email/call turn or a system event. */
function FeedRow({ item }: { item: FeedItem }) {
  const { role, channel } = item;
  const label =
    role === "hestia"
      ? `Hestia → ${item.vendorName}`
      : role === "vendor"
        ? `${item.vendorName} → Hestia`
        : item.vendorName;

  const verb =
    role === "hestia"
      ? channel === "email"
        ? "emailed"
        : "called"
      : role === "vendor"
        ? channel === "email"
          ? "replied"
          : "call update"
        : "update";

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 shrink-0">
        {role === "hestia" ? (
          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
            {channel === "email" ? (
              <Send className="size-3 text-primary" />
            ) : (
              <Phone className="size-3 text-primary" />
            )}
          </div>
        ) : role === "vendor" ? (
          <div className="size-6 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="size-3 text-muted-foreground" />
          </div>
        ) : (
          <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Zap className="size-3 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
          <span className="font-medium text-foreground/80 truncate">
            {label}
          </span>
          <span className="shrink-0">· {verb}</span>
          <span className="ml-auto shrink-0">{timeAgo(item.at)}</span>
        </div>
        <div
          className={cn(
            "rounded-md border p-2 text-xs whitespace-pre-wrap",
            role === "hestia"
              ? "bg-primary/5 border-primary/20"
              : role === "vendor"
                ? "bg-muted/40"
                : "bg-emerald-500/5 border-emerald-500/20 italic",
          )}
        >
          {item.text}
        </div>
      </div>
    </div>
  );
}

/** A live "…" row for a vendor we're currently waiting on (reply or call). */
function PendingRow({ task }: { task: BookingTask }) {
  const waitingOnVendor = task.pending === "vendor_reply";
  const label = waitingOnVendor
    ? task.channel === "call"
      ? `Calling ${task.vendorName}…`
      : `Waiting on ${task.vendorName}…`
    : `Hestia is replying to ${task.vendorName}…`;

  return (
    <div className="flex gap-2">
      <div className="mt-0.5 shrink-0">
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center",
            waitingOnVendor ? "bg-muted" : "bg-primary/10",
          )}
        >
          {waitingOnVendor ? (
            task.channel === "call" ? (
              <Phone className="size-3 text-muted-foreground" />
            ) : (
              <Building2 className="size-3 text-muted-foreground" />
            )
          ) : (
            <Bot className="size-3 text-primary" />
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 flex items-center">
        <div className="rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/20">
          <span>{label}</span>
          <span className="inline-flex gap-0.5">
            <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1 rounded-full bg-current animate-bounce" />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Live, chronological stream of every email, call, and agent action across the
 * whole campaign — so the user watches the autonomous outreach unfold (and
 * reads the actual email copy) without expanding individual vendors. Vendors
 * we're currently waiting on show an animated "…" row at the top.
 */
function ActivityFeed({ tasks }: { tasks: BookingTask[] }) {
  const items: FeedItem[] = tasks
    .flatMap((t) =>
      t.turns.map((turn) => ({ ...turn, vendorName: t.vendorName })),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const pending = tasks.filter((t) => t.pending && !DONE_STAGES.has(t.stage));

  if (items.length === 0 && pending.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="size-3.5 animate-spin" />
        Reaching out to vendors…
      </div>
    );
  }

  return (
    <div className="max-h-[28rem] overflow-y-auto p-3 flex flex-col gap-3">
      {pending.map((t) => (
        <PendingRow key={`pending-${t.id}`} task={t} />
      ))}
      {items.map((item) => (
        <FeedRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function VendorRow({
  task,
  campaignId,
  onResolved,
}: {
  task: BookingTask;
  campaignId: string;
  onResolved: (overview: Overview) => void;
}) {
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState<"book" | "decline" | null>(null);
  const lastDecision = task.decisions[task.decisions.length - 1];

  const resolve = async (action: "book" | "decline") => {
    setResolving(action);
    try {
      const res = await fetch("/api/orchestrator/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, action, campaignId }),
      });
      const data = (await res.json()) as { overview: Overview };
      if (data.overview) onResolved(data.overview);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2.5"
      >
        {task.channel === "email" ? (
          <Mail className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Phone className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1 flex flex-col">
          <span className="text-sm font-medium truncate">
            {task.vendorName}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {task.category}
          </span>
        </div>
        <Badge
          className={cn(
            "shrink-0 gap-1 border-0 text-[10px]",
            STAGE_STYLE[task.stage],
          )}
        >
          <StageIcon stage={task.stage} />
          {STAGE_LABEL[task.stage]}
        </Badge>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Inline approval for escalated bookings — no Agent tab needed. */}
      {task.stage === "needs_human" && (
        <div className="px-3 pb-2.5 -mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {lastDecision?.reason ?? "Awaiting your decision."}
          </span>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => resolve("book")}
            disabled={resolving !== null}
          >
            {resolving === "book" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => resolve("decline")}
            disabled={resolving !== null}
          >
            {resolving === "decline" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <X className="size-3" />
            )}
            Pass
          </Button>
        </div>
      )}

      {open && (
        <div className="border-t px-3 py-3 flex flex-col gap-2">
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
      )}
    </div>
  );
}

/**
 * Inline, self-driving booking tracker shown in the chat after a plan is
 * created. It auto-runs the autonomous loop (polling + ticking until every
 * vendor resolves) and lets the user approve escalations in place — so the
 * whole outreach lifecycle is visible and actionable without the Agent tab.
 */
export function BookingTracker({ campaignId }: { campaignId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [autopilot, setAutopilot] = useState(true);
  const [stepping, setStepping] = useState(false);
  const [view, setView] = useState<"activity" | "vendors">("activity");
  // Dev-only: the autopilot/step controls are NEVER shown in a normal demo.
  // Reveal them by running `hestiaDev()` in the browser console (or set
  // localStorage `hestia_dev=1`). Off by default so an audience never sees them.
  const [devMode, setDevMode] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driving = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/orchestrator?campaignId=${encodeURIComponent(campaignId)}`,
    );
    setOverview((await res.json()) as Overview);
  }, [campaignId]);

  // Wire up the hidden dev escape hatch: a `hestiaDev(on?)` console helper and a
  // localStorage flag, kept in sync across mounted trackers via a custom event.
  useEffect(() => {
    const KEY = "hestia_dev";
    const read = () => {
      try {
        return localStorage.getItem(KEY) === "1";
      } catch {
        return false;
      }
    };
    setDevMode(read());

    const onChange = () => setDevMode(read());
    window.addEventListener("hestia-dev-change", onChange);
    window.addEventListener("storage", onChange);

    const w = window as unknown as {
      hestiaDev?: (on?: boolean) => string;
    };
    if (!w.hestiaDev) {
      w.hestiaDev = (on = true) => {
        try {
          if (on) localStorage.setItem(KEY, "1");
          else localStorage.removeItem(KEY);
        } catch {
          // ignore storage failures (private mode, etc.)
        }
        window.dispatchEvent(new Event("hestia-dev-change"));
        return on
          ? "Hestia dev controls ON — autopilot toggle + Step are now visible."
          : "Hestia dev controls OFF — autopilot runs silently.";
      };
    }

    return () => {
      window.removeEventListener("hestia-dev-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Drive the loop: tick while any task is still active (mock vendors reply,
  // the agent decides), then stop. needs_human tasks pause it until resolved.
  const drive = useCallback(async () => {
    if (driving.current) return;
    driving.current = true;
    setStepping(true);
    try {
      const res = await fetch("/api/orchestrator/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = (await res.json()) as { overview: Overview };
      setOverview(data.overview);
    } finally {
      driving.current = false;
      setStepping(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-advance: while autopilot is on, keep polling/ticking as long as any
  // task can still move on its own. The server gates each task on its own timer
  // (nextActionAt), so most ticks are no-ops until a vendor reply / Hestia
  // response comes "due" — that's what makes messages arrive staggered. We poll
  // ~1s so the UI reflects each arrival promptly. needs_human tasks are terminal
  // and wait inline for the user; they never stall the loop.
  useEffect(() => {
    if (!autopilot || !overview) return;
    const autoAdvanceable = overview.tasks.some(
      (t) =>
        ACTIVE_STAGES.has(t.stage) &&
        (t.awaiting === "hestia" || (t.awaiting === "vendor" && t.mock)),
    );
    if (overview.active === 0 || !autoAdvanceable) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(drive, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [autopilot, overview, drive]);

  if (!overview || overview.tasks.length === 0) return null;

  const { tasks, counts, active } = overview;
  const booked = counts.booked ?? 0;
  const needsHuman = counts.needs_human ?? 0;
  const total = tasks.length;
  const done = total - active;
  const canStep = tasks.some(
    (t) =>
      ACTIVE_STAGES.has(t.stage) &&
      (t.awaiting === "hestia" || (t.awaiting === "vendor" && t.mock)),
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold">Outreach &amp; Bookings</span>
          {active > 0 ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Loader2 className="size-3 animate-spin" />
              Working
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
            >
              <CheckCircle2 className="size-3" />
              All resolved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground mr-1">
            {done}/{total} done · {booked} booked
          </span>
          {/* Controls are hidden entirely during demos. They only render when
              dev mode is enabled (run `hestiaDev()` in the console), so an
              audience never sees the autopilot machinery. */}
          {devMode && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={autopilot ? "default" : "outline"}
                className="h-7 gap-1 text-xs px-2"
                onClick={() => setAutopilot((v) => !v)}
                title={
                  autopilot
                    ? "Autopilot is driving the loop automatically — click to pause"
                    : "Autopilot paused — click to resume auto-driving"
                }
              >
                <Zap className={cn("size-3", autopilot && "fill-current")} />
                {autopilot ? "Autopilot on" : "Autopilot off"}
              </Button>
              {!autopilot && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs px-2"
                  onClick={drive}
                  disabled={stepping || !canStep}
                  title="Advance the autonomous loop by one step"
                >
                  {stepping ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  Step
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {needsHuman > 0 && (
        <button
          type="button"
          onClick={() => setView("vendors")}
          className="w-full px-4 py-2 bg-red-500/5 border-b border-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 hover:bg-red-500/10 transition-colors text-left"
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          <span>
            {needsHuman === 1
              ? "1 booking needs your call"
              : `${needsHuman} bookings need your call`}{" "}
            — click to review &amp; approve.
          </span>
        </button>
      )}

      {/* View switch: a live email/call feed (default) vs. the per-vendor list. */}
      <div className="px-3 pt-3 flex items-center gap-1">
        <Button
          size="sm"
          variant={view === "activity" ? "secondary" : "ghost"}
          className="h-7 gap-1.5 text-xs"
          onClick={() => setView("activity")}
        >
          <Inbox className="size-3.5" />
          Live activity
        </Button>
        <Button
          size="sm"
          variant={view === "vendors" ? "secondary" : "ghost"}
          className="h-7 gap-1.5 text-xs"
          onClick={() => setView("vendors")}
        >
          <ListChecks className="size-3.5" />
          Vendors ({total})
        </Button>
      </div>

      {view === "activity" ? (
        <ActivityFeed tasks={tasks} />
      ) : (
        <div className="p-3 flex flex-col gap-2">
          {tasks.map((task) => (
            <VendorRow
              key={task.id}
              task={task}
              campaignId={campaignId}
              onResolved={setOverview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

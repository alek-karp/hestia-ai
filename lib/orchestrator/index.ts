// Autonomous booking orchestrator.
//
// Ties the pieces together into a self-driving loop:
//   registerCampaign  → create one task per vendor we reached out to
//   ingest*           → a vendor reply (email webhook / call report) arrives
//   advanceTask       → the agent decides + acts (auto-reply, book, escalate…)
//   tick              → drives progress with no human input; in mock mode it
//                       also synthesises vendor replies so the demo advances
//
// Real channels (AgentMail / VAPI) are used when configured; otherwise tasks
// run in `mock` mode and the simulator stands in for the vendor.

import { nanoid } from "nanoid";
import { sendThreadReply } from "@/lib/emails";
import { decideNextAction } from "./agent";
import { DEMO_EVENT, DEMO_TARGETS } from "./demo";
import { simulateVendorReply } from "./simulator";
import {
  clearState,
  findTaskByCallId,
  findTaskByThreadId,
  getState,
  getTask,
  listTasks,
  listTasksByCampaign,
  upsertCampaign,
  upsertTask,
} from "./store";
import type {
  BookingTask,
  ChannelKind,
  ConversationTurn,
  EventBrief,
  MockPersona,
  TurnRole,
} from "./types";

export type { BookingTask } from "./types";

const STAGE_DONE = new Set(["booked", "declined", "needs_human"]);

/** Hard cap on Hestia replies per task before we hand off to a human. */
const MAX_HESTIA_TURNS = 5;

// Realistic pacing (ms). Mock vendors don't reply instantly — emails come back
// over a spread, calls take longer to "connect", and Hestia takes a beat to
// compose. A global speed factor lets demos run faster/slower without touching
// the ratios (HESTIA_DEMO_SPEED: 1 = real-feel default, 2 = twice as fast).
const SPEED = Math.max(0.1, Number(process.env.HESTIA_DEMO_SPEED) || 1);
const DELAYS = {
  vendorEmail: [5000, 14000],
  vendorCall: [9000, 20000],
  hestiaReply: [2500, 6500],
  /** Per-vendor offset so the first replies trickle in rather than landing together. */
  initialStagger: 2600,
  initialBase: 2500,
} as const;

function rand(range: readonly [number, number]): number {
  const [min, max] = range;
  return Math.round((min + Math.random() * (max - min)) / SPEED);
}

function dueAt(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function isDue(task: BookingTask): boolean {
  if (!task.nextActionAt) return true;
  return Date.parse(task.nextActionAt) <= Date.now();
}

/** Time until a vendor sends their next (simulated) reply. */
function scheduleVendorReply(task: BookingTask): void {
  const range =
    task.channel === "call" ? DELAYS.vendorCall : DELAYS.vendorEmail;
  task.nextActionAt = dueAt(rand(range));
  task.pending = "vendor_reply";
}

/** Time until Hestia composes its next response after a vendor reply. */
function scheduleHestiaReply(task: BookingTask): void {
  task.nextActionAt = dueAt(rand(DELAYS.hestiaReply));
  task.pending = "hestia_reply";
}

function now(): string {
  return new Date().toISOString();
}

function turn(
  role: TurnRole,
  channel: ChannelKind,
  text: string,
): ConversationTurn {
  return { id: nanoid(8), at: now(), role, channel, text };
}

export type CampaignTargetInput = {
  vendorName: string;
  category: string;
  channel: ChannelKind;
  contact: { email?: string; phone?: string };
  threadId?: string;
  callId?: string;
  /** The outreach copy already sent, recorded as Hestia's opening turn. */
  openingMessage?: string;
  /** Demo-only: force the mock vendor's behaviour (cooperative/busy/haggler…). */
  mockPersona?: MockPersona;
  /**
   * Demo-only: drive this task with the simulator even though a real send
   * happened (real `threadId`/`callId` is still recorded for cross-reference).
   * Lets the chat flow showcase the full loop without anyone answering the
   * email or call.
   */
  forceMock?: boolean;
};

/**
 * Registers a new campaign and one task per outreach target. Tasks that have a
 * real threadId/callId are live; the rest run in mock mode and are advanced by
 * the simulator on tick.
 */
export function registerCampaign(
  event: EventBrief,
  targets: CampaignTargetInput[],
): { campaignId: string; taskIds: string[] } {
  const campaignId = nanoid(10);
  upsertCampaign({ id: campaignId, event, createdAt: now() });

  const taskIds: string[] = [];
  for (const [index, t] of targets.entries()) {
    const id = nanoid(10);
    // A task self-drives via the simulator when it has no real channel, or when
    // demo mode explicitly forces it (real outreach still went out).
    const mock = t.forceMock || (!t.threadId && !t.callId);
    const task: BookingTask = {
      id,
      campaignId,
      vendorName: t.vendorName,
      category: t.category,
      channel: t.channel,
      contact: t.contact,
      stage: "contacted",
      awaiting: "vendor",
      hestiaTurns: 1, // the opening outreach counts as our first turn
      threadId: t.threadId,
      callId: t.callId,
      mock,
      mockPersona: t.mockPersona,
      // Mock vendors reply on a staggered schedule so the inbox fills up
      // gradually (like real life). Live tasks wait on a real webhook.
      nextActionAt: mock
        ? dueAt(
            DELAYS.initialBase +
              index * DELAYS.initialStagger +
              rand([0, 2000]),
          )
        : undefined,
      pending: mock ? "vendor_reply" : null,
      turns: t.openingMessage
        ? [turn("hestia", t.channel, t.openingMessage)]
        : [],
      decisions: [],
      event,
      createdAt: now(),
      updatedAt: now(),
    };
    upsertTask(task);
    taskIds.push(id);
  }

  return { campaignId, taskIds };
}

/** Appends a turn and persists. */
function appendTurn(task: BookingTask, t: ConversationTurn): void {
  task.turns.push(t);
  upsertTask(task);
}

/**
 * Runs the autonomous agent on a task and applies its decision. Safe to call
 * repeatedly — it no-ops on terminal tasks or when it isn't Hestia's move.
 */
export async function advanceTask(taskId: string): Promise<BookingTask | null> {
  const task = getTask(taskId);
  if (!task) return null;
  if (STAGE_DONE.has(task.stage)) return task;
  if (task.awaiting !== "hestia") return task;

  // Hard safety rail: never loop a vendor forever. Past the cap we escalate to a
  // human regardless of what the agent would choose — this also guarantees the
  // "needs_human" path shows up in demos (e.g. the haggler vendor).
  if (task.hestiaTurns >= MAX_HESTIA_TURNS) {
    task.decisions.push({
      id: nanoid(8),
      at: now(),
      action: "escalate",
      stage: "needs_human",
      reason: `No agreement after ${task.hestiaTurns} replies — handing off to a human.`,
      llm: false,
    });
    task.stage = "needs_human";
    task.awaiting = "none";
    task.pending = null;
    task.nextActionAt = undefined;
    task.turns.push(
      turn(
        "system",
        task.channel,
        `🚨 Escalated to a human: stalled after ${task.hestiaTurns} replies.`,
      ),
    );
    upsertTask(task);
    return task;
  }

  const decision = await decideNextAction(task, {
    // Demo-seeded tasks run on the deterministic decision path so the canned
    // showcase is identical every time (and works without an API key).
    forceHeuristic: Boolean(task.mockPersona),
  });

  task.decisions.push({
    id: nanoid(8),
    at: now(),
    action: decision.action,
    stage: decision.stage,
    reason: decision.reason,
    llm: decision.llm,
  });

  switch (decision.action) {
    case "send_reply": {
      const text =
        decision.message?.trim() ||
        "Thanks for the update — could you share your availability and a quote?";
      task.turns.push(turn("hestia", task.channel, text));
      task.hestiaTurns += 1;
      task.stage =
        decision.stage === "contacted" ? "negotiating" : decision.stage;
      task.awaiting = "vendor";
      // Wait a realistic beat for the vendor's next reply.
      scheduleVendorReply(task);

      // Deliver over the real channel when we have one (email only — a call is
      // one-shot). Mock tasks just record the turn; the simulator replies next.
      if (!task.mock && task.channel === "email" && task.threadId) {
        await sendThreadReply({ threadId: task.threadId, text }).catch(
          () => null,
        );
      }
      break;
    }
    case "book":
      task.stage = "booked";
      task.awaiting = "none";
      task.pending = null;
      task.nextActionAt = undefined;
      task.turns.push(
        turn("system", task.channel, `✅ Booked ${task.vendorName}.`),
      );
      break;
    case "decline":
      task.stage = "declined";
      task.awaiting = "none";
      task.pending = null;
      task.nextActionAt = undefined;
      task.turns.push(
        turn(
          "system",
          task.channel,
          `${task.vendorName} declined / unavailable.`,
        ),
      );
      break;
    case "escalate":
      task.stage = "needs_human";
      task.awaiting = "none";
      task.pending = null;
      task.nextActionAt = undefined;
      task.turns.push(
        turn(
          "system",
          task.channel,
          `🚨 Escalated to a human: ${decision.reason}`,
        ),
      );
      break;
    case "wait":
      task.awaiting = "vendor";
      scheduleVendorReply(task);
      break;
  }

  upsertTask(task);
  return task;
}

/** Records a vendor reply on a task and hands control back to the agent. */
async function ingestVendorTurn(
  task: BookingTask,
  text: string,
  opts?: { defer?: boolean },
): Promise<BookingTask | null> {
  appendTurn(task, turn("vendor", task.channel, text));
  task.awaiting = "hestia";
  if (task.stage === "contacted") task.stage = "negotiating";

  // For simulated (mock) tasks, let Hestia "think" for a beat before replying
  // so the back-and-forth has realistic rhythm — the next tick picks it up when
  // due. Real webhook replies are handled right away.
  if (opts?.defer) {
    scheduleHestiaReply(task);
    upsertTask(task);
    return task;
  }

  task.pending = null;
  task.nextActionAt = undefined;
  upsertTask(task);
  return advanceTask(task.id);
}

/** AgentMail webhook → a vendor replied to an outreach email thread. */
export async function ingestEmailReply(input: {
  threadId: string;
  text: string;
}): Promise<BookingTask | null> {
  const task = findTaskByThreadId(input.threadId);
  if (!task) return null;
  return ingestVendorTurn(task, input.text);
}

/** VAPI webhook → an outbound call ended; feed the summary in as a turn. */
export async function ingestCallReport(input: {
  callId: string;
  summary?: string;
  transcript?: string;
}): Promise<BookingTask | null> {
  const task = findTaskByCallId(input.callId);
  if (!task) return null;
  const text =
    input.summary?.trim() ||
    input.transcript?.trim() ||
    "Call completed (no summary available).";
  return ingestVendorTurn(task, `Call summary: ${text}`);
}

/**
 * One step of the autonomous loop. Advances every task whose scheduled action
 * is *due*:
 *  - tasks awaiting Hestia → run the agent (composes a reply / books / escalates)
 *  - mock tasks awaiting a vendor → synthesise a reply, then defer to Hestia
 * Timing gates (`nextActionAt`) make messages arrive staggered over realistic
 * delays. Returns how many tasks changed so a caller (UI poller) can keep
 * polling until everything resolves. When `campaignId` is given, only that
 * campaign's tasks are driven.
 */
export async function tick(campaignId?: string): Promise<{
  advanced: number;
  active: number;
}> {
  const inScope = (t: BookingTask) =>
    !campaignId || t.campaignId === campaignId;
  const tasks = listTasks().filter(
    (t) => inScope(t) && !STAGE_DONE.has(t.stage),
  );
  let advanced = 0;

  for (const task of tasks) {
    if (!isDue(task)) continue; // not yet — its delay hasn't elapsed
    if (task.awaiting === "hestia") {
      await advanceTask(task.id);
      advanced += 1;
    } else if (task.awaiting === "vendor" && task.mock) {
      const reply = await simulateVendorReply(task);
      await ingestVendorTurn(task, reply, { defer: true });
      advanced += 1;
    }
  }

  const active = listTasks().filter(
    (t) => inScope(t) && !STAGE_DONE.has(t.stage),
  ).length;
  return { advanced, active };
}

/**
 * Human-in-the-loop override: resolve a task directly (typically one the agent
 * escalated as `needs_human`). Lets the user approve or pass on a booking from
 * the chat without digging into the Agent tab.
 */
export function resolveTask(
  taskId: string,
  action: "book" | "decline",
): BookingTask | null {
  const task = getTask(taskId);
  if (!task) return null;

  task.decisions.push({
    id: nanoid(8),
    at: now(),
    action,
    stage: action === "book" ? "booked" : "declined",
    reason: "Resolved by a human from the planner.",
    llm: false,
  });
  task.stage = action === "book" ? "booked" : "declined";
  task.awaiting = "none";
  task.turns.push(
    turn(
      "system",
      task.channel,
      action === "book"
        ? `✅ Booked ${task.vendorName} (approved by you).`
        : `${task.vendorName} passed (declined by you).`,
    ),
  );
  upsertTask(task);
  return task;
}

export type OrchestratorOverview = {
  campaigns: number;
  tasks: BookingTask[];
  counts: Record<string, number>;
  active: number;
};

export function getOverview(campaignId?: string): OrchestratorOverview {
  const all = listTasks();
  const tasks = campaignId
    ? all.filter((t) => t.campaignId === campaignId)
    : all;
  const counts: Record<string, number> = {};
  for (const t of tasks) counts[t.stage] = (counts[t.stage] ?? 0) + 1;
  const active = tasks.filter((t) => !STAGE_DONE.has(t.stage)).length;
  return {
    campaigns: Object.keys(getState().campaigns).length,
    tasks,
    counts,
    active,
  };
}

/**
 * Seeds a ready-made campaign of mock vendors for demos — no chat flow, no real
 * emails or calls. Each vendor's scripted persona guarantees a varied outcome
 * (several booked, one declined, one escalated) once the loop runs. Returns the
 * new task ids so the caller can immediately tick or just poll the overview.
 */
export function seedDemoCampaign(): { campaignId: string; taskIds: string[] } {
  return registerCampaign(DEMO_EVENT, DEMO_TARGETS);
}

/** Clears every campaign and task — a clean slate before/after a demo. */
export function resetOrchestrator(): void {
  clearState();
}

export { getTask, listTasks, listTasksByCampaign };

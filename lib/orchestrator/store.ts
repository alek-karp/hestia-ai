// File-backed persistence for the orchestrator.
//
// The autonomous loop spans multiple, independent HTTP requests (webhooks from
// AgentMail / VAPI, the UI poller, manual ticks), so state has to outlive a
// single request. There's no database in this project, so we persist a small
// JSON snapshot to `.data/orchestrator.json` and keep an in-memory copy hot.
//
// A module-level singleton is stored on `globalThis` so Next.js dev hot-reload
// (which re-evaluates modules) doesn't drop the in-memory state between edits.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BookingTask, Campaign, OrchestratorState } from "./types";

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "orchestrator.json");

type Store = {
  state: OrchestratorState;
};

const GLOBAL_KEY = "__hestia_orchestrator_store__";

function emptyState(): OrchestratorState {
  return { campaigns: {}, tasks: {} };
}

function load(): OrchestratorState {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw) as OrchestratorState;
      return {
        campaigns: parsed.campaigns ?? {},
        tasks: parsed.tasks ?? {},
      };
    }
  } catch {
    // Corrupt or unreadable snapshot — start fresh rather than crash.
  }
  return emptyState();
}

function store(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { state: load() };
  }
  return g[GLOBAL_KEY] as Store;
}

function persist(): void {
  try {
    const dir = dirname(DATA_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store().state, null, 2));
  } catch {
    // Best-effort: a failed write shouldn't break the request. The in-memory
    // copy stays authoritative for the life of the process.
  }
}

export function getState(): OrchestratorState {
  return store().state;
}

/** Wipes all campaigns and tasks — used to reset the demo. */
export function clearState(): void {
  store().state = emptyState();
  persist();
}

export function upsertCampaign(campaign: Campaign): void {
  store().state.campaigns[campaign.id] = campaign;
  persist();
}

export function upsertTask(task: BookingTask): void {
  task.updatedAt = new Date().toISOString();
  store().state.tasks[task.id] = task;
  persist();
}

export function getTask(id: string): BookingTask | undefined {
  return store().state.tasks[id];
}

export function listTasks(): BookingTask[] {
  return Object.values(store().state.tasks).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function listTasksByCampaign(campaignId: string): BookingTask[] {
  return listTasks().filter((t) => t.campaignId === campaignId);
}

export function findTaskByThreadId(threadId: string): BookingTask | undefined {
  return listTasks().find((t) => t.threadId === threadId);
}

export function findTaskByCallId(callId: string): BookingTask | undefined {
  return listTasks().find((t) => t.callId === callId);
}

// Domain model for the autonomous booking orchestrator.
//
// A "campaign" is one event's worth of outreach. Each vendor/caterer we reach
// out to becomes a "task" that the autonomous agent drives through a small
// state machine (contacted → negotiating → quote_received → booked) without
// human input, escalating to `needs_human` only when it can't decide.

export type BookingStage =
  | "contacted" // outreach sent, waiting on the vendor's first reply
  | "negotiating" // back-and-forth in progress
  | "quote_received" // vendor shared availability / a price
  | "booked" // confirmed — nothing more to do
  | "declined" // vendor unavailable, or we passed
  | "needs_human"; // agent escalated for a human decision

export type ChannelKind = "email" | "call";

/**
 * Mock vendor behaviour used in demo mode (no real provider on the other end):
 *  - cooperative: gives a fair quote and confirms → booked
 *  - pricey: premium quote but still books → booked
 *  - busy: declines up front (unavailable) → declined
 *  - haggler: keeps counter-offering, never confirms → escalates to a human
 */
export type MockPersona = "cooperative" | "pricey" | "busy" | "haggler";

/** Whose move it is. Drives the autonomous loop. */
export type Awaiting = "vendor" | "hestia" | "none";

export type TurnRole = "hestia" | "vendor" | "system";

export type ConversationTurn = {
  id: string;
  at: string;
  role: TurnRole;
  channel: ChannelKind;
  text: string;
};

/** The action the autonomous agent chose on a given task. */
export type AgentAction =
  | "send_reply" // reply to the vendor to move the booking forward
  | "book" // we have enough to confirm — mark booked
  | "decline" // vendor unavailable / not a fit — close out
  | "wait" // nothing to do until the vendor responds
  | "escalate"; // a human needs to make this call

export type DecisionLogEntry = {
  id: string;
  at: string;
  action: AgentAction;
  stage: BookingStage;
  reason: string;
  /** True when produced by the LLM, false for the heuristic fallback. */
  llm: boolean;
};

export type EventBrief = {
  title: string;
  date: string;
  area: string;
  headcount: number;
  food?: string;
  budget?: string;
};

export type BookingTask = {
  id: string;
  campaignId: string;
  vendorName: string;
  category: string;
  channel: ChannelKind;
  contact: { email?: string; phone?: string };
  stage: BookingStage;
  awaiting: Awaiting;
  /** Number of replies Hestia has sent on this task (loop guard). */
  hestiaTurns: number;
  /** AgentMail thread id (email) — present when a real send happened. */
  threadId?: string;
  /** VAPI call id (call) — present when a real call was placed. */
  callId?: string;
  /** True when there is no real channel behind this task (demo/mock mode). */
  mock: boolean;
  /** Forced mock behaviour for demo seeding; derived from id when absent. */
  mockPersona?: MockPersona;
  /**
   * ISO time the next simulated action (vendor reply or Hestia response) is
   * "due". The loop skips a task until this passes, so messages arrive
   * staggered over realistic delays instead of all at once. Undefined = ready
   * now (or, for live tasks, waiting on a real reply).
   */
  nextActionAt?: string;
  /** What we're waiting to happen next — drives the live "…" pending UI. */
  pending?: "vendor_reply" | "hestia_reply" | null;
  turns: ConversationTurn[];
  decisions: DecisionLogEntry[];
  event: EventBrief;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  event: EventBrief;
  createdAt: string;
};

export type OrchestratorState = {
  campaigns: Record<string, Campaign>;
  tasks: Record<string, BookingTask>;
};

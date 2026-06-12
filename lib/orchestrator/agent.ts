// The autonomous decision agent.
//
// Given a booking task (the event brief + the full conversation so far), it
// decides Hestia's next move with NO human in the loop: reply to keep
// negotiating, book, decline, wait, or escalate. When OpenAI isn't configured
// it falls back to a deterministic heuristic so the loop still runs in demos.

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { AgentAction, BookingStage, BookingTask } from "./types";

export type AgentDecision = {
  action: AgentAction;
  /** Stage to move the task to after applying the action. */
  stage: BookingStage;
  /** Reply text — only meaningful when action is "send_reply". */
  message?: string;
  reason: string;
  /** True when the LLM produced this, false for the heuristic fallback. */
  llm: boolean;
};

const MAX_HESTIA_TURNS = 4;

const decisionSchema = z.object({
  action: z.enum(["send_reply", "book", "decline", "wait", "escalate"]),
  stage: z.enum([
    "contacted",
    "negotiating",
    "quote_received",
    "booked",
    "declined",
    "needs_human",
  ]),
  message: z
    .string()
    .optional()
    .describe("The reply to send the vendor. Required when action=send_reply."),
  reason: z
    .string()
    .describe(
      "One short sentence explaining the decision (for the audit log).",
    ),
});

function transcript(task: BookingTask): string {
  if (task.turns.length === 0) return "(no messages yet)";
  return task.turns
    .map((t) => {
      const who =
        t.role === "hestia"
          ? "Hestia (us)"
          : t.role === "vendor"
            ? "Vendor"
            : "System";
      return `${who}:\n${t.text}`;
    })
    .join("\n\n---\n\n");
}

function lastVendorText(task: BookingTask): string {
  for (let i = task.turns.length - 1; i >= 0; i--) {
    if (task.turns[i].role === "vendor")
      return task.turns[i].text.toLowerCase();
  }
  return "";
}

/**
 * Deterministic fallback used when no LLM is available. Looks for obvious
 * signals in the vendor's latest message and respects the turn-count guard.
 */
function heuristicDecision(task: BookingTask): AgentDecision {
  const text = lastVendorText(task);
  const fromName = process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events";

  if (!text) {
    return {
      action: "wait",
      stage: task.stage === "contacted" ? "contacted" : task.stage,
      reason: "No vendor reply yet — waiting.",
      llm: false,
    };
  }

  const unavailable =
    /(unavailable|fully booked|can't|cannot|not able|no availability|sorry)/.test(
      text,
    );
  if (unavailable) {
    return {
      action: "decline",
      stage: "declined",
      reason: "Vendor indicated they are unavailable.",
      llm: false,
    };
  }

  const confirms =
    /(confirm|booked|reserve|hold the date|we're all set|see you)/.test(text);
  const hasQuote = /(\$|usd|price|quote|per head|per person|total)/.test(text);

  if (confirms && task.stage === "quote_received") {
    return {
      action: "book",
      stage: "booked",
      reason: "Vendor confirmed availability and terms.",
      llm: false,
    };
  }

  if (task.hestiaTurns >= MAX_HESTIA_TURNS) {
    return {
      action: "escalate",
      stage: "needs_human",
      reason: "Negotiation ran long without a confirmation — needs a human.",
      llm: false,
    };
  }

  const nextStage: BookingStage = hasQuote ? "quote_received" : "negotiating";
  const message = hasQuote
    ? `Thank you — that works for us. Please go ahead and hold ${task.event.date} for ${task.event.headcount} guests; I'll consider this confirmed on our end.\n\nWarm regards,\n${fromName}`
    : `Thanks for getting back to me. Could you share your availability for ${task.event.date} and a rough quote for ${task.event.headcount} guests?\n\nWarm regards,\n${fromName}`;

  return {
    action: "send_reply",
    stage: nextStage,
    message,
    reason: hasQuote
      ? "Vendor shared a quote — accepting and asking them to hold the date."
      : "Vendor engaged — asking for availability and pricing.",
    llm: false,
  };
}

export async function decideNextAction(
  task: BookingTask,
  opts?: { forceHeuristic?: boolean },
): Promise<AgentDecision> {
  if (opts?.forceHeuristic) return heuristicDecision(task);
  if (!process.env.OPENAI_API_KEY) return heuristicDecision(task);

  const fromName = process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events";

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: decisionSchema,
      system: `You are ${fromName}, an autonomous event-planning agent negotiating a booking with a single vendor over ${task.channel}.
You operate with NO human in the loop. Read the event brief and the conversation, then choose the next move.

Actions:
- send_reply: write the vendor's next message to advance the booking (ask for availability/quote, accept terms, confirm details). Provide "message".
- book: the vendor has confirmed availability AND terms are acceptable — close the deal. Use stage "booked".
- decline: the vendor is unavailable or clearly not a fit — close out. Use stage "declined".
- wait: nothing to do until the vendor replies. Use stage "contacted" or "negotiating".
- escalate: a genuine judgement call a human must make (e.g. budget far exceeded, contradictory terms). Use stage "needs_human".

Rules:
- Be decisive and autonomous — prefer moving the booking forward over escalating.
- Only escalate when truly stuck; routine pricing within reason does NOT need a human.
- You have already sent ${task.hestiaTurns} reply(ies). After ${MAX_HESTIA_TURNS} replies without a confirmation, escalate.
- Replies: warm, concise, 2-4 sentences, plain text, signed "${fromName}". Use only facts in the thread — never invent prices or commitments.
- Set "stage" to the booking stage AFTER your action.`,
      prompt: `Event brief:
- Title: ${task.event.title}
- Date: ${task.event.date}
- Location: ${task.event.area}
- Headcount: ${task.event.headcount}
${task.event.food ? `- Food: ${task.event.food}\n` : ""}${task.event.budget ? `- Budget: ${task.event.budget}\n` : ""}- Vendor: ${task.vendorName} (${task.category})
- Current stage: ${task.stage}

Conversation so far (oldest first):
${transcript(task)}

Decide the next move.`,
    });

    return { ...object, llm: true };
  } catch {
    // Network / quota error — degrade gracefully to the heuristic.
    return heuristicDecision(task);
  }
}

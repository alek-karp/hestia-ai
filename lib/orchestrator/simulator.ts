// Mock vendor simulator.
//
// In demo mode there's no real vendor on the other end of an email/call, so the
// autonomous loop would stall waiting for replies. This generates a plausible
// vendor response so the whole pipeline (contacted → negotiating →
// quote_received → booked) advances on its own. Used by the orchestrator tick
// for tasks flagged `mock`.

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { BookingTask, MockPersona } from "./types";

/**
 * Picks the vendor "personality". A demo seed can force one via
 * `task.mockPersona`; otherwise it's derived deterministically from the task id
 * so a vendor behaves consistently across turns.
 */
function vendorPersona(task: BookingTask): MockPersona {
  if (task.mockPersona) return task.mockPersona;
  let hash = 0;
  for (const ch of task.id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const bucket = Math.abs(hash) % 10;
  if (bucket < 7) return "cooperative";
  if (bucket < 9) return "pricey";
  return "busy";
}

function heuristicVendorReply(task: BookingTask): string {
  const persona = vendorPersona(task);
  const replyCount = task.turns.filter((t) => t.role === "vendor").length;

  if (persona === "busy" && replyCount === 0) {
    return `Hi — thanks for reaching out about ${task.event.title}. Unfortunately we're fully booked on ${task.event.date} and won't be able to accommodate. Best of luck with the event!`;
  }

  // The haggler never gives a clean quote or confirmation — it keeps adding
  // conditions — so the agent eventually escalates to a human (the
  // "needs_human" demo path). Wording deliberately avoids decline/confirm
  // signals so the deterministic agent keeps negotiating until the turn cap.
  if (persona === "haggler") {
    const counters = [
      `Thanks for reaching out! Before we go further I'd need your full run-of-show and a guaranteed minimum spend — our rates shift a lot depending on those.`,
      `It's a tricky date for us. We'd want a premium rate plus a separate setup fee, and I'd need you to approve a budget ceiling first.`,
      `There's also a 60% deposit and an exclusivity clause on our side. Would you be willing to agree to those terms?`,
      `We're keen to make it work, but I'd also need you to move the start time earlier and cover overtime separately before we go ahead.`,
    ];
    return counters[Math.min(replyCount, counters.length - 1)];
  }

  if (replyCount === 0) {
    return `Hello! Thanks for thinking of ${task.vendorName} for ${task.event.title}. We do have availability on ${task.event.date}. For ${task.event.headcount} guests we'd be looking at roughly $${persona === "pricey" ? 95 : 65} per head, all in. Happy to answer any questions.`;
  }

  // Cooperative / pricey vendors confirm on the second turn.
  return `Sounds great — we'll hold ${task.event.date} for ${task.event.headcount} guests. Consider it confirmed on our side, and we'll follow up with a contract. Looking forward to it!`;
}

/** Produces the next mock vendor message for a task awaiting a vendor reply. */
export async function simulateVendorReply(task: BookingTask): Promise<string> {
  // Demo-seeded tasks carry a forced persona and use the scripted replies so the
  // showcase is fully repeatable — even when an API key is configured. Organic
  // (chat-created) mock tasks fall through to the LLM for natural variety.
  if (task.mockPersona) return heuristicVendorReply(task);
  if (!process.env.OPENAI_API_KEY) return heuristicVendorReply(task);

  const persona = vendorPersona(task);
  const history = task.turns
    .map(
      (t) => `${t.role === "vendor" ? "You (vendor)" : "Organiser"}: ${t.text}`,
    )
    .join("\n\n");

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are role-playing a ${task.category} vendor named "${task.vendorName}" replying to an event organiser over ${task.channel}.
Persona: ${persona === "cooperative" ? "friendly and eager to win the booking — give availability and a fair quote, then confirm when asked." : persona === "pricey" ? "professional but on the premium side — quote a higher price, still willing to book." : persona === "haggler" ? "difficult to pin down — keep introducing new fees, deposits, and conditions, and never give a clean confirmation no matter what the organiser offers." : "regretfully unavailable for the requested date — politely decline."}

Rules:
- Stay in character as the vendor. Be concise (2-4 sentences), warm, realistic.
- Move toward a clear outcome: give availability + a concrete per-head price, and once the organiser accepts, confirm the booking explicitly ("we'll hold the date", "consider it confirmed").
- If your persona is unavailable, decline clearly in your first reply.
- If your persona is the haggler, never confirm — always add another condition or counter-offer.
- Plain text only. No subject line.`,
      prompt: `Event: ${task.event.title} on ${task.event.date} in ${task.event.area}, ${task.event.headcount} guests${task.event.food ? `, food: ${task.event.food}` : ""}.

Conversation so far:
${history || "(the organiser just reached out)"}

Write your next reply as the vendor.`,
    });
    return text.trim();
  } catch {
    return heuristicVendorReply(task);
  }
}

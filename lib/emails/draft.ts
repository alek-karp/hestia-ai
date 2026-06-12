import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { ThreadDetail } from "./types";

export type DraftReply = {
  text: string;
};

/**
 * Drafts Hestia's next reply to a vendor thread. The model reads the whole
 * conversation (the original outreach already contains the full event brief)
 * and proposes a concise, professional response for human approval — it does
 * not send anything.
 */
export async function draftThreadReply(
  thread: ThreadDetail,
): Promise<DraftReply> {
  const fromName = process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events";

  const transcript = thread.messages
    .map((m) => {
      const role = m.outbound ? `${fromName} (us)` : "Vendor";
      return `${role}:\n${m.text}`;
    })
    .join("\n\n---\n\n");

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: `You are ${fromName}, an event-planning assistant corresponding with a vendor by email.
Write the next reply in the conversation on our behalf.

Rules:
- Be warm, concise, and professional. 2-4 short sentences.
- Move the booking forward: answer the vendor's questions, confirm details already agreed, and ask for the single most useful next thing (availability, a quote, or a hold on the date).
- Use only facts present in the thread. Never invent prices, dates, or commitments.
- Plain text only. No subject line, no quoted history.
- Sign off as "${fromName}".`,
    prompt: `Here is the email thread so far (oldest first):\n\n${transcript}\n\nWrite our next reply.`,
  });

  return { text: text.trim() };
}

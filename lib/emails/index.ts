import { createAgentMailProvider } from "./agentmail";
import type {
  EmailProvider,
  EmailRecord,
  OutreachEmail,
  ReplyInput,
  ThreadDetail,
  ThreadSummary,
} from "./types";

export type {
  EmailRecord,
  OutreachEmail,
  ReplyInput,
  ThreadDetail,
  ThreadMessage,
  ThreadSummary,
} from "./types";

// Lazily initialised so env vars are read at call time, not module load time.
let _provider: EmailProvider | null | undefined;

function provider(): EmailProvider | null {
  if (_provider === undefined) _provider = createAgentMailProvider();
  return _provider;
}

/**
 * Sends an outbound outreach email. Returns null when no email provider is
 * configured (AGENTMAIL_API_KEY missing), so callers can treat email as
 * optional without branching everywhere.
 *
 * All mail is routed to the redirect inbox (EMAIL_REDIRECT_TO) — real vendors
 * are never contacted in this demo.
 */
export async function sendOutreachEmail(
  email: OutreachEmail,
): Promise<EmailRecord | null> {
  const p = provider();
  if (!p) return null;
  return p.send(email);
}

/** Lists recent conversation threads in the outreach inbox. */
export async function listReplyThreads(
  limit?: number,
): Promise<ThreadSummary[]> {
  const p = provider();
  if (!p) return [];
  return p.listThreads(limit);
}

/** Fetches a full thread (all messages) for review and drafting. */
export async function getReplyThread(
  threadId: string,
): Promise<ThreadDetail | null> {
  const p = provider();
  if (!p) return null;
  return p.getThread(threadId);
}

/** Sends an (approved) reply to the most recent message in a thread. */
export async function sendThreadReply(
  input: ReplyInput,
): Promise<EmailRecord | null> {
  const p = provider();
  if (!p) return null;
  return p.reply(input);
}

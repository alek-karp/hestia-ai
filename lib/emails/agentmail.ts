import { AgentMailClient } from "agentmail";
import type {
  EmailProvider,
  EmailRecord,
  OutreachEmail,
  ReplyInput,
  ThreadDetail,
  ThreadMessage,
  ThreadSummary,
} from "./types";

/**
 * Demo safety guard: every outreach email is delivered here instead of to the
 * real vendor. The recipient can then reply *as if* they were the vendor, so we
 * can exercise the full conversation loop without contacting real businesses.
 */
const DEFAULT_REDIRECT_TO = "priyanshu.mahey02@gmail.com";

/** AgentMail returns `Date` objects for timestamps; normalise to ISO strings. */
function iso(value: Date | string | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

export function createAgentMailProvider(): EmailProvider | null {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) return null;

  const redirectTo = process.env.EMAIL_REDIRECT_TO ?? DEFAULT_REDIRECT_TO;
  const fromName = process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events";
  const client = new AgentMailClient({ apiKey });

  // Resolve the sending inbox once and cache the promise. Falls back to creating
  // an inbox when AGENTMAIL_INBOX_ID is not configured.
  let inboxIdPromise: Promise<string> | undefined;
  function resolveInboxId(): Promise<string> {
    if (inboxIdPromise) return inboxIdPromise;
    const configured = process.env.AGENTMAIL_INBOX_ID;
    inboxIdPromise = configured
      ? Promise.resolve(configured)
      : client.inboxes
          .create({ clientId: "hestia-outreach", displayName: fromName })
          .then((inbox) => inbox.inboxId);
    return inboxIdPromise;
  }

  return {
    async send(email: OutreachEmail): Promise<EmailRecord> {
      const inboxId = await resolveInboxId();

      // A small banner in the redirect inbox makes it obvious which vendor this
      // stand-in message represents.
      const intendedLine = email.intendedTo
        ? `${email.businessName} <${email.intendedTo}>`
        : email.businessName;
      const banner = `[Hestia outreach → ${intendedLine}]`;

      const res = await client.inboxes.messages.send(inboxId, {
        to: redirectTo,
        subject: email.subject,
        text: `${banner}\n\n${email.text}`,
        html: email.html
          ? `<p style="color:#9ca3af;font-size:12px;margin:0 0 12px">${banner}</p>${email.html}`
          : undefined,
        labels: email.labels,
      });

      return {
        messageId: res.messageId,
        threadId: res.threadId,
        inboxId,
        businessName: email.businessName,
        deliveredTo: redirectTo,
        intendedTo: email.intendedTo,
        subject: email.subject,
        status: "sent",
      };
    },

    async listThreads(limit = 20): Promise<ThreadSummary[]> {
      const inboxId = await resolveInboxId();
      // AgentMail's default thread list only surfaces threads with a received
      // message, so outreach we've sent (but that hasn't been replied to yet)
      // is hidden. Filtering by the system `sent` label returns every outreach
      // conversation; replies keep the label, so replied threads show too.
      const res = await client.inboxes.threads.list(inboxId, {
        limit,
        labels: ["sent"],
      });
      return res.threads.map((t) => {
        const labels = t.labels ?? [];
        return {
          threadId: t.threadId,
          subject: t.subject ?? "(no subject)",
          preview: t.preview ?? "",
          senders: t.senders ?? [],
          messageCount: t.messageCount,
          updatedAt: iso(t.updatedAt),
          // Address fields are unreliable here (every message reports the inbox
          // identity), so we key off AgentMail's system labels: a thread with
          // an unread received message is awaiting our reply.
          awaitingReply:
            labels.includes("unread") && labels.includes("received"),
        };
      });
    },

    async getThread(threadId: string): Promise<ThreadDetail> {
      const inboxId = await resolveInboxId();
      const t = await client.inboxes.threads.get(inboxId, threadId);

      const messages: ThreadMessage[] = (t.messages ?? []).map((m) => {
        const labels = m.labels ?? [];
        // A message is inbound when it carries the `received` label. We can't
        // rely on the from-address: in the redirect demo every message shows
        // the inbox's own address.
        const outbound = !labels.includes("received");
        return {
          messageId: m.messageId,
          from: m.from,
          to: m.to ?? [],
          timestamp: iso(m.timestamp),
          outbound,
          text: (m.extractedText ?? m.text ?? m.preview ?? "").trim(),
          labels,
        };
      });

      const last = messages.at(-1);
      return {
        threadId: t.threadId,
        subject: t.subject ?? "(no subject)",
        preview: t.preview ?? "",
        senders: t.senders ?? [],
        messageCount: t.messageCount,
        updatedAt: iso(t.updatedAt),
        awaitingReply: last ? !last.outbound : false,
        messages,
      };
    },

    async reply(input: ReplyInput): Promise<EmailRecord> {
      const inboxId = await resolveInboxId();
      const thread = await client.inboxes.threads.get(inboxId, input.threadId);
      const lastMessageId = thread.lastMessageId;

      const res = await client.inboxes.messages.reply(inboxId, lastMessageId, {
        text: input.text,
        html: input.html,
      });

      return {
        messageId: res.messageId,
        threadId: res.threadId,
        inboxId,
        businessName: thread.subject ?? "Reply",
        deliveredTo: redirectTo,
        subject: thread.subject ?? "Re:",
        status: "sent",
      };
    },
  };
}

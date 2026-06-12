// AgentMail sends POST events here. Configure the URL in the AgentMail Console:
// https://console.agentmail.to → Webhooks. Point it at /api/emails/webhook.
//
// Key event types:
//   message.received   — a new email (e.g. a vendor reply) arrived
//   message.sent       — an outbound email was sent
//   message.delivered  — an outbound email was delivered
//   message.bounced    — delivery failed
//
// For production, verify the svix signature (svix-id / svix-timestamp /
// svix-signature headers) against AGENTMAIL_WEBHOOK_SECRET using the `svix`
// package before trusting the payload.

type AgentMailMessage = {
  inboxId?: string;
  threadId?: string;
  messageId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  text?: string;
  extractedText?: string;
  labels?: string[];
};

type AgentMailEvent = {
  type: string;
  eventType: string;
  eventId?: string;
  message?: AgentMailMessage;
};

export async function POST(req: Request) {
  const payload = (await req.json()) as AgentMailEvent;

  if (payload.eventType?.startsWith("message.received")) {
    const msg = payload.message;
    console.log("[email-webhook] reply received", {
      threadId: msg?.threadId,
      from: msg?.from,
      subject: msg?.subject,
      preview: (msg?.extractedText ?? msg?.text)?.slice(0, 300),
    });

    // TODO: persist the reply / surface it in the planning UI — write to DB,
    // update the workflow, notify the user, etc.
  }

  return new Response("ok");
}

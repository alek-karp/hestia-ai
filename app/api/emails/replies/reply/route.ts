import { sendThreadReply } from "@/lib/emails";

// POST /api/emails/replies/reply  body: { threadId, text }
// Sends an (approved) reply to the most recent message in the thread.
export async function POST(req: Request) {
  const { threadId, text } = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    text?: string;
  };

  if (!threadId || !text?.trim()) {
    return Response.json(
      { error: "threadId and text are required" },
      { status: 400 },
    );
  }

  const record = await sendThreadReply({ threadId, text });
  if (!record) {
    return Response.json(
      { error: "Email provider not configured" },
      { status: 503 },
    );
  }

  return Response.json(record);
}

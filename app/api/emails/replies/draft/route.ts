import { getReplyThread } from "@/lib/emails";
import { draftThreadReply } from "@/lib/emails/draft";

// POST /api/emails/replies/draft  body: { threadId }
// Returns an AI-drafted reply for human review. Does NOT send anything.
export async function POST(req: Request) {
  const { threadId } = (await req.json().catch(() => ({}))) as {
    threadId?: string;
  };

  if (!threadId) {
    return Response.json({ error: "threadId is required" }, { status: 400 });
  }

  const thread = await getReplyThread(threadId);
  if (!thread) {
    return Response.json(
      { error: "Email provider not configured or thread not found" },
      { status: 404 },
    );
  }

  const draft = await draftThreadReply(thread);
  return Response.json(draft);
}

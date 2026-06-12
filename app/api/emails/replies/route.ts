import { getReplyThread, listReplyThreads } from "@/lib/emails";

// GET /api/emails/replies            → list recent threads (summaries)
// GET /api/emails/replies?threadId=X → full thread with all messages
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  if (threadId) {
    const thread = await getReplyThread(threadId);
    if (!thread) {
      return Response.json(
        { error: "Email provider not configured or thread not found" },
        { status: 404 },
      );
    }
    return Response.json(thread);
  }

  const threads = await listReplyThreads(20);
  return Response.json({ threads });
}

import { getOverview, resolveTask } from "@/lib/orchestrator";

// POST /api/orchestrator/task  body: { taskId, action: "book" | "decline", campaignId? }
//
// Human-in-the-loop override from the planner: approve or pass on a booking
// (usually one the agent escalated as needs_human) without leaving the chat.
export async function POST(req: Request) {
  const { taskId, action, campaignId } = (await req
    .json()
    .catch(() => ({}))) as {
    taskId?: string;
    action?: "book" | "decline";
    campaignId?: string;
  };

  if (!taskId || (action !== "book" && action !== "decline")) {
    return Response.json(
      { error: "taskId and action ('book' | 'decline') are required" },
      { status: 400 },
    );
  }

  const task = resolveTask(taskId, action);
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  return Response.json({ task, overview: getOverview(campaignId) });
}

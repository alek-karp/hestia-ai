import { getOverview } from "@/lib/orchestrator";

// GET /api/orchestrator             → snapshot of every autonomous booking task.
// GET /api/orchestrator?campaignId= → only that campaign's tasks (for the chat
//                                     inline tracker).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId") ?? undefined;
  return Response.json(getOverview(campaignId));
}

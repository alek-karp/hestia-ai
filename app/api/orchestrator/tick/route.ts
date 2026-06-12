import { getOverview, tick } from "@/lib/orchestrator";

// POST /api/orchestrator/tick → run one step of the autonomous loop.
//
// Advances every task that needs attention (agent decisions + mock vendor
// replies) and returns the fresh overview. The UI poller calls this on an
// interval and stops once `active` reaches 0, so the system keeps booking with
// no human input until everything is resolved. An optional { campaignId }
// scopes the step (and the returned overview) to one campaign.
export async function POST(req: Request) {
  const { campaignId } = (await req.json().catch(() => ({}))) as {
    campaignId?: string;
  };
  const result = await tick(campaignId);
  return Response.json({ ...result, overview: getOverview(campaignId) });
}

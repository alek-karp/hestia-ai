import { getOverview, seedDemoCampaign } from "@/lib/orchestrator";

// POST /api/orchestrator/seed → load a ready-made demo campaign of mock vendors.
//
// No chat flow, no real emails/calls: instantly populates the booking board so
// you can hit Autopilot and watch the agent negotiate, book, decline, and
// escalate on its own.
export async function POST() {
  const { campaignId, taskIds } = seedDemoCampaign();
  return Response.json({ campaignId, taskIds, overview: getOverview() });
}

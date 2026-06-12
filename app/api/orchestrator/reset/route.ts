import { getOverview, resetOrchestrator } from "@/lib/orchestrator";

// POST /api/orchestrator/reset → wipe all campaigns and tasks (clean slate).
export async function POST() {
  resetOrchestrator();
  return Response.json({ overview: getOverview() });
}

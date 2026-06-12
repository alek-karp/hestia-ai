import { getEventContext } from "@/lib/airbyte/context-store";

export async function POST() {
  const result = await getEventContext({
    area: "San Francisco",
    headcount: 50,
    food: "vegetarian lunch",
    date: "next month",
  });

  return Response.json({
    ok: result.background.ok,
    recordCount: result.background.records.length,
    result,
  });
}

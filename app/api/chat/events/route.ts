import { createLumaEvent, LumaApiError } from "@/lib/luma";
import type { CreateLumaEventInput } from "@/lib/luma";

export async function POST(req: Request) {
  let body: CreateLumaEventInput;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.start_at || !body.end_at) {
    return Response.json(
      { error: "Missing required fields: name, start_at, end_at" },
      { status: 400 },
    );
  }

  try {
    const event = await createLumaEvent(body);
    return Response.json({ event }, { status: 201 });
  } catch (err) {
    if (err instanceof LumaApiError) {
      return Response.json(
        { error: err.message, code: err.code },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error("[luma/events] Unexpected error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

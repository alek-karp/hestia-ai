import { getAllCallResults } from "@/lib/calls/store";

export async function GET() {
  return Response.json(getAllCallResults());
}

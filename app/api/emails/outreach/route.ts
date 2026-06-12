import { sendOutreachEmail } from "@/lib/emails";
import { composeOutreach, type OutreachContext } from "@/lib/emails/compose";

type OutreachRequest = {
  businessName?: string;
  category?: string;
  intendedTo?: string;
  event?: Partial<OutreachContext["event"]>;
};

const DEMO_EVENT = {
  title: "Birthday Dinner",
  date: "June 28 (evening)",
  area: "Austin",
  headcount: 35,
  food: "shared plates",
  budget: "$2,000",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as OutreachRequest;

  const email = composeOutreach({
    businessName: body.businessName ?? "The Grand Atrium",
    category: body.category ?? "Venue",
    intendedTo: body.intendedTo,
    event: { ...DEMO_EVENT, ...body.event },
    fromName: process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events",
  });

  const record = await sendOutreachEmail(email);

  if (!record) {
    return Response.json(
      { error: "Email provider not configured" },
      { status: 503 },
    );
  }

  return Response.json(record);
}

import { initiateCall } from "@/lib/calls";

const VENUE_PHONE = "4255606921";

export async function POST() {
  const record = await initiateCall({
    phone: VENUE_PHONE,
    businessName: "Venue",
    variables: {
      agentName: process.env.VAPI_AGENT_NAME ?? "Hestia",
      yourCompany: process.env.VAPI_COMPANY_NAME ?? "Hestia Events",
      eventType: "birthday dinner",
      preferredDates: "June 28 or June 29 (evening)",
      guestCount: "35",
      budget: "$2,000",
      city: "Austin",
      callbackNumber: process.env.VAPI_CALLBACK_NUMBER ?? "",
    },
  });

  if (!record) {
    return Response.json({ error: "Call provider not configured" }, { status: 503 });
  }

  return Response.json(record);
}

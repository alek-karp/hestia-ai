// VAPI sends POST events here. Configure the URL in your VAPI dashboard or
// phone number settings: https://dashboard.vapi.ai — set it to:
// https://hestia-ai-two.vercel.app/api/calls/webhook

import { upsertCallResult } from "@/lib/calls/store";
import { ingestCallReport } from "@/lib/orchestrator";

type VapiEvent = {
  type: string;
  call?: {
    id: string;
    phoneNumberId: string;
    assistantOverrides?: { variableValues?: Record<string, string> };
    analysis?: {
      structuredData?: { booked?: boolean };
      summary?: string;
    };
  };
};

export async function POST(req: Request) {
  const payload = (await req.json()) as VapiEvent;

  if (payload.type === "end-of-call-report") {
    const callId = payload.call?.id ?? "unknown";
    const businessName =
      payload.call?.assistantOverrides?.variableValues?.businessName ??
      "Unknown vendor";
    const booked = payload.call?.analysis?.structuredData?.booked;
    const summary = payload.call?.analysis?.summary ?? "";

    const bookingStatus =
      booked === true ? "confirmed" : booked === false ? "declined" : "unknown";

    upsertCallResult({
      callId,
      businessName,
      bookingStatus,
      summary,
      updatedAt: Date.now(),
    });

    console.log("[call-webhook] call completed", {
      callId,
      businessName,
      bookingStatus,
    });

    // Feed the call outcome into the autonomous orchestrator so the agent can
    // act on what was agreed (book, decline, or escalate) without a human.
    if (payload.call?.id) {
      await ingestCallReport({
        callId: payload.call.id,
        summary,
      }).catch((err) =>
        console.error("[call-webhook] orchestrator ingest failed", err),
      );
    }
  }

  return new Response("ok");
}

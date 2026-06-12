// VAPI sends POST events here. Configure the URL in your VAPI dashboard or
// phone number settings: https://dashboard.vapi.ai
//
// Key event types:
//   call-started       — call connected
//   end-of-call-report — call ended, includes transcript + summary
//   status-update      — mid-call status changes

type VapiEvent = {
  type: string;
  call?: { id: string; phoneNumberId: string };
  artifact?: {
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
  };
};

export async function POST(req: Request) {
  const payload = (await req.json()) as VapiEvent;

  if (payload.type === "end-of-call-report") {
    console.log("[call-webhook] call completed", {
      callId: payload.call?.id,
      summary: payload.artifact?.summary,
      transcriptPreview: payload.artifact?.transcript?.slice(0, 300),
    });

    // TODO: persist call result — write to DB, emit to PostHog, etc.
  }

  return new Response("ok");
}

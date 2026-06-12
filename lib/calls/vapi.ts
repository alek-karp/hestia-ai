import type { CallProvider, CallRecord, OutboundCall } from "./types";

const VAPI_API_URL = "https://api.vapi.ai";

export function createVapiProvider(): CallProvider | null {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey || !phoneNumberId || !assistantId) return null;

  return {
    async initiate(call: OutboundCall): Promise<CallRecord> {
      const res = await fetch(`${VAPI_API_URL}/call/phone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantId,
          phoneNumberId,
          customer: { number: call.phone },
          assistantOverrides: {
            variableValues: call.variables,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`VAPI error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as { id: string };
      return {
        callId: data.id,
        phone: call.phone,
        businessName: call.businessName,
        status: "queued",
      };
    },
  };
}

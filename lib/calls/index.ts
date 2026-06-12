import { createVapiProvider } from "./vapi";
import type { CallProvider, CallRecord, OutboundCall } from "./types";

export type { OutboundCall, CallRecord } from "./types";

// Lazily initialised so env vars are read at call time, not module load time.
let _provider: CallProvider | null | undefined;

function provider(): CallProvider | null {
  if (_provider === undefined) _provider = createVapiProvider();
  return _provider;
}

/**
 * Initiates an outbound AI phone call. Returns null when no call provider is
 * configured (VAPI_API_KEY / VAPI_PHONE_NUMBER_ID missing), so callers can
 * treat calls as optional without branching everywhere.
 */
export async function initiateCall(call: OutboundCall): Promise<CallRecord | null> {
  const p = provider();
  if (!p) return null;
  return p.initiate(call);
}

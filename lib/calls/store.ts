export type BookingStatus = "pending" | "confirmed" | "declined" | "unknown";

export interface CallResult {
  callId: string;
  businessName: string;
  bookingStatus: BookingStatus;
  summary?: string;
  updatedAt: number;
}

// In-memory store — intentionally simple for hackathon demo purposes
const store = new Map<string, CallResult>();

export function upsertCallResult(result: CallResult) {
  store.set(result.callId, result);
}

export function getCallResult(callId: string): CallResult | undefined {
  return store.get(callId);
}

export function getAllCallResults(): CallResult[] {
  return Array.from(store.values());
}

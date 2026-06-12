export type OutboundCall = {
  phone: string;
  businessName: string;
  variables: Record<string, string>;
};

export type CallRecord = {
  callId: string;
  phone: string;
  businessName: string;
  status: "queued" | "disabled";
};

export type CallProvider = {
  initiate(call: OutboundCall): Promise<CallRecord>;
};

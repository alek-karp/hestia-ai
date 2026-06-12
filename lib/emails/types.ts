export type OutreachEmail = {
  /** Vendor / business we are pretending to reach out to. */
  businessName: string;
  /**
   * The vendor's real email address. Recorded for reference only — outreach is
   * always routed to the redirect inbox, so real vendors are never contacted.
   */
  intendedTo?: string;
  subject: string;
  text: string;
  html?: string;
  /** AgentMail labels for filtering / campaign tracking. */
  labels?: string[];
};

export type EmailRecord = {
  messageId: string;
  threadId: string;
  inboxId: string;
  businessName: string;
  /** Address the email was actually delivered to (the redirect / test inbox). */
  deliveredTo: string;
  /** The vendor address the email was nominally addressed to. */
  intendedTo?: string;
  subject: string;
  status: "sent" | "disabled";
};

/** A single email within a conversation thread. */
export type ThreadMessage = {
  messageId: string;
  from: string;
  to: string[];
  timestamp: string;
  /** True when this message was sent by us (outbound), false when received. */
  outbound: boolean;
  /** New reply content with quoted history stripped (falls back to full text). */
  text: string;
  labels: string[];
};

/** Compact thread info for list views. */
export type ThreadSummary = {
  threadId: string;
  subject: string;
  preview: string;
  senders: string[];
  messageCount: number;
  updatedAt: string;
  /** True when the most recent message was received (awaiting our reply). */
  awaitingReply: boolean;
};

/** A full conversation thread with all its messages. */
export type ThreadDetail = ThreadSummary & {
  messages: ThreadMessage[];
};

export type ReplyInput = {
  threadId: string;
  text: string;
  html?: string;
};

export type EmailProvider = {
  send(email: OutreachEmail): Promise<EmailRecord>;
  listThreads(limit?: number): Promise<ThreadSummary[]>;
  getThread(threadId: string): Promise<ThreadDetail>;
  reply(input: ReplyInput): Promise<EmailRecord>;
};

import type { OutreachEmail } from "./types";

export type OutreachContext = {
  /** Vendor / business name. */
  businessName: string;
  /** What we want from them, e.g. "Venue", "Catering", "Photography". */
  category: string;
  /** The vendor's real email (recorded only — never actually contacted). */
  intendedTo?: string;
  event: {
    title: string;
    date: string;
    area: string;
    headcount: number;
    food?: string;
    budget?: string;
  };
  /** Who the email is signed from. */
  fromName: string;
  /** Where the vendor should reply (the redirect inbox handles delivery). */
  replyTo?: string;
};

/**
 * Builds a polished vendor-outreach email (subject + plain text + HTML) from an
 * event brief. Used by both the manual outreach endpoint and the chat tool so
 * copy stays consistent.
 */
export function composeOutreach(ctx: OutreachContext): OutreachEmail {
  const { businessName, category, event, fromName } = ctx;
  const lcCategory = category.toLowerCase();

  const subject = `${category} inquiry — ${event.title} (${event.date})`;

  const detailLines = [
    `Event: ${event.title}`,
    `Date: ${event.date}`,
    `Location: ${event.area}`,
    `Headcount: ${event.headcount} guests`,
    event.food ? `Catering preference: ${event.food}` : null,
    event.budget ? `Budget: ${event.budget}` : null,
  ].filter(Boolean) as string[];

  const text = [
    `Hi ${businessName} team,`,
    "",
    `I'm organising an event and would love to explore ${lcCategory} options with you. Here are the details:`,
    "",
    ...detailLines.map((l) => `  • ${l}`),
    "",
    `Could you share your availability, pricing, and what packages you offer for an event of this size? Happy to hop on a quick call if that's easier.`,
    "",
    "Looking forward to hearing from you.",
    "",
    "Warm regards,",
    fromName,
  ].join("\n");

  const detailsHtml = detailLines
    .map((l) => `<li style="margin:2px 0">${l}</li>`)
    .join("");

  const html = [
    `<p>Hi ${businessName} team,</p>`,
    `<p>I'm organising an event and would love to explore <strong>${lcCategory}</strong> options with you. Here are the details:</p>`,
    `<ul style="padding-left:18px">${detailsHtml}</ul>`,
    `<p>Could you share your availability, pricing, and what packages you offer for an event of this size? Happy to hop on a quick call if that's easier.</p>`,
    `<p>Looking forward to hearing from you.</p>`,
    `<p>Warm regards,<br/>${fromName}</p>`,
  ].join("");

  return {
    businessName,
    intendedTo: ctx.intendedTo,
    subject,
    text,
    html,
    labels: ["outreach", lcCategory.replace(/\s+/g, "-")],
  };
}

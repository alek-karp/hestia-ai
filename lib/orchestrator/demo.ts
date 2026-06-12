// Demo fixtures for showcasing the autonomous orchestrator without any real
// emails or calls. `seedDemoCampaign` (lib/orchestrator) turns these into mock
// booking tasks whose `mockPersona` forces a varied, repeatable outcome spread
// — several booked, one declined, one escalated to a human — so a single click
// demonstrates every path the agent can take.

import type { CampaignTargetInput } from "./index";
import type { EventBrief } from "./types";

export const DEMO_EVENT: EventBrief = {
  title: "Summer Rooftop Launch",
  date: "August 14 (evening)",
  area: "Austin",
  headcount: 80,
  food: "shared plates & cocktails",
  budget: "$12,000",
};

/**
 * One target per vendor. The `mockPersona` is the demo's script:
 *   cooperative / pricey → booked, busy → declined, haggler → needs_human.
 * Mixed email/call channels show both outreach modes on the board.
 */
export const DEMO_TARGETS: CampaignTargetInput[] = [
  {
    vendorName: "The Grand Atrium",
    category: "Venue",
    channel: "email",
    contact: { email: "events@grandatrium.example" },
    mockPersona: "cooperative",
    openingMessage:
      "Hi Grand Atrium team — I'm planning a rooftop launch for ~80 guests on August 14 and would love to check your availability and pricing.",
  },
  {
    vendorName: "Skyline Terrace",
    category: "Venue",
    channel: "call",
    contact: { phone: "+15125550142" },
    mockPersona: "pricey",
    openingMessage:
      "Outbound call placed to Skyline Terrace about an 80-guest rooftop launch on August 14.",
  },
  {
    vendorName: "Verde Catering",
    category: "Catering",
    channel: "email",
    contact: { email: "hello@verdecatering.example" },
    mockPersona: "cooperative",
    openingMessage:
      "Hi Verde Catering — looking for shared plates & cocktails for 80 guests on August 14. Could you share packages and pricing?",
  },
  {
    vendorName: "Pulse AV & Tech",
    category: "AV & Tech",
    channel: "email",
    contact: { email: "bookings@pulseav.example" },
    mockPersona: "cooperative",
    openingMessage:
      "Hi Pulse AV — we need sound and lighting for a rooftop launch (80 guests, August 14). What would you recommend and at what cost?",
  },
  {
    vendorName: "Lens & Light Studio",
    category: "Photography",
    channel: "email",
    contact: { email: "studio@lensandlight.example" },
    mockPersona: "haggler",
    openingMessage:
      "Hi Lens & Light — interested in event photography for August 14 (80 guests). Could you share availability and a quote?",
  },
  {
    vendorName: "Bloom Florals",
    category: "Florals",
    channel: "call",
    contact: { phone: "+15125550199" },
    mockPersona: "busy",
    openingMessage:
      "Outbound call placed to Bloom Florals about florals for an August 14 rooftop launch.",
  },
];

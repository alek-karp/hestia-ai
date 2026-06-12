import { openai } from "@ai-sdk/openai";
import type { UIMessage } from "ai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  hasToolCall,
  streamText,
} from "ai";
import { z } from "zod";
import { runCateringAgent } from "@/lib/agents/catering-agent";
import { runLumaAgent } from "@/lib/agents/luma-agent";
import { runVendorsAgent } from "@/lib/agents/vendors-agent";
import {
  AIRBYTE_CONTEXT_STORE_PROMPT,
  contextStoreSearch,
  getEventContext,
} from "@/lib/airbyte/context-store";
import { initiateCall } from "@/lib/calls";
import { sendOutreachEmail } from "@/lib/emails";
import { composeOutreach } from "@/lib/emails/compose";

export async function POST(req: Request) {
  const { messages, modelId } = (await req.json()) as {
    messages: UIMessage[];
    modelId: string;
  };

  const result = streamText({
    model: openai(modelId ?? "gpt-4o"),
    system: `You are Hestia, an AI assistant specialising in planning physical events.

Your job is to collect five details before creating a plan:
1. Number of attendees
2. Location / area
3. Food & catering preferences
4. Date (and time if relevant)
5. Whether to create an online event page on Luma (yes/no)

${AIRBYTE_CONTEXT_STORE_PROMPT}

Rules:
- Accept details the moment the user states them clearly — never repeat them back or ask "just to confirm".
- If the user gives multiple details at once, capture all of them.
- Only ask for what is still missing, one question at a time.
- Keep every response to 1–2 short sentences.
- Once all five are known, immediately call create_event_plan — no summary, no sign-off.
- After create_event_plan returns, call add_workflow_insights exactly once with 2–3 short, useful insights about the plan (a tip, a risk, or a recommended next step), then stop.
- Subtle Greek mythology tone; never mention Hestia by name.`,
    messages: await convertToModelMessages(messages),
    stopWhen: hasToolCall("add_workflow_insights"),
    tools: {
      create_event_plan: {
        description:
          "Create a structured event plan once all details are confirmed. Searches Airbyte Context Store for shared event context, then dispatches Luma, catering, and vendor subagents in parallel.",
        inputSchema: z.object({
          title: z.string().describe("Short event title"),
          description: z.string().describe("One-sentence event summary"),
          headcount: z.number().describe("Number of attendees"),
          area: z.string().describe("Location / area of the event"),
          date: z.string().describe("Date and time of the event"),
          food: z.string().describe("Food and catering plan"),
          lumaPage: z.boolean().describe("Whether to create a Luma event page"),
          steps: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
              }),
            )
            .describe("Ordered list of planning steps"),
        }),
        execute: async (input) => {
          const airbyteContext = await getEventContext({
            area: input.area,
            headcount: input.headcount,
            food: input.food,
            date: input.date,
          });

          const [lumaEvent, catering, vendors] = await Promise.all([
            input.lumaPage
              ? runLumaAgent({
                  title: input.title,
                  description: input.description,
                  date: input.date,
                  area: input.area,
                  headcount: input.headcount,
                }).catch(() => null)
              : Promise.resolve(null),
            runCateringAgent({
              headcount: input.headcount,
              food: input.food,
              area: input.area,
              date: input.date,
              contextRecords: airbyteContext.background.records,
            }).catch(() => []),
            runVendorsAgent({
              area: input.area,
              headcount: input.headcount,
              date: input.date,
              contextRecords: airbyteContext.background.records,
            }).catch(() => ({ vendors: [] })),
          ]);

          const sharedVars = {
            agentName: process.env.VAPI_AGENT_NAME ?? "Hestia",
            yourCompany: process.env.VAPI_COMPANY_NAME ?? "Hestia Events",
            eventType: input.title,
            preferredDates: input.date,
            guestCount: String(input.headcount),
            budget: "",
            city: input.area,
            callbackNumber: process.env.VAPI_CALLBACK_NUMBER ?? "",
          };

          const callTargets = [
            ...catering
              .filter((c) => c.phone)
              .map((c) => ({
                phone: c.phone as string,
                businessName: c.provider,
                variables: {
                  ...sharedVars,
                  eventType: `${input.food} catering for ${input.title}`,
                },
              })),
            ...vendors.vendors
              .filter((v) => v.phone)
              .map((v) => ({
                phone: v.phone as string,
                businessName: v.name,
                variables: {
                  ...sharedVars,
                  eventType: `${v.category} for ${input.title}`,
                },
              })),
          ];

          const callResults = await Promise.allSettled(
            callTargets.map((t) => initiateCall(t)),
          );

          const calls = callResults
            .filter(
              (
                r,
              ): r is PromiseFulfilledResult<
                Awaited<ReturnType<typeof initiateCall>>
              > => r.status === "fulfilled" && r.value !== null,
            )
            .map((r) => r.value);

          // Email outreach to caterers and vendors that expose an email.
          // Every message is routed to the demo redirect inbox, so the copy is
          // addressed to the vendor but never reaches a real business.
          const fromName = process.env.AGENTMAIL_FROM_NAME ?? "Hestia Events";
          const eventBrief = {
            title: input.title,
            date: input.date,
            area: input.area,
            headcount: input.headcount,
            food: input.food,
          };

          const emailTargets = [
            ...catering
              .filter((c) => c.email)
              .map((c) =>
                composeOutreach({
                  businessName: c.provider,
                  category: "Catering",
                  intendedTo: c.email,
                  event: eventBrief,
                  fromName,
                }),
              ),
            ...vendors.vendors
              .filter((v) => v.email)
              .map((v) =>
                composeOutreach({
                  businessName: v.name,
                  category: v.category,
                  intendedTo: v.email,
                  event: eventBrief,
                  fromName,
                }),
              ),
          ];

          const emailResults = await Promise.allSettled(
            emailTargets.map((e) => sendOutreachEmail(e)),
          );

          const emails = emailResults
            .filter(
              (
                r,
              ): r is PromiseFulfilledResult<
                Awaited<ReturnType<typeof sendOutreachEmail>>
              > => r.status === "fulfilled" && r.value !== null,
            )
            .map((r) => r.value);

          return {
            ...input,
            airbyteContext,
            lumaEvent,
            catering,
            vendors,
            calls,
            emails,
          };
        },
      },
      context_store_search: {
        description:
          "Search Airbyte Context Store for indexed records from connected business sources. Use for read-only search, filtering, sorting, and aggregation before falling back to direct APIs.",
        inputSchema: z.object({
          connector: z
            .string()
            .optional()
            .describe("Optional Airbyte connector/source identifier"),
          entity: z
            .string()
            .describe(
              "Entity to search, such as contacts, deals, products, vendors, or caterers",
            ),
          query: z
            .string()
            .optional()
            .describe(
              "Human-readable search intent for traceability. Airbyte requires structured filters, so this is not sent as the Context Store query object.",
            ),
          filters: z
            .record(z.unknown())
            .optional()
            .describe("Structured filters supported by the connector entity"),
          fields: z
            .array(z.string())
            .optional()
            .describe("Fields to include in the returned records"),
          sort: z
            .array(z.record(z.unknown()))
            .optional()
            .describe("Sort clauses supported by the connector entity"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Maximum records to return"),
          cursor: z.string().optional().describe("Pagination cursor"),
        }),
        execute: async (input) => contextStoreSearch(input),
      },
      add_workflow_insights: {
        description:
          "Surface 1–3 short insights that annotate the event-planning workflow shown in the sidebar — a tip, a risk, or a recommended next step. Call once after create_event_plan returns.",
        inputSchema: z.object({
          insights: z
            .array(
              z.object({
                title: z.string().describe("Short headline, 2–4 words"),
                body: z.string().describe("One concise, useful sentence"),
                tone: z
                  .enum(["info", "success", "warning"])
                  .describe(
                    "info for tips, success for confirmations, warning for risks",
                  ),
              }),
            )
            .min(1)
            .max(3)
            .describe("The insights to display alongside the workflow"),
        }),
        execute: async (input) => input,
      },
    },
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
}

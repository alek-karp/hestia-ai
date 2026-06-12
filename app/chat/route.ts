import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStreamResponse, hasToolCall, streamText } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { runLumaAgent } from "@/lib/agents/luma-agent";
import { runCateringAgent } from "@/lib/agents/catering-agent";
import { runVendorsAgent } from "@/lib/agents/vendors-agent";
import { initiateCall } from "@/lib/calls";

export async function POST(req: Request) {
  const { messages, modelId } = await req.json() as { messages: UIMessage[]; modelId: string };

  const result = streamText({
    model: openai(modelId ?? "gpt-4o"),
    system: `You are Hestia, an AI assistant specialising in planning physical events.

Your first job is to gather five details from the user — ask for them conversationally,
one or two at a time, and confirm each before moving on:
1. Number of attendees
2. Location / area
3. Food & catering preferences
4. Date (and time if relevant)
5. Whether to create an online event page on Luma (yes/no)

Once you have confirmed ALL five details, call the create_event_plan tool to produce the plan.
Do not call the tool until every detail is confirmed.
Be concise, warm, and keep the Greek mythology theme subtly in your tone.`,
    messages: await convertToModelMessages(messages),
    stopWhen: hasToolCall("create_event_plan"),
    tools: {
      create_event_plan: {
        description: "Create a structured event plan once all details are confirmed. Dispatches Luma, catering, and vendor subagents in parallel.",
        inputSchema: z.object({
          title: z.string().describe("Short event title"),
          description: z.string().describe("One-sentence event summary"),
          headcount: z.number().describe("Number of attendees"),
          area: z.string().describe("Location / area of the event"),
          date: z.string().describe("Date and time of the event"),
          food: z.string().describe("Food and catering plan"),
          lumaPage: z.boolean().describe("Whether to create a Luma event page"),
          steps: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
            })
          ).describe("Ordered list of planning steps"),
        }),
        execute: async (input) => {
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
            }).catch(() => []),
            runVendorsAgent({
              area: input.area,
              headcount: input.headcount,
              date: input.date,
            }).catch(() => ({ vendors: [] })),
          ]);

          const eventContext = `Event: "${input.title}", date: ${input.date}, location: ${input.area}, headcount: ${input.headcount}, food: ${input.food}.`;

          const callTargets = [
            ...catering
              .filter((c) => c.phone)
              .map((c) => ({
                phone: c.phone as string,
                businessName: c.provider,
                firstMessage: `Hi, I'm an AI assistant calling on behalf of someone planning an event. I'd love to ask about your catering services.`,
                systemPrompt: `You are a friendly, concise assistant calling ${c.provider} to inquire about catering availability. ${eventContext} Ask about: availability on that date, pricing per head, and menu options for "${input.food}". Once you have the key details, thank them and let them know someone will follow up by email.`,
              })),
            ...vendors.vendors
              .filter((v) => v.phone)
              .map((v) => ({
                phone: v.phone as string,
                businessName: v.name,
                firstMessage: `Hi, I'm an AI assistant calling on behalf of someone planning an event. I'd love to ask about your ${v.category.toLowerCase()} services.`,
                systemPrompt: `You are a friendly, concise assistant calling ${v.name} about ${v.category} services. ${eventContext} Ask about: availability on that date and pricing. Once you have the key details, thank them and let them know someone will follow up by email.`,
              })),
          ];

          const callResults = await Promise.allSettled(
            callTargets.map((t) => initiateCall(t))
          );

          const calls = callResults
            .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof initiateCall>>> => r.status === "fulfilled" && r.value !== null)
            .map((r) => r.value);

          return { ...input, lumaEvent, catering, vendors, calls };
        },
      },
    },
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
}

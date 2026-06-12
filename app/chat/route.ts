import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";

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
    stopWhen: stepCountIs(2),
    tools: {
      create_event_plan: {
        description: "Create a structured event plan once all details are confirmed.",
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
          if (!input.lumaPage) return { ...input, lumaEvent: null };

          return {
            ...input,
            lumaEvent: {
              url: "https://lu.ma/hestia-event-stub",
              title: input.title,
              description: input.description,
              date: input.date,
              area: input.area,
              headcount: input.headcount,
            },
          };
        },
      },
    },
  });

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() });
}

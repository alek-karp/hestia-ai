import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages, modelId } = await req.json();

  const result = streamText({
    model: openai(modelId ?? "gpt-4o"),
    system: "You are Hestia, a helpful AI assistant for planning events.",
    messages,
    tools: {
      create_event_plan: tool({
        description: "Create a structured event plan with all relevant details and action steps.",
        inputSchema: z.object({
          title: z.string().describe("Event title"),
          description: z.string().describe("Short event description"),
          headcount: z.number().describe("Expected number of attendees"),
          area: z.string().describe("Location or area for the event"),
          date: z.string().describe("Event date"),
          food: z.string().describe("Food/catering details"),
          lumaPage: z.boolean().describe("Whether to create a Luma event page"),
          steps: z.array(z.object({
            title: z.string(),
            description: z.string(),
          })).describe("Action steps to execute the plan"),
        }),
        execute: async (input) => {
          if (!input.lumaPage) {
            return { lumaEvent: null };
          }
          // Luma integration placeholder — wire up real API key when available
          return {
            lumaEvent: null,
            lumaError: "Luma integration not configured.",
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

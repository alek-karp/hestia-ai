import Exa from "exa-js";

export type CateringAgentInput = {
  headcount: number;
  food: string;
  area: string;
  date: string;
  contextRecords?: Record<string, unknown>[];
};

export type CateringAgentOutput = {
  provider: string;
  menu: string[];
  notes: string;
  estimatedCostPerHead: number;
  url?: string;
  phone?: string;
  email?: string;
  source?: "exa";
};

function contextText(records: Record<string, unknown>[] | undefined) {
  return records?.length
    ? ` Event background context: ${records
        .map((record) => JSON.stringify(record))
        .join(" ")
        .slice(0, 1200)}`
    : "";
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?[\d\s\-().]{7,18}\d)/);
  return match?.[0]?.trim();
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match?.[0];
}

export async function runCateringAgent(
  input: CateringAgentInput,
): Promise<CateringAgentOutput[]> {
  const exa = new Exa(process.env.EXA_API_KEY);

  const query = `catering company ${input.food} food ${input.area} events ${input.headcount} guests${contextText(input.contextRecords)}`;

  const result = await exa.searchAndContents(query, {
    type: "neural",
    numResults: 4,
    summary: {
      query:
        "In 1-2 sentences max: what catering services do they offer and what is their approximate cost per person? Include phone or email if available.",
    },
    text: { maxCharacters: 1000 },
  });

  return result.results.map((r) => {
    const fullText = `${r.summary ?? ""} ${r.text ?? ""}`;
    return {
      provider: r.title ?? r.url,
      menu: [],
      notes: r.summary ?? r.text?.slice(0, 300) ?? "",
      estimatedCostPerHead: 0,
      url: r.url,
      phone: extractPhone(fullText),
      email: extractEmail(fullText),
      source: "exa",
    };
  });
}

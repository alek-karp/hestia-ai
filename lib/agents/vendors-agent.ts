import Exa from "exa-js";

export type VendorsAgentInput = {
  area: string;
  headcount: number;
  date: string;
};

export type Vendor = {
  category: string;
  name: string;
  notes: string;
  url?: string;
  phone?: string;
  email?: string;
};

export type VendorsAgentOutput = {
  vendors: Vendor[];
};

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+?[\d\s\-().]{7,18}\d)/);
  return match?.[0]?.trim();
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match?.[0];
}

export async function runVendorsAgent(input: VendorsAgentInput): Promise<VendorsAgentOutput> {
  const exa = new Exa(process.env.EXA_API_KEY);

  const result = await exa.searchAndContents(
    `event venue cafe restaurant bar hall ${input.area} hire private events ${input.headcount} guests`,
    {
      type: "neural",
      numResults: 4,
      summary: {
        query: "What kind of venue is this, what is their capacity, what do they charge for private hire, phone number, email address?",
      },
      text: { maxCharacters: 1000 },
    }
  );

  const vendors: Vendor[] = result.results.map((r) => {
    const fullText = `${r.summary ?? ""} ${r.text ?? ""}`;
    return {
      category: "Venue",
      name: r.title ?? r.url,
      notes: r.summary ?? r.text?.slice(0, 200) ?? "",
      url: r.url,
      phone: extractPhone(fullText),
      email: extractEmail(fullText),
    };
  });

  return { vendors };
}

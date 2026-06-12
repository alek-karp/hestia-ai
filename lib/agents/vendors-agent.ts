export type VendorsAgentInput = {
  area: string;
  headcount: number;
  date: string;
};

export type Vendor = {
  category: string;
  name: string;
  notes: string;
};

export type VendorsAgentOutput = {
  vendors: Vendor[];
};

export async function runVendorsAgent(input: VendorsAgentInput): Promise<VendorsAgentOutput> {
  await new Promise((r) => setTimeout(r, 1800));
  return {
    vendors: [
      {
        category: "Venue",
        name: "The Atheneum Hall",
        notes: `Capacity 200+, central ${input.area}`,
      },
      {
        category: "AV & Tech",
        name: "Spark Events AV",
        notes: "Full PA, lighting, and streaming packages",
      },
      {
        category: "Photography",
        name: "Aegis Studios",
        notes: "Candid & portrait packages from £800",
      },
      {
        category: "Florals",
        name: "Bloom & Bough",
        notes: "Seasonal arrangements, delivery included",
      },
    ],
  };
}

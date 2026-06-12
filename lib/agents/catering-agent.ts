export type CateringAgentInput = {
  headcount: number;
  food: string;
  area: string;
  date: string;
};

export type CateringAgentOutput = {
  provider: string;
  menu: string[];
  notes: string;
  estimatedCostPerHead: number;
};

export async function runCateringAgent(_input: CateringAgentInput): Promise<CateringAgentOutput> {
  await new Promise((r) => setTimeout(r, 2400));
  return {
    provider: "Olive & Thyme Catering Co.",
    menu: [
      "Mediterranean mezze platters",
      "Grilled chicken skewers with tzatziki",
      "Roasted vegetable tart",
      "Baklava and seasonal fruit",
    ],
    notes: `Suitable for ${_input.headcount} guests. Dietary alternatives available on request.`,
    estimatedCostPerHead: 45,
  };
}

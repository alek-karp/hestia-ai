export type LumaAgentInput = {
  title: string;
  description: string;
  date: string;
  area: string;
  headcount: number;
};

export type LumaAgentOutput = {
  url: string;
  title: string;
  description: string;
  date: string;
  area: string;
  headcount: number;
};

export async function runLumaAgent(input: LumaAgentInput): Promise<LumaAgentOutput> {
  await new Promise((r) => setTimeout(r, 1200));
  return {
    url: "https://lu.ma/hestia-event-stub",
    title: input.title,
    description: input.description,
    date: input.date,
    area: input.area,
    headcount: input.headcount,
  };
}

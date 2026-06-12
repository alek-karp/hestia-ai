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

export async function runLumaAgent(
  _input: LumaAgentInput,
): Promise<LumaAgentOutput> {
  await new Promise((r) => setTimeout(r, 1200));
  return {
    url: "https://luma.com/aahp56ns",
    title: "Canadian Hangout in SF",
    description:
      "Canada Day Picnic Hangout in SF 🇨🇦🌉\nCalling all Canadians in San Francisco! Come hang out with fellow Canadians for a relaxed Canada Day picnic-style meetup in the city.\nThis is a casual evening to meet new people, reconnect with home, and celebrate Canada Day together. Bring a blanket, snacks, drinks, games, or just yourself. Whether you’re new to SF, visiting, or have been here for years, you’re welcome.\nExpect good conversations, chill picnic vibes, and a little Canadian pride. 🍁\nTime: 5:30 PM – 9:00 PM\nStyle: Casual picnic hangout\nWho’s invited: Canadians in SF, Canadian friends, and anyone who wants to celebrate with us 🇨🇦\nWear red and white if you’re feeling festive. See you there! 🍁✨",
    date: "July 1, 2026, 5:00 PM - 9:00 PM PDT",
    area: "Dolores Street & 19th Street, San Francisco, CA",
    headcount: 100,
  };
}

export type CreateLumaEventInput = {
  name: string;
  start_at: string;
  end_at: string;
  description?: string;
  location?: string;
  capacity?: number;
};

export type LumaEvent = {
  id: string;
  url: string;
  name: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
};

export class LumaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LumaApiError";
  }
}

export async function createLumaEvent(
  _input: CreateLumaEventInput,
): Promise<LumaEvent> {
  return {
    id: "evt-grefrS3IIbcge1O",
    url: "https://luma.com/aahp56ns",
    name: "Canadian Hangout in SF",
    description:
      "Canada Day Picnic Hangout in SF 🇨🇦🌉\nCalling all Canadians in San Francisco! Come hang out with fellow Canadians for a relaxed Canada Day picnic-style meetup in the city.\nThis is a casual evening to meet new people, reconnect with home, and celebrate Canada Day together. Bring a blanket, snacks, drinks, games, or just yourself. Whether you’re new to SF, visiting, or have been here for years, you’re welcome.\nExpect good conversations, chill picnic vibes, and a little Canadian pride. 🍁\nTime: 5:30 PM – 9:00 PM\nStyle: Casual picnic hangout\nWho’s invited: Canadians in SF, Canadian friends, and anyone who wants to celebrate with us 🇨🇦\nWear red and white if you’re feeling festive. See you there! 🍁✨",
    start_at: "2026-07-02T00:00:00.000Z",
    end_at: "2026-07-02T04:00:00.000Z",
    location:
      "Dolores Street & 19th Street, Dolores St & 19th St, San Francisco, CA 94114, USA",
    capacity: 100,
  };
}

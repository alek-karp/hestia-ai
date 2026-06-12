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

export async function createLumaEvent(input: CreateLumaEventInput): Promise<LumaEvent> {
  return {
    id: "evt-hestia-stub",
    url: "https://lu.ma/hestia-event-stub",
    name: input.name,
    description: input.description ?? "",
    start_at: input.start_at,
    end_at: input.end_at,
    location: input.location ?? "",
    capacity: input.capacity ?? 0,
  };
}

type ContextRecord = Record<string, unknown>;

const AIRBYTE_API_BASE_URL = "https://api.airbyte.ai/api/v1";
const NOTION_ENTITY = "pages";

let cachedToken: { token: string; expiresAt: number } | undefined;

export const AIRBYTE_CONTEXT_STORE_PROMPT = `Airbyte Context Store guidance:
- Use context_store_search first for searchable read-only data from connected sources.
- Use direct APIs only for writes, real-time freshness, or entities/fields not indexed in Context Store.
- Do not claim Context Store data was used unless the tool returned records.`;

async function getApplicationToken() {
  if (process.env.AIRBYTE_API_KEY) {
    return process.env.AIRBYTE_API_KEY;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.AIRBYTE_CLIENT_ID;
  const clientSecret = process.env.AIRBYTE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return;
  }

  const res = await fetch(
    `${AIRBYTE_API_BASE_URL}/account/applications/token`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Airbyte token request failed ${res.status}: ${await res.text()}`,
    );
  }

  const body = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 900) * 1000,
  };

  return cachedToken.token;
}

function recordsFrom(payload: unknown): ContextRecord[] {
  const body = payload as {
    result?: unknown;
    records?: unknown;
    results?: unknown;
    data?: unknown;
    items?: unknown;
  };
  const records =
    body.result ??
    body.records ??
    body.results ??
    body.data ??
    body.items ??
    payload;
  if (records && typeof records === "object" && !Array.isArray(records)) {
    const nested = records as { data?: unknown; records?: unknown };
    if (Array.isArray(nested.data)) return nested.data as ContextRecord[];
    if (Array.isArray(nested.records)) return nested.records as ContextRecord[];
  }
  return Array.isArray(records) ? (records as ContextRecord[]) : [];
}

export async function contextStoreSearch(input: {
  connector?: string;
  entity: string;
  query?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  sort?: unknown[];
  limit?: number;
  cursor?: string;
}) {
  const connectorId = input.connector ?? process.env.AIRBYTE_CONNECTOR_ID;

  if (!connectorId) {
    return {
      ok: false,
      records: [],
      error: "AIRBYTE_CONNECTOR_ID is not set",
    };
  }

  try {
    const token = await getApplicationToken();

    if (!token) {
      return {
        ok: false,
        records: [],
        error: "Set AIRBYTE_API_KEY or AIRBYTE_CLIENT_ID/AIRBYTE_CLIENT_SECRET",
      };
    }

    const res = await fetch(
      `${AIRBYTE_API_BASE_URL}/integrations/connectors/${connectorId}/execute`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entity: input.entity,
          action: "context_store_search",
          params: {
            query: {
              filter: input.filters ?? { eq: { archived: false } },
            },
            fields: input.fields,
            sort: input.sort,
            limit: input.limit ?? 8,
            cursor: input.cursor,
          },
        }),
      },
    );

    if (!res.ok) {
      return {
        ok: false,
        records: [],
        error: `Airbyte Context Store returned ${res.status}: ${await res.text()}`,
      };
    }

    const payload = await res.json();
    return { ok: true, records: recordsFrom(payload), raw: payload };
  } catch (error) {
    return {
      ok: false,
      records: [],
      error: error instanceof Error ? error.message : "Airbyte request failed",
    };
  }
}

export async function getEventContext(input: {
  area: string;
  headcount: number;
  food: string;
  date: string;
}) {
  const background = await contextStoreSearch({
    entity: NOTION_ENTITY,
    query: `event background ${input.area} ${input.food} ${input.headcount} guests ${input.date}`,
    filters: { eq: { archived: false } },
    limit: 8,
  });

  return { background };
}

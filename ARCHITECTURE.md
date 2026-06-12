# Hestia Architecture

> Keep this file up to date whenever you add, remove, or significantly change a file, route, agent, component, or external integration.

## Overview

Hestia is an AI event-planning assistant. The user chats with an AI that gathers five event details, then dispatches three parallel subagents to produce a structured plan.

## Request Flow

```
Browser (app/page.tsx)
  └── useChat → POST /chat
        └── app/chat/route.ts  (streamText + create_event_plan tool)
              └── tool.execute → Promise.all([
                    lib/agents/luma-agent.ts      → Luma event page (stubbed)
                    lib/agents/catering-agent.ts  → Exa neural search for caterers
                    lib/agents/vendors-agent.ts   → Exa neural search × 4 categories
                  ])
              └── createUIMessageStreamResponse → browser
```

### Step-by-step

1. **`app/page.tsx`** — client-only chat UI. Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at `/chat`. Sends `{ messages, modelId }`. Renders tool parts as `Plan`, subagent status cards, `LumaEventCard`, `CateringCard[]`, and `VendorsCard`.

2. **`app/chat/route.ts`** — the active API route. `streamText` with `stopWhen: hasToolCall("create_event_plan")`. System prompt gathers five fields conversationally before allowing the tool to fire.

3. **`lib/agents/luma-agent.ts`** — stub. Accepts title/description/date/area/headcount, sleeps 1.2s, returns a hardcoded lu.ma URL. Replace with real Luma API calls when ready (`LUMA_API_KEY` is available).

4. **`lib/agents/catering-agent.ts`** — calls Exa `searchAndContents` (neural, 4 results). Parses phone/email from result text with regex. Returns `CateringAgentOutput[]`.

5. **`lib/agents/vendors-agent.ts`** — runs four parallel Exa searches (Venue, AV & Tech, Photography, Florals). Returns `VendorsAgentOutput { vendors: Vendor[] }`.

### Inactive / legacy routes

- **`app/api/chat/route.ts`** — old route, not used by the UI. Do not delete without confirming it's fully dead.
- **`app/api/chat/events/route.ts`** — Luma events listing stub.

## Component Layers

### `components/ai-elements/`
Purpose-built chat UI primitives using compound-component patterns with named sub-exports.

| Component | Purpose |
|-----------|---------|
| `conversation.tsx` | Scrollable message list container |
| `message.tsx` | Per-message wrapper (user / assistant) |
| `prompt-input.tsx` | Textarea + footer toolbar |
| `plan.tsx` | Collapsible event plan card |
| `agent.tsx` | Subagent status card |
| `agent-avatar.tsx` | Avatar with background colour |
| `model-selector.tsx` | Searchable model picker popover |
| `context.tsx` | Token usage display |
| `luma-event-card.tsx` | Renders Luma event output |
| `catering-card.tsx` | Renders a single caterer result |
| `vendors-card.tsx` | Renders the vendor list |

### `components/` (root)
| Component | Purpose |
|-----------|---------|
| `booking-panel.tsx` | Right sidebar: event summary + Venue/Catering/Luma Event booking cards (pending/confirmed states) |
| `booking-panel-context.tsx` | `BookingPanelProvider` + `useBookingPanel` — shared open/close state between navbar and page |
| `booking-panel-toggle.tsx` | Navbar `PanelRight` icon button that calls `togglePanel` from context |
| `call-venue-button.tsx` | VAPI call trigger button in navbar |
| `nav-tabs.tsx` | Centered navigation tabs in header |
| `verified-caterer-card.tsx` | Verified caterer display card |
| `verified-vendor-card.tsx` | Verified vendor display card |

### `components/ui/`
shadcn/ui base components (Button, Card, Spinner, etc.). Do not add business logic here.

## Data Types

```
create_event_plan tool input:
  title, description, headcount, area, date, food, lumaPage, steps[]

create_event_plan tool output:
  ...input + lumaEvent (LumaAgentOutput | null) + catering (CateringAgentOutput[]) + vendors (VendorsAgentOutput)

LumaAgentOutput:   { url, title, description, date, area, headcount }
CateringAgentOutput: { provider, menu[], notes, estimatedCostPerHead, url?, phone?, email? }
VendorsAgentOutput:  { vendors: Vendor[] }
Vendor:            { category, name, notes, url?, phone?, email? }
```

## External Services

| Service | Key | Status |
|---------|-----|--------|
| OpenAI | `OPENAI_API_KEY` | Active — all LLM calls |
| Exa | `EXA_API_KEY` | Active — catering + vendor searches |
| Luma | `LUMA_API_KEY` | Present, not yet wired up (agent is stubbed) |

## Stack

- Next.js (App Router), React 19, TypeScript
- AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) — `UIMessage` protocol, `streamText`, `createUIMessageStreamResponse`
- Tailwind CSS v4, shadcn/ui
- Biome (linter + formatter, 2-space indent, `bun lint` / `bun format`)
- Bun as package manager and task runner

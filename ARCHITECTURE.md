# Hestia Architecture

> Keep this file up to date whenever you add, remove, or significantly change a file, route, agent, component, or external integration.

## Overview

Hestia is an AI event-planning assistant. The user chats with an AI that gathers five event details, then dispatches three parallel subagents to produce a structured plan.

## Request Flow

```
Browser (app/page.tsx)
  └── useChat → POST /chat
        └── app/chat/route.ts  (streamText + create_event_plan tool)
              └── tool.execute → lib/airbyte/context-store.ts (optional shared Context Store search)
              └── tool.execute → Promise.all([
                    lib/agents/luma-agent.ts      → Luma event page (stubbed)
                    lib/agents/catering-agent.ts  → Exa search with Airbyte Notion background context
                    lib/agents/vendors-agent.ts   → Exa search with Airbyte Notion background context
                  ])
              └── initiateCall × N        (VAPI outbound phone calls)
              └── sendOutreachEmail × N   (AgentMail vendor/caterer emails)
              └── createUIMessageStreamResponse → browser

Navbar (components/airbyte-test-button.tsx)
  └── POST /api/airbyte/test
        └── lib/airbyte/context-store.ts → Context Store Notion background test search
```

### Step-by-step

1. **`app/page.tsx`** — client-only chat UI with a split layout: the conversation on the left and a reactive workflow panel on the right. Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at `/chat`. Sends `{ messages, modelId }`. Renders the tool's result cards (`LumaEventCard`, `CateringCard[]`, `VendorsCard`) inline, and feeds the latest `create_event_plan` tool state into `deriveWorkflow` to drive the `WorkflowCanvas`. The `airbyteContext` field from the tool output is forwarded into the workflow model to drive the "Fetch Event Context" step.

2. **`app/chat/route.ts`** — the active API route. `streamText` with `stopWhen: hasToolCall("add_workflow_insights")`. System prompt gathers five fields conversationally before allowing the tool to fire, exposes a `context_store_search` tool for ad hoc Airbyte searches, and calls `getEventContext` inside `create_event_plan` so the catering and vendor subagents share the same Notion-backed Airbyte Context Store background.

3. **`lib/agents/luma-agent.ts`** — stub. Accepts title/description/date/area/headcount, sleeps 1.2s, returns a hardcoded lu.ma URL. Replace with real Luma API calls when ready (`LUMA_API_KEY` is available).

4. **`lib/agents/catering-agent.ts`** — calls Exa `searchAndContents` (neural, 4 results), appending shared Notion background records from Airbyte Context Store to the search query when available. Parses phone/email from result text with regex.

5. **`lib/agents/vendors-agent.ts`** — calls Exa search for venues/vendors, appending shared Notion background records from Airbyte Context Store to the search query when available.

6. **`lib/airbyte/context-store.ts`** — Airbyte Context Store client and prompt guidance. `contextStoreSearch` obtains an application token from `AIRBYTE_CLIENT_ID` / `AIRBYTE_CLIENT_SECRET` (or reuses `AIRBYTE_API_KEY` if provided), then POSTs `action: "context_store_search"` requests to `/integrations/connectors/<AIRBYTE_CONNECTOR_ID>/execute`. It accepts common response shapes (`result`, `records`, `results`, `data`, or `items`) and returns raw records. `getEventContext` searches the Notion `pages` entity for event background context used by all subagents.

7. **`app/api/airbyte/test/route.ts`** — manual in-app Airbyte smoke test. POSTs a fixed event brief through `getEventContext` and returns the Notion background record count plus the raw Context Store result/error payload.

## Outreach Integrations

After the subagents return, `create_event_plan` fans out to two outbound channels. Both mirror the same provider pattern (lazy provider, returns `null`/no-op when unconfigured) so they're optional.

### Phone calls (VAPI)

- **`lib/calls/`** — `types.ts` (`OutboundCall`, `CallRecord`, `CallProvider`), `vapi.ts` (`createVapiProvider` → POST `/call/phone`), `index.ts` (`initiateCall`). Returns `null` when `VAPI_API_KEY` / `VAPI_PHONE_NUMBER_ID` / `VAPI_ASSISTANT_ID` are missing.
- **`app/api/calls/venue/route.ts`** — manual demo trigger (POST). **`app/api/calls/webhook/route.ts`** — receives VAPI events (`end-of-call-report`, etc.).
- **`components/call-venue-button.tsx`** — navbar button that POSTs to the venue route.

### Email (AgentMail)

- **`lib/emails/`** — `types.ts` (`OutreachEmail`, `EmailRecord`, `EmailProvider`, plus `ThreadSummary` / `ThreadDetail` / `ThreadMessage` / `ReplyInput` for the reply loop), `agentmail.ts` (`createAgentMailProvider` using the `agentmail` SDK — `send`, `listThreads`, `getThread`, `reply`), `compose.ts` (`composeOutreach` builds vendor-outreach subject/text/HTML from an event brief), `draft.ts` (`draftThreadReply` — `generateText` proposes Hestia's next reply from the thread), `index.ts` (`sendOutreachEmail`, `listReplyThreads`, `getReplyThread`, `sendThreadReply`). All return `null`/`[]` when `AGENTMAIL_API_KEY` is missing.
- **Demo safety guard:** every email is delivered to `EMAIL_REDIRECT_TO` (default `priyanshu.mahey02@gmail.com`), never to the real vendor. The body is addressed to the vendor and a `[Hestia outreach → …]` banner is prepended so the redirect inbox can reply *as* the vendor.
- The sending inbox is `AGENTMAIL_INBOX_ID`; if unset, an inbox is created on first send and cached in memory. `AGENTMAIL_FROM_NAME` signs the messages.
- **Reply loop (polling + human-in-the-loop):** outreach threads carry AgentMail's system `sent` label, which the default thread list hides — so `listThreads` filters by `labels: ["sent"]` to surface all outreach (replies keep the label, so replied threads show too). `awaitingReply` is true when the latest sender isn't our own inbox.
- **`app/api/emails/outreach/route.ts`** — manual outreach trigger (POST, optional JSON override). **`app/api/emails/replies/route.ts`** — GET lists threads, GET `?threadId=` returns a full thread. **`app/api/emails/replies/draft/route.ts`** — POST `{ threadId }` returns an AI-drafted reply (sends nothing). **`app/api/emails/replies/reply/route.ts`** — POST `{ threadId, text }` sends the approved reply to the thread's last message. **`app/api/emails/webhook/route.ts`** — receives AgentMail events (`message.received` etc.); verify svix signatures with `AGENTMAIL_WEBHOOK_SECRET` in production.
- **`components/email-vendor-button.tsx`** — navbar button that POSTs to the outreach route. **`app/inbox/page.tsx`** — "Inbox" tab: thread list + conversation view + AI-draft/approve/send composer (polls on load and after sending). Added to `components/nav-tabs.tsx`.

## Workflow Visualization (observability)

The right-hand panel renders the event-planning pipeline as a live, traceable graph instead of a chatbot transcript. It is **not** user-editable — there is no drag-to-create palette; the graph is derived from the AI's progress.

The pipeline is a **directed acyclic graph (DAG), not a straight line**. Each step declares the steps it `dependsOn`, so independent steps that share the same dependencies run **in parallel**: the Luma page, catering, and vendor subagents all fan out from "Fetch Event Context" (Airbyte) and fan back into "Compile Event Plan". The DAG is: Start → Gather Event Details → Fetch Event Context → {Create Luma Event Page ∥ Source Catering ∥ Find Vendors} → Compile Event Plan. The Airbyte step surfaces its record count in the Trace and Graph panels; if Airbyte is unconfigured, it shows "Unavailable" so the step is still visible without being a blocking error.

- **`lib/workflow.ts`** — pure model + `deriveWorkflow({ started, toolState, input, output })`. Maps the `create_event_plan` tool's stream state onto six steps (Start → Gather Event Details → {Create Luma Event Page ∥ Source Catering ∥ Find Vendors} → Compile Event Plan), computing each step's `status`, `dependsOn` edges, and real `inputs`/`outputs` from the tool data. Called on every render so the canvas stays in lockstep with the assistant.
- **`components/ai-elements/workflow-canvas.tsx`** — the right panel. Header shows workflow name + status + completed count; tabs switch between **Graph** (React Flow node diagram), **Steps** (OpenUI Lang render), and **Trace** (step list). The Graph lays steps out in dependency ranks (`layoutSteps`) so parallel branches sit side-by-side, and derives edges from each step's `dependsOn`. Shows an empty state until the first message. Always visible on desktop (`w-72 sm:w-80 lg:w-[26rem]`).
- **`components/ai-elements/workflow-node.tsx`** — `WorkflowNode` (React Flow custom node), `StatusBadge`, `StepIcon`, and the `WORKFLOW_ICONS` map.
- **`components/ai-elements/workflow-observability.tsx`** — `WorkflowObservability`, the Trace tab's step list with expandable input/output rows.
- **`lib/workflow-lang.ts`** — serialises the derived workflow to OpenUI Lang for the Steps tab. Groups steps by dependency rank (`groupByRank`); ranks with multiple steps are emitted as a `WorkflowParallelGroup` so the list reflects parallel branches too.
- **`components/ai-elements/workflow-openui.tsx`** — the OpenUI component library (`WorkflowPanel`, `WorkflowStep`, `WorkflowParallelGroup`, `WorkflowInsight`) registered for the `<Renderer>`. Drives `scripts/generate-workflow-prompt.ts` → `lib/generated/workflow-system-prompt.txt`.


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
| `workflow-canvas.tsx` | Reactive right-hand workflow panel (Graph + Trace tabs) |
| `workflow-node.tsx` | React Flow node, status badge, icon map |
| `workflow-observability.tsx` | Trace tab step list with expandable I/O |

### `components/` (root)
| Component | Purpose |
|-----------|---------|
| `booking-panel.tsx` | Right sidebar: event summary + Venue/Catering/Luma Event booking cards (pending/confirmed states) |
| `booking-panel-context.tsx` | `BookingPanelProvider` + `useBookingPanel` — shared open/close state between navbar and page |
| `booking-panel-toggle.tsx` | Navbar `PanelRight` icon button that calls `togglePanel` from context |
| `airbyte-test-button.tsx` | Navbar smoke-test button for `/api/airbyte/test`; displays record counts or the Airbyte error |
| `call-venue-button.tsx` | VAPI call trigger button in navbar |
| `email-vendor-button.tsx` | AgentMail outreach trigger button in navbar |
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
  ...input + airbyteContext + lumaEvent (LumaAgentOutput | null) + catering (CateringAgentOutput[]) + vendors (VendorsAgentOutput) + calls (CallRecord[]) + emails (EmailRecord[])

LumaAgentOutput:   { url, title, description, date, area, headcount }
CateringAgentOutput: { provider, menu[], notes, estimatedCostPerHead, url?, phone?, email? }
VendorsAgentOutput:  { vendors: Vendor[] }
Vendor:            { category, name, notes, url?, phone?, email? }
```

## External Services

| Service | Key | Status |
|---------|-----|--------|
| OpenAI | `OPENAI_API_KEY` | Active — all LLM calls |
| Airbyte Context Store | `AIRBYTE_CONNECTOR_ID`, `AIRBYTE_CLIENT_ID`, `AIRBYTE_CLIENT_SECRET`, `AIRBYTE_API_KEY` | Optional — shared Notion `pages` background context through Airbyte's connector execute API; Exa remains fallback for vendor/caterer sourcing |
| Exa | `EXA_API_KEY` | Active — catering + vendor searches |
| Luma | `LUMA_API_KEY` | Present, not yet wired up (agent is stubbed) |
| VAPI | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID` | Active — outbound phone calls |
| AgentMail | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `EMAIL_REDIRECT_TO`, `AGENTMAIL_FROM_NAME` | Active — vendor email outreach (all mail routed to `EMAIL_REDIRECT_TO`) |

## Stack

- Next.js (App Router), React 19, TypeScript
- AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) — `UIMessage` protocol, `streamText`, `createUIMessageStreamResponse`
- Tailwind CSS v4, shadcn/ui
- Biome (linter + formatter, 2-space indent, `bun lint` / `bun format`)
- Bun as package manager and task runner

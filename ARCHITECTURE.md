# Hestia Architecture

> Keep this file up to date whenever you add, remove, or significantly change a file, route, agent, component, or external integration.

## Overview

Hestia is an AI event-planning assistant. The user chats with an AI that gathers five event details, then dispatches three parallel subagents to produce a structured plan. After outreach is sent, an **autonomous booking orchestrator** takes over: it negotiates with each vendor over email/phone, auto-replying to responses, booking, declining, or escalating — with little to no human input.

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
              └── registerCampaign(...)   (lib/orchestrator → one self-driving task per vendor)
              └── createUIMessageStreamResponse → browser

Navbar (components/airbyte-test-button.tsx)
  └── POST /api/airbyte/test
        └── lib/airbyte/context-store.ts → Context Store Notion background test search

Async, no human input (after the plan is created):
  AgentMail webhook → ingestEmailReply  ┐
  VAPI webhook      → ingestCallReport   ├→ lib/orchestrator → agent decides + acts
  UI poller / tick  → tick (mock vendors)┘     (auto-reply · book · decline · escalate)
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

- **`lib/calls/`** — `types.ts` (`OutboundCall`, `CallRecord`, `CallProvider`), `vapi.ts` (`createVapiProvider` → POST `/call/phone`), `index.ts` (`initiateCall`), `store.ts` (in-memory `callId → CallResult` map with `classifyBookingStatus` keyword scorer). Returns `null` when `VAPI_API_KEY` / `VAPI_PHONE_NUMBER_ID` / `VAPI_ASSISTANT_ID` are missing.
- **`app/api/calls/venue/route.ts`** — manual demo trigger (POST). **`app/api/calls/webhook/route.ts`** — receives VAPI `end-of-call-report`, classifies booking outcome from transcript/summary, writes to store. Configure URL in VAPI dashboard: `https://hestia-ai-two.vercel.app/api/calls/webhook`. **`app/api/calls/status/route.ts`** — GET returns all `CallResult[]` from the in-memory store; polled by the booking panel every 5 s.
- **`components/call-venue-button.tsx`** — navbar button that POSTs to the venue route. **`components/booking-panel.tsx`** — polls `/api/calls/status` every 5 s and renders a "Phone Outreach" section showing each call's vendor name, booking status badge (Booked / Unavailable / Calling… / Call ended), and VAPI summary.

### Email (AgentMail)

- **`lib/emails/`** — `types.ts` (`OutreachEmail`, `EmailRecord`, `EmailProvider`, plus `ThreadSummary` / `ThreadDetail` / `ThreadMessage` / `ReplyInput` for the reply loop), `agentmail.ts` (`createAgentMailProvider` using the `agentmail` SDK — `send`, `listThreads`, `getThread`, `reply`), `compose.ts` (`composeOutreach` builds vendor-outreach subject/text/HTML from an event brief), `draft.ts` (`draftThreadReply` — `generateText` proposes Hestia's next reply from the thread), `index.ts` (`sendOutreachEmail`, `listReplyThreads`, `getReplyThread`, `sendThreadReply`). All return `null`/`[]` when `AGENTMAIL_API_KEY` is missing.
- **Demo safety guard:** every email is delivered to `EMAIL_REDIRECT_TO` (default `priyanshu.mahey02@gmail.com`), never to the real vendor. The body is addressed to the vendor and a `[Hestia outreach → …]` banner is prepended so the redirect inbox can reply *as* the vendor.
- The sending inbox is `AGENTMAIL_INBOX_ID`; if unset, an inbox is created on first send and cached in memory. `AGENTMAIL_FROM_NAME` signs the messages.
- **Reply loop (polling + human-in-the-loop):** outreach threads carry AgentMail's system `sent` label, which the default thread list hides — so `listThreads` filters by `labels: ["sent"]` to surface all outreach (replies keep the label, so replied threads show too). `awaitingReply` is true when the latest sender isn't our own inbox.
- **`app/api/emails/outreach/route.ts`** — manual outreach trigger (POST, optional JSON override). **`app/api/emails/replies/route.ts`** — GET lists threads, GET `?threadId=` returns a full thread. **`app/api/emails/replies/draft/route.ts`** — POST `{ threadId }` returns an AI-drafted reply (sends nothing). **`app/api/emails/replies/reply/route.ts`** — POST `{ threadId, text }` sends the approved reply to the thread's last message. **`app/api/emails/webhook/route.ts`** — receives AgentMail events (`message.received` etc.); verify svix signatures with `AGENTMAIL_WEBHOOK_SECRET` in production.
- **`components/email-vendor-button.tsx`** — navbar button that POSTs to the outreach route. **`app/inbox/page.tsx`** — "Inbox" tab: thread list + conversation view + AI-draft/approve/send composer (polls on load and after sending). Added to `components/nav-tabs.tsx`.

## Autonomous Booking Orchestrator

After `create_event_plan` sends outreach, it calls `registerCampaign` to hand every reachable caterer/vendor to a **self-driving loop** (`lib/orchestrator/`). Each vendor becomes a `BookingTask` that the agent advances through a small state machine — `contacted → negotiating → quote_received → booked` (or `declined` / `needs_human`) — with no human input. The agent auto-replies to vendor responses, books when terms are acceptable, and only escalates when it genuinely can't decide.

- **`lib/orchestrator/types.ts`** — domain model: `BookingStage`, `ChannelKind`, `Awaiting`, `ConversationTurn`, `AgentAction`, `DecisionLogEntry`, `EventBrief`, `BookingTask`, `Campaign`, `OrchestratorState`.
- **`lib/orchestrator/store.ts`** — file-backed persistence at `.data/orchestrator.json` (gitignored) with an in-memory singleton cached on `globalThis` so state survives across the independent requests the loop spans (webhooks, UI poller, ticks). CRUD + `findTaskByThreadId` / `findTaskByCallId` for webhook matching.
- **`lib/orchestrator/agent.ts`** — `decideNextAction(task)`: the autonomous decision-maker. Uses `generateObject` (gpt-4o-mini) to choose `send_reply` / `book` / `decline` / `wait` / `escalate` from the event brief + conversation. Falls back to a deterministic heuristic when `OPENAI_API_KEY` is absent or the call fails. Escalates after `MAX_HESTIA_TURNS` (4) without a confirmation.
- **`lib/orchestrator/simulator.ts`** — `simulateVendorReply(task)`: stands in for a real vendor in mock mode so the loop advances end-to-end without AgentMail/VAPI. Persona drives the outcome (`cooperative`/`pricey` → booked, `busy` → declined, `haggler` → escalates). Demo-seeded tasks (those with a forced `mockPersona`) use the scripted replies so the showcase is identical every run; organic mock tasks fall through to the LLM for variety.
- **`lib/orchestrator/demo.ts`** — `DEMO_EVENT` + `DEMO_TARGETS`: a ready-made campaign of six mock vendors (mixed email/call) whose forced personas guarantee a full outcome spread (4 booked, 1 declined, 1 escalated). No chat flow, no real emails/calls.
- **`lib/orchestrator/index.ts`** — the orchestrator API: `registerCampaign(event, targets)` (creates tasks; real `threadId`/`callId` ⇒ live, otherwise `mock`; targets may carry a `mockPersona`), `ingestEmailReply` / `ingestCallReport` (append the vendor turn, then `advanceTask`), `advanceTask(taskId)` (run the agent + apply the action — demo tasks use the deterministic decision path; a hard `MAX_HESTIA_TURNS` rail force-escalates to a human so no task loops forever), `tick()` (one autonomous step), `seedDemoCampaign()` / `resetOrchestrator()` (demo load + clean slate), and `getOverview()` for the UI.
- **Wiring:** `app/chat/route.ts` builds campaign targets from caterers/vendors after sending outreach. In **demo mode** (`HESTIA_DEMO_MODE` !== `"false"`, the default) it makes *every* vendor a task (fabricating a placeholder email when Exa surfaced none), flags each `forceMock` with a cycled persona, and still fires the real email/call — so the Agent board self-completes from a single chat message without anyone replying. With demo mode off, only vendors with a real contact become tasks and the loop waits on genuine vendor replies. `app/api/emails/webhook/route.ts` → `ingestEmailReply`. `app/api/calls/webhook/route.ts` → `ingestCallReport`.
- **API routes:** `app/api/orchestrator/route.ts` (GET overview, optional `?campaignId=` filter), `app/api/orchestrator/tick/route.ts` (POST one loop step; optional `{ campaignId }` scopes it), `app/api/orchestrator/seed/route.ts` (POST → load the demo campaign), `app/api/orchestrator/reset/route.ts` (POST → wipe all state), `app/api/orchestrator/task/route.ts` (POST `{ taskId, action: "book" | "decline" }` → human-in-the-loop override via `resolveTask`).
- **`app/agent/page.tsx`** — "Agent" tab: a live booking board grouped by stage, with per-task conversation + decision-log drill-down. **Load demo** seeds the canned campaign and flips on Autopilot; **Reset** wipes state; **Autopilot** polls `/api/orchestrator/tick` every ~2.5s until no tasks are active; **Step** advances one iteration manually. Added to `components/nav-tabs.tsx`.
- **`components/ai-elements/booking-tracker.tsx`** — the inline tracker rendered **in the chat** right after `create_event_plan` returns (scoped to that call's `campaignId`, which the tool now returns). It self-drives the loop (polls + ticks `/api/orchestrator/tick` every ~1.4s until every vendor resolves) and has two views: a **Live activity** feed (default) — a chronological stream of every email/call message and agent action across the whole campaign, so the user reads the actual outreach copy and watches bookings happen autonomously without expanding anything — and a **Vendors** list with per-vendor status, expandable transcripts, and inline **Approve / Pass** for any `needs_human` escalation (POST `/api/orchestrator/task`); a click-through red banner jumps to it. The entire outreach lifecycle — watching, reading the emails, drilling in, and approving — happens in the Planner without visiting the Agent tab. **Autopilot runs silently and its toggle/Step controls are hidden by default** (not in the DOM) so they're invisible during demos; reveal them with `hestiaDev()` in the browser console (`hestiaDev(false)` to hide; backed by a `hestia_dev` localStorage flag).

### Demoing without real emails/calls

**Demo mode is on by default** (`HESTIA_DEMO_MODE` unset or anything but `"false"`), so the concept is fully showcasable two ways:

1. **Full chat flow** — describe an event in the **Planner** (e.g. "rooftop launch for 80 in Austin on Aug 14, shared plates, yes Luma page"). `create_event_plan` runs the real subagents, sends the real outreach (visible in the **Inbox**), then registers every sourced vendor as a self-driving task. An **inline "Outreach & Bookings" tracker** appears right under the plan and drives the whole campaign to completion — booked / declined / needs_human — with live per-vendor status, expandable transcripts, and inline **Approve / Pass** for escalations. No need to leave the chat (the **Agent** tab shows the same board if you want the full-screen view).
2. **One click** — on the **Agent** tab hit **Load demo** for a canned six-vendor campaign (no chat, no sends) with a guaranteed 4 booked / 1 declined / 1 escalated spread. **Reset** clears the board.

To require *real* vendor replies instead (live threads/calls, human-in-the-loop via the Inbox), set `HESTIA_DEMO_MODE=false`.



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
| `booking-tracker.tsx` | Inline live booking tracker shown in the chat after a plan; self-drives the autonomous loop and offers inline Approve/Pass for escalations |
| `vendors-card.tsx` | Renders the vendor list |
| `workflow-canvas.tsx` | Reactive right-hand workflow panel (Graph + Trace tabs) |
| `workflow-node.tsx` | React Flow node, status badge, icon map |
| `workflow-observability.tsx` | Trace tab step list with expandable I/O |

### `components/` (root)
| Component | Purpose |
|-----------|---------|
| `booking-panel.tsx` | Right sidebar: event summary + Venue/Catering/Luma Event booking cards (pending/confirmed states) |
| `booking-panel-context.tsx` | `BookingPanelProvider` + `useBookingPanel` — shared open/close state between navbar and page; also holds `workflowOpen` / `toggleWorkflow` |
| `booking-panel-toggle.tsx` | Navbar `PanelRight` icon button that calls `togglePanel` from context |
| `workflow-toggle.tsx` | Navbar button that calls `toggleWorkflow` to show/hide the `WorkflowCanvas` sidebar |
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

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

1. **`app/page.tsx`** — client-only chat UI with a split layout: the conversation on the left and a reactive workflow panel on the right. Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointed at `/chat`. Sends `{ messages, modelId }`. Renders the tool's result cards (`LumaEventCard`, `CateringCard[]`, `VendorsCard`) inline, and feeds the latest `create_event_plan` tool state into `deriveWorkflow` to drive the `WorkflowCanvas`.

2. **`app/chat/route.ts`** — the active API route. `streamText` with `stopWhen: hasToolCall("create_event_plan")`. System prompt gathers five fields conversationally before allowing the tool to fire.

3. **`lib/agents/luma-agent.ts`** — stub. Accepts title/description/date/area/headcount, sleeps 1.2s, returns a hardcoded lu.ma URL. Replace with real Luma API calls when ready (`LUMA_API_KEY` is available).

4. **`lib/agents/catering-agent.ts`** — calls Exa `searchAndContents` (neural, 4 results). Parses phone/email from result text with regex. Returns `CateringAgentOutput[]`.

5. **`lib/agents/vendors-agent.ts`** — runs four parallel Exa searches (Venue, AV & Tech, Photography, Florals). Returns `VendorsAgentOutput { vendors: Vendor[] }`.

## Workflow Visualization (observability)

The right-hand panel renders the event-planning pipeline as a live, traceable graph instead of a chatbot transcript. It is **not** user-editable — there is no drag-to-create palette; the graph is derived from the AI's progress.

The pipeline is a **directed acyclic graph (DAG), not a straight line**. Each step declares the steps it `dependsOn`, so independent steps that share the same dependencies run **in parallel**: the Luma page, catering, and vendor subagents all fan out from "Gather Event Details" and fan back into "Compile Event Plan".

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

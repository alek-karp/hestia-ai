# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
bun dev          # start dev server
bun build        # production build
bun lint         # biome check (lint + format check)
bun format       # biome format --write
```

No test suite is configured.

## Architecture

**Hestia** is an AI event-planning assistant. The user chats with an AI that gathers event details, then dispatches three parallel subagents to produce a structured plan.

### Request flow

1. `app/page.tsx` — single-page chat UI using `useChat` from `@ai-sdk/react`. Sends messages to `POST /chat`.
2. `app/chat/route.ts` — the main AI route. Uses AI SDK `streamText` with a `create_event_plan` tool. When the tool fires it calls three subagents in parallel via `Promise.all`:
   - `lib/agents/luma-agent.ts` — creates a Luma event page (currently stubbed)
   - `lib/agents/catering-agent.ts` — sources catering options
   - `lib/agents/vendors-agent.ts` — finds vendors
3. Tool output is streamed back and rendered in `app/page.tsx` as `Plan`, `LumaEventCard`, `CateringCard`, and `VendorsCard` components.

There is also an older/alternate route at `app/api/chat/route.ts` — the active route is `app/chat/route.ts`.

### Component layers

- `components/ai-elements/` — compound AI-UI primitives (Conversation, Message, PromptInput, Plan, ModelSelector, Context, etc.). These are purpose-built for chat UIs and use compound-component patterns with sub-exports.
- `components/ui/` — shadcn/ui base components (Button, Card, Spinner, etc.).

### Stack

- Next.js 16 (App Router), React 19, TypeScript
- AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) — `UIMessage` protocol, `streamText`, `createUIMessageStreamResponse`
- Tailwind CSS v4, shadcn/ui, Biome (linter/formatter, 2-space indent)
- OpenAI models only; model is selected client-side and passed in the request body

### Environment

See `.env.example` for required variables. `OPENAI_API_KEY` is required; `LUMA_API_KEY` is used by the Luma agent stub.

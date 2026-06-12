# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@ARCHITECTURE.md

## Keeping ARCHITECTURE.md current

After every change that adds, removes, or significantly modifies a file, route, agent, component, or external integration, update `ARCHITECTURE.md` to reflect the new state before finishing the task.

## Commands

```bash
bun dev          # start dev server
bun build        # production build
bun lint         # biome check (lint + format check)
bun format       # biome format --write
```

No test suite is configured.

## Architecture

See `ARCHITECTURE.md` for the full architecture reference (request flow, agents, components, data types, external services, stack).

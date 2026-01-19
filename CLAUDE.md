# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Development (all apps with hot reload)
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm typecheck

# API-specific commands (run from apps/api/)
pnpm dev          # tsx watch src/server.ts
pnpm build        # tsc -p tsconfig.json
pnpm start        # node dist/server.js (requires build first)
```

Note: Lint is not yet configured (marked as "lint later" in package.json).

## Architecture

**Monorepo Structure** using pnpm workspaces:
- `apps/api` - Fastify v5 API server (TypeScript, ES2022, strict mode)
- `apps/web` - Web application (placeholder, not yet implemented)

**API Server** (`apps/api/src/server.ts`):
- Fastify v5.7.1 with built-in logging
- Environment variables: `PORT` (default: 3001), `HOST` (default: 0.0.0.0)
- Currently has single endpoint: `GET /health`

**TypeScript Configuration**:
- Target/Module: ES2022 (ESM, not CommonJS)
- Module Resolution: Bundler
- Strict mode enabled
- Output: `dist/` directory


## Working Rules (must follow)

- Work incrementally: one small feature per change-set.
- Before editing multiple files, propose: (1) plan, (2) files to touch, (3) commands to run.
- Do not introduce new frameworks unless asked.
- Do not rewrite working code “for style” unless requested.

## Security & Secrets

- Never commit secrets or tokens.
- Use `.env` for local secrets; keep `.env.example` updated.
- Do not print sensitive values in logs.

## Endpoint Quality Bar

When adding/modifying an API endpoint:
- Define request/response shape explicitly (TypeScript types or JSON schema).
- Return structured JSON (prefer predictable fields).
- Add at least one request/response example in docs/comments.
- Include basic validation and safe error messages.

## Copilot Scope (Phase 1)

We are building an agent-facing copilot that can:
- Summarize a ticket/conversation
- Suggest a reply in a given tone
- Extract fields: issue_type, priority, order_id (optional), next_action
- Later: tool/function calling to internal services (not yet)

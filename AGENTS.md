# Homarr Agent Rules

## Repository Structure

```
homarr/
├── apps/
│   ├── nextjs/          # Main Next.js application (port 3000)
│   ├── docs/            # Docusaurus 3 documentation site (@homarr/docs)
│   ├── tasks/           # Cron job runner + Fastify tRPC API (port 3002)
│   └── websocket/       # Standalone tRPC WebSocket server (port 3001)
├── packages/
│   ├── api/             # tRPC appRouter, procedures, OpenAPI
│   ├── auth/            # NextAuth config, providers, session, API keys
│   ├── db/              # Drizzle schema (3 DB drivers), migrations, queries
│   ├── core/            # Env validation, DB/Redis driver factories, logging
│   ├── definitions/     # Domain enums: WidgetKind, IntegrationKind, permissions
│   ├── widgets/         # All 39 dashboard widgets (definitions + components)
│   ├── integrations/    # Integration classes (HTTP clients to external apps)
│   ├── redis/           # Redis pub/sub channels, caching abstractions
│   ├── translation/     # next-intl setup, locale configs, lang JSON files
│   ├── ui/              # Shared Mantine components, theme, hooks
│   ├── validation/      # Shared zod schemas for API/forms
│   ├── common/          # Shared utilities, IDs, errors
│   ├── cron-jobs/       # Cron job implementations (25+ jobs)
│   ├── cron-jobs-core/  # Cron scheduling primitives
│   ├── cron-job-status/ # Cron status via Redis
│   ├── boards/          # Board context, edit mode, cache updater
│   ├── modals/          # Modal primitives on Mantine
│   ├── modals-collection/ # Feature modals (apps, boards, docker, etc.)
│   ├── form/            # useZodForm (Mantine + zod resolver)
│   ├── forms-collection/# Reusable form UIs (new app, icon picker, upload)
│   ├── spotlight/       # Command palette / search with multiple modes
│   ├── request-handler/ # Server request handlers (feeds, integrations)
│   ├── notifications/   # Mantine notifications wrapper
│   ├── docker/          # Dockerode-based Docker access
│   ├── icons/           # Icon DB/repo integration
│   ├── image-proxy/     # Image proxy + caching
│   ├── ping/            # Reachability / ping utilities
│   ├── analytics/       # Server-side analytics (Umami)
│   ├── server-settings/ # Server setting keys/types
│   ├── settings/        # User-facing settings UI context
│   ├── old-import/      # Legacy Homarr import
│   ├── old-schema/      # Legacy Homarr zod schemas
│   └── cli/             # Node CLI for ops (brocli)
├── tooling/
│   ├── typescript/      # Base tsconfig
│   └── github/          # CI setup action
├── tools/
│   └── homarr-dev/      # Go CLI for local and PR Docker images
├── development/         # Dev docker-compose (Redis, MySQL, PostgreSQL)
├── e2e/                 # E2E test specs
└── Dockerfile           # Multi-stage production build
```

## Documentation Sync

The documentation site lives at `apps/docs/` (Docusaurus 3, `@homarr/docs`).

When modifying user-facing code, you MUST also update the corresponding documentation:

- New integration → `apps/docs/docs/integrations/<slug>/index.mdx` + `index.ts`
- New widget → `apps/docs/docs/widgets/<slug>/index.mdx` + `index.ts`
- Changed API → `apps/docs/docs/management/api.mdx`
- New/changed env vars → `apps/docs/docs/advanced/`
- New CLI commands → `apps/docs/docs/advanced/command-line/`
- Auth changes → `apps/docs/docs/advanced/` SSO pages
- New cron job → `apps/docs/docs/management/tasks.mdx`

## Monorepo Commands

- `pnpm dev` — Next.js app only
- `pnpm dev:cli -- dev` — run the developer CLI without installing a global binary
- `pnpm db:seed` — seed default database data explicitly
- `pnpm docker:dev:up` — start the Redis development service in the background
- `pnpm dev:docs` — Docusaurus docs site only
- `pnpm turbo build` — build all packages
- `pnpm turbo build --filter=@homarr/docs` — build docs only
- `pnpm turbo typecheck` — typecheck all packages
- `pnpm lint` / `pnpm format` — oxlint / oxfmt

## Code Style

- Lint: oxlint (not ESLint)
- Format: oxfmt (not Prettier)
- UI: Mantine (not Tailwind) — Tailwind is only used in docs app
- Mantine: use the `mantine` MCP server (configured in `.mcp.json`; tools `get_item_doc` / `get_item_props` / `search_docs`) for current v9 APIs before writing component code. Prefer built-in primitives (`Combobox`/`useCombobox` for selects, the polymorphic `component` prop, `@mantine/hooks`) over hand-rolled equivalents. Check `packages/ui/` for existing conventions first.

## MCP servers

`.mcp.json` at the repo root declares project-scoped MCP servers (the standard Claude Code layout; other tools can import the same `mcpServers` block). See the `mantine` entry there for the Mantine v9 server, and the upstream docs at https://mantine.dev/guides/llms/ for per-tool setup (OpenCode: `.opencode/opencode.json`, Codex: `.codex/config.toml`). Only keyless server definitions belong in `.mcp.json`; anything needing secrets stays in local dotfiles.

## Agent Skills

Portable agent skills live in `.agents/skills/` (the Agent Skills open standard). Cursor, Codex, and OpenCode read `.agents/skills/` natively. Claude Code does not scan it, so `.claude/skills/` is a symlink back to `.agents/skills/`. Install skills at `.agents/skills/<name>/SKILL.md` — that single copy is used everywhere. See `.agents/skills/` for available skills (documentation-sync, mcp-integration, codebase-context, datatable-migration).

- Icons: @tabler/icons-react
- Docs app can import from `@homarr/definitions` for shared types
- Run `pnpm dev:cli -- dev` to browse local `homarr:*` images and remote PR images.
- Run `pnpm dev:cli -- build <name>` from a Homarr checkout to build `homarr:<name>` with rebuild provenance.
- Run `pnpm dev:cli -- build --pr <number>` to build a PR locally from a temporary checkout.
- Run Go checks from `tools/homarr-dev` with `go test ./...` and `go vet ./...`.

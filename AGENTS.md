# Homarr Agent Rules

## Repository Structure

```
homarr/
├── apps/
│   ├── nextjs/          # Main Next.js application (port 3000)
│   ├── docs/            # Next.js + Fumadocs documentation site (@homarr/docs)
│   ├── tasks/           # Cron-job initialization and scheduling runtime
│   ├── websocket/       # Standalone tRPC WebSocket server (port 3001)
│   └── workshop/        # Go/PocketBase Workshop service
├── packages/
│   ├── api/             # tRPC appRouter, procedures, OpenAPI
│   ├── auth/            # NextAuth config, providers, session, API keys
│   ├── db/              # SQLite and PostgreSQL schemas, migrations, queries
│   ├── core/            # Env validation, DB/Redis driver factories, logging
│   ├── definitions/     # Domain enums: WidgetKind, IntegrationKind, permissions
│   ├── widgets/         # Dashboard widget definitions and components
│   ├── integrations/    # Integration classes (HTTP clients to external apps)
│   ├── redis/           # Redis pub/sub channels, caching abstractions
│   ├── translation/     # next-intl setup, locale configs, lang JSON files
│   ├── ui/              # Shared Mantine components, theme, hooks
│   ├── validation/      # Shared zod schemas for API/forms
│   ├── common/          # Shared utilities, IDs, errors
│   ├── cron-jobs/       # Cron job implementations
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
│   ├── custom-widgets/  # Custom JSX v2 schema, validation, and runtime
│   ├── onboarding/      # Onboarding studio and setup flow
│   ├── workshop/        # Homarr-side Workshop client and contracts
│   └── cli/             # Bun CLI for ops (brocli)
├── tooling/
│   ├── typescript/      # Base tsconfig
│   └── github/          # CI setup action
├── tools/
│   └── homarr-dev/      # Go CLI for local and PR Docker images
├── development/         # Dev docker-compose (Redis, MySQL, PostgreSQL)
├── e2e/                 # E2E test specs
└── Dockerfile           # Multi-stage production build
```

## Documentation

Add or update docs only when a smart, advanced user cannot infer the changed behavior from the UI or generated API schema. Document hidden capabilities, surprising behavior, non-obvious prerequisites or constraints, configuration contracts, and migrations. A code or API change alone is not a reason to add docs.

Keep warranted documentation concise. Omit UI walkthroughs, visible control descriptions, and details already clear from the interface or schema.

Only after this reader-value test passes, use these locations:

- New integration → `apps/docs/docs/integrations/<slug>/index.mdx` + `index.ts`
- New widget → `apps/docs/docs/widgets/<slug>/index.mdx` + `index.ts`
- Changed API → `apps/docs/docs/management/api/index.mdx`
- New/changed env vars → `apps/docs/docs/advanced/`
- New CLI commands → `apps/docs/docs/advanced/command-line/`
- Auth changes → `apps/docs/docs/advanced/` SSO pages
- New cron job → `apps/docs/docs/management/tasks.mdx`

## Monorepo Commands

- `bun run dev` — Next.js app only
- `bun run dev:cli -- dev` — run the developer CLI without installing a global binary
- `bun run db:seed` — seed default database data explicitly
- `bun run docker:dev:up` — start the Redis development service in the background
- `bun run dev:docs` — Fumadocs site only
- `bun run turbo build` — build all packages
- `bun run turbo build --filter=@homarr/docs` — build docs only
- `bun run turbo typecheck` — typecheck all packages
- `bun run lint` / `bun run format` — oxlint / oxfmt

## Code Style

- Lint: oxlint (not ESLint)
- Format: oxfmt (not Prettier)
- UI: Mantine (not Tailwind) — Tailwind is only used in docs app
- Mantine: use the `mantine` MCP server in `.mcp.json` for current v9 APIs before writing component code. Prefer built-in primitives (`Combobox`/`useCombobox`, the polymorphic `component` prop, `@mantine/hooks`) and check `packages/ui/` for existing conventions first.
- Icons: @tabler/icons-react
- Docs app can import from `@homarr/definitions` for shared types
- Run `bun run dev:cli -- dev` to browse local `homarr:*` images and remote PR images.
- Run `bun run dev:cli -- build <name>` from a Homarr checkout to build `homarr:<name>` with rebuild provenance.
- Run `bun run dev:cli -- build --pr <number>` to build a PR locally from a temporary checkout.

## Testing

Add tests only when requested. Favor assertions that would fail for a plausible regression in user-visible behavior or a security boundary; avoid checks that repeat implementation details or duplicate stronger coverage. For focused changes, run only the relevant existing or newly requested checks when validation is needed. Do not run broad test, Docker, or E2E suites by default.

## MCP servers

`.mcp.json` declares project-scoped MCP servers. Keep only keyless definitions there; credentials belong in local dotfiles. See [Mantine LLM tooling](https://mantine.dev/guides/llms/) for client-specific setup.

## Agent Skills

Portable skills live in `.agents/skills/`. Read the relevant `SKILL.md` before working in that domain; detailed references are loaded only when needed. Claude-compatible discovery is provided through `.claude/skills`.

- `codebase-context` — architecture, package boundaries, and shared utilities
- `documentation-sync` — documentation for changes users need explained
- `mcp-integration` — safe tRPC-to-MCP exposure
- `homarr-custom-widget` — safe Custom JSX v2 authoring

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

---
name: codebase-context
description: Navigate Homarr's monorepo architecture and reuse shared packages. Use when locating code, choosing a package boundary, understanding runtime services, tRPC, databases, widgets, integrations, cron jobs, Custom Widgets, Workshop, or checking @homarr/common before creating a utility.
---

# Homarr Codebase Context

Orient from the current checkout before editing. Treat package manifests, exports, and source as authoritative when they differ from this snapshot.

## Workflow

1. Confirm the branch and inspect the nearest `package.json`, existing sibling modules, and package exports.
2. Search `@homarr/common` before creating a general-purpose helper. Read [references/common.md](references/common.md) for every public entrypoint and export.
3. Read [references/architecture.md](references/architecture.md) when the task crosses packages, runtimes, routing, data, widgets, integrations, cron jobs, Custom Widgets, or Workshop.
4. Keep the change in the deepest package that owns the behavior. Reuse public entrypoints rather than deep-importing implementation files.
5. Re-run targeted searches before documenting counts, consumers, or dependency edges; these change faster than the architectural seams.

## Current toolchain

- Use Node `24.18.0` from `mise.toml` and pnpm `11.15.1` from `package.json`.
- Use pnpm workspaces with Turborepo. Workspace packages use the `@homarr/` scope and catalog-managed dependencies.
- Use Next.js App Router, TypeScript, tRPC, Drizzle, Mantine v9, Tabler icons, Jotai, TanStack Query, next-intl, Vitest, and Playwright.
- Use oxlint and oxfmt. Mantine is the application UI system; Tailwind is limited to the docs app.
- `pnpm dev` starts only `@homarr/nextjs`. Start a standalone runtime explicitly when the task needs it.

## High-value seams

- Server/RSC tRPC: `@homarr/api/server`
- Client tRPC hooks: `@homarr/api/client`
- Main router: `packages/api/src/root.ts`
- MCP eager router: `packages/api/src/mcp.ts`
- Database schemas: `packages/db/schema/{sqlite,mysql,postgresql}.ts`
- Widget registry: `packages/widgets/src/registry.ts`
- Widget loading manifest: `packages/widgets/src/manifest.ts`
- Integration definitions: `packages/definitions/src/integration.ts`
- Integration factory: `packages/integrations/src/base/creator.ts`
- Cron jobs: `packages/cron-jobs/src/jobs/`
- App routes: `apps/nextjs/src/app/[locale]/`

When a code change affects users, invoke `documentation-sync`. When exposing tRPC through MCP, invoke `mcp-integration`.

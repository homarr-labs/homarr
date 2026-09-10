---
name: documentation-sync
description: Keep Homarr documentation in sync with code changes. Use when modifying code that affects user-facing behavior, or when adding/modifying widgets, integrations, cron jobs, API routes, env vars, permissions, auth providers, or UI in apps/docs. Covers the docs/ mapping table, integration doc pattern, and widget doc pattern.
---

# Documentation Sync

When modifying code that affects user-facing behavior, you MUST also update the documentation in `apps/docs/`.

## What triggers a doc update

| Code change            | Doc location                                                |
| ---------------------- | ----------------------------------------------------------- |
| New integration        | `apps/docs/docs/integrations/<slug>/index.mdx` + `index.ts` |
| New widget             | `apps/docs/docs/widgets/<slug>/index.mdx` + `index.ts`      |
| Changed API surface    | `apps/docs/docs/management/api.mdx`                         |
| New/changed env vars   | `apps/docs/docs/advanced/`                                  |
| New CLI commands       | `apps/docs/docs/advanced/command-line/`                     |
| Changed auth providers | `apps/docs/docs/advanced/` SSO pages                        |
| UI/UX changes          | Relevant getting-started or management pages                |
| New cron job           | `apps/docs/docs/management/tasks.mdx`                       |
| Changed permissions    | `apps/docs/docs/management/users.mdx`                       |

## Integration doc pattern

Each integration has a folder under `apps/docs/docs/integrations/<slug>/`:

- `index.ts` — exports a typed `IntegrationDefinition` with name, description, iconUrl, path
- `index.mdx` — uses shared components: `IntegrationHeader`, `IntegrationCapabilites`, `IntegrationSecrets`
- Import metadata from `@homarr/definitions` where possible

## Widget doc pattern

Each widget has a folder under `apps/docs/docs/widgets/<slug>/`:

- `index.ts` — exports a typed `WidgetDefinition` with icon, name, description, path, configuration
- `index.mdx` — uses shared components: `WidgetHeader`, `WidgetConfig`, `WidgetAdding`

## Development

- Run docs locally: `pnpm dev:docs` from root
- Build docs: `pnpm turbo build --filter=@homarr/docs`
- The docs app can import from `@homarr/definitions` for type-safe integration/widget metadata
- Docusaurus strict mode throws on broken links — fix any broken references before committing

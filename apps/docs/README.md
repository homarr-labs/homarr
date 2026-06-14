# Homarr Documentation (`@homarr/docs`)

The official [homarr.dev](https://homarr.dev) documentation site, built with [Docusaurus 3](https://docusaurus.io/) and living inside the Homarr monorepo.

## Why it's in the monorepo

Having documentation alongside the application code enables:

- **Two-way linking** — the docs app imports from `@homarr/definitions` for type-safe integration/widget metadata, and the main app references doc paths via generated sitemap types
- **Atomic PRs** — code changes and their documentation updates ship in the same pull request
- **Shared tooling** — same Node version, pnpm catalog, oxlint/oxfmt, CI pipeline
- **Build-time validation** — Docusaurus strict mode catches broken links and references at build time

## Development

From the **monorepo root**:

```bash
# Start the docs dev server (port 3003)
pnpm dev:docs

# Or from within this directory
pnpm dev
```

## Build

```bash
# Build docs only
pnpm turbo build --filter=@homarr/docs

# Build everything (docs + main app + tasks + websocket)
pnpm build
```

## Lint & Format

Uses oxlint and oxfmt (same as the rest of the monorepo):

```bash
pnpm lint        # oxlint
pnpm format      # oxfmt (check)
pnpm format -- --write  # oxfmt (fix)
```

## Typecheck

```bash
pnpm typecheck
```

## Content Structure

```
docs/
├── getting-started/    # Installation guides, glossary, prerequisites
├── management/         # Boards, apps, users, integrations, settings, tasks, API
├── integrations/       # 55 integration guides (one folder each)
├── widgets/            # 42 widget guides (one folder each)
├── advanced/           # SSO, env vars, proxy, styling, CLI, development
└── community/          # FAQ, donate, license, translations, get-in-touch
```

Each integration/widget doc follows a consistent pattern:

- `index.ts` — typed metadata (`IntegrationDefinition` / `WidgetDefinition`)
- `index.mdx` — content using shared React components (`IntegrationHeader`, `WidgetHeader`, etc.)

## Importing from homarr packages

The docs app has `@homarr/definitions` as a workspace dependency. You can import integration kinds, widget kinds, and other definitions directly:

```typescript
import { IntegrationKind } from '@homarr/definitions';
```

This enables type-safe references to homarr domain concepts within documentation code.

## Search (Algolia DocSearch)

Search uses the `Docusaurus` Algolia index (crawler `cd77a285-2756-4557-bf21-ee703748df15`). A separate `markdown` index is built for LLM markdown indexing.

Crawler reference config: [`docsearch.config.js`](docsearch.config.js).

**Verify search health:**

```bash
pnpm verify:search
```

## Tech Stack

| Layer | Technology |
|---|---|
| Site generator | Docusaurus 3 (`@docusaurus/preset-classic`) |
| Styling | Tailwind CSS 3 + Docusaurus Infima |
| Icons | `@tabler/icons-react` |
| Diagrams | Mermaid (`@docusaurus/theme-mermaid`) |
| Search | Algolia DocSearch |
| Analytics | PostHog |
| Charts | @nivo/line |

## Contributing

When making changes to the homarr codebase that affect user-facing behavior, **always update the corresponding documentation in this app**. See `.cursor/rules/documentation-sync.mdc` for the complete mapping of code changes to doc locations.

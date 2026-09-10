# Homarr documentation (`@homarr/docs`)

The source for [homarr.dev](https://homarr.dev), built with Next.js and Fumadocs UI inside the Homarr monorepo.

## Develop

From the repository root:

```bash
pnpm dev:docs
```

The site runs on `http://127.0.0.1:3003`. To use a local Workshop API:

```bash
WORKSHOP_API_URL=http://127.0.0.1:8090 pnpm dev:docs
```

## Validate

```bash
pnpm --filter @homarr/docs typecheck
pnpm --filter @homarr/docs build
pnpm --filter @homarr/docs validate:links
```

The static export is written to `out/`. The build validates that every registered integration and widget has a docs
page. The link check validates internal Markdown and MDX links against that export.

## Write content

Documentation lives in `docs/`; project posts live in `blog/`. Navigation is controlled by the nearest `meta.json`.
Integration and widget folders pair typed `index.ts` metadata with `index.mdx` content.

Use standard Markdown and MDX. Shared components live in `src/components/`. Mermaid fences, tabs, callouts, zoomable
images, and syntax-highlighted code are supported by the Fumadocs pipeline.

When a user-facing change affects setup or behavior, update the matching page in the same pull request. See the
[documentation-sync skill](../../.agents/skills/documentation-sync/SKILL.md) for the code-to-content map.

## Published formats

- `/docs` — searchable documentation with typed navigation
- `/api-reference` — interactive reference generated from the OpenAPI schema
- `/llms.txt` — compact documentation and blog index for agents
- `/llms-full.txt` — complete processed Markdown corpus
- `/llms.mdx/docs/.../content.md` — raw Markdown for each docs page
- `/llms.mdx/blog/.../content.md` — raw Markdown for each blog post
- `/blog/rss.xml` — RSS feed for project posts

Every docs page and blog post includes copy-Markdown and view-source actions. Search is generated at build time and
runs locally in the browser; it does not depend on an external crawler.

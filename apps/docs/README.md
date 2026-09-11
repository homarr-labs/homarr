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
pnpm --filter @homarr/docs verify:search
```

The static export is written to `out/`. The build validates that every registered integration and widget has a docs
page. The link check validates internal Markdown and MDX links and rendered anchors against that export.
The search check exercises the exported index with title, heading, and body queries and verifies result destinations.

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
runs locally in the browser; it does not depend on an external crawler. Markdown exports and search resolve
integration credentials and widget defaults from the same typed metadata used by the pages.
The getting-started overview and complete Custom JSX component catalog are also included, with property types,
binding contracts, and blocked capabilities taken from the published catalog JSON.

Published Docusaurus `/docs/category/...` addresses remain available as static compatibility pages. They forward to
the corresponding overview or developer setup guide, preserving query strings and anchors, and provide a direct
link when JavaScript is disabled. Their canonical metadata points to the destination; compatibility pages are
excluded from search and the sitemap.

## Kapa AI

The **Ask AI** launcher uses Homarr's existing public Kapa Website ID. The root layout loads the widget once across
client-side navigation. **Search** and `Ctrl+K` / `Cmd+K` always use Fumadocs search, including when Kapa is unavailable.

Set `KAPA_WEBSITE_ID` at build time to use a different Kapa Website Widget integration. An explicitly empty value
disables the widget, for example `KAPA_WEBSITE_ID= pnpm --filter @homarr/docs build`. This is a public integration ID
included in exported pages, not a Kapa API key. Rebuild the static export after changing it.

In the Kapa dashboard, confirm the integration is live and enable the production and preview domains. Restoring the
script does not verify that the historical integration is still active. Follow the
[Kapa widget setup](https://docs.kapa.ai/integrations/website-widget/quickstart) for domain restrictions and CSP settings.

After changing the documentation structure, review the Website Crawl source in Kapa: use the deployed `/docs` URL as
the start URL and preview `main` as the content selector. Replace any old Docusaurus-specific selector and check that
titles, headings, code samples, and integration details appear in the extracted Markdown. Docs are exported as HTML;
the site also publishes `/sitemap.xml` and permits crawling in `/robots.txt`. The `/llms.txt` exports do not configure
Kapa ingestion automatically. See [Kapa source setup](https://docs.kapa.ai/getting-started/index-your-first-source).

Before publishing, check that Ask AI opens after navigating between pages, ask a documentation question, and verify
its citations point to the current docs. In a separate check, block `widget.kapa.ai` and confirm search still works.

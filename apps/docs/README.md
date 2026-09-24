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
pnpm --filter @homarr/docs verify:seo
```

The static export is written to `out/`. The build validates that every registered integration and widget has a docs
page and typed metadata module. CI enforces this alongside schema drift and export validation. The link check validates internal Markdown and MDX links and rendered anchors against that export.
The search check exercises the exported index with title, heading, and body queries and verifies result destinations.
The SEO check validates canonical URLs, descriptions, social metadata, heading structure, and sitemap coverage in the
exported HTML. These tags are generated at build time; set `HOMARR_WEBSITE_URL` before building for a different origin.

## Preview the static export with PocketBase

After building the docs, run from the repository root:

```bash
sh apps/workshop/preview-docs.sh
```

Open `http://127.0.0.1:8093/docs/`. This starts an isolated PocketBase container with temporary local data and serves
the export directly, including search, Markdown, and the custom 404 page. Workshop browser requests use the configured
backend; a trailing `/api/` is removed because the PocketBase SDK appends its API paths. The preview does not copy or
migrate another database. Set `WORKSHOP_API_URL` to a remote PocketBase origin when testing against one;
`WORKSHOP_REMOTE_API_URL` can override the server-side metadata source independently. Direct item links then use that
source for titles and social metadata. Missing remote items return 404; an unavailable backend returns 503.

Verify public item pages without changing the remote database:

```bash
REMOTE_WORKSHOP_URL=https://workshop.example.com
WORKSHOP_TEST_URL=http://127.0.0.1:8093 WORKSHOP_REMOTE_API_URL="$REMOTE_WORKSHOP_URL" \
  node apps/workshop/tests/remote-workshop.integration.mjs
```

Stop it with `docker stop homarr-docs-static-preview`. Rebuild and restart the preview after changing source files;
startup recreates the runtime configuration. `DOCS_PREVIEW_PORT`, `DOCS_PREVIEW_HOST`, and `DOCS_PREVIEW_NAME` override
the defaults. Set the host to this machine's Tailscale address to access it from your other devices.

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
- `/llms.mdx/api-reference/.../content.md` — operation parameters, bodies, responses, and authentication
- `/blog/rss.xml` — RSS feed for project posts

Every docs page and blog post includes copy-Markdown and view-source actions. Search is generated at build time and
runs locally in the browser; it does not depend on an external crawler. Markdown exports and search resolve
integration credentials and widget defaults from the same typed metadata used by the pages.
The search dialog and its client-side engine load when search is first opened. Fumadocs caches the downloaded index
for subsequent queries. The docs index, individual Markdown pages, and full corpus share the `llms()` renderer.
API operations are indexed alongside docs and exported as Markdown from the same OpenAPI schema. The reference uses
Fumadocs with Scalar: select an instance URL and API key, then explicitly send a request. Authentication is not
persisted in local storage. Browser access requires the documented REST CORS configuration.

The Custom JSX guide includes a lazily loaded, editable example using the application renderer and real component
registry. Its bindings work locally; configured widget queries and actions do not run.

The getting-started overview and complete Custom JSX component catalog are also included, with property types,
binding contracts, and blocked capabilities taken from the published catalog JSON.

Published Docusaurus `/docs/category/...` addresses remain available as static compatibility pages. They forward to
the corresponding overview or developer setup guide, preserving query strings and anchors, and provide a direct
link when JavaScript is disabled. Their canonical metadata points to the destination; compatibility pages are
excluded from search and the sitemap.

## Fumadocs upgrade notes

The September 2026 update moves Core/UI from 16.15.4 to 16.15.12, MDX from 15.4.0 to 15.4.3, and OpenAPI from
11.3.5 to 12.0.1. Review the upstream [Core](https://github.com/fuma-nama/fumadocs/blob/dev/packages/core/CHANGELOG.md),
[UI](https://github.com/fuma-nama/fumadocs/blob/dev/packages/radix-ui/CHANGELOG.md),
[MDX](https://github.com/fuma-nama/fumadocs/blob/dev/packages/mdx/CHANGELOG.md), and
[OpenAPI](https://github.com/fuma-nama/fumadocs/blob/dev/packages/openapi/CHANGELOG.md) changelogs when upgrading.

- Core/UI and MDX now declare side effects for better tree shaking. UI also fixes tabs reverting to the URL hash.
- Core's `llms({ renderPage })` API provides the shared `index()`, `page()`, and `full()` exports.
- OpenAPI 12 replaces several custom renderer options and hooks. This site uses `createOpenAPIPage()` and
  `getOpenAPIPageProps()` without those removed overrides; the built-in renderer retains all request languages.
  The Scalar adapter receives an equivalent nonrecursive union for unconstrained JSON values to avoid recursive
  schema expansion during rendering. The generated public OpenAPI document remains unchanged.
- MDX 15.4.3 fixes duplicate compilation output when its experimental build cache is enabled. We leave that cache
  disabled: its current key checks source content without accounting for all compiler configuration changes.
- The existing macro collections, processed-Markdown component adapters, and static search remain supported.
  Typed version roots and server-side MCP tools are available upstream but are not needed by this static site.

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

## Release verification

The production image compiles the docs itself; it does not depend on a host `out/` directory.
Build-time `HOMARR_WEBSITE_URL` controls canonical metadata. Runtime URL overrides configure Workshop connections
but do not rewrite already-exported canonical URLs.

PostHog records SPA pageviews and named `demo_opened`, `installation_opened`, and `link_clicked` events through
`hog.homarr.dev`. Link events include destination, source path, external status, and an explicit CTA label when present.
Form autocapture and session replay are disabled; tracked URL query strings and fragments are removed. Localhost and
`?analytics_test` traffic carries `verification=true`; exclude it from production reports.

Carbon loads one visible placement after the desktop TOC, below API examples, or below content on other layouts.
The homepage is excluded at every viewport size. Navigation reloads the ad script; resizing changes placement only when crossing its breakpoint. Ad blockers
or no-fill responses must not prevent content, navigation, or search from working.

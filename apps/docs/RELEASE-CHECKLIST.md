# Fumadocs + Workshop release checklist

Keep this PR a draft until the staging gates pass. Production promotion is a separate action.
Use the same candidate image digest throughout staging and promotion.

## Verified locally

- [x] Build the combined PocketBase/docs production image with production canonical URLs.
- [x] Start with empty isolated storage; verify health, UID 100, migrations, administration, and public reads.
- [x] Check static HTML, search, Markdown, assets, redirects with query strings, and HTML/API 404s.
- [x] Verify gzip and identity responses, including explicit `gzip;q=0` rejection.
- [x] Replace the container with the same volume; verify persisted records and uploaded bytes.
- [x] Back up stopped storage and restore into a separate volume; verify authentication, records, and uploaded bytes.
- [x] Run docs/API typechecks, schema drift, integration/widget coverage, rendered links, search, and SEO checks.
- [x] Verify all 42 API operations have descriptions and appear in search and Markdown exports.
- [x] Exercise the API client with a configurable instance URL and API key; sending is explicit and credentials
      are not retained in local storage. Verify authenticated cross-origin requests against a real Homarr runtime.
- [x] Test blog/category redirects, canonical URLs, sitemap, mobile API layout, and direct deep links.
- [x] Exercise the embedded Custom JSX example: bindings, progress changes, malformed input, reset, theme,
      keyboard access, mobile layout, and focused accessibility checks.
- [x] Run Workshop integration checks for permissions, submissions, uploads, moderation, social previews,
      missing items, runtime configuration, OAuth configuration rotation, and migrations.

## Carbon

- [x] Carbon follows the desktop TOC. Full-width pages and pages without a TOC place it below the content;
      mobile/tablet layouts also place it below the content.
- [x] The homepage neither displays nor requests an ad at any viewport size; navigating away loads one.
- [x] Client navigation requests a fresh ad; back/forward and breakpoint changes retain one active unit.
- [x] Long/empty TOCs, full-width docs, API reference, blog, Workshop details, and 404 pages have a placement.
- [x] Blocking Carbon and no-fill responses leave navigation/content usable; no periodic refresh timer is used.
- [ ] Verify delivery and placement on the intended staging hostname before release.

## PostHog

- [x] Initial/client navigation and back/forward each emit one pageview; hash navigation adds none.
- [x] Demo, Install, and other links emit `demo_opened`, `installation_opened`, and `link_clicked` respectively.
      Normal, Ctrl-click, and native middle-click events were checked without delaying navigation.
- [x] Verify site/source/destination/external properties and removal of URL queries/fragments, including nested
      person properties. Form, API-key, and ad-click autocapture and session replay remain disabled.
- [x] Verify HTTP 200 ingestion through `hog.homarr.dev` and stored events in project 62963.
- [x] Blocking analytics does not break the site. Exclude `verification=true` traffic from production reports.

## Remaining staging gates

- [x] Native amd64 and arm64 image-smoke CI jobs passed, including persistence and restore.
- [x] Documentation and application CI passed on code commit `333206c06`, including the Fast gate, schema drift,
      links/search/SEO, formatting, and database validation.
- [ ] Complete real GitHub OAuth sign-in/out on the configured staging callback; configuration tests alone do not
      exercise the external provider. Recheck account permissions and disposable upload/moderation after sign-in.
- [ ] Verify proxy headers/TLS, OAuth URLs/secrets, persistent storage, backups, resource limits, and public assets
      using the intended staging configuration. Check API-client requests against the intended HTTPS Homarr origin.
- [x] Verify Kapa opens after client navigation and local search works with its script blocked.
- [ ] Verify Kapa answers/citations and crawl/domain configuration in a normal browser on staging. Automated QA
      reached the provider but received HTTP 403 (`Captcha token is invalid`); no answer was available.
- [ ] Record and rehearse the prior-image rollback with an isolated restored backup in staging.

## Promotion only — intentionally not performed by this PR

- [ ] Record the tested published image digest and production backup; approve promotion and change PR draft status.
- [ ] Deploy that digest and repeat health, docs/search, Workshop, Carbon, and PostHog public-hostname checks.

## Evidence

Carbon placement revised on 2026-09-24: focused docs typecheck, formatting, and production build passed. Browser
checks confirmed no homepage ad/request at 1440px and 390px, placement after the desktop TOC and below installation
content, and one fresh script on client navigation. This supersedes the earlier above-the-fold placement requirement.

Dependency refresh on 2026-09-24 incorporates `release/v2` through `a974c9642`, including Next 16.3.3,
Mermaid ^11.16.1 (resolved to 11.17.2), and the security overrides. The regenerated lockfile retains the Fumadocs
pins and unrelated Babel, Lucide, and Zod resolutions. Frozen installation, all 21 focused API/CORS/widget-manifest tests, and docs
typechecking passed. The rebuilt combined image
`sha256:7148d4777cf3c6abbfdbe96524fd8c7bfb864b7e7c8425f9d5f66c314cc25aeb`
passed runtime configuration, static routes, persistence, and backup/restore checks. Its exact export passed
search, Markdown, SEO, and link validation with the same counts below. External-service evidence below predates
this dependency refresh; the remaining staging gates still apply. A fresh browser regression verified mobile API
navigation without horizontal overflow, a valid Scalar example with no automatic API request, operation search,
and editing/resetting the actual Custom JSX playground. Native amd64/arm64 image smoke and docs CI passed on
dependency merge `76bcce4ed`.

Verified on 2026-09-23–24. Local amd64 production image:
`sha256:4395c7c5b9ee2504fcabcd706a4b7d284864b3037c334f69604b0483a34bb23b`.
This is a local image ID, not a published multi-architecture manifest digest. Canonical origin is `https://homarr.dev`;
only runtime Workshop connections were overridden for isolated browser checks.

- Exact-image smoke passed, including backup/restore and uploaded-file byte comparisons.
- Exact-image export: 275 Markdown pages, all 42 API operations, 108 search destinations, 279 canonical pages,
  and 12 noindex pages. Blog alias SEO now passes.
- Search transfer compressed from about 8.23 MB to 1.52 MB; search still loads only on demand.
- Real REST runtime: valid key 200, missing/invalid key 401, missing endpoint 404, OPTIONS 204; authenticated browser
  cross-origin fetch succeeded. Six focused CORS tests and the complete Workshop integration suite passed.
- PostHog readback of marked checks after 20:00 UTC: 16 pageviews, 3 demo, 6 install, and 4 link events.
  These are aggregate QA totals; separate browser traces checked per-interaction duplication and URL sanitization.
- Recursive integration-request JSON schemas render through Scalar without unbounded expansion; two focused
  normalization tests and a 256 MB capped render passed. The raw published API contract is preserved.
- The widget registry's 13 manifest checks passed; the Stats polling entry now matches its definition.
- Independent browser review covered ad lifecycle, analytics payloads, mobile layout, and the widget playground.
  Focused playground accessibility scanning reported no violations.

The example staging hostname `v2.preview.homarr.dev` was reachable over HTTPS on 2026-09-24. PocketBase health
and the public GitHub OAuth provider listing responded successfully, but the site still served Docusaurus rather
than this Fumadocs candidate. It cannot establish candidate deployment, callback, ad-placement, or rollback proof.

Unchecked staging gates remain required; local success does not verify external OAuth or production configuration.

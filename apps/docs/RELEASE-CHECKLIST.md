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
- [x] Verify all 41 API operations have descriptions and appear in search and Markdown exports.
- [x] Exercise the API client with a configurable instance URL and API key; sending is explicit and credentials
      are not retained in local storage. Verify authenticated cross-origin requests against a real Homarr runtime.
- [x] Test blog/category redirects, canonical URLs, sitemap, mobile API layout, and direct deep links.
- [x] Exercise the embedded Custom JSX example: bindings, progress changes, malformed input, reset, theme,
      keyboard access, mobile layout, and focused accessibility checks.
- [x] Run Workshop integration checks for permissions, submissions, uploads, moderation, social previews,
      missing items, runtime configuration, OAuth configuration rotation, and migrations.

## Carbon

- [x] Real creatives render above the fold on desktop and non-home mobile/tablet pages, without TOC overlap.
- [x] The mobile homepage neither displays nor requests an ad; navigating away loads one.
- [x] Client navigation requests a fresh ad; back/forward and breakpoint changes retain one active unit.
- [x] Long/empty TOCs, full-width docs, API reference, blog, Workshop details, and 404 pages have a placement.
- [x] Blocking Carbon and no-fill responses leave navigation/content usable; no periodic refresh timer is used.
- [ ] Verify delivery on the staging/production hostname and confirm the placement with Carbon before release.

## PostHog

- [x] Initial/client navigation and back/forward each emit one pageview; hash navigation adds none.
- [x] Demo, Install, and other links emit `demo_opened`, `installation_opened`, and `link_clicked` respectively.
      Normal, Ctrl-click, and native middle-click events were checked without delaying navigation.
- [x] Verify site/source/destination/external properties and removal of URL queries/fragments, including nested
      person properties. Form, API-key, and ad-click autocapture and session replay remain disabled.
- [x] Verify HTTP 200 ingestion through `hog.homarr.dev` and stored events in project 62963.
- [x] Blocking analytics does not break the site. Exclude `verification=true` traffic from production reports.

## Remaining staging gates

- [ ] Check the candidate commit's documentation and native amd64/arm64 image-smoke CI jobs.
- [ ] Complete real GitHub OAuth sign-in/out on the configured staging callback; configuration tests alone do not
      exercise the external provider. Recheck account permissions and disposable upload/moderation after sign-in.
- [ ] Verify proxy headers/TLS, OAuth URLs/secrets, persistent storage, backups, resource limits, and public assets
      using the intended staging configuration. Check API-client requests against the intended HTTPS Homarr origin.
- [ ] Verify Kapa opens after navigation, returns useful answers with current citations, and has current crawl/domain
      configuration; blocking Kapa must leave local search available.
- [ ] Record and rehearse the prior-image rollback with an isolated restored backup in staging.

## Promotion only — intentionally not performed by this PR

- [ ] Record the tested published image digest and production backup; approve promotion and change PR draft status.
- [ ] Deploy that digest and repeat health, docs/search, Workshop, Carbon, and PostHog public-hostname checks.

## Evidence

Verified on 2026-09-23. Local amd64 production image:
`sha256:dff7d74d23d6dc35376ecb0f15366a8def172e35e76b8e29239326eb91acddc2`.
This is a local image ID, not a published multi-architecture manifest digest. Canonical origin is `https://homarr.dev`;
only runtime Workshop connections were overridden for isolated browser checks.

- Exact-image smoke passed, including backup/restore and uploaded-file byte comparisons.
- Exact-image export: 274 Markdown pages, all 41 API operations, 106 search destinations, 278 canonical pages,
  and 12 noindex pages. Blog alias SEO now passes.
- Search transfer compressed from about 8.23 MB to 1.52 MB; search still loads only on demand.
- Real REST runtime: valid key 200, missing/invalid key 401, missing endpoint 404, OPTIONS 204; authenticated browser
  cross-origin fetch succeeded. Six focused CORS tests and the complete Workshop integration suite passed.
- PostHog readback of marked checks after 20:00 UTC: 16 pageviews, 3 demo, 6 install, and 4 link events.
  These are aggregate QA totals; separate browser traces checked per-interaction duplication and URL sanitization.
- Independent browser review covered ad lifecycle, analytics payloads, mobile layout, and the widget playground.
  Focused playground accessibility scanning reported no violations.

Unchecked staging gates remain required; local success does not verify external OAuth or production configuration.

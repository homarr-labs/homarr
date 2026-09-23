# Fumadocs + Workshop release checklist

Use the exact candidate image digest throughout staging and promotion. A passing build is not deployment proof.

## Candidate verification

- [ ] Build `apps/workshop/Dockerfile --target production` from the candidate commit with the production
      `HOMARR_WEBSITE_URL`, `WORKSHOP_API_URL`, and `WORKSHOP_WEB_URL` build arguments.
- [x] Start that image with an empty, isolated `/pb_data` volume; confirm health, non-root runtime, migrations,
      PocketBase administration, and public Workshop listing reads.
- [x] Run `apps/workshop/test-image.sh`: static search, Markdown exports, trailing-slash redirects, HTML/API 404s,
      runtime URL overrides, Workshop social metadata, and public CORS.
- [ ] Restart the container with the same volume and verify data persists. Rehearse backup and restore into a
      separate volume. Do not reuse an unsupported pre-consolidation v2 database.
- [ ] Verify both published amd64 and arm64 images; smoke-test the architecture used by production.
- [ ] Check canonical URLs, sitemap, robots, legacy category redirects, blog redirects, images, and assets through
      the production reverse proxy. Resolve the existing `/blog/` redirect mismatch in `verify:seo`.
- [ ] Run docs typecheck, coverage, link, search, and SEO checks against the candidate export.
- [ ] Navigate between docs, blog, API reference, home, and Workshop without reloads; test search, hash links,
      light/dark theme, browser back/forward, and a direct deep-link reload.

## Carbon

- [x] A real creative renders above the fold at 1366×768 and 1920×1080; no TOC overlap or clipped attribution.
- [x] At 390×844 and 768×1024, non-home pages show one ad before scrolling, with no horizontal overflow.
- [x] At mobile width the homepage neither displays nor requests an ad. Navigating to docs loads one.
- [ ] Client navigation requests a fresh ad; back/forward and desktop/mobile resize leave only one active unit.
- [ ] Long/empty TOCs, full-width docs, API pages, blog posts, Workshop details, and 404 pages retain a placement.
- [ ] Blocking Carbon or receiving no fill leaves navigation and content usable. No ad refresh timer is used.
- [ ] Verify real delivery on the production hostname and confirm the redesigned placement with Carbon.

## PostHog

- [ ] Initial navigation and client-side route changes each emit one `$pageview`; hash links do not create pageviews.
- [ ] Demo emits `demo_opened`, Install emits `installation_opened`, and other HTTP(S) links emit `link_clicked`.
      Verify normal, new-tab, and middle-click navigation without delaying the user's click.
- [ ] Events include `site`, `source_path`/page URL, destination, and internal/external classification as applicable.
      Queries/fragments are stripped from captured URL fields; forms/API credentials and ad clicks are not autocaptured.
- [ ] Verify successful ingestion through `https://hog.homarr.dev` and confirm events in the PostHog project.
      Filter `verification=true` (localhost or `?analytics_test`) out of production reports.
- [ ] Block analytics requests and confirm the site remains usable. Session replay stays disabled.

## Workshop and promotion

- [ ] Verify GitHub OAuth callback, sign-in/out, account permissions, submission/upload, moderation, and installation
      against staging; use disposable content and remove it afterward.
- [ ] Verify saved item URLs/social previews and missing-item responses with the intended local or remote backend.
- [ ] Check API-reference authentication against a real Homarr instance; static rendering does not prove CORS or
      authenticated playground requests. Endpoint descriptions/examples and API search coverage remain follow-up work.
- [ ] Verify production secrets, OAuth URLs, proxy headers/TLS, persistent storage, backups, and resource limits.
- [ ] Capture the running image digest and backup, deploy the candidate, then repeat health, docs, search, Workshop,
      Carbon, and PostHog smoke checks on the public hostname.
- [ ] Record rollback image and data-restore procedure before promotion; verify the rollback in staging.

## Evidence for this update

Verified locally on 2026-09-23 using the production target on amd64, with loopback build URLs.
Local image ID: `sha256:f242f3579ec11d1f49ec79ac1234a1a635e8dbc4370c8cb5b211dd88fb84eaff`.
This is a local image ID, not a published manifest digest. Rebuild with production URLs before promotion.

- Production build, coverage validation, docs typecheck, and the complete image smoke script passed.
- Search verification passed: 233 Markdown exports and 66 result destinations. Rendered links: zero errors.
- PocketBase ran as UID 100; the isolated data volume survived container replacement.
- Real Carbon creatives rendered at desktop, mobile, and tablet sizes. Mobile homepage requested no ad;
  client navigation to docs created a fresh ad without reloading the document. Resizing home to mobile removed it.
- PostHog returned HTTP 200 for pageviews, demo, install, and link events, marked `verification=true`.
  Final-image payloads removed a query/fragment probe and contained no heatmap data. Dashboard readback remains
  unverified: the connected account does not expose the Homarr project.
- `verify:seo` still fails on the existing `/blog/` redirect: `expected one document heading`.

Unchecked items include broader interaction cases and production-only checks; they are not implied passes.

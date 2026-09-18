# Real integration statistics validation

2026-09-18 · branch `feat/new-integration-stats` · base `origin/release/v2` at `4305dd3b7dbe30032e93cf6cc1691b89349babca`.

**23 of 24 new providers passed against real Docker services through Homarr.** Your Spotify remains unverified because it requires a Spotify developer application and an authorized Spotify account. No Mock integration or substituted provider response was used in this run.

## What passed

The running Homarr checkout used its real SQLite database, authentication, integration permissions, HTTP tRPC API, and dedicated Redis cache. Homarr ran as a development server on localhost:3138; the external services and their dependencies ran in the isolated `homarr-stats-live` Docker Compose project. This is not a production-image build.

For each passing provider, `development/integration-stats/validate.mjs` created or updated an integration with actual credentials, passed its connection check, retrieved its catalog, and forced a successful statistics refresh. A pass requires metrics, a non-null update timestamp, and no snapshot error.

| Provider | Catalog fields | Result |
| --- | ---: | --- |
| caddy | 3 | PASS |
| gatus | 4 | PASS |
| myspeed | 3 | PASS |
| netdata | 2 | PASS |
| prometheus | 3 | PASS |
| spoolman | 2 | PASS |
| syncthingRelay | 3 | PASS |
| trilium | 3 | PASS |
| maintainerr | 4 | PASS |
| fileflows | 4 | PASS |
| plantit | 4 | PASS |
| unmanic | 3 | PASS |
| romm | 6 | PASS |
| xteve | 3 | PASS |
| stash | 9 | PASS |
| miniflux | 2 | PASS |
| homebox | 6 | PASS |
| mealie | 4 | PASS |
| karakeep | 6 | PASS |
| linkwarden | 3 | PASS |
| tandoor | 3 | PASS |
| changedetection | 2 | PASS |
| healthchecks | 4 | PASS |
| Your Spotify | 3 | BLOCKED: external Spotify application/account |

Fresh services legitimately contain zero media, bookmarks, recipes, or jobs. MySpeed has no completed speed test and returns missing measurements, shown as a dash rather than a fabricated zero. Non-empty real data includes a 1,000 g Spoolman spool, Trilium notes, two Gatus endpoints, two Prometheus targets, two Changedetection watches, Homebox locations, and a pinged Healthchecks check.

## Compatibility fixes found by real services

- Caddy rejects browser fetch metadata at its admin API. Its provider now uses Homarr's certificate-aware Axios transport without browser fetch headers or redirects.
- Homebox v0.26.2 returns `totalTags` instead of `totalLabels`; either recognized field maps to the labels statistic.
- Plant-it authenticates with username/password and obtains a fresh JWT before reading its statistics.
- Stash uses its actual `ApiKey` request header.
- Unmanic's pending-task POST requires its DataTables request body.
- xTeVe omits zero counters; zero defaults are accepted only after validating `status: true`.
- MySpeed's empty history is a valid response with missing measurements.
- Six integration icon paths were corrected against the upstream icon repository.

Service setup fixes included Plant-it's MySQL dependency, Stash writable configuration directories, Tandoor's container port and allowed hosts, Homebox's required API-key pepper, and Healthchecks' writable SQLite path. Setup details are in the group reports; exact running images are in [image-versions.md](../../development/integration-stats/image-versions.md).

## UI, cache, and code checks

The real-data dashboard displays 24 ordered cards from 23 sources. Desktop grid alignment, advanced view, and the 390 px mobile layout were inspected in the browser. Mobile retained all 24 cards in its scrollable widget with no page-width overflow. Hover details show the source and actual snapshot timestamp. Advanced view exposes those details beneath larger values. The standalone screenshots are retained in the session artifacts.

A fresh `force:false` refresh preserved its previous update timestamp. Redis reports snapshot TTL `-1` (no expiry), and anonymous access to an existing snapshot returned HTTP 403. After correcting the development server's hostname and dedicated Redis network configuration, the dashboard loaded all sources successfully. A separate review found no additional actionable cache/refresh defect.

Focused checks passed: integration, API, widget, and Next.js typechecks; existing widget translation tests (642); integration access and connection tests (18); changed-code formatting; and `git diff --check`. Changed-code lint returned no errors, with existing-style warnings in the Redis module and the upstream Linkwarden `_count` field. No new tests were added.

## Validation limits

The 55 existing integration adapters were not each provisioned in this stack. This run covers the 24 newly added provider candidates, with 23 successful real-service checks. Empty-library checks do not prove every populated or alternate-version response. Your Spotify's container startup alone is not counted as a pass. No production build or full repository test suite was run.

Credentials, authenticated browser state, and detailed response snapshots are stored privately outside Git. The Compose harness includes only environment-variable references to secrets. See [the harness README](../../development/integration-stats/README.md) for reproduction.

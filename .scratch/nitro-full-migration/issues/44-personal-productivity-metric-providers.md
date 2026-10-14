# 44: Personal/productivity metric providers

**What to build:** Configure, test and render the eight productivity providers' exact personal/space/inventory metrics with complete pagination and safe credential handling.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds below all have native Stats, connection checks and generic HTTP eligibility; K means apiKey, other units are counts.

| Kind | Auth and complete metrics/semantics |
| --- | --- |
| `yourSpotify` | K query token; songs,artists,time (seconds); source all-time dates, first bucket, ms-to-seconds |
| `mealie` | K bearer; recipes,users,categories,tags; household scope/schema |
| `trilium` | K raw Authorization, no added Bearer; version (text),notesCount,dbSize (bytes); JSON ETAPI format |
| `tandoor` | K bearer; users,recipes,keywords; first space/empty space, paginated keyword total |
| `spoolman` | none; spools,remainingWeight (grams); exclude archived and sum weights |
| `linkwarden` | K bearer; links,collections,tags; envelope variants, collection totals, repeated/max-1000 cursor guard |
| `karakeep` | K bearer; bookmarks,favorites,archived,highlights,lists,tags; user-owned aggregate |
| `changedetection` | K x-api-key; diffsDetected,totalObserved; object-key watch list/source diff predicate |

Miniflux remains #40-owned. Exact evidence: original INTEGRATION-005 and research §2.1.

## Required contracts

Accept #40 Stats/snapshot/operation/trusted request interfaces, #41 managed form/check interfaces, #88 metric consumption and #04/#03 policy/refresh/invalidation revisions. Interfaces, not full producer completion, gate independent work; real identity/crypto/storage/outbound runtime and all eight target UI demos are release joins.

## Decision holds

Q11/Q12 gate concrete persistence/conversion paths; Q15 is limited to applicable session continuity. Per-service freshness/restart and native URL/trust changes need explicit dispositions where relevant. Exact runtime/library/server/auth baseline and secure live access remain unverified, not inferred approval.

## Ownership

Exclusive local clients, native parsing, projections, descriptors and focused fixtures for these eight kinds. No Miniflux, management form, common transport, physical schema or widget source edits; #40/#41/#02/#88 retain those boundaries. COMPOSITION alone owns central registration/exports/manifests.

- [ ] Demonstrate each registered kind's configure/test/masked edit/remove/delete and authorized metric-card consumption, preserving every credential field, native check and exact H mode.
- [ ] Keep table metrics and source scopes: all-time/first-bucket, first-space, household/user ownership and archived exclusion are not generalized counters. Empty, missing, partial and schema-error outcomes remain distinct from zero.
- [ ] Linkwarden pagination stops on repeated cursor or bound, checks abort between pages and preserves complete tag totals; Tandoor uses aggregate count, not first-page length.
- [ ] Policy resolves before secret access; redact query/raw-header credentials and errors, preserve prefixed URLs/external links, and fence config/trust/delete/cancellation completions through accepted refresh ports. Focused mode/paging/error/denial fixtures establish these behaviors.
- [ ] Collect independent target UI/result evidence for every metric. Live paging/source-scope evidence is later and explicitly approved with deployed versions/modes/minimum access; unknown services do not pass and no mandatory automatic all-88 live matrix is created.

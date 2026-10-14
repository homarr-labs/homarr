# 43: Media/library metric providers

**What to build:** Configure, test and consume all seven media/library native Stats providers through authorized metric cards, preserving source meaning rather than reducing them to generic counts.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds below all have native Stats, connection checks and generic HTTP eligibility. K means apiKey; unspecified units are counts.

| Kind | Auth and complete metrics/semantics |
| --- | --- |
| `autobrr` | K query apikey; approvedPushes,rejectedPushes,filters,indexers; release counts and list lengths |
| `jellystat` | K X-API-Token; songs,movies,episodes,other; fixed 30-day Audio/Movie/Series/Other plays, not inventory |
| `tubearchivist` | K Authorization Token; pendingDownloads,videos,channels,playlists; nullable pending recorded zero, doc_count |
| `komga` | K X-API-Key; libraries,series,books; availability/totalElements, series/books list POST with empty object |
| `romm` | none; platforms,roms,saves,states,screenshots,totalFileSize (bytes); uppercase size alternatives/missing size |
| `stash` | K ApiKey; scenes,images,galleries,performers,studios,tags,sceneBytes,imageBytes (bytes),sceneDuration (seconds); compiled GraphQL |
| `maintainerr` | none; itemsHandled,episodesHandled,moviesHandled,reclaimable (bytes); storage coercion |

Exact native/auth row evidence: original INTEGRATION-004 and integration research §2.1.

## Required contracts

Start needs accepted #40 snapshot/Stats/context/trusted request/result interfaces, #41 reusable configure/test form and #88 metric-selection/consumption interface; #04 provides policy-before-decrypt and #03 refresh/fencing. Only consumed revisions gate dispatch, not whole producer completion. Real policy/crypto/repository/outbound runtime plus persisted configuration and metric UI are release joins.

## Decision holds

Q11/Q12 apply to concrete SQL/conversion work; Q15 only to applicable session continuity. Cache/restart lifetime and native URL/trust policy changes remain held where material. Runtime/library and deployed version/access evidence is unverified; no blanket policy or live matrix is approved.

## Ownership

Own only these seven provider clients/native parsers/projections, descriptors and focused fixtures; consume #40's common transport. #41 owns reusable management UI, #88 widget presentation and COMPOSITION central registration/manifests. Record exclusive provider files before dispatch.

- [ ] Each kind completes authorized configure/test/masked edit/mode/remove/delete and a named Stats-card consumption demo, with exact registered identity, metadata and H authentication; source no-auth never bypasses Homarr policy.
- [ ] Preserve every table metric/unit and source scope; distinguish collection lengths, pagination totals, nullable defaults and missing fields. GraphQL application errors on HTTP success remain errors, not fabricated scalars.
- [ ] Check native allowed-kind/query before decrypt; full access gates configuration/generic HTTP. Redact query/header credentials and raw causes, preserve base prefixes/external links and exact POST-as-read behavior.
- [ ] Focused valid/empty/partial/invalid/application-error, pre-abort/deadline and config/trust/delete fixtures prove stale-result fencing, bounded refresh and no credential leakage, using accepted state ports rather than a new polling fleet.
- [ ] Record composed target management/metric evidence for all seven independently; any later live evidence requires explicit approved versions/auth/endpoints and bounded source reads, not merely connection success. Unknown or inaccessible providers remain unverified and no automatic all-provider live matrix is required.

# 49: Media organizer libraries

**What to build:** Configure/test five organizers and consume their complete authorized libraries, calendars and supported missing/queued media, retaining source-specific result meaning.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds all use K X-Api-Key, native tests and generic HTTP eligibility. K means apiKey; unspecified units are counts.

| Kind | Native surface and exact Stats projection |
| --- | --- |
| `sonarr` | library/calendar/missing/queue; shows,monitored,downloaded (episodes),missing,queued,episodes,storage (bytes) |
| `radarr` | library/calendar/missing/queue; movies,monitored,downloaded (movies),missing,queued,storage (bytes) |
| `lidarr` | library/calendar only; artists,monitored,upcoming (next seven days) |
| `readarr` | library/calendar only; books,monitored,upcoming (next seven days) |
| `bindery` | missing/queue schemas/totals/pageSize only; no Stats implementation |

Exact method/auth/native evidence: original INTEGRATION-010 and research §§2.2–2.3. Do not invent Lidarr/Readarr missing-media functions or Bindery metrics.

## Required contracts

Start requires accepted #40 execution/snapshot/query/trust/results, #54 shared calendar/date/recurrence/link interface, #41 forms and #80 calendar/organizer plus #88 metric consumption interfaces. Only exact interfaces gate dispatch; completing CalDAV or all widgets is not a native blocker. Real policy/secrets/storage/runtime and every provider's configure/test/native UI path are release joins.

## Decision holds

Bindery/Wazuh selectable-but-no-Stats discrepancy needs approved retain-empty/unsupported or separately specified capability-map correction; changed metric selection remains held. Q11/Q12 apply to concrete persistence/conversion and Q15 applicable sessions. Calendar clock/timezone behavior, native URL/trust changes, runtime and deployed Readarr/version/access evidence remain qualified where needed, never inferred future support guarantees.

## Ownership

Own the five clients, shared organizer composition, local descriptors and focused fixtures; #54 solely owns the shared calendar contract. #80/#88 own saved widget orchestration/presentation, #41 forms and COMPOSITION central registration/manifests/exports. Exclusive source allocation precedes dispatch.

- [ ] Each kind completes authorized configure/test/masked edit/remove/delete, exact H/native checks and named library/calendar/missing/queue/Stats UI consumption according to its actual capabilities.
- [ ] Fixtures preserve Sonarr monitored/episode/image mapping, Radarr physical/digital/cinema releases, Lidarr albums/artists and Readarr author/book/release fields; missing/queue Stats use totalCount/pageSize=1 while native lists honor requested bounds.
- [ ] Calendar results preserve month plus six-day margins, unmonitored options, release filters/windows, Date/image/external links and seven-day Stats scopes. Check exact allowed kinds/query before decrypt, redact keys/errors and preserve base prefixes.
- [ ] Focused empty/partial/schema/application-error/abort/revision fixtures prove bounded paging, native cache semantics and config/trust/delete fences. Bindery's unsupported/empty Stats is explicit, not fabricated or silently removed.
- [ ] Demonstrate each provider's actual target results independently; later bounded live library/calendar/missing/queue reads require explicitly approved deployed versions/filter/auth/access. Unknown Readarr future support and unavailable live deployments remain unverified, not a passed automatic all-provider matrix.

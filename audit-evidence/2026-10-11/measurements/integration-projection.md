# Select only linked board IDs during integration authorization

The integration middleware (two lookups) and media-request search integration lookup previously loaded every column of each linked widget item. The only consumed item field is boardId in hasQueryAccessToIntegrationsAsync. Full options/advancedOptions strings and all other item fields are discarded before downstream integration data/HTTP responses. Selecting boardId keeps the relation, ordering, permission checks and public response shape.

Baseline source was frozen before edits. The original large input baseline recorded 8,243,961 materialized bytes and 8,276,016 bytes of held heap delta after GC. Final repeated comparison uses the same extracted real Drizzle query relation options, actual migrated SQLite schema, pinned Node 24.18.0, 512 MiB heap limit, concurrency one, one warm-up and explicit GC after event-loop yields. Each linked synthetic widget has 16 KiB options and 16 KiB advancedOptions. One public board and an Overseerr integration avoid sensitive data. Sizes 1/25/250 are synthetic scale points, not observed user workloads.

Nine alternating before/after process pairs per size (54 fresh processes), twenty subsequent released queries per process, produce integration-projection-raw.json. integration-projection-summary.json uses the ordinary median (mean of two middle observations for even sample counts). An initial parent attempt lost child stdout on immediate process exit; output was changed to synchronous write and the entire formal paired run was repeated. The incomplete attempt is not used. Original small/representative calibration files precede the corrected post-release yield protocol and are not used in the final results.

| Linked widgets | Serialized DB result before / after | Held heap delta before / after | Median warm query ms before / after |
|---:|---:|---:|---:|
| 1 | 33,153 / 258 B | 61,200 / 14,024 B | 1.79 / 1.58 |
| 25 | 824,511 / 2,121 B | 844,808 / 29,208 B | 3.38 / 1.88 |
| 250 | 8,243,961 / 19,821 B | 8,272,328 / 32,944 B | 21.12 / 3.46 |

At 250 widgets, per-process median query times range 20.14–31.18 ms before and 2.38–3.59 ms after. Held-delta ranges are 8.22–8.51 MB before and -0.099–0.302 MB after: small after deltas have GC noise, so the stronger conclusion is removal of the large option-string materialization. Median sampled max RSS is 299.70 / 285.13 MB; held RSS is 285.08 / 284.41 MB, which does not support a material steady-state RSS claim. External and ArrayBuffers after the held GC are unchanged at 4,862,085 / 2,241,235 B (ArrayBuffers is included in external).

After releasing the result, large-input heap deltas return near the initial GC baseline (-11,248 / -10,592 B median). Twenty repeated released queries show small runtime/measurement-bookkeeping drift: after variant +45,792 B from cycle 1 to 20, +26,336 B from 11 to 20. This does not show widget-sized result accumulation; it also does not prove indefinite flat memory or whole-application freedom from leaks. Snapshot arrays and timings are retained by the harness. Sampled maxima are not exact peaks.

Time/space: row count remains O(N). Materializing and serializing full options adds O(N*S) input-byte work and memory before; the item projection now carries O(N) board IDs. The same board IDs and byte-identical downstream integration payload are asserted in every pair. The media-search query shares the three-field relation shape; existing authorization/API checks are required separately. SQLite was measured; PostgreSQL runtime was not.

This is a server query-allocation and CPU result, not client retained heap, a network payload reduction, or a whole-server RAM percentage. No public fields were removed.

# K pinned snapshot-ID source fix

Source-only handoff for `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-schema-snapshot-id-wTek86tz`. No further edits by this lease. Coordinator hash freezing, validation, compilation, and approval remain pending; no commands, checks, tests, compilation, module evaluation, or native SQL were performed here.

## Exact deltas

- `control/schema-control.ts`: only the `proof()` lineage loop changes. The UUID-shape predicate gains one private boolean exception requiring index `36`, path `meta/0036_snapshot.json`, ID `ddg-bangs-sqlite-0036`, incoming `prevId` `fc94243d-373c-4834-890e-560bbbd53f12`, and the actual previously verified `files` pin with size `55739` and SHA-256 `4919812d9b1980ac0201e3aca7a1bd9bbdcecaa17c9e1e4a4e67b0f53b886f02`. Existing all-assets byte/hash proof precedes this loop. Snapshot version `6` and dialect `sqlite`, chain continuity `prevId === previousId`, and uniqueness `!seenIds.has(id)` remain mandatory outside the exception. Every other ID retains the existing UUID regex; lineage output fields are unchanged.
- `records/launch-schema.py`: only the fixed `STAGE` and `ORIGINAL_COMPILE_CONTROL` literals change to this fresh root and its `/control`, respectively. This is the forthcoming actual compilation origin, not a claim about previous compilation. Launcher logic, evidence contracts and hashes, six-variable environment, cache/init/security/native/receipt/strict-close behavior, and watchdog remain unchanged.
- `.scratch/nitro-full-migration/implementation/convergence-K-snapshot-id-fix.md`: this handoff record.

## Evidence limits and unchanged holds

The coordinator reports that the source-asset lineage projection identifies exactly one ID-grammar exception among all 51 snapshots, with a continuous unique chain. That factual projection is not a native PASS and was not independently checked in this lease. The prior `SNAPSHOT_LINEAGE` failure occurred with native attempts zero; the old failed stage, CID `65ae...`, once-lock, raw receipt, and recorded forced-true state remain untouched. Historical snapshots, all 103 asset pins, seven evidence records, copied inputs, generated output, manifests, approvals, product sources, configuration, and data were not written.

Coordinator type/lint validation, new 111-input compilation and closure review with the same 110 dependency inputs, source/compiled/host review, frozen hashes, and fresh authenticated approval remain required before any new synthetic native attempt. This handoff authorizes no run, rerun, K repair, D clearance, application boot, adoption, or production release.

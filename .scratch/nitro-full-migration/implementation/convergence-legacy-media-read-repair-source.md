# Legacy Spotlight media read repair — source frozen

## Result and lease

**The two independently reviewed P2 repairs and one indentation correction are authored and frozen; independent source review and fresh focused type/lint/format validation remain required.** No validation or runtime acceptance is claimed.

Sole product file: `packages/spotlight/src/modes/external/search-engines-search-group.tsx`. This renewed lease starts from the coordinator's cancelled partial source, not the original pre-connector file. Its supplied **26,961 bytes / SHA-256 `3b6294e14f27848c78de11416bd11fcd3361e8d763d2e7e71817349ce9cc4b67`** matched the new before-image before editing.

New private evidence allocation:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-legacy-media-read-repair-s69zz03y`

Frozen after-image: **27,169 bytes / SHA-256 `6dc7af33e30b506b9013b9561774a31ea09c1751e7cc959380bf12c800951c97`**.

All product changes used `functions.patch`. This author will not edit the frozen source further without a renewed lease.

## Exact two repairs

### 1. Initial cached access is uncertain, not a permanent denial

The committed layout observer now retires an integration permission/target observation only when the actual mounted owner is active, its captured modal presentation remains current, the catalog observer reports **`isFetchedAfterMount`**, the catalog result is successful, and access is denied/missing. Observable session mismatch still retires independently and permanently.

The observer marker is an existing typed query-result field, not an invented epoch or authority token. Installed evidence: `node_modules/@tanstack/query-core/build/modern/_tsup-dts-rollup.d.ts:1495`; `queryObserver.js:243,328` compares result data/error update counts with the observer's initial query state. Initial cached success alone therefore cannot satisfy this branch; successful-result gating also excludes an errored fetch from becoming a permanent permission denial.

The existing `refresh(mounted)` owner guard is unchanged. Initial cached denial cannot retire the intent before that required dialog refresh is issued. After its actual `catalog.refetch({throwOnError: true})` resolves, the existing current-owner check and explicit returned-record permission check still permanently retire a genuine denied/missing target before reading options. No old cached success is relabeled a fresh read, no refresh is skipped, and no permission/query-success gate is weakened. This remains an observed UI/resource association, not proof of future server freshness or a revocation sequence.

### 2. Observer read errors join the existing read-only error/retry path

`readError` selects the actual manual refresh error, catalog observer error or options observer error. The existing error output now displays that selected error, and the existing retry control becomes visible for it as well as an unknown mutation outcome. Consequently an observer refetch can expose its real failure even when it did not enter the manual refresh catch.

The retry handler, owner/pending guards and `refresh(owner, mutation.isError)` path are unchanged. It performs the real catalog/options reads and, for an unknown mutation, existing typed cache reconciliation only. It never invokes `mutateAsync`, resets the mutation/shared unknown outcome, clears the permanent dispatch latch or authorizes another write. An idle dialog can regain read admission after a successful read; a dispatched/unknown intent cannot regain Send through this control.

## Formatting and preserved behavior

Removed the one extra leading space before `current.options?.requestedSeasons?.includes(season)`, the existing seasonal validation continuation. No formatter executable or format check was invoked; no canonical-formatter success is claimed. The source diff contains only the two repairs above and this whitespace correction. The coordinator's earlier format1 receipt is historical and was not overwritten.

The existing local connector, pure `RequestMediaContent`, original modal options/title/table/buttons, Open-in/search-engine/bang UI, unconditional hooks, committed refs, actual session-object/copied-field observation and captured modal epoch are unchanged. So are exactly-once dispatch with `retry: false`, valid-season/current-options gates, actual resolved-void outcome handling, owner-checked reconciliation and the read-only retry semantics.

No new comments, tests, helper/export/framework, dependency, cast, `any`, suppression, Session/DTO field, Auth/native import or authority gate was added. Default Next and existing per-call legacy RPC authentication/permissions/CSRF behavior remain unchanged. Server-version evidence is still unavailable and is not required for this UI association. Native writer-through-COMMIT and unobservable future freshness remain separate unproved holds.

## Evidence and handoff

The allocation contains immutable `before.tsx`, `source-before.json`, `after.tsx`, `source-after.json`, `changes.diff` and `freeze.json`. The freeze receipt binds raw byte/SHA pins for both images, their metadata receipts and the complete diff, with `authorFrozen: true`, `checksRun: false`, `runtimeExecuted: false` and review/typecheck/lint/format still required. Allocation permissions are0700; every evidence file was created with O_EXCL0600. No old receipt was rewritten.

Only bounded `/usr/bin/python3 -I -S -B` source-file I/O, SHA-256 authentication and difflib capture ran. No compiler, lint, tests, application/module evaluation, formatter command, browser, network, Engine, SQL, private configuration/data inspection or nested agent ran. The original `nitro-legacy-media-source-_wos9xdd` before-image, cancelled-source disposition, older artifacts/failures and protected3100/3200/data were untouched. Other Native2/Widget6 sources were not inspected or edited.

Coordinator next step: independent review of these exact frozen bytes, then fresh focused type/lint/format checks after all relevant writers freeze. Prior fourteen-check totals supplied by the coordinator are not measurements of this repair. Source/token **91/334** and runtime **0/9** remain unchanged; this handoff adds no activation, runtime, native or through-COMMIT claim.

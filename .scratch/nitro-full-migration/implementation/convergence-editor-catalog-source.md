# Editor catalog — one-file source freeze

## Outcome and authority

Implemented the approved original one-file plan plus amendments A–F in **only** `apps/nitro/src/features/widgets-editor/add-widget.tsx`. The user's AUTHOR release supersedes the plan's historical pending-review text; this report does not alter that plan or grant any additional scope. This source is now frozen for independent source review and coordinator-owned checks. No application activation is claimed; static-control activation remains **0/9**.

New evidence stage:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-editor-catalog-source-8nt8rh6z`

| Image         | Bytes | SHA-256                                                            |
| ------------- | ----: | ------------------------------------------------------------------ |
| `before.tsx`  | 18026 | `2e3d7be2f825de888bf67e055110232a8393d906b64f12014d1bdd9528f455e2` |
| `after.tsx`   | 27244 | `d9c36c5dea3e1e8ec430a905a2eb71c7ce1edb05dad98450860d922d25d08f81` |
| `source.diff` | 21480 | `bdb05eda10e30e1e71f3681ae1bccfbeba275dd8eebd4586a74e75de1e7ae6f1` |

`before.json`, `after.json` and `freeze.json` record the exact named source images and diff. Two bounded Python `-I -S -B` stdlib-only file-I/O/hash/difflib invocations created the stage and receipts; directory mode is 0700 and evidence files were created O_EXCL with mode 0600. The before image matches its original pin, and the actual source matched the after image at completion of capture. This is file evidence, not a compiler, lint, runtime or semantic acceptance result.

## Actual consumer change

- Added required `definitionManifest: WidgetDefinitionManifest`, using the existing public type export and declared widget dependency. Existing React `useEffect` is used alongside the existing layout/ref/state APIs; shipped React declarations and a sibling effect pattern were inspected. No dependency or shared props-contract file was changed; no Context7/network request was made.
- Removed the global `['nitro','widget-editor','source-definitions']` Query entry and its reconstructed Promise.all/map. The actual passed manifest's `loadAllWidgetDefinitions()` is awaited directly; the existing manifest owns stable promises, all69/all-or-nothing loading, rejection eviction and generation/disposal validation. No alternative catalog, empty-success fallback, local promise memoizer or automatic error retry was introduced.
- Domain loader identity is checked inside the owned try/catch. Mismatch becomes an observable error, not a lifetime-predicate failure that silently hides the reason. Selection loads through the captured manifest and passes the matching domain into the existing editor.

## Lifecycle implementation

`CatalogState` is an idle/pending/ready/error discriminated union with the manifest's returned map type. `catalogLoad` attaches pending/ready observations; `catalogFailure` holds the transferred error lease and retry barrier. A small file-local binding comparator compares the actual manifest/domain/board/client/query utilities; it is not a new owner service. Existing committed `current` state also records the single `catalogAttempt` value for publication guards, not another counter or producer identity.

- Fresh admission requires the actual committed dialog, live permission/current-owner checks and a genuinely current captured host owner before attachment/publication. Invalid prepublication capture produces no pending state or admission loop. Every async success/error publication rechecks the exact attached lease, committed attempt, binding and captured/live owner.
- Pending/ready retirement is consumed by one identity-checked committed detachment. Still-eligible retirement with a valid fresh capture increments the same `catalogAttempt` once. A lease from an already superseded attempt is detached without another readmission increment, preventing old passive work flushed around a layout update from feeding a counter loop. Idle states and currentness reads never schedule themselves.
- Error leases never enter that retirement increment path. Same-binding/same-attempt failure barriers prevent eligibility or callback changes from automatically retrying a failed catalog. Manual recovery or a genuinely new binding can admit another observation; the existing manifest still decides whether resources remain held.
- **Amendment F:** passive cleanup changes a lease only while `catalogLoad.current === lease`. After transfer to `catalogFailure`, callback-only dependency cleanup leaves the active error and its attachment intact. Actual committed owner loss retires the error; unmount retires both refs; explicit retry or admitted changed binding owns failure replacement.
- Render admission checks current render binding/attempt/eligibility as well as the captured lifetime, rather than relying solely on the prior committed props. Only an admitted attached pending catalog shows loading. Detached/invalid capture states show an explicit hold with guarded Try Again, not an orphaned spinner or selectable partial catalog. Current Error.message values, including actual manifest holds/mismatch/disposal reasons, remain visible; unknown failures retain the common failure label.
- Ownership loss/recovery must be observable through genuine producer renders/binding changes or explicit recovery. No polling, subscription shim, timer, fake currentness callback or capture revival was added. Effect cleanup does not physically cancel module imports or dispose the shared manifest; upstream generation ownership remains responsible for disposal.

## Existing interactions preserved

The three generated integration/settings/custom-widget queries and their inputs/enabled flags/retry:false remain intact. Their error alerts and manual recovery remain visible independently of catalog holds. The main recovery action validates a fresh real owner and checks the live pending attachment before scheduling catalog recovery; server refetches retain current-owner guards.

Both normal and custom widget selection require a ready owned catalog. All69 definitions are loaded before readiness; the existing separate customApi card presentation remains. Existing integration/access filtering, missing-integration creation callback, migration/draft-writer/permission holds and reduction/schema/default-size behavior remain.

Selection origins now capture the manifest/domain and retain the admitted catalog lifetime in their closure. Existing checks after definition/integration/refetch/create awaits remain, and final loading publication requires the exact current operation. Committed invalidation resets the obsolete lock/loading/error/selection; an old async finally cannot clear a newer operation's loading state. Rendered selection/loading/error are gated on admitted current ownership. No fake draft writer or creation callback was supplied.

Mantine primitives, modal dimensions, grid breakpoints, card/input styles, labels/badges and downstream WidgetEditor presentation were retained. Changes are consumer state/admission/error/recovery joins, not a redesign. No new comments, casts, any, tests, helpers in other files, wrapper-only files, routes, providers, manifests, CSS or dependencies were added.

## Handoff and unchanged evidence boundaries

The user reports the separate 37-workspace tranche terminal at **28 green / 9 red, lint0 / format1**, with the separate formatting files outside this lease. Those are supplied baseline facts, not validation of this changed source; no unrelated files were read or repaired for that tranche.

**Pending:** independent review of this exact after image/diff, then separately authorized fresh whole Nitro noEmit/typecheck and focused editor lint. No lint/typecheck/format/test/build/config/application/SSR/browser/SQL/native/Engine/network invocation was performed. The only shell invocations were the explicitly authorized named-source evidence captures. No private config/data/secrets, broad hashes, nested agents, git operations or compiled outputs were touched.

Actual producer composition must still pass the required genuine manifest and matching domain; this patch does not mount the dormant board/private route consumers, resolve server334 enrollment, clear resource/write holds, or provide runtime evidence. All69 prior definition source acceptance, activation0/9, default Next status and the original fifth-artifact/source association remain unchanged. No old compiled-output body or receipt is relabeled. Product writer work is complete and frozen at the after pin above; further edits require renewed scope.

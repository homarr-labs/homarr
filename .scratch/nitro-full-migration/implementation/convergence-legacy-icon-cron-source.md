# Legacy icon Cron bridge: one-file source return

## Delivered and frozen

Implemented the independently approved refinement at `convergence-legacy-icons-plan.md:111–248` in **`packages/cron-jobs/src/jobs/icons-updater.ts` only**. The final 455-line source is frozen for independent review. No lint/typecheck/format/compiler/test/runtime result is claimed; coordinator checks remain deferred until all writers freeze.

The captured diff has four hunks: public import adjustments plus the called local helper/types/policy; the stale fetch call and all-source-failure guard; the PostgreSQL icon-delete guard; the SQLite icon-delete guard. Existing reconciliation, transaction driver selection, checksum matching, insertion values, ID/name/URL retention, 5000-icon batch division, registry/schedule/start behavior and other transaction statements remain outside the delta.

## Actual bridge and policy

- `NO_EXTERNAL_CONNECTION` remains the first callback operation. The non-exported helper is called only afterwards and dynamically imports public Core HTTP there, preserving the early opt-out before newly reached DNS/trust/transport initialization.
- The helper reads real legacy hostname/thumbprint/certificate rows, builds the existing identity checker and acquires one callback-owned certificate agent. Its CA/proxy/DNS behavior remains the existing Core implementation; every public fetch receives that explicit dispatcher. No second/default agent, direct Undici import or global transport was introduced.
- Five operations use the existing public metadata array and provider parsers unchanged, followed by one real local `id/name/content/size` DB read mapped with the public local helper. No endpoint, branch, license, URL template, extension rule, local MD5 input or media URL identity was substituted.
- Policy is the approved **new legacy choice**: 16777216 HTTP index bytes, 200000 complete index entries, 1024 UTF-8 path bytes and a 10000-ms original per-index deadline. These are not pre-existing configuration/defaults or measured provider requirements. The byte-path preflight supplements the unchanged parser's string-length limit.
- Content-Length is optional, but a supplied value must be digits-only, a safe integer and within the byte cap. Stream chunks are lifted to unknown and validated as Uint8Array before retention. Fatal UTF-8 decoding, JSON-as-unknown, complete array/path preflight and existing provider parsing must all succeed; no prefix or partial feed can become authoritative.
- Real abort timers/signals and monotonic boundary checks bracket fetch, body reads, decode, JSON, path preflight and parser return. Timer/listener cleanup occurs after reader cleanup. Synchronous parse overrun is detected at the following boundary, not claimed preemptible.

## Failure and physical resource ownership

Each source holds its provisional group and original primary failure separately from cleanup failures. Actual `reader.closed` and coalesced cancellation promises receive rejection observers immediately; the original promises are also settled before lock release. Header/early-response failure instead awaits actual unconsumed body cancellation. Cancellation and release failures are retained, not thrown from `finally` over the original cause. An additional closed-reader error distinct from a captured primary error is retained as a fatal cleanup fault rather than hidden.

Ordinary source failures return the actual source slug with `success: false`, empty icons and `source-unavailable`; genuinely empty successful sources remain successful. HTTP errors use the real `IconSourceHttpError` status/rate-limit/reset/retry metadata. Private diagnostic logging includes that metadata or a fixed generic message, not raw network URLs/body/credentials in a returned group. Diagnostic sink failure itself prevents replacement.

All five source promises and the local promise are retained in `Promise.allSettled`. Only after that settlement does the helper await **one** public `agent.destroy()` call. Setup/task/reader/teardown faults are retained, and any fatal outcome rejects before catalog reads/writes using an AggregateError containing retained source and fatal errors with the first retained error as cause. Cancellation rejection is conservatively fatal; it is not dismissed merely because another stream operation already failed. No retry, replacement agent, Promise.race abandonment or cleanup flag is used as a physical completion receipt.

The existing scoped HTTP parent signal, if present, is honored before setup and after shared settlement/teardown. It is not a newly issued native operation, credential authority or active-owner assertion. There is no `createIconFetcher`, native service construction, fake `assertCurrentAuthorityAsync`, read-scope adapter or native callback clock in this bridge.

The helper returns all six genuine source groups only after supported teardown completion. The caller then throws the exact fixed all-source-failure Error before `db.query.iconRepositories.findMany` if no source succeeded. Failed groups keep their slugs, so they are not mistaken for absent repositories. Only successful groups populate the existing checksum/deletion maps. Both existing SQL branches skip their icon-delete statement when its predicate is undefined, preventing an unfiltered `.where(undefined)` deletion. No await was added to SQLite's synchronous transaction callback.

## Source images and pins

New private capture directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-legacy-icon-cron-source-1bf802d20468`

| Image         | Bytes | SHA-256                                                            |
| ------------- | ----: | ------------------------------------------------------------------ |
| Before        |  5486 | `4d1ee52426c84307d1119a6f2d7c152689e466b4bb725b0dc288956d0b61410b` |
| After, frozen | 16390 | `bf6f3adda58567e006811c69d0aead1f69a9f4c218fd777c3edb45cebb4beed2` |

`icons-updater.before.ts`, `source-before.json`, `icons-updater.after.ts`, `icons-updater.diff` (13488 bytes), `source-after.json` and `capture-index.json` retain the actual one-file images, unified diff and pins. The saved before image matched its original size/hash during final capture. Capture used a fresh exclusive 0700 directory and O_EXCL 0600 files, bounded reads, content-relevant metadata stability checks and Python `-I -S -B` standard-library file I/O/hash/difflib only. Both capture commands exited 0. Product/report edits used `functions.patch`; no other command ran.

## Retained limitations and next gate

Local media is still a legacy full-table byte materialization; the remote index cap is not imposed on uploaded images, and no SQL-native byte budget or cancellation proof is invented. Existing legacy DB admission, hostname/CA snapshot lifetime and late currentness remain unchanged. Existing checksum behavior, including local alias limitations, is retained rather than relabeled as native selected-reference synchronization.

The awaited public Undici destroy lifecycle is the supported ordinary completion barrier. The installed implementation's internal rejection/callback limitations remain those documented in the accepted plan: there is no all-fault finite cleanup deadline, guaranteed internal constructor cleanup or native containment proof. Pending cleanup keeps this operation pending with SQL unissued; an unavailable physical completion result is never treated as success.

No DB/Core/native Icons source, manifest/export/schema/reference codec, environment key, helper file, new dependency, comment, test, cast, authored `any`, suppression or global configuration was added. No lint/type/format/compiler/test, network/provider, SQL/native/Engine, program/configuration evaluation, private configuration/data/secret access, Git or nested agent operation occurred. App source/acceptance, older images/stages/controls/data/evidence and disjoint writers/live outputs were not edited or captured. This is a source return, not native COMMIT authority, application readiness, provider-fit evidence or a new 91/334 acceptance result.

Independent source review and coordinator-owned fresh focused lint/typechecks are next; the source remains frozen pending that review.

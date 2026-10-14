# Lane27 mechanical body typing — independent exact-source review

## Decision

**ACCEPT the exact bounded-body source correction at SHA-256 `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` for SOURCE consumption. P0/P1/P2/P3: 0 new findings.** This clears only the recorded frozen Node/Bun body type-composition issue. The earlier J2 source PASS remains bounded to its unchanged freeze; no lane01 new manifest, current whole workspace, native authentication, publication, host mounting or private SSR approval is admitted.

Before identity: `ed414458eb598e3bebfd5f418215d98d14200d9a335430085c8c22ce24565dbb`.

## Spec

Read the current sole authorized body source, complete `body.before.ts`, `body.after.ts`, the materialized physical body copy, and actual `body.diff`. The only two hunks are:

1. `pendingRead` uses `ReturnType<typeof reader.read> | undefined`, inferred from the actual reader acquired at line 58 rather than a separately chosen DOM result type.
2. Lines 107-110 capture `const currentRead = reader.read()`, assign that exact promise to `pendingRead`, await that same nonoptional promise, and clear pending ownership at the original point immediately after successful await.

No extra read, await, promise wrapper or ownership gap is introduced. A rejected read still leaves the owned promise available to cleanup. The Uint8Array check, byte-budget accounting/allocation, request/bounds/lifetime signals, cancellation, finite segmented deadline timer, cleanup order (pending read, cancellation, closed, release lock, detach), reconstruction, errors and exported/client contracts are unchanged. No casts, assertions, suppressions, comments or production helper changes were added.

## Standards

No new finding. The mechanical change keeps the existing naming/control flow and obtains the type from the actual resource without a cast or fake declaration. No dependency, manifest, tests or unrelated source was introduced.

## Actual static evidence inspected

Final directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable27-bun-body-frozen-tZKCzi/`.

Read `validate.mjs`, `path-map.json`, physical final Node/Bun configs, actual input-list sections and targeted dependency entries, both profile receipts, both complete final raw diagnostic logs, lint raw output/config, `verification.json`, `integrity.json`, source pins, accepted producer fingerprints, frozen Auth/DB manifests and relevant physical reader contracts/source. Exact logical/physical/hash pairs were searched directly in `closure.json`.

- The final TypeScript snapshot-API driver maps logical paths to new physical copies. Its filesystem callbacks read only mapped paths, return null for unknown files and empty entries for unknown directories; the directory index derives only from that map. There is no live-source fallback. It rejects any program input not present in the map.
- The driver collects config, program/options, global, syntax, bind and semantic diagnostics across the entire selected program, not just the body or owned paths. It calls no production-source evaluator or emitter. Configs retain strict/noUncheckedIndexedAccess/noEmit, incremental false, skipLibCheck and the old explicit logical paths/roots.
- Input lists include genuine ES2024/DOM/DOM.Iterable declarations, actual DB producer and authority-reader source, all production-session source, and installed `bun-types/sqlite.d.ts`. The Bun list additionally includes the genuine Bun globals and `@types/bun` entrypoint. No replacement DOM/DB/reader declarations or pruned-root workaround was found in the inspected evidence.

| Frozen check     | Complete recorded inputs | Raw diagnostics            | Recorded process exit |
| ---------------- | ------------------------ | -------------------------- | --------------------- |
| Node+DOM         | 1930                     | `[]`; all six categories 0 | 0                     |
| Bun+DOM          | 1958                     | `[]`; all six categories 0 | 0                     |
| Body-only oxlint | 1 file / 197 rules       | 0 warnings, 0 errors       | 0                     |

The materialization receipt records **2085 new regular physical copies**. This is static verification of those copies through controlled logical-path remapping using installed TypeScript 7.0.2 and recorded Node 24.18.0, not an unrestricted native CLI/full physical workspace check or native auth proof. Exits are recorded in `verification.json`; they were not rerun by this reviewer.

Earlier `playable27-bun-body-types-GpN25U` and `playable27-bun-body-return-kO8jYf` failures remain. Read their actual drivers, profile receipts and raw diagnostic samples: 59 semantic diagnostics, including unresolved migration `../..` imports and consequent implicit types, with reduced 1929/1957-input graphs. The final driver adds trailing-directory separator normalization after `path.normalize`; the diagnostic collection and mapped-only file access remain. This is an ephemeral filesystem-wrapper correction, not source/declaration rewriting or diagnostic suppression. Those earlier runs are not passes.

Recorded final evidence hashes:

| Artifact                | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `closure.json`          | `e1e644cff03e3b8c834c3d3eb591f75888cd3c06b8b831836f5c7b5bcb9f413f` |
| Each final type raw log | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `lint.raw.log`          | `5cd2400fa331bfa694265f2895ccb5ea65168af01a9e0a65365deb12b3737dc1` |
| `body.diff`             | `d662c01cef4a50c7a92945365656d6d2ece86eb0cc1324325f90c33155a15bac` |
| `path-map.json`         | `cdff98e0d8ae9301804978675ccb5490939ae5921983c37908d81d9f9f7a037d` |
| `validate.mjs`          | `5b3e07aeb254b1fda90fa620341b3cd64ccb0a1d4af877f04671b60d8416b7d4` |

## Unchanged pins and limits

The new closure contains the exact four accepted J2 logical/physical/hash pairs: persistence `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d`, service `64a6a9f329392cd86506fd3e3d4a7baab8995976110ae9bc0cd1af7887eea083`, SQL persistence `277296a53b7f3240f5cdf932fcb53b204d21f366a2510103d4b546480d1a7a1b`, repository `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71`. Corrected lane26 statements remain `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` in both accepted fingerprints and the physical closure.

Old captured Auth/DB manifest identities remain `fd11143aace1b3eeb4fd49e1e0a679fbc96e068a78e24ef53418a03b6878ab73` / `82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b`; these exact pairs were matched in the closure and their physical contents inspected. Frozen reader contracts still declare unsupported COMMIT authority; reader revoke still owns its DELETE. No new lane01 manifest or active peer source was read/admitted. The old graph's unchanged status and physical-copy integrity are recorded receipts, not independently recomputed facts.

**Verification limit:** source and recorded hashes were inspected, not independently rehashed; no validation process or filesystem-stat census was run. Single-line map/closure/config previews truncate, so targeted exact matches and physical-file reads were used rather than claiming every captured byte was independently audited. Compiler receipts and input lists support the stated complete frozen profiles, not arbitrary current-workspace resolution or declaration-library correctness beyond the configured skipLibCheck.

All logout exact-operation invalidation/drain, logging admission before reads, authority/all-writer validity through COMMIT/G3 dispatch, physical provider settlement, native SQL/race/restart proof, delivery/reconciliation/revocation, host, issuer publication, private-boundary/SSR and production holds remain. Publication still always rejects. J5 may consume this exact corrected SOURCE with the previously accepted frozen interfaces, but may not activate or publish them.

No commands, probes, tests, source runtime evaluation, SQL, provider calls, builds, browser/listeners, Git, children or source writes were performed. The only write is this new canonical review. **Spec: 0; Standards: 0. Exact-hash SOURCE consumption: ACCEPT; runtime/publication approval: NO.**

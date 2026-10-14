# Lane27 mechanical Bun body typing — frozen return

## Scope and decision

Exact pre-edit inventory: sole source write `packages/auth/nitro/production-sessions/bounded-body.ts`; sole new handoff this file. Handoff absence was checked before edits and again before creation. Concrete J2 source independently passed in `playable-27-review.md`; that review and `playable-27.md` were not rewritten.

**Requested mechanical correction complete; independent review required before future consumption.** Both complete frozen type profiles and focused body lint pass. This is SOURCE-only validation, not whole-workspace currentness, new manifest admission, native execution, publication, currentness-through-COMMIT, logging admission, host or private-boundary approval. All existing holds remain.

## Exact source change

```diff
-    let pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | undefined;
+    let pendingRead: ReturnType<typeof reader.read> | undefined;
@@
-        pendingRead = reader.read();
-        const chunk = await pendingRead;
+        const currentRead = reader.read();
+        pendingRead = currentRead;
+        const chunk = await currentRead;
         pendingRead = undefined;
```

Before SHA-256: `ed414458eb598e3bebfd5f418215d98d14200d9a335430085c8c22ce24565dbb`.

After SHA-256: `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b`.

Validation compared the edited file byte-for-byte with the frozen body plus exactly these replacements. The actual acquired reader determines the promise type; the same promise is assigned to cleanup ownership and awaited nonoptionally. Pending ownership is cleared at the same point. The existing Uint8Array guard, byte budget, stream/lifetime/deadline/cancellation behavior, cleanup awaits and order, timers, Request reconstruction and contracts remain unchanged. No casts, assertions, suppressions, comments or production helpers were added.

## New physical frozen validation

Artifact directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable27-bun-body-frozen-tZKCzi/`.

The previous accepted J2 closure `playable27-j2-frozen-0NB1EN/closure.json` was verified against SHA-256 `edb39d1d30ef4135c75bedbad1eb50f111b8b7f6fbb6f135963b528cff103bfb`. Its captured contents, with only the exact body replacement, were materialized as **2085 new regular physical files** under `physical/`; each copy was hash-checked. `closure.json` retains every actual content, logical path, physical relative path and hash. The old immutable graph remains unchanged.

The installed TypeScript snapshot API was rerun in separate clean compiler-driver processes. Guarded filesystem callbacks map frozen logical paths to the new physical files, including normalized directory paths; unknown file reads return null and unknown directories enumerate empty, with no live-source fallback. Every compiler input must exist in the physical path map. This is a new static check of physical copies using logical-path remapping, not a reused compiler receipt, an ordinary unrestricted filesystem run, or a native auth experiment.

Clean `env -i`; explicit Node **24.18.0**; installed TypeScript **7.0.2**; Bun **1.4.2** verified by `--version` only. The unchanged frozen configurations retain strict/noUncheckedIndexedAccess/noEmit, incremental false and skipLibCheck. No emitter or persistent compiler cache was requested. The Node profile uses genuine Node+DOM globals and the actual installed `bun-types/sqlite.d.ts`; the Bun profile adds genuine installed Bun globals. No DB/reader or runtime declarations were invented.

| Check                                      | Actual complete inputs | Diagnostics          | Process exit | Raw log              |
| ------------------------------------------ | ---------------------- | -------------------- | ------------ | -------------------- |
| Node+DOM                                   | 1930                   | 0                    | 0            | `types.node.raw.log` |
| Bun+DOM                                    | 1958                   | 0                    | 0            | `types.bun.raw.log`  |
| Body-only oxlint, 197 rules, deny warnings | 1 source file          | 0 warnings, 0 errors | 0            | `lint.raw.log`       |

Config, program/options, global, syntax, bind and semantic diagnostics were collected across each complete profile, not filtered to owned files. `node-inputs.json`, `bun-inputs.json`, profile metadata, `validate.mjs`, `path-map.json` and `verification.json` record the exact checked graph and driver. `body.diff` is the raw non-Git diff (diff exit 1 denotes the expected source difference).

Initial physical-host attempts are preserved at `playable27-bun-body-types-GpN25U/` and `playable27-bun-body-return-kO8jYf/`. They returned 59 migration/module-resolution diagnostics per profile because the filesystem wrapper did not recognize trailing directory separators. Correcting only the disposable validation wrapper restored the full 1930/1958-input graph. Those failures were not suppressed, overwritten or represented as successes; no production dependency/source was changed to fix tooling.

## Frozen SOURCE pins and old manifest graph

These identities were verified from captured contents and retained unchanged in the new physical closure. They do not assert the current workspace or any active peer's source state; no active peer source was read. The four J2 sources, adapter, provider, origin, DB, reader and manifests were not written.

| Frozen source                                                | SHA-256                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/persistence.ts`     | `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d` |
| `packages/auth/nitro/production-sessions/service.ts`         | `64a6a9f329392cd86506fd3e3d4a7baab8995976110ae9bc0cd1af7887eea083` |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `277296a53b7f3240f5cdf932fcb53b204d21f366a2510103d4b546480d1a7a1b` |
| `packages/auth/nitro/production-sessions/repository.ts`      | `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71` |
| `packages/db/runtime.ts`                                     | `565edbf507067b3ef7373689c71715d99ad6a866be9e5f05a88978f7dabdd768` |
| `packages/db/transaction-gate.ts`                            | `fcc02392e17a7162396422829be513e7951ea415a539394d72b2b6754b598c88` |
| `packages/db/runtime-auth-session.ts`                        | `6337eda7301d10242bb341c9d6c781212b7256a6e4377460b6c0441fe8647de6` |
| `packages/db/runtime-auth-session/contracts.ts`              | `97f9a30beba8e441f8fcaeee6f5e81671851b6fc27a2a549d44bad7188ff06b2` |
| `packages/db/runtime-auth-session/statements.ts`             | `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` |
| `packages/db/runtime-authority/locks.ts`                     | `d12ed57b059b7fb903d0f5933149897ff80dce8da7363c34be74ffc0bf48dc21` |

The old captured Auth manifest already declares `@auth/core`, `@homarr/db` and definitions; its hash is `fd11143aace1b3eeb4fd49e1e0a679fbc96e068a78e24ef53418a03b6878ab73`. The old captured DB manifest hash is `82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b`. All eight captured workspace manifest identities are in `verification.json`. Pending lane01 declarations were neither read nor admitted. Current32's existing typing graph was not changed. Logout planning in `ses_ed4489e78ffeYuz4h2arGTO4FT` remains separate at the frozen reader/DB boundary.

## Raw evidence hashes and holds

| Artifact                 | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `closure.json`           | `e1e644cff03e3b8c834c3d3eb591f75888cd3c06b8b831836f5c7b5bcb9f413f` |
| `types.node.raw.log`     | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `types.bun.raw.log`      | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `lint.raw.log`           | `5cd2400fa331bfa694265f2895ccb5ea65168af01a9e0a65365deb12b3737dc1` |
| `body.diff`              | `d662c01cef4a50c7a92945365656d6d2ece86eb0cc1324325f90c33155a15bac` |
| `source-pins.json`       | `1d1240f9270d973b2ef3b7b5f39fe592d232e2e0a18f53266f009f62438a696a` |
| `accepted26-hashes.json` | `1edda2193b4a0fa694482c7e7fb858ea7bcef282b3e22c06b4b01cc727e0effa` |

Publication still always rejects. Genuine logging admission before reads, reader/resource COMMIT, all-enabled-writer validity through dispatch, physical transport settlement, native SQL/provider proof, logout invalidation/drain, delivery/reconciliation, host and private-boundary approvals remain held. This correction clears only the recorded type mismatch in the bounded frozen source graph, subject to independent review.

No tests, body probes, production-source runtime evaluation, SQL/providers, servers, builds, installs, Git operations, child agents, protected data or port activity occurred. Only the one source file and this new handoff were written in the repository; validation artifacts are confined to approved temporary storage. **Return frozen now; no future consumption authorized by this handoff.**

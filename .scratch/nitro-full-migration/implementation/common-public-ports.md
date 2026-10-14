# Common public ports — narrow declaration handoff

2026-10-11. **Declared `@homarr/common/url` and Common's direct Query Core dependency; fresh HEAD-only candidate and scoped checks pass.** Base HEAD verified before writing: `27f35202d22af256bf58f8b33e39b84e0030f45b`, after the coordinator's Stage A commits. Oracle approved this declaration and the separate Definitions import cleanup. Nothing staged or committed; no producer wait/poll.

## Exact checkout delta, made first

Only these working declaration files changed:

```text
packages/common/package.json
  exports:      "./url": "./src/url.ts"
  dependencies: "@tanstack/query-core": "5.101.2"

bun.lock
  workspaces["packages/common"].dependencies:
    "@tanstack/query-core": "5.101.2"
```

Both source files already exist in HEAD. `./object → ./src/object.ts` was already exported/committed and is unchanged. The new URL export points to the existing algorithm, not a copied helper. Definitions can now use the actual public `/object` and `/url` declarations; their owner alone edits its five import lines.

Before declaration, installed Query Core metadata and **both existing lock vendor entries** were verified as **5.101.2**. Root/HEAD/working catalogs contain React Query **5.101.2**, but **no Query Core catalog entry**. Therefore the approved direct exact pin is used, not `catalog:` or reliance on hoisting. No root/catalog edit, vendor addition, version upgrade, other dependency or duplicate library was introduced.

## Fresh artifact directory and current-base patches

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-common-public-ports.5OGp8o
```

`before/**`, `head/**` and `before.json` preserve the exact current HEAD/working manifests and locks, experiment manifest, installed vendor identity, two Common source hashes and original pre-install snapshot. Historical ten-/three-field patches are **stale historical evidence**, not reused or changed.

| Artifact                        | Delta / SHA-256                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `head-common-manifest.patch`    | Exactly two added fields/lines, zero removals; `5f4b2c7966408418d6283cb47c0f35a5184145bc75de3a26110a045fe7804779`                    |
| `head-common-lock.patch`        | Exactly one added dependency field/line, zero removals; `59447bc4ec7223c63150352fe5926e0949799f44bfc6adf24c960d53004193cd`           |
| `working-common-manifest.patch` | Same two-field step; `5f4b2c7966408418d6283cb47c0f35a5184145bc75de3a26110a045fe7804779`                                              |
| `working-common-lock.patch`     | Working baseline plus one field only; `65d4320524ce00ba25c246e739e0cf830427f3e42e72b259cf8d74f126184438`                             |
| `common-only.lock`              | Complete HEAD-based candidate; `eecd3e6d7b1a72d2b7c9b8b283d80667f258d712cb192a26ea84a4b1f3092fb1`                                    |
| `candidate-proof.json`          | Structural equality/provenance assertions; `6e0b045dd79e45f9308e8c8b567f4967ea949f2e55129ec8f385085e25bc49e4`                        |
| `leaf-evidence.json`            | Exact source/type/runtime edges and both vendor resolution views; `45ed4b91d34ea8c2dd37e0c5fe6bf6dd94990ba6f339136ca111721b7cea9ba8` |

Both fresh HEAD patches passed **read-only** `git apply --cached --check`; no application/staging was performed. Existing source algorithms require **no new source staging** for this declaration-only commit. Coordinator alone captures the accepted declarations; do not stage the full working lock or unrelated pending declarations.

Lock/manifest anchors:

```text
before working lock  d76adbf7da5151ca28c75f7cdb0e605b959ed463a444c4284333d26d44c4dfe6
after working lock   094406d2ebe3146f6aa90620473efc12ea1d19f341038ff910a075aa6bbc2183
current HEAD lock    a4c192514e0b907f2564c417aa553c99c1be86f57c1d91137bf11db9c1368581
HEAD-only candidate  eecd3e6d7b1a72d2b7c9b8b283d80667f258d712cb192a26ea84a4b1f3092fb1
Common manifest      e5086d29a7a776588a2b67acb7a957301ea2a50b9f8e1654baa9775254cf9c1d
```

Deep structural comparisons prove the working lock retains all **2,601 package entries**, experiment workspace, root/catalog/metadata and every other workspace field, with only the named Common dependency addition. The candidate retains all **2,590 HEAD package entries**, root/catalog/metadata, committed Stage A fields and every other workspace field, again plus only that dependency. Query Core's existing package/integrity entry is identical. This is not inferred merely from entry counts.

## Source-free isolated installation proof

New `fixture/` contains **42 exact HEAD manifests**, substituting only the minimal Common manifest, the candidate lock, and the existing four exact HEAD patches:

```text
patches/dns-caching.patch
patches/@types__node-unifi.patch
patches/mantine-datatable@9.3.1.patch
patches/trpc-to-openapi.patch
```

All 46 manifest/patch input hashes are in `candidate-proof.json`. No Common/Definitions/application/producer source was copied. No install ran in the checkout.

Both installs use Bun **1.4.2**, `env -i`, **`--no-env-file`**, isolated HOME, explicit PATH/native cache, owned `clean.toml`, hoisted linker, public **`https://registry.npmjs.org`**, **`--frozen-lockfile --ignore-scripts`**. Existing cache is reused; only established public-registry fixture resolution is permitted. No lifecycle scripts or credential/environment config is loaded.

- Fresh fixture install: exit 0, **2052 packages installed**. `frozen-fixture-install.log`, hash `d869bfaf9d0bd6823e4dde87ee2b2146ffee01206aa9ff01461dd4a438823e97`.
- Repeat frozen install: exit 0, **Checked 2327 installs across 2314 packages (no changes)**. `frozen-fixture-repeat.log`, hash `842ee43e2e7348dbf4aba7affb3792ed23b947cec7f8e5278eab663d1bb128db`.
- Candidate lock and all 46 fixture inputs remain byte-identical after both installs.
- Working and fixture Common consumers resolve the direct installed **5.101.2** metadata/entry. Both metadata hashes are `a6e0ecd3732c18d82f4ed70829c121ff14fa97ba98f037cbfed4b7773d53c01f`; ESM import target is `./build/modern/index.js`, installed metadata says `sideEffects: false`. This is resolution/metadata evidence, **not module evaluation or a new Query client**.
- Four working public resolutions, from Common and the actual Definitions package consumer, confirm `/object` and `/url` target the exact repository files. Fixture verifies declarations/vendor metadata only, since it contains no source.

## Existing source allowlist and honest runtime/type boundaries

The only source hash set inspected is:

| Existing source                 | HEAD = current working SHA-256                                     | Runtime boundary                                                     |
| ------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `packages/common/src/url.ts`    | `5d13a39fd18be4e89b5af964c6b7bc35c2a1bcdcd5162aefc627c3eb05148e6a` | **Zero runtime imports** after actual Bun browser TypeScript erasure |
| `packages/common/src/object.ts` | `99b969a659f7a959f257883b22f7d1e95f5fcd53aef32dea4eb6731c24f91921` | Exactly `@tanstack/query-core` runtime import, now directly declared |

Neither source file was changed/copied/evaluated. Both are already in HEAD; this is **not a new URL/object/hash algorithm**. Query Core is an external vendor boundary in this scoped source scan, not secretly a workspace substitute or an executed client.

`url.ts:1` imports Next's **ReadonlyHeaders type only**. It erases completely from the real browser transform; scoped TypeScript still resolves installed Next declaration files. No Next runtime, environment, DB, Redis or protected server module is evaluated by this check. Existing forwarded-header/default-protocol and safe-URL behavior is unchanged; exposing the source port does not authorize treating untrusted forwarded headers as a host trust decision.

`object.ts` keeps the existing `Buffer.from(hashKey([obj])).toString("base64")` inside dormant **`hashObjectBase64`**. It was **not called**, no Buffer polyfill was introduced and no general browser support for that function is claimed. Definitions' selected pure object helpers do not justify changing the hashing semantics.

Scoped installed TypeScript **7.0.2** check passes, exit 0, zero diagnostics, with explicit roots only `url.ts` and `object.ts`:

```text
--ignoreConfig --noEmit --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --esModuleInterop --resolveJsonModule --noUncheckedIndexedAccess
--types node,bun,react,react-dom --pretty false --listFiles
```

The full retained log lists **220 files, exactly two workspace source files**, both Common leaves; no Core/G/DB/runtime workspace type source was included. Real installed Bun declarations are selected, not a stub. `skipLibCheck: true` is the existing scoped-check declaration policy, not source-diagnostic suppression. No `any`, assertion, alias, path override, filtered diagnostic or global configuration change was added. `typecheck-common.log` hash: `15434c671f3c38322c1c96dfee745d630e4e0f5cab7d90596cc3f0f8b46af86d`.

Two-file source lint passes, **zero warnings/errors**; Common manifest `oxfmt --check` passes. No formatter writes, tests, browser bundle, host build or whole-repository checks were run. All Bun checks use the same clean explicit environment/config as the installs.

## Preservation and remaining holds

Final guard verifies both unchanged Common sources, exact two-field manifest/one-field lock deltas, **42 other unchanged manifest inputs** including the experiment/root, all fixture inputs/lock and the original pre-install snapshot. `final-state.json` retains artifact hashes and handoff hash. No prior Stage A/browser/ten-field/three-field artifact was rewritten or reused as this candidate. Reconcile the explicit base if HEAD changes before coordinator capture; never blindly apply a historical patch.

Definitions owner alone owns the line-1 public import cleanups in `permissions.ts`, `widget-integration-map.ts`, `docker-integration-match.ts`, `release-provider.ts` and `integration-url-template.ts`. Their source was not inspected, changed or polled in this task. **Fresh whole-Settings runtime graph evidence waits for that owner's return and independent review**; declaring these ports is not clearance of the previous five Common-root stops.

G's Core scope/runtime/private gate/driver, public server/seed/copy graphs, HTTP proof, legacy Day.js, private auth/backend, UI/editor and host implementation remain outside this allocation and held. No source hash/evaluation/acceptance of those graphs, source cleanup, provider composition, listener allocation or B/C readiness is claimed.

Checkout writes are only `packages/common/package.json`, its single workspace lock field and this authorized handoff; remaining writes are owned temporary evidence. No root manifest, other dependency, source/app/UI change, checkout install, staging/commit/branch, nested agent, real data/credential/.env/DB/provider/paid call, browser/listener/3100/3200/3210, shared Docker or service action. **Return boundary reached: declarations and candidate proof are ready; no wait for Definitions/proxy/restore work.**

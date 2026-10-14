# Context public ports — export-only handoff

2026-10-11. **Four selected exports declared; no dependency or lock change.** Oracle-approved PUBLIC-CONTEXT-PLAN/source preparations remain bounded: Auth SessionUser equivalence accepted, setup-read factories accepted as candidate contracts/source preparation only. No context consumer substitution, server graph acceptance, SQL/native RPC or mounting follows.

## Exact working additions

| Manifest                     | Added export → actual existing target                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `packages/auth/package.json` | `./nitro/context-types` → `./nitro/context-types.ts`                          |
| `packages/api/package.json`  | `./nitro/resources/setup-read` → `./src/nitro/resources/-setup-read/index.ts` |
| same                         | `./nitro/context` → `./src/nitro/context.ts`                                  |
| same                         | `./nitro/contribution` → `./src/nitro/contribution.ts`                        |

All four package exports resolve to the exact existing file paths. API targets were checked by filename/stat only: **no API source content/hash/import graph or factory evaluation**. Targets remain producer-prepared uncommitted sources, not sources committed by these declaration patches. Coordinator must pair separately accepted exact source ownership before curating a commit.

Every existing export, dependency, development dependency and other field in both full working manifests is preserved. Auth already directly declares `@auth/core` and Definitions; API already directly declares Auth. No new dependency, root/type/wildcard export, lock field or install is required.

## Fresh exact-base artifacts

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-context-public-ports.6MPVRk
```

Base is the supplied **`27f35202d22af256bf58f8b33e39b84e0030f45b`**. Exact HEAD manifest bytes are reused from the verified saved HEAD snapshot in the independently accepted Common evidence directory, checked against its recorded hashes. **No Git command** was used here; this is explicit-base provenance, not a fresh assertion about a moving Git reference. Reconcile the candidate if coordinator's base changes.

| Patch                        | Exact scope                                         | SHA-256                                                            |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| `working-auth-exports.patch` | Before-step full working Auth → one export addition | `8d3cee1127290b1af205e1a6f7c859889423dddb37cf2d6afc1cf5775ead3acd` |
| `head-auth-exports.patch`    | Exact saved HEAD Auth → same one export             | `8d3cee1127290b1af205e1a6f7c859889423dddb37cf2d6afc1cf5775ead3acd` |
| `working-api-exports.patch`  | Before-step full working API → three exports only   | `9960b93511398d3353e0a55cfb1436511a7791f540cb01fee0a960ac201c54cc` |
| `head-api-exports.patch`     | Exact saved HEAD API → three exports only           | `84cc185b1e918deae716c5b4f565fc723b566e7c0c0c9e9de81fdf0d1bd2d534` |

All patches are strictly additive, **one/three added lines and zero removed lines**. Minimal HEAD candidates are in `candidate/packages/{auth,api}/package.json`; they contain **none of the fourteen older pending API export keys or pending dependency fields**. Full working API retains those peer-reviewed pending declarations unchanged. `proof.json` enumerates their separation; never stage the full working API manifest in place of the narrow candidate.

Manifest SHA-256:

```text
Auth before / HEAD    cf67608a1d2ebbb6d213ec8c9851e6ff5939d298e63de8c8ceda90cf06cbfd2a
Auth after / candidate fd11143aace1b3eeb4fd49e1e0a679fbc96e068a78e24ef53418a03b6878ab73
API working before    c73df99a30ca7e61161ba63cb3166b9ccf09a90bce0cd64beb67c6eddae352dd
API working after     5dd3b20343830174cd763c3b67677f04fa035643ab848a7dc9771097c14c3e2c
API HEAD              1fbca6fbd4bdc194bd3f4370cd451cd8c572a6de9db7634abb5ea56423483a1e
API HEAD candidate    50780d3fe8286bb2c272c29db0e11399ea4f979d16a5d1dc6486823332400790
```

## Pure Auth leaf evidence only

`packages/auth/nitro/context-types.ts` is unchanged, SHA-256:

```text
f6288524ace2573e18a5ef6a2d80a839075ab9bae2e37fbc7c635bbc69a894c6
```

Its two imports are explicitly **type-only**: `@auth/core/types` and `@homarr/definitions`. Actual Bun browser TypeScript transformation produces **empty runtime text**, no imports and no initialization. This check parses/transpiles source without importing/evaluating it. Existing accepted SessionUser equivalence is retained; no legacy Auth/Next root comparison, provider/config/session engine, JWT choice or Q16 selection was performed.

Auth-leaf-only strict installed TypeScript check passes, exit 0, zero diagnostics, 354 compiler-listed files. No Core/DB/API or other Auth implementation appears in that compiler-only workspace list. The source root is solely `packages/auth/nitro/context-types.ts`:

```text
--ignoreConfig --noEmit --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --esModuleInterop --resolveJsonModule --noUncheckedIndexedAccess
--types node,bun,react,react-dom --pretty false --listFiles
```

`skipLibCheck` is the existing scoped declaration policy, not source diagnostic filtering. Real installed types only; no stub, assertion, `any`, root/type export widening, paths override or diagnostic suppression. No whole-context/setup/contribution compiler run was attempted.

Auth leaf lint and both working manifest formatting checks pass. Evidence:

```text
proof.json          ca3e5c8dc22556cae1d0a9bc3512d6fc1565f43711362db5a1bd751aaf08ff2c
typecheck-leaf.log  fd04301048802bea06647a99bd1ff235999bacd6ebfae62c5815ad14695bec44
lint-leaf.log       b9c6528d9de7ad64fa12c5604d24f33c9ae8ac810a3a91d609380b360a7c3bd4
manifest-format.log c08dad2a5b986ce2575103fc6af7ed43737ed70cadf739ebb4e9d11c0da8908e
```

Checks use Bun `--no-env-file`, `env -i`, isolated HOME, explicit local PATH and owned clean config. No install/network, tests, browser build, live data/credentials/provider or module evaluation.

## Preservation, handoff and holds

Structural before/after checks prove exactly four added exports. The other 42 snapshot manifest/lock inputs remain unchanged, including **Common's reviewed two-field declaration and working lock**. No lock candidate/delta/install was produced. Previously accepted Common evidence and all earlier artifacts remain untouched. No Git, index/stage/commit/branch operation occurred.

**SPINE owns the next separately allocated minimal TYPE-edge substitution** in the existing API context. That consumer still uses the old Session-root type boundary until its owner returns; this declaration does not quietly change it or clear its compile-time graph. Setup factories/context/contribution remain source preparation, not runnable/accepted server graph consumption. All mutable G/Core scope/runtime/seed/copy/HTTP graphs remain uninspected/unhashed/unevaluated and held. Settings' active fifth Definitions cleanup and whole-browser graph review remain separate; no producer polling.

Checkout writes are only the two allocated manifests and this handoff. No source/Common/lock/root/other manifest change, install, fake context, SQL/native RPC/host mount, listener/browser/container/service, environment/data/credential/network/provider or nested agent work. No ticket/count update or completion beyond existing #01; Q16 and private/session/public-host gates are unchanged. **Declarations returned frozen for independent review, with context-consumer ownership handed back to SPINE.**

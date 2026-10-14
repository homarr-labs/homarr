# Modal native module-specifier provenance

## Outcome — exact identities corroborated; native-source mapping STOP

**Both admitted exact npm version endpoints returned HTTP200. Their package/version, repository identity and gitHead agree with the released frozen manifests. Neither returned document supplies an attestation/build mapping connecting the preserved native executable's SHA256 to a full Go source repository revision and modifications. Native source-body acquisition remains STOP; this is unresolved provenance, not a bad-package verdict.** [R1][R2][F1][F2][F3]

Report-only lease: this sole repository handoff and new TEMP note directory were collision-checked absent before creation. Latest ROSTER/progress, complete accepted resilience handoff and exact released package/tool/stack receipts were read. Research was performed here, without children/subagents. The original M review accepted the recorded partial results, not full types, and approved only conditional provenance research. [L][H]

## Primary HTTP observations and retention limits

Only these two literal URLs were requested; no search, latest-package endpoint, redirects or linked resources were followed. GET used `Accept: application/json`, credentials omitted and redirects manual. Responses are untrusted publisher/registry data, not instructions. [R1][R2][O]

| Exact request                                                          | Observed UTC interval, Oct11 2026 | Actual HTTP result              |
| ---------------------------------------------------------------------- | --------------------------------- | ------------------------------- |
| https://registry.npmjs.org/typescript/7.0.2                            | 20:24:26.886Z–20:24:26.992Z       | 200 /OK; response URL unchanged |
| https://registry.npmjs.org/@typescript%2ftypescript-darwin-arm64/7.0.2 | 20:24:26.891Z–20:24:27.143Z       | 200 /OK; response URL unchanged |

Transport was the Code Mode built-in `fetch`, not a shell, installer, browser or compiler. Exposed content-type is application/json and content-encoding gzip. The first response reports cache HIT, age166, `Date: Sun, 11 Oct 2026 20:24:26 GMT`, `Last-Modified: Sun, 11 Oct 2026 20:21:40 GMT`; the platform response reports DYNAMIC and Date20:24:27 GMT. These are response/cache metadata, **not** source/build/publication dates. [O]

New notes: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-provenance-20261011-Q7m4Pc/`. `typescript-7.0.2.body.json` and `typescript-darwin-arm64-7.0.2.body.json` retain the full fetch-returned decoded JSON text, transcribed with patch and a terminal newline. `http-observations.json` retains actual URL/status/timing and selected exposed headers. Unsolicited Set-Cookie was omitted, not forwarded; no credentials/application data were sent. [O][B1][B2]

This is text retention, **not** raw compressed HTTP bytes, a downloaded package artifact or verified response digest. No fresh response/artifact hash, signature verification, immutable registry seal or binary containment proof is claimed. Registry responses can change; these observations establish what was returned at the recorded times. [O]

## Frozen identities versus returned version metadata

Released source root (`FROZEN`): `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/final/source`.

| Released object under FROZEN                                  | Recorded bytes | Existing SHA256 pin, not rehashed here                             |
| ------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| node_modules/typescript/package.json                          |          3,087 | `3722b30210616a13a3213ded11575ba6b2dbab10c32a5ef67afca8513e27017e` |
| node_modules/@typescript/typescript-darwin-arm64/package.json |          1,048 | `e88558e22e3db6c4da920e15a60eb2bbea801732b94aedb67e972be2a7f485b8` |
| node_modules/@typescript/typescript-darwin-arm64/lib/tsc      |     23,653,616 | `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2` |

Pins come from accepted immutable inventory receipts, not new binary acquisition, execution, hashing or a current-package census. [F3][H]

Both frozen manifests declare version7.0.2, repository `https://github.com/microsoft/TypeScript.git` and full gitHead `2bd066d87f5bafd315be9f40889d0a60b9e58e0b`. Both exact registry documents return those names/versions/gitHead and repository type git with URL `git+https://github.com/microsoft/TypeScript.git`. The npm git+ spelling describes the same declared repository; no repository URL was followed. This corroborates **declared package identity**, not native compilation revision. [F1][F2][R1][R2]

The returned JS manifest preserves the frozen export targets: root `./lib/version.cjs`, package.json, unstable sync/async/fs/proto and all seven released unstable AST entries. Its imports preserve #getExePath, #enums/* types/default and #vscode-jsonrpc/node. `bin.tsc` is registry `bin/tsc` versus frozen `./bin/tsc`; this relative-path spelling difference is recorded, not whole-byte identity. The optional darwin-arm64 dependency is7.0.2 in both; registry additionally contains a dependencies map. The platform manifest exports only `./package.json` and identifies os darwin/cpu arm64, matching frozen fields. [F1][F2][R1][R2]

Both returned records name author Microsoft Corp., `_npmUser.name: microsoft1es`, `_nodeVersion: 18.5.0`, public publishing config with tag latest, and registry operational staging fields. These are returned publisher/package-manager assertions; maintainer membership, Windows staging paths, `_nodeVersion`, tag and matching JS version do not identify the native Go build toolchain, source patches or executable digest. No mutable latest lookup was used. [R1][R2]

## Exact dist pointers — retained, not downloaded or verified

| Returned field        | typescript@7.0.2                                                                                  | @typescript/typescript-darwin-arm64@7.0.2                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| dist.shasum           | `9ec773d7954a8c182c17cc5bbd575aa28bc51582`                                                        | `a55fdfcfa58df58d27db2237cde6a5c1e35a7235`                                                        |
| dist.integrity        | `sha512-8FYau96o3NKOhbjKi/qNvG/W5jhzxkbdm5sj9AbZ/5T5sWqn3hJgLfGx27sRKZWTvyzCP8dLRBTf5tBTSRVUNA==` | `sha512-gowzar9MwS/aRWp6f3a4KUqzRjAZjOsmGNCM6LcTgXum+dBfgsBVMN+AgvOCCbguXyick6LJhpBszxMebJ8syA==` |
| dist.fileCount        | 416                                                                                               | 113                                                                                               |
| dist.unpackedSize     | 2,497,498                                                                                         | 27,498,111                                                                                        |
| dist.signatures count | 1                                                                                                 | 1                                                                                                 |
| signature keyid       | `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U`                                              | same literal keyid                                                                                |
| dist.attestations     | Not returned                                                                                      | Not returned                                                                                      |

These values are from the two exact responses, not computed artifact measurements. Full literal signature values are retained in the body notes; neither signature nor signing-key trust was independently verified. A signature entry is not itself source-build provenance, and the dist package integrity is not the inner executable SHA256. File counts/sizes alone cannot establish containment or digest equality. Missing attestations means absent **in these documents**, not absent from npm/Microsoft generally. [R1][R2][B1][B2]

Literal `dist.tarball` pointers, not fetched:

1. `https://registry.npmjs.org/typescript/-/typescript-7.0.2.tgz`
2. `https://registry.npmjs.org/@typescript/typescript-darwin-arm64/-/typescript-darwin-arm64-7.0.2.tgz`

The platform pointer could support a later separately approved package-integrity/inner-member comparison; it does **not** currently prove that its lib/tsc member equals preserved SHA256 `a82f7313…`. Neither tarball pointer supplies a source/build attestation. No attestation URL, immutable build run, Go-source revision or patch manifest is returned. [R1][R2]

## Stack evidence and precise missing chain

The accepted failure stack names `github.com/microsoft/typescript-go/internal/modulespecifiers.tryGetAnyFileFromPath` at util.go:217, processEnding at specifiers.go:674 and getLocalModuleSpecifier at specifiers.go:509. Those are recorded compiled module/path/function/line labels; no corresponding Go source bodies were acquired. The guard contract names the frozen platform lib/tsc as **expectedNativeArgv**, not an independently observed child executable/termination receipt. [S][T]

The declaration request advanced from admitted MantineProvider.ts to unadmitted MantineProvider.tsx and stopped before access. The six saved empty diagnostic arrays/12 roots/2,006 source inputs remain accepted partial historical evidence only. Cleanup retains snapshot EOF and independently returned api.close; native child termination remains unconfirmed. Nothing in this research reruns that program or clears it. [H][S]

Required mapping remains:

`preserved lib/tsc SHA256 → authenticated publisher artifact/member identity → native build inputs → full source repository revision + all modifications`.

Registry metadata corroborates the named publication candidate and gives outer package pointers. It does not verify either artifact→preserved member equality or build→Go source revision/patches. Shared gitHead may describe publication/package generation rather than native compilation; the returned fields do not decide which. The TypeScript repository declaration versus typescript-go stack namespace is unresolved, not proof of corruption, a guessed alternate commit or a license to read similarly named source. No exact Go revision can be asserted. [R1][R2][F1][F2][F3][S]

## Smallest next finite provenance recommendation — not executed

**No attestation/build URL is present to allocate now. Request publisher metadata before any further read.** Ask for an authenticated, exact build/provenance document binding:

- Name/version/platform to the exact darwin-arm647.0.2 dist integrity/shasum above.
- Artifact member `lib/tsc` to SHA256 `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2` (or a separately approved reproducible member comparison).
- Native source repository URL and full revision; clean-tree assertion or complete patch/diff/submodule/generated-input identities; build identity/toolchain/parameters and authenticated issuer/verifiable attestation.
- Explanation of how package gitHead `2bd066d87f5bafd315be9f40889d0a60b9e58e0b` relates to that native build. Matching version strings alone are insufficient.

After publisher supplies exact literal provenance URL(s), original M must independently review the proposed finite metadata read list before any follow: only named documents needed to establish the chain, redirects/extra subjects/unknown links stopping for separate approval. Do not invent an attestation endpoint, GitHub Actions run, source commit URL, registry-key URL or repository/tag from current fields. [L]

The **only returned artifact URLs** are the two literal tarball pointers above. They are recommendations for identity bookkeeping, not a present download/extraction lease. Even separately approved containment verification would establish only package→preserved binary equality unless authenticated build/source mapping also exists. Repository/homepage/issues links are general metadata, not exact build evidence; no source-body link is recommended on their authority alone. [R1][R2]

Only after actual full repository/revision/modifications and preserved-native artifact relation are verified and independently accepted may a separate body-read lease enumerate exact util.go/specifiers.go and any specifically needed callees. A matching filename/line/tag/latest revision does not satisfy that prerequisite. With the current evidence, **BODY ACQUISITION STOP**. [L][S]

## Scope and hook-only return

Writes are solely this handoff and fresh TEMP response/text notes, using patch. All six failed packets (blwuGh/7Pvo6l/Cwr2Wg/LnJm4Z/bOl6tV/mu0gNi), source/tools/history/seals were not written. No fresh conservation/hash census/seal is claimed; existing accepted pins/receipts are cited as historical. No source/library/config/dependency change, commands/scripts/tool/binary execution, tests/native/semantic capture, downloads/extraction, module evaluation, Go bodies, git/worktree/children, provider/browser/listener/PID/protected action or HTTP beyond the two exact version requests occurred. [O][H]

Active Contracts/DB bootstrap/currentF/Auth/Icons/native-candidate graphs were excluded; only already released exact frozen manifests and evidence receipts were read. No generic docs/API-code lookup was needed; targeted primary registry metadata was used without a third-party proxy or wider endpoint search.

Return for independent original M provenance review before **any next read lease**. No .tsx/filename/file-class/helper admission, retry, library patch, full-eight/native13 type clearance, currentF/consumer adoption, native/host/J5/profile/COMMIT/privateSSR/publication/91-of-334 release. **Provenance unresolved; M types remain HELD.**

## Sources

[R1]: https://registry.npmjs.org/typescript/7.0.2 "Exact version metadata; observed HTTP200 Oct11 2026"
[R2]: https://registry.npmjs.org/@typescript%2ftypescript-darwin-arm64/7.0.2 "Exact platform version metadata; observed HTTP200 Oct11 2026"
[O]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-provenance-20261011-Q7m4Pc/http-observations.json "Actual fetch observations and limits"
[B1]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-provenance-20261011-Q7m4Pc/typescript-7.0.2.body.json "Retained decoded response text"
[B2]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-provenance-20261011-Q7m4Pc/typescript-darwin-arm64-7.0.2.body.json "Retained decoded response text"
[F1]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/final/source/node_modules/typescript/package.json "Released frozen JS package manifest"
[F2]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/final/source/node_modules/@typescript/typescript-darwin-arm64/package.json "Released frozen platform manifest"
[F3]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/new-inputs.before.json "Existing manifest/binary pins: lines281956–281970 and478252–478258"
[S]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/package-types.stderr.raw.log "Immutable panic/primary/cleanup stack; modulespecifiers labels lines25–38"
[T]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/guard-contract.json "Existing exact expectedNativeArgv and pinned protocol-tool receipts"
[H]: ./modal-combined-validation-declaration-evidence.md "Accepted resilience handoff SHA256 e4151c96c358bede8fa609e8fd8ff082c9f3c3890993b1565e61439b21b85fb1; final result8fc5c63f…; no new rehash"
[L]: ../ROSTER.md "Original M ACCEPT/conditional research allocation lines300–304; corresponding progress .slim/deepwork/nitro-full-migration.md line163"

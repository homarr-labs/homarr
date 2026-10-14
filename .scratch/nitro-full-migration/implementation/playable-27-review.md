# Lane27 exact J2 source join — independent bounded review

## Decision

**PASS for bounded J2 source consumption. No new P0–P3 finding in the four owned source paths. J5 SOURCE may consume these exact frozen private interfaces, preserving every hold below.** This is not issuer publication, native SQL/provider execution, reader/resource COMMIT capability, SSR activation, or production mounting approval.

Reviewed `playable-27.md:1-68`, the four current implementation files, the frozen adapter/body, actual producer factory/contracts/statements/runtime/transaction gate, genuine authority reader/lifetime/snapshots, installed public Core callback branches, package manifests, and the final raw artifacts. No commands, tests, SQL, providers, browser, builds, Git operations, or children ran. Only this new review file was written.

## Spec

No new bounded source defect found:

- **Concrete same-runtime binding:** `service.ts:621-639` constructs the private owner and issuer. `sql-persistence.ts:103-142,155-178` binds the genuine exported `createAuthSessionSqlRuntime`, genuine `createSqlAuthorityReader`, and fixed read repository to the same supplied runtime. `packages/db/package.json:11-12` exposes the actual producer entrypoint. No admission-success callback or caller-selected mutation SQL is introduced; a structurally matching runtime is still not admission proof.
- **Source facts and branches:** `repository.ts:56-147` performs parameterized, bounded, source-first-row ID/name-provider/email-provider/account/session reads, including full password/provider/profile/account facts and the actual PostgreSQL timestamp decoder. `service.ts:250-334,418-515` retains genuine verifier/Core selection and private witnesses. `sql-persistence.ts:314-456` converts existing/create identity, selectors, account absence/link/existing witnesses, generated/existing sessions, and fixed login effects into the reviewed discriminated producer plan. Producer source rechecks existing facts, selector/ID/account absence and session constraints under its fixed unit. Same-account and authenticated-link public Core branches still receive login effects without inventing a new session. Unsupported updates hold rather than silently persist partial effects.
- **Single dispatch:** `sql-persistence.ts:505-517` invokes exactly one `establishAsync` or `renewAsync` for a mutating operation. No adapter write, second reader, transaction-assertion callback, retry, compensation DELETE, or Core Credentials/JWT workaround substitutes for it. Throttled renewal does not dispatch.
- **Private claim and association:** `persistence.ts:158-195` retains the opaque operation association and consumes it once after owner/pending validation; `sql-persistence.ts:481-482` additionally resolves the private matching scope before dispatch. The genuine preexisting reader lease is acquired inside tracked work and retained privately in that scope (`230-249`), not released at preparation or replaced with a caller DTO.
- **Owned work and settlement:** scope creation installs request/lifetime/deadline ownership before async work, uses finite segmented timers, and clamps to admitted host validity (`155-205,230-249`). Repository and actual body/verifier/Core/native promises are retained while in flight. Scope/owner close await exposed work and genuine lease release (`252-269,587-600`); a never-settling provider remains pending, not declared physically disposed.
- **Separate native ledger/readback:** `476-576` creates a new ledger rather than reopening staging. Confirmation comes only from the concrete producer return. The same reader admits the resulting token and checks actor, expiry, memberships, expanded permissions and fresh currentness; renewal also compares old/fresh grants. Required releases are awaited even after failure. These checks are not same-native-transaction authority through dispatch.
- **Honest disposition:** recognized producer dispatch ambiguity remains `commit-ambiguous`; confirmed return followed by readback/currentness/release failure becomes `confirmed-commit-settlement-failed`. Other failures make no rollback claim. Every outcome remains `publication: "held"`; `persistence.ts:198-201` always rejects publication.
- **Logout stops:** `service.ts:528-530` rejects before reader admission/native dispatch. Frozen reader revoke owns its own DELETE (`sql-authority/authority.ts:210-248`), so combining it with producer revoke would duplicate mutation. No such call exists here. The requested genuine same-reader/same-runtime exact-operation completion-to-invalidation/drain extension remains required, including ambiguity handling, without a second DELETE or caller-asserted revoked DTO.

## Standards

No new non-tooling standards finding. The change stays in the private production-session boundary, uses existing declared Auth/DB/definitions dependencies and actual package exports, preserves `unknown` decoding and discriminated plans, and adds no comments, dependency, tests, schema, host, or route. Private proposal/owner/lease helpers must remain server-private and must not become RPC payloads or public capability claims.

## Frozen identity and actual evidence

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable27-j2-frozen-0NB1EN/`.

These exact path/hash pairs were matched directly in `closure.json`, not only in the handoff:

| Owned path under `packages/auth/nitro/production-sessions/` | Recorded SHA-256                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `persistence.ts`                                            | `42d8b7fea6bab03ba15219e957d236780c4b454d6e64d9b47ffa5ee3b57eab2d` |
| `service.ts`                                                | `64a6a9f329392cd86506fd3e3d4a7baab8995976110ae9bc0cd1af7887eea083` |
| `sql-persistence.ts`                                        | `277296a53b7f3240f5cdf932fcb53b204d21f366a2510103d4b546480d1a7a1b` |
| `repository.ts`                                             | `363c4649f94472db465b9ccc83ef45b70e799a4a6774b3fac44865ccaafe1a71` |

The corrected accepted lane26 statement pair `packages/db/runtime-auth-session/statements.ts` / `232955e0ce7d179a9b3bf13171c877ffec3ca2254b083ff69304a91290935aaa` matches both closure and `accepted26-hashes.json`. Frozen body pair `ed414458eb598e3bebfd5f418215d98d14200d9a335430085c8c22ce24565dbb` also matches the closure. Adapter/origin/OIDC fingerprints are recorded consistently with the frozen return; current adapter branches were inspected directly.

Direct raw reads:

- `types.raw.log` is `[]`. `tsconfig.json` selects Node plus DOM, strict/noUncheckedIndexedAccess/noEmit, no incremental cache, and skipLibCheck; the actual `bun-types/sqlite.d.ts` input is present. Metadata reports Node 24.18.0, TypeScript 7.0.2, **1930 inputs, zero diagnostics**. This is a bounded static profile, not Node native SQLite execution or a whole-repo pass.
- `types.bun.raw.log` contains **six diagnostics**, all in unchanged `bounded-body.ts`: one incompatible reader-result promise annotation and five possibly-undefined chunk diagnostics. `tsconfig.bun.json` adds actual Bun globals; metadata reports **1958 inputs**. **Full Bun/DOM closure FAILS.** No clean full-Bun claim is accepted.
- `lint.raw.log` says `Found 0 warnings and 0 errors` and `4 files with 197 rules`. The copied oxlint configuration was inspected; metadata records exit 0. No lint run was repeated.
- `verification.json` records raw hashes: Node types `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`, Bun types `62ce53203e4ef3785a90a82c5917995f2cfc40262686f7e8dca38100ac42815a`, lint `6c60e0fbecce89722af87859b10812909d73223c6b6c5597ddd5fb99a73102b2`, closure `edb39d1d30ef4135c75bedbad1eb50f111b8b7f6fbb6f135963b528cff103bfb`.

Evidence limit: under the no-command constraint, hashes were not independently recomputed and compiler input counts/no-live-fallback execution were not independently rerun or enumerated. The single-line closure/config previews truncate; targeted exact path/hash/input searches were used. Recorded integrity metadata is supporting evidence, not independently established execution proof.

## Holds retained for J5

J5 may design source ownership against prepare/persist/discard/close and opaque held outcomes; it must not emit the private prepared response, session/color cookies, profile, token, witness or read lease, mount this factory, or interpret `confirmed-commit` as publication approval.

- Authentic resource-owner admission must establish credential SQL logging disabled **before reads**, real storage/config/lifetime/clock/skew/expiry/demo compatibility. The reader configuration literal is not a logging receipt; the producer's later write-time logger rejection does not protect earlier reads.
- Reader `commitAuthority`/resource COMMIT remain unsupported. Before/after snapshots and unchanged-grant comparison do not prove all-enabled-writer participation or validity through native COMMIT/G3 dispatch.
- Physical LDAP/OIDC transport settlement, native SQL correctness, rollback/ambiguity/races/restart readback and genuine production request ownership remain unproven.
- Logout requires the independently reviewed exact-operation reader invalidation/drain extension. Full Bun typing requires the narrowly identified frozen-body reopening; no producer/source-consumption pass clears either.
- Delivery, response reconciliation against actual committed profile/color scheme, distinct Set-Cookie handling, exact-operation reconciliation/revocation, SSR and private-boundary review remain held. No native proof, delivery, browser-cookie acceptance, or working-auth claim was established.

**Summary:** Spec: 0 new bounded findings. Standards: 0 new findings. J5 SOURCE consumption: yes for this exact freeze only. Publication/native/mount approval: no.

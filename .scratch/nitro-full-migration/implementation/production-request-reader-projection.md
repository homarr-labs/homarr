# Auth same-owner request reader — frozen three-source return

## Scope and source identities

**Implemented; focused complete static profiles and lint PASS. Frozen for independent Spec plus Standards/raw-evidence review, not source acceptance, public package publication, J5 or production readiness.** ROSTER.md:194,200–202 and deepwork:99–101 record Oracle approval of the exact projection plan, Main report's closed read lease and this new exclusive source allocation. Main construction/revision research remains future work and was not implemented.

Only product writes:

| Product path                                                 | Required before SHA-256                                            | Frozen candidate SHA-256                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `397bcd543f0189bdbfa77fb2e085220f564f559a72813f98abeb12570fcfc1c1` | `8f540379e0431874733e5f1277006c3b13ab9aa1070563421f2a80604688fa45` |
| `packages/auth/nitro/production-sessions/service.ts`         | `7ddf76baaf6804a5947a28c71a924050926a764789c9b2ccc446235a22940587` | `46d113be4d632a0f4c0f9b882c10d22a98700ba26f07aaafd6e82e361643432c` |
| `packages/auth/nitro/request-session-reader.ts`              | Absent                                                             | `71836aef7b7a10c27907bc554998e99246f52fb22f1e59929f371ff18204a0c2` |

This is the sole new repository handoff. New leaf and handoff collisions were checked initially, in pre-capture and immediately before their creation. The supplied checkout was retained; no Git operation occurred. No other product, manifest, export index, dependency, contract, DB, provider, Backend, host or prior handoff was written.

## Concrete API-key construction choice

`createProductionSessionSqlOwner(runtime, input, requestApiKeys)` now requires the existing `SqlAuthorityConfiguration["apiKeys"]` choice. It rejects missing/nonobject/null/array input and any tag other than `disabled` or `approved-stored-bcrypt-reader` **before** owner/controller/A/fixed-producer construction. The discriminant is read once, validated and copied into one frozen object containing only that known field; no caller extras, tag assertion, cast, default enabling, new numeric limit or provenance receipt.

The same existing B/A authority is constructed once; the frozen choice replaces only its previously hardcoded disabled API-key field. Existing full runtime, approved opaque expiry, snapshot/skew/native limits, issuer clock and joined lifetimes remain unchanged. A itself was not modified: its existing validator does not validate the API-key tag, which is why the new check belongs before B construction.

`createProductionSqlSessionIssuer(runtime, configuration, sqlConfiguration, ldap, requestApiKeys)` threads that required fifth argument into B. The one located SQL-owner construction call is updated; bounded Auth/Backend/API/Next request-source searches found no additional concrete caller. No fixture/caller outside the allocation was amended. A later additional caller requires a separate allocation, not an implicit default.

All issuer preparation remains opaque-only. No API key is acquired for session renewal/logout/CSRF. Canonical-origin/signed-CSRF/POST/body/selected-session gates, real full witnesses, sealed proposal claim, exactly one A revoke, retained native disposition, ambiguity and matching drain remain the accepted B algorithms.

## Actual two-method projection and exact issuer association

Auth-private `getProductionSessionSqlRequestReader(owner)` first uses the existing genuine `owned(owner)` lookup. Getter and both methods synchronously reject B closing or its joined configuration lifetime already aborted, using existing `IssuerStagingError`, before invoking the reader/native path.

Its returned frozen object actually contains **only** `admitOpaqueSessionAsync` and `admitApiKeyAsync`. The narrow `ProductionSessionRequestReader` type reuses the corresponding existing `SqlAuthorityReader` signatures; it does not disguise a wider runtime reader behind a Pick. Each method delegates directly to `value.authority.reader` and returns that actual promise/admission/original lease. No cloned lease, second authority registry/reader/runtime/pool/producer, SQL callback, revoke, COMMIT capability, reader close or witness accessor is projected.

`service.ts` has one module-private `WeakMap<object, ProductionSessionSqlOwner>`. Only concrete factory construction inserts the exact frozen `sqlIssuer` object it then returns, associated with its actual existing B owner. No structural owner/issuer field matching or caller registration API exists. Auth-private `getProductionSessionRequestReader(issuer)` rejects a missing association and obtains the genuine B projection. Copied/foreign/type-shaped issuers do not acquire it. This association establishes construction/ownership, **not authenticated host admission**.

Existing construction failure still awaits the actual `closeProductionSessionSqlOwner(owner)` and throws the original staging error. Returned issuer persistence/discard/close delegates and B's accepted shared-close body are unchanged. Request consumers receive no close capability: actual admitted lease `releaseAsync` is request cleanup; shared issuer close still owns B/A reader/producer drain without closing the supplied main runtime.

## Header and leaf boundaries

For a present API-key header, the adapter uses exactly the existing `split(".")` grammar: exactly two nonempty parts, no trim, normalization or invented regex. Present empty/malformed headers throw existing `SqlAuthorityError("INVALID_OPERATION")` **before reader delegation**. Null/undefined remain valid absent-header method inputs and delegate unchanged; enabled reader returns its genuine anonymous result, disabled reader rejects with its existing `READER_DISABLED` before credential SQL. No cookie fallback or request producer is implemented here.

Well-formed headers delegate to A's unchanged stored-hash/bcrypt/reread/witness admission. Reader/native/verifier/deadline/abort failures are not caught or rewritten as anonymous. Rejecting present malformed headers intentionally narrows the original reader's malformed-anonymous behavior; it does not claim byte-equivalence to the permissive old browser selector. Future host selection must preserve valid-key precedence and genuine fulfilled-anonymous-only cookie fallback, never failure fallback.

New server-source leaf `nitro/request-session-reader.ts` contains exactly three named exports:

- `getProductionSessionRequestReader` from the Auth-private service.
- Type-only `ProductionSessionRequestReader` from the Auth-private SQL owner.
- Existing `readSingleCookie` from the Auth-private origin source, unchanged parser implementation.

No constructor, wildcard/barrel, A/B owner, credentials/witnesses, provider, held ledger/disposition, native close or publication is exposed. No undeclared `server-only` dependency/import was added; actual Auth dependencies were read first. Server-source intent/file naming is not browser graph exclusion proof. Cookie prefix/name must later come from the same real pinned issuer configuration; this leaf invents no default cookie or forwarded-header policy.

**No manifest entry was added.** Existing Auth/DB/Backend public export inventories, manifests and lock remain identical. New leaf was validated as a real additional source root with its actual relative imports, not an export shim. Coordinator01 may separately publish the exact leaf only after independent source acceptance.

## Immutable capture and semantic conservation

Evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/production-request-reader-8PBog8qn/`

Before product edits, recaptured all **2085** accepted B closure files from current actual source/declarations/config metadata. All accepted source/prerequisite pins matched, including required two before hashes, A, ledger, repository, body, DB26, manifests and lock. Zero drift/missing input. Every copy is a regular read-only single-link independent physical file, with actual canonical source and distinct source/copy device/inode receipts. No source or captured data directory was opened.

Final fresh capture contains **2088 mapped physical files**: original complete 2085, new leaf and two new root-addition profile files. Only the two allocated original sources changed; **2083 original neighbors** remain byte-identical. Both old configs remain captured unchanged; each new profile retains its complete original ordered roots/options and adds only the new leaf. Inverse JSON removes that one root and reproduces the original config. No root pruning, fake declarations/public exports or live read fallback.

Full source before/after raw diffs are retained. Executed whole-byte inverse checks reproduce each required before source exactly after removing only the allocated additions/substitutions (`inverse.json`). Static block comparisons independently show:

- Entire original SQL source from `assertProductionSessionSqlConfiguration` through all scopes/reads/witness conversions/persistence/claim/logout/discard/shared close is identical.
- Entire service preparation/response/login/renewal/logout body from its suppressed logger through the concrete SQL factory boundary is identical.
- Original B ownership lookup/bounds body, frozen ledger publication rejection, A registry/currentness/revoke/close and native foundation pins are unchanged.
- Actual leaf is exactly its three permitted named exports; public export inventories and original historical handoffs/evidence remain unchanged.

Capture/FS guards reject any reached Icons/modal/form active path before reading/hashing/copying it. Original admitted Auth graph and actual new-leaf compiler closure reach none; no active01 `packages/icons/package.json`, M/T/C/F inputs or UI consumer graph was read. Prior B/A receipts and all 2085 original accepted physical B inputs were checked unchanged, not overwritten.

## Fresh complete static checks

Used genuine installed TypeScript **7.0.2** snapshot API under Node **24.18.0**, oxlint **1.73.0** and existing actual SQLite/Node/Bun declarations (`@types/node`24.13.3, `@types/bun`/bun-types1.3.10). Bun **1.4.2** was invoked only for `--no-env-file --version`. Core remains actual pinned0.41.3. Tool pins match accepted B before and after checks.

The new snapshot driver preserves accepted B's actual mapped filesystem/compiler method. Its full diff is retained: select the two new physical profiles, guard forbidden paths/realpath before FS access and reject any missed read. Every compiler source and every read belongs to its fresh immutable mapping; **zero missed reads**, no live fallback. Original strict/noUncheckedIndexedAccess/noEmit/nonincremental and configured skipLibCheck remain unchanged. skipLibCheck is not claimed as dependency semantic proof or whole-workspace validation.

| Check                                                      | Actual complete inputs/read files | Diagnostics/result                               | Raw exit |
| ---------------------------------------------------------- | --------------------------------- | ------------------------------------------------ | -------- |
| Node+DOM / actual SQLite declarations                      | 1931 inputs / 2044 read files     | Config/program/global/syntax/bind/semantic all 0 | 0        |
| Bun+DOM / actual installed globals                         | 1959 inputs / 2073 read files     | Config/program/global/syntax/bind/semantic all 0 | 0        |
| Focused oxlint, all three allocated sources, deny warnings | 3 sources / 197 rules             | 0 warnings / 0 errors                            | 0        |

Both profiles preserve the complete original ordered1930/1958 input arrays after excluding only the added leaf, with no removed inputs. Both type stdout logs are exactly unfiltered `[]`; check stderr logs are empty. Full actual roots/options/inputs/read inventories/diagnostic categories and raw command/status/environment records are retained. Three source-diff process exits are1 for actual differences, not failures. All preparation/version/static/post-verification checks succeeded; no failed check was hidden or retried.

Compiler/linter/version, preparation and post-verification processes use a replacement tool-only environment with explicit fixed PATH/locale, disposable HOME/TMP inside this new directory and no env loading/inherited credential or NODE_OPTIONS. Initial metadata preflight used `env -i` with only PATH and locale; HOME/TMP were unset, and its explicit capture destinations were entirely inside this directory. Its tool-return command/output is recorded separately rather than represented as a captured subprocess log. Static scripts/copies/evidence are confined to this new approved temp directory. No product module evaluation, emission, incremental cache, runtime probe, SQL, provider/network, tests/body/reentrant probes, browser/listener/PID, installation/build, Git/worktree/child or protected3100/3200/3210/`-g`/application-data activity occurred.

| Frozen evidence              | SHA-256                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `verification.json`          | `921f2056fb755f5131e4500e72684c5c5de27c80de2cb7b69e622e5b0d2096c2` |
| `before-closure.json`        | `1439d448d604b5ab00372abc95ce95b0c7c2a156947d135a99594000eccf68de` |
| `closure.json`               | `e3ec650d8d326d5934b9a27119e7e98aca270e6f805ea26cca25720cbb3bc7ca` |
| `inverse.json`               | `5a7264d102006ea7e64be5931572ca4b5c4475313f8fd467212b6fa0bdd61745` |
| `semantic-preservation.json` | `4e2e4fbc7b719e4179f39aa7145663f565ed55abb8f7f6f2d78f541bd22f9d31` |
| `validate.mjs`               | `aaf3775129b3c0ece3b82190746914249e99b37f6b94f4c6a0dea015c0c0453f` |
| `driver.diff`                | `10dfedeb2ceb61a6961916b2a3c9b1843dd05ccb4dec04564ba42d8f64bf0310` |
| `raw-statuses.json`          | `d8cbb240d1796a1780790148695a49782c9d55ca784f8f3fd5aa76030cb7a5d2` |
| `postcheck.json`             | `dd7c5d933a779256080f4717d87ef72e36dae9b0223a657cf5eb0ec759430c87` |

`verification.json` retains all other artifact/source/tool hashes; separate final integrity records freeze this handoff identity without self-embedding it.

## Acceptance stops

Independent Spec and Standards/raw-evidence review of these exact three hashes and new packet must return before source consumption or coordinator01's separate Auth leaf declaration. No reviewer was spawned/polled and no self-acceptance is claimed; completion hooks only. Original accepted B history remains the input for concurrent Main research, not these unaccepted new source bytes.

Actual host still has no admitted concrete issuer instance. This getter cannot construct one or convert a caller flag/type/WeakMap association into physical resource/logging admission. Main Session Host/J5/profile/sessionRevision/durable generation/Query transition producers, REST/MCP, compatible writers and validity through COMMIT remain separately held. Reader `commitAuthority` and resourceCommit remain unsupported. Publication **always rejects**, including after confirmed commit; no private SSR/delivery/native/provider/race/restart/physical/host/publication or91-of334/count gate clears.

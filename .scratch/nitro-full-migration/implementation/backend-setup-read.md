# Read-only setup-backed context: frozen review handoff

2026-10-11. Implements the oracle-approved bounded source preparation in `PUBLIC-CONTEXT-PLAN.md`. This lane writes only NEW `packages/api/src/nitro/resources/-setup-read/**` and this report. Source is now frozen for independent review, unregistered and uncommitted; no D/#05/#125 closure or public-host mounting is claimed.

Certificate six, localization, home helper, context/procedure, accepted steps, Auth, legacy claims/schema, central map/index, manifests/lock and host source were not edited. G's returned 22/297 preparation remains under review/HELD. No runtime/Core evaluation or hash was used as graph acceptance. No environment files, current data/credentials, live DB/provider/network, browser/listener/container, preserved 3100/3200/3210, install, Git or nested-agent operation was used.

## Actual factories and typed resources

Public-intent `index.ts` exports exactly:

- `createSetupReadResources(admission: SetupReadAdmission, resources: SetupReadResources): BackendSetupResources`.
- `createSetupBackedContext(input: SetupBackedContextInput, admission: SetupReadAdmission, resources: SetupReadResources): BackendContext`.
- Type-only `SetupReadAdmission`, `SetupReadResources`, `SetupBackedContextInput`.

`SetupReadAdmission` borrows the existing BackendContext DB type, matching physical SQLite `users/onboarding/serverSettings` schema slice, request signal and mandatory synchronous `assertCurrent()`. These are primitive admission resources, not final user/claim/setup controller callbacks. The host must supply the actual narrowed SQLite DB and the schema from that same admitted handle. The relational `db.query.users/onboarding` reads use that DB's attached physical schema; the claim predicate uses its explicitly supplied serverSettings table. Types alone do not prove host pairing.

`SetupReadResources` requires actual typed `eq` and `now(): number`; no ambient DB, default clock replacement, mock authority, `hasUsers`/finished-step callback or new policy engine. The callbacks reject any passed DB other than the bound admission's exact DB. Both factories initially check currentness; every SQL read has before/after fences and awaits the real operation before the after-fence, including on failure. A callback already executing remains the scope owner's responsibility to settle before release.

`SetupBackedContextInput` retains the frozen request/principal/device/demo/effect/disposal surface and requires trusted explicit `baseUrl`. It also forwards optional existing diagnostic capabilities without generating logs itself. The builder requires the request and admission signals to be identical, derives the claim token from the actual request Cookie header, installs both actual read callbacks and invokes the unchanged `createBackendContext`. Effect/disposal-registration delegates are fenced and forwarded, never fabricated no-ops. The builder itself emits no response effect or disposal registration.

Optional D supplies an actual anonymous principal, explicit disabled demo mode and source-optional `deviceType: undefined`. The input still accepts the genuine existing authenticated principal shape for a separately selected future private authority; no subject/revision/cookie is converted into an administrator or private account here. Trusted baseUrl is not derived from forwarding headers. No auth/CSRF/origin/session/Q16 choice is made.

## Source equivalence and read/error behavior

Comparators: actual `packages/api/src/onboarding-claim.ts:21–76`, `onboarding-step.ts` and legacy `router/onboard/onboard-queries.ts:14–21,31–35`. The accepted `routers/-settings-setup/steps.ts` is directly reused unchanged for the real onboarding read/normalization; the provider-coupled legacy barrel is not imported.

- Cookie extraction retains the literal `homarr-onboarding-claim`, semicolon splitting, first equals separator, exact trimmed name, trimmed encoded value and decodeURIComponent. The first matching duplicate wins; empty/malformed first matching value stops with undefined rather than considering a later duplicate. Decoded text receives no further normalization or token-format checks.
- Claim-only access samples the required clock **once before the users read**, retaining the source default-argument timing. It executes `db.query.users.findFirst({columns:{id:true}})` first. Existing user short-circuits denial; absent/empty token after that read denies without claim SQL. This is source-computed denial, not a placeholder for D's unused mandatory setup port.
- Present tokens query actual serverSettings with `eq(settingKey, "__onboarding_claim")`. JSON is parsed as unknown and narrowed without assertions: lowercase 64-hex hash, numeric safe-integer expiry; extra properties ignored, malformed shapes denied. No positivity, new TTL or token-format rule is added.
- Retains expiry `<= now`, SHA256 of the actual token, Buffer length comparison and actual timingSafeEqual. No claim issuance, renewal, deletion, randomness or cache exists in this adapter.
- There is deliberately **no onboarding finish predicate** in the claim read gate. The source's finish check belongs to excluded issuance, not claim-only validation.
- `currentStep` returns the actual accepted reader's `.current`: missing row -> start; user/group/setup/finish preserved; settings/integrations -> setup; unknown/null/undefined -> start. Its previous-step truthiness/normalization code remains untouched.
- SQL/clock failures are not transformed into false/default/healthy setup. SQL errors propagate when the admission remains current; a failed after-fence instead reports unavailable admission, never successful read/rollback. Only source JSON rejection becomes invalid-claim denial. Admission/currentness failures use `SetupReadAdmissionError` with fixed text and safe reason, no supplied cause/token/hash; no new wire-error protocol or route is installed.
- The private parser returns no public DTO. The package-intent barrel exports no stored claim/hash/token/list API; the borrowed BackendContext retains its existing internal claim-token field but must never be serialized. Pure check output contains statuses only. This read-only seam has no certificate mutation/retirement protocol and changes none of its mandatory effects.

## Admission lifetime and composition holds

Both returned context and callbacks are borrowed **inside** the whole native RPCHandler admission, not standalone application/global services. COMPOSITION must bracket genuine DB acquisition, context construction, RPC processing and completed serialization in accepted `withDatabaseAsync`. Do not return DB/context/builders from a completed admission or treat one admission as an MVCC snapshot/transaction. A retained borrowed callback is a misuse: currentness plus the tracked DB must reject it, while Foundation owns already-started SQL settlement, response-body/disposal fences and shutdown-before-close ordering.

The builder cannot itself prove that a caller supplied a genuinely tracked DB/currentness primitive or prevent all structural retention of BackendContext's required DB field. Host lifetime review and actual negative fixtures remain necessary. No automatic lease release/disposal callback returns a revoked DB, and no response stream may perform deferred SQL after serialization/admission release.

COMPOSITION alone may declare `@homarr/api/nitro/resources/setup-read` -> `./src/nitro/resources/-setup-read/index.ts` after this exact source is accepted. Selected existing context/contribution/steps public leaves remain separate reviewed declarations as needed; no aggregate/wildcard export is proposed or added.

API's manifests were read before coding: existing DB/auth/definitions, oRPC and development Drizzle/TypeScript are declared; crypto/Buffer/assert/filesystem use Node primitives. Installed Drizzle 0.45.2, TypeScript 7.0.2 and oRPC 2.0.0-beta.43 were read locally. No network docs lookup was made; previous Context7 quota exhaustion remains recorded. No new library/API or unsafe compatibility workaround is used.

The frozen context's type-only `Session` import still reaches the Auth root/Next compilation graph in this source snapshot. It is not a runtime import, but is not a clean public type graph claim. The assigned Auth owner supplies its pure context-types boundary and the spine owner alone makes the reviewed minimal type substitution; this lane imports neither a private Auth type file nor a replacement context. Selected public server runtime/type graph closure, G review, actual host admissions and serialization/body lifetime proof remain prerequisites for D. Unrelated UI/editor completion and a fully completed private session feature are not prerequisites; Q16/private authority/CSRF/origin decisions remain separate holds.

## Completed checks versus held execution

Completed, using only owned sources:

```sh
bun --no-env-file packages/api/src/nitro/resources/-setup-read/checks.mts
bun --no-env-file packages/api/src/nitro/resources/-setup-read/typecheck.mts
/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node packages/api/src/nitro/resources/-setup-read/typecheck.mts
./node_modules/.bin/oxlint packages/api/src/nitro/resources/-setup-read
./node_modules/.bin/oxfmt --check packages/api/src/nitro/resources/-setup-read
```

Pure `checks.mts` passed on actual cookie/claim functions: duplicate/malformed/decoded cookie behavior, valid/mismatched/empty token, malformed/null JSON, hash casing, safe-integer guard, exact expiry and retained negative-expiry semantics. It imports only Node primitives and the owned pure claims leaf; **no DB/runtime evaluation or SQL mock** occurs. Clock sampling before SQL has static source evidence and a prepared real-SQL check, not executed SQL proof.

Scoped compiler checks passed with **zero diagnostics** under Bun 1.4.2 and the pinned Node 24.18.0 executable; lint and format pass without findings. Only the seven owned code roots plus the owned config were targeted. Transitive types are read by the compiler, not evaluated as runtime modules; this is not broad graph acceptance or a full-repository typecheck.

`sqlite-checks.mts` is **prepared, not invoked**. Its explicit exported `runOwnedSetupReadSqliteChecksAsync(migrationsFolder)` dynamically obtains genuine accepted persistence/operators/context only on future invocation, requires absolute actual migration assets, creates a new exclusive owned on-disk SQLite file, runs real source migrations/readiness and enters actual tracked admissions. It does not return fabricated SQL rows or cast fake databases. Its narrow checks cover:

- Real users-first/absent-token denial, hash/expiry/mismatch/malformed claim behavior and one clock sample retained when the clock advances before SQL.
- Existing-user short-circuit while the owned claim table is temporarily renamed, proving no claim-row lookup; real claim-read failure while renamed otherwise propagates, with exact table name restored afterward.
- Missing/current/legacy step behavior through the unchanged real reader and valid claim behavior at finish without an invented finish gate.
- Borrowed context construction, foreign actual admission rejection, currentness change after an admitted read, pre-aborted rejection and deliberately retained negative callback/effect use after release; no successful escaped DB operation.
- Close/drain before removing only the known owned SQLite/WAL/SHM files and empty generated directory. No listeners/real installation paths are needed.

These checks remain gated on G's frozen review and selected public graph acceptance. They have not created/opened any SQLite file or executed/evaluated the runtime/Core graph in this lane; readiness, schema assumptions, SQL behavior and cleanup are **unverified**. Real two-public-leaf Fetch SQL/serialization/body proof belongs the host join afterward, not this primitive-only run. No claim of PostgreSQL execution, provider calls, effective production authority, #05/D/#125 completion or changed central identity counts is made.

## Frozen owned SHA256

All paths below are relative to `packages/api/src/nitro/resources/-setup-read/`; hashes were recorded after final scoped checks. No G/runtime/Core source was hashed as accepted.

| File                | SHA256                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `claims.ts`         | `30792dea90a84414b28f6fbb6b745130f5635012fabcc0aac7a6dbb635c85abf` |
| `context.ts`        | `9c9d7f9b26b7051920c92009a13c8047af0446fc021b47ca45f88e75a1e96542` |
| `resources.ts`      | `bc963739a665786d83173c18dce45b530e0293986ec0e408fb0f1db46c370163` |
| `index.ts`          | `189c53fdc7b7e4e02d5a79df9daaaf601de27e0e36867a5dea7aeaebcbf363b6` |
| `checks.mts`        | `0a9c20cc34e5778495db46164740d974f9a23ed33237b3b512ed443d6937b87c` |
| `sqlite-checks.mts` | `fe633535fc023c37325960cf2be21dc297185d4c507d7cd8e836aa9b860dee64` |
| `typecheck.mts`     | `58b5a3d38d5b86b1cea8f8d205e43f9e5660c449c0db4b137f2ace93aa52a89a` |
| `tsconfig.json`     | `5d3c03c8d9cae8f4e98b42f6e8365a84b3b80eb8923497b7aa7c265a75129006` |

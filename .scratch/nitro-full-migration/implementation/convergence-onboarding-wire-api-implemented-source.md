# Onboarding wire API phase B — four-file source freeze

## Outcome and scope

**The API B bodies are authored and source-frozen for joint A/B source review and coordinator checks.** Not SOURCE ACCEPT, a fresh type/style/native result, mounting, enrollment, runtime/init authority or usable onboarding.

Exactly four product paths changed:

1. NEW `packages/api/src/nitro/assembly/onboarding-wire.ts`
2. NEW `packages/api/src/nitro/assembly/onboarding-writes.ts`
3. `packages/api/src/nitro/procedure.ts`
4. `packages/api/package.json`

The approved wire plan/co-location amendment and accepted actual Auth frame verifier are the prerequisites. Coordinator supplies Auth verifier SOURCE ACCEPT and fresh Auth/API/Backend/Nitro four-package type/lint/format 0 at `TEMP/nitro-onboarding-frame-verifier-checks-1mjinhxw`; those are **not checks of these new API bytes**. Earlier B STOP report and `a2a81a353e7334aabe60bc64` unchanged-source evidence remain untouched and historical.

## Actual public ports

Runtime entry `@homarr/api/nitro/assembly/onboarding-wire` exposes exactly:

```ts
createOnboardingRpcInputProducer(): ProductionOnboardingRpcInputSource
assertOnboardingRpcInputProducer(source: ProductionOnboardingRpcInputSource): void
createOnboardingRpcRequestController(
  source: ProductionOnboardingRpcInputSource,
  binding: OwnedOnboardingRpcRequestBinding,
): OwnedOnboardingRpcRequestController
```

The binding contains actual issuer, original Auth request handle, original Request, actual Auth frame/ticket/packet, exact BackendContext and empty basePath. It contains no decoded input, decoder/body getter, policy/SQL/native callback or Runtime. Original bounds/lifetimes are obtained from the real Auth request port rather than supplied time values. BackendContext's real scoped setup resources and genuine MAIN factory birth remain C's responsibility, not a frozen-DTO assertion made by B.

Controller ports are `executeAsync(): Promise<OnboardingRpcRequestResult>` and `closeAsync(): Promise<void>`. The completed result contains the **actual SDK source Response**, explicit output/error outcome, real Auth publication handle, actual finite cache/native/primary/sourceOutcome read, and separately recorded cleanup outcome. B uses the real A Response-registration/read ports before returning this result; the source Response body has been physically consumed once into A's finite cache. C–D must forward those retained bytes and enroll/settle the real physical publication, not reread that body or register a second response.

The added `@homarr/api/nitro/assembly/onboarding-writes` export has a **types-only condition**, no runtime/default entry. `OnboardingWriteContribution` derives from the actual private contribution factory; `OnboardingWriteClient` is its real SDK RouterClient type. The internal writes factory/bundle assertion/contribution constructor are sibling-module implementation details, not additional public runtime controller/input-registration ports. All old package exports/dependencies/scripts remain unchanged.

## Actual three-leaf source

| Canonical wire path                          | SDK schema                                    | Source metadata/access                                                 | Actual fixed work                                                                    |
| -------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /rpc/onboard/nextStep`                 | Real `z.void()` input/output                  | onboard.nextStep / onboardingClaimed / demo guarded                    | Matching Auth from-codec preparation and fixed nextStep dispatcher                   |
| `POST /rpc/user/initUser`                    | Existing userInitSchema / real void output    | user.initUser / onboardingStep user / demo guarded                     | Matching real Auth schema/hash/private IDs preparation and fixed initUser dispatcher |
| `POST /rpc/group/createInitialExternalGroup` | Existing groupCreateSchema / real void output | group.createInitialExternalGroup / onboardingStep group / demo guarded | Matching real Auth group preparation and fixed initialExternalGroup dispatcher       |

The three handlers use `os.$context<BackendContext>()`/sourceProcedureMeta and **no middleware**. They receive the exact registered initial context rather than adopting a middleware clone. `assertSourceProcedureAccess` is extracted once in `procedure.ts`: the old sourceProcedure retains its metadata, outer error translator and access/demo middleware, calling the same guard with the original conjunction, access order, admin/claim/step reads and error messages. Non-onboarding guards remain synchronous within the existing middleware; onboarding reads remain awaited. New handlers call that helper inside their owned catch/retirement boundary.

No unsafe legacy establishment/transition helpers are called/spread. No register/create/completeSetup leaf, broad/lazy/batch router, fake administrator, startup dummy resources or no-op handler was added. Existing source memberships/count 91 and two anonymous/twelve authenticated-read/three fixed-write/nine Auth route scopes are not changed or mounted by these modules.

## Producer, codec and receipt birth

- Wire owns a private source→actual writes-bundle WeakMap. Its fixed factory calls the exact writes factory; the writes module independently verifies actual bundle membership. Copied/frozen/structurally equal producers do not become registered sources. Startup creates the three fixed consumers and private registries only, not a per-request router.
- `onboarding-writes.ts` co-locates producer construction, active-controller/claimed-frame/receipt registries, **all three actual schema-handler closures**, actual per-request SDK codec/controller observations and consuming functions. No cross-module receipt setter/callback exists.
- Controller construction validates exact original POST/origin/Host/path and empty basePath, obtains real Auth bounds and invokes **actual `assertProductionOnboardingRpcFrame`** with the original source object. It builds the real local procedures/codec only after that binding exists, registers disposal, then asserts again before publishing the controller. Failure starts actual owned retirement/close rather than adopting another context/frame.
- Real public `RPCHandlerCodec`, `StandardHandler` and `FetchHandler` perform actual matching, deserialization, Standard Schema validation, output validation/serialization and error encoding. The recording codec delegates to that real codec/default serializer; it does not implement RPC envelopes or decode `packet.json`.
- The SDK-created StandardRequest keeps the original Request lineage. Only its adapter header view strips forwarded headers; the original headers/Request are not mutated, cloned or reconstructed. Its ordinary resolveBody accessor calls the **real Auth-owned cache port** under exact issuer/request/frame association. Original compatible json/none interpretation constrains explicit accessor hints; incompatible overrides/fallbacks reject. It never calls a live default body reader.
- Match/decode/procedure-call observations precede handler execution. Exact path segments, actual procedure reference, actual input/output schema references, validation enabled, middleware absence, exact context and owned SDK signal are checked. Decode and execution are single-use; controller copies/dry procedure calls cannot create a registered active request.
- Each actual schema handler performs the shared guard, then calls the accepted Auth verifier **immediately before directly inserting** its own ticket/packet/context/procedure/schema/actual validated input receipt. There is no await or caller callback between the final assertion and insertion. Receipt birth is not an exported input registrar.
- Matching Auth preparation consumes the frame before invoking its captured fixed consumer. The consumer therefore does **not** call the pre-consumption verifier afterwards: it verifies/consumes its own actual private receipt and recorded identities once, returning only that actual schema result. Auth's existing private preparation/currentness/native checks remain authoritative. No plain input DTO or opaque brand alone supplies this lineage.

Auth still owns original bounded body read/bytes, request clocks/origin/CSRF, canonical revalidation, bcrypt 10/private IDs/provider/email semantics and same-runtime native units. B introduces no Auth SDK dependency, budget/expiry recapture, SQL/auth predicate callback, token/force/ID source or native resend.

## Physical task, error and output ownership

Owned task promises are published before invoking actual codec/decode/cache/schema/procedure/handler/guard/preparation/native/serialization/retirement/Response-registration/cancellation work. Actual nested tasks settle in the request's private set. Retirement waits the **Auth** owned work; it does not drain a parent API codec/handler task which is awaiting it. Close publishes its own completion, stops admission, retires and drains actual remaining work without adding itself to that drain.

SDK `encodeError` is observed even for decode/schema/output-validation failure before a handler result. Handler translation and codec error translation await retirement. Original primary errors and actual Auth-task primary identities are retained separately from genuine different disposal/cleanup failure; replay of the same primary is not wrapped repeatedly or classified as a shared cleanup fault. No propagated error graph is walked or used as proof of COMMIT.

Output/error decisions originate from the actual recording encode methods, not `matched`, HTTP status, void output or reportError silence. Positive output requires the real handler's receipt consumption/native return and SDK void-output validation. Known COMMIT and dispatched-unconfirmed classification remain the accepted Auth/native observer facts in the actual A publication record. Later serialization/retirement/finite-output failure does not authorize positive publication or resend.

The controller passes the real completed Response/outcome into A's finite producer, reads its actual retained result under original/observed timing and hands that association to C–D. A-owned failed readiness follows A's real abandonment settlement. Any untransferred SDK body is cancelled as actual work; a created but undelivered Auth publication is abandoned through its genuine port. After execution/close, transient binding/context/issuer/procedure/handler/StandardRequest and receipt/active registrations are cleared; no bound Runtime is stored/exported. A delivered finite publication remains C–D's physical terminal responsibility.

These are authored source bodies for rereview, not executed behavior or safety acceptance. In particular, C's real Application-root/final-context registration and startup enrollment are not proven by object freezing or this API producer registry.

## Required C–F joins / continuing holds

1. C's actual retained native MAIN constructor must call the fixed wire factory/verifier and pass **that same original producer** into Auth issuer construction. Existing five-argument MAIN construction is not silently upgraded by importing these files.
2. The genuine Application request root/setup-context factory must create/register the actual final context and Auth packet/frame/ticket before constructing this controller; real scoped resources, original clocks/lifetimes and private SessionUser DTO lineage must be forwarded. No first-lookup TOFU or fake context/resource is implemented here.
3. C–D must enroll the separate real onboarding publication producer, retain the actual completed source Response/publication/finite bytes and report guarded physical headers/head/bodyless/EOF/abandonment through the accepted A terminal port. B's result/promise is not physical publication proof.
4. Exact claim GET/POST route ownership, CSRF cookie/token/client header propagation, generated client installation and route enrollment remain E/F/C work. Nothing here manufactures server POST headers, mounts handlers or completes setup.

Joint A/B independent rereview and fresh coordinator checks are required before those callers consume this changed closure. CompleteSetup and all native/init/runtime/application/transport activation holds remain intact.

## Fresh private source evidence

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-api-implemented-source-3297cd47da11e38b38f88661`

Directory mode 0700; artifact records/images/diffs created O_EXCL/mode 0600. Authorized bounded pure Python `-I -S -B` file/hash/difflib I/O records two new-path before absences, four after images/diffs and 22 protected unchanged associations in `before.json`/`after.json`. No product writes follow the after-capture freeze; only this new report is added afterwards.

| Product path                    | Before SHA-256 / absence                                           | Frozen after SHA-256                                               | After bytes / lines |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------- |
| `assembly/onboarding-wire.ts`   | Absent                                                             | `097d113bf1a70c4695254b214980de1a6d3a5bbd5fc22c882e75d77b91ef7144` | 1513 / 40           |
| `assembly/onboarding-writes.ts` | Absent                                                             | `f5c76172036108faa595006aabf54c2ed40ee0f2399b8b9773241e17a7628343` | 31957 / 797         |
| `nitro/procedure.ts`            | `8352cd37cdc249192388a76347f1f314de71e88d0a382ff7e91fd9e53aad3701` | `e2e2b0cb1652bee3743cf4cdb46134bffc47a8336248c22a6cbcad5e0665d331` | 3902 / 103          |
| `packages/api/package.json`     | `7742bd2efe5a2ab541af4e28bc11887fd4b9232113348b2bc28057b121e0f457` | `61baf7c017565e214edab94c0ff884c6501a6b62111cce35b811cea4bf54b3ef` | 6436 / 133          |

Assembly paths are under `packages/api/src/nitro/`; procedure is under `packages/api/src/`.

| Protected Auth/DB source                                     | Identical before/after SHA-256                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/onboarding.ts`      | `80056246320eaee86fbebd627723cfe756f41dff91d537d7503777c69cd3b67e` |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `9d0f069579d238e166a26a2f064a122629bc8677aa384b701e7f8023bfea3098` |
| `packages/auth/nitro/production-sessions/service.ts`         | `86d09bfbd7308694fad44fff1392a357055b90b5e81770b10aebd5f86820a142` |
| `packages/auth/nitro/production-sessions/index.ts`           | `4c14fb67eaf7f7817320f90fa6442580a7df084901100673b9b83ff9ac9b4d92` |
| `packages/db/runtime-onboarding/contracts.ts`                | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` |
| `packages/db/transaction-gate.ts`                            | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` |
| `packages/db/runtime.ts`                                     | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` |

Remaining metadata associates unchanged legacy transition/user/group routers and their three helper files, API nitro/index/assembly/client/contribution/context/port-map/errors entries, and the existing user/group validation sources. No unsafe helper/resource/entrypoint or client/schema/contract/MAIN file was edited.

Existing declared API dependencies and installed public SDK declarations/JS were read before source coding. Product imports use only public declared dependency exports or existing local API modules; no direct transitive/private SDK import, new dependency/library, product helper file beyond the two leased new modules, comments/tests/casts/any/suppressions or manifest script/dependency changes were added.

Coordinator checks may run only **after this freeze and the separate historical native attempt reaches terminal status**. No compiler/style/check command, application imports/evaluation, tests, native SQL/Engine, network/Context7 retry, private configuration/data, nested agents, commit or push was used. The historical external C/H/P/new-box executor's live outputs/daemon/budget were not read/probed/affected, and its generation is not current API proof. No old checks/artifacts/hold/count markers were relabelled or SOURCE HOLD self-cleared.

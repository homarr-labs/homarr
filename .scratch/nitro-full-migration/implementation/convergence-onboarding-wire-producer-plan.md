# Onboarding wire producer — four-command bridge plan

## Decision

**The installed SDK supports the bridge; the existing Auth/MAIN exports do not yet close it.** The next prerequisite is an Auth-owned original-packet/cache port joined to a genuinely constructed, fixed API codec/input producer. Do not attach today's raw-JSON preparation to today's Fetch RPCHandler and call the transport accepted: that either rejects the real packet or reads an already-consumed body.

This is ready for phased source-plan review, not a product lease or a claim that the proposed ports already exist. Coordinator supplies **Auth4 and MAIN5 SOURCE ACCEPT**, current MAIN fresh types **3**, lint **0**, and a separately handled format issue. Those are not all-zero checks or native/application acceptance. The MAIN freeze report's older pending-review language remains historical; this report does not edit it. Context7 retries are held; only actual installed declarations/JS and public repository source were read. No network retry was made.

Membership to add eventually is exactly:

| Resource               | Method/path                                  | Purpose                                           |
| ---------------------- | -------------------------------------------- | ------------------------------------------------- |
| Claim                  | `GET /api/onboarding/claim`                  | Real issuer-CSRF cookie/token, no native mutation |
| Claim                  | `POST /api/onboarding/claim`                 | Existing fixed claim command                      |
| Welcome transition     | `POST /rpc/onboard/nextStep`                 | Existing fixed nextStep command                   |
| First user             | `POST /rpc/user/initUser`                    | Existing fixed initUser command                   |
| Initial external group | `POST /rpc/group/createInitialExternalGroup` | Existing fixed initialExternalGroup command       |

There are four native commands, not five. **completeSetup is entirely deferred:** no new command/result union arm, candidate, builder, stub, source-output placeholder, route, client method or exported completion dispatcher. Existing two anonymous reads, twelve authenticated reads, three fixed writes and nine Auth HTTP paths stay unchanged until a separately approved enrollment cut adds this independent closed set.

## 1. Installed SDK facts that determine the design

Actual installed versions are `@orpc/server` and `@orpc/client` **2.0.0-beta.43**, and their Standard Server packages **0.10.2**. These are source/package reads, not imported/evaluated modules or newly verified hashes.

| Evidence                                                                                             | Exact consequence                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/api/package.json:100–101`; `packages/auth/package.json:32–47`                              | API declares both oRPC packages. Auth has **no oRPC dependency**. Keep library routing/serialization in API; do not deep-import its dependency into Auth, add a library, or reverse the API→Auth dependency. Backend already declares `@orpc/server`.                                                                                |
| Installed server `dist/adapters/standard/index.d.mts:81–93`, `dist/adapters/fetch/index.d.mts:26–44` | Public `RPCHandlerCodec`, `StandardHandler` and `FetchHandler` provide a supported adapter seam. No private library import is needed in product code.                                                                                                                                                                                |
| Installed server `dist/shared/server.B1ecixZJ.mjs:330–346`                                           | Codec first matches the procedure/path, then its `decodeInput` calls `request.resolveBody()` and the actual serializer's `deserialize`. It is not a raw user object decoder.                                                                                                                                                         |
| Installed client `dist/shared/client.Bstqyaro.mjs:102–134`; `client.DpkGsZt-.mjs:405–482`            | RPCLink applies the real serializer; ordinary values become its `{json,meta}` representation, while undefined can remain absent. Meta handling is library-owned. Do **not** implement “take packet.json”, hand-copy that representation, strip metadata, or manufacture a canonical Request.                                         |
| Installed Standard Server fetch `dist/index.mjs:131–147,249–264`                                     | The ordinary lazy request points to the original Request. Its JSON resolution calls `request.text()`; `resolveBody` is **not a cached body getter**. A second call after consumption can fail. Replace that accessor on the library-produced standard request with the real owned cache; do not let the default accessor read again. |
| Installed server `server.B1ecixZJ.mjs:60–99`                                                         | Handler catches decode/procedure failures and calls `encodeError`, returning a matched response. A resolved handler promise is not evidence of successful command execution. Intercept the actual error-encoding boundary, not just thrown outer errors or HTTP status.                                                              |
| Installed server `server.FEqy7Hrj.mjs:74–92,119–181`                                                 | Input schema validation is real Standard Schema validation; each middleware `next()` spreads context at `152–155`. Even an unchanged `next()` creates a different object. `handler.context === finalBackend` fails if these procedures use the current middleware-bearing sourceProcedure unchanged.                                 |
| Installed client `RPCLinkCodec.decodeResponse:136–159`                                               | Default client interprets status below 400 as output. Keep the default error-status mapping, but still record the server's actual encodeError outcome; a custom/success-status error packet must not escape retirement merely because status is 200.                                                                                 |

Derive Standard request/codec parameter types from the public oRPC declarations (`Parameters`/exported interfaces) in API. Reading the transitive Standard Server implementation here does not authorize adding undeclared direct imports in product code. Keep the exact serializer used by the API codec and generated client; no custom protocol implementation or packet-selection callback supplied by an RPC caller.

## 2. Existing source ownership, and the concrete missing joins

MAIN now captures the original Request before readiness/principal/body work. Application registers the **actual constructed RequestContext** in its private root/WeakMap at `application.ts:514–523`. `assertApplicationOnboardingRequestContext` checks real membership, Request/signal/requestId/disposer/carrier identity and lifetime. `auth.ts:988–1017` then resolves the existing private carrier to the Auth opaque handle. A structural copy or a frozen RequestContext is not admitted. Preserve this producer chain.

The missing joins are precise:

1. Auth preparations in `service.ts:1419–1456` accept only issuer/opaque request/original Request. Their source owns raw canonical JSON reading, validation/hash and admission. They cannot currently consume a library-produced opaque input receipt or expose the already-owned original packet cache.
2. MAIN exposes a capture lookup, not an onboarding final-BackendContext/handler/input/dispatch/publication binding. Existing `bindFixedWriteBackendAsync:700–842` is limited to authenticated App/Board leaves and cannot be reinterpreted as anonymous claim authority.
3. Existing `createSetupBackedContext:74–105` produces the final frozen context, principal copy, real scoped DB/setup readers and claim token. That is the appropriate factory, not a fake DB/setup resource; its output must be registered at this genuine factory call before API receives it, not adopted on first handler lookup.
4. Existing fixed-write RPC finite request helper **rebuilds Request** (`authenticated-rpc.ts:171–188`). It is unsuitable for onboarding original-request provenance. The accepted original capture must remain the only Request passed through this new flow.
5. Application's current private publication guard rejects anonymous principals (`265–274`), and its rich physical publication producer is enrolled for the nine Auth paths only. Claim-only onboarding cannot borrow an administrator SessionUser or masquerade as one of those Auth responses.

These are source-authoring prerequisites, not missing decisions about providers or native SQL. Repaired DB4 and accepted Auth authority/cleanup bodies remain the mutation owner.

## 3. Minimal package seam: owned raw packet plus fixed registered codec receipts

### Proposed ports — none is an existing export

Keep the new Auth bodies inside its existing four production-session files. Provide opaque, command-correlated packet/frame/input-ticket/publication handles, resolved through the same issuer→OwnedSql registrations. No API schema/codec import in Auth and no public input DTO setter.

The concrete proposed surface is:

```ts
readProductionOnboardingRpcPacketAsync(
  issuer: ProductionSqlSessionIssuer,
  original: ProductionOnboardingRequest,
  request: Request,
): Promise<ProductionOnboardingRpcPacket>

resolveProductionOnboardingRpcPacketAsync(
  issuer: ProductionSqlSessionIssuer,
  packet: ProductionOnboardingRpcPacket,
  request: Request,
): Promise<unknown>

prepareProductionOnboardNextStepFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardNextStepInputTicket,
): Promise<PreparedProductionOnboardNextStep>

prepareProductionOnboardingInitUserFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInitUserInputTicket,
): Promise<PreparedProductionOnboardingInitUser>

prepareProductionInitialExternalGroupFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionInitialExternalGroupInputTicket,
): Promise<PreparedProductionInitialExternalGroup>
```

The packet reader is a real body producer, not `() => suppliedDTO`: it asserts the actual registration/origin/CSRF, prepublishes the real body/admission tasks, uses the repaired owned reader once, retains original bytes/parsed JSON or genuine absence, and caches that promise on the original record. The resolver only serves that already-owned cache under the original budget and exact Request/issuer/frame association. It does not consume a new stream, treat an opaque brand as proof, or parse a guessed RPC envelope. Retain real cancellation/terminal-replay/reader-release facts and the existing bounded cleanup summary.

Support only these finite JSON/absent-body commands. Explicitly reject incompatible multipart/file/event-stream/octet-stream body hints instead of allowing a library fallback to a live stream. Plain HTTP JSON parsing is distinct from RPC serializer decoding. The library handles the latter, including its actual absent-input behavior for nextStep. Cache values must not be caller-mutable substitutes for the original bytes; retain the private immutable packet observation and library-safe per-request ownership.

### Actual fixed codec/input producer, not a receipt self-assertion

NEW `packages/api/src/nitro/assembly/onboarding-wire.ts` owns `createOnboardingRpcInputProducer()` and its module-private producer/receipt registrations. It imports the installed **public** RPCHandlerCodec/StandardHandler/FetchHandler APIs and the real source schemas. It accepts no caller decoder, body getter returning user data, custom serializer, registry list or SQL/policy callback. Its closed implementation constructs the actual per-request codec only after receiving real context/resources, never a startup router with no-op handlers.

At startup `native-main-persistence.ts` imports and calls this **exact factory**, immediately invokes its exported module-private-registration assertion, and passes that same verified producer object through an explicit onboarding-only construction resource to the actual issuer. Auth captures this fixed typed producer once with its issuer owner. The producer reference is not selected by a request and cannot be installed/replaced by a handler. The factory's own registry, not a revision string/brand/structural object, supplies producer identity; MAIN construction supplies the trusted admission call site. No first-request/first-context TOFU is permitted.

The dependency-light Auth interface for that startup resource has three fixed receipt consumers:

```ts
consumeNextStepInput(ticket, packet, finalContext): void
consumeInitUserInput(ticket, packet, finalContext): UserInitSourceInput
consumeInitialExternalGroupInput(ticket, packet, finalContext): InitialGroupSourceInput
```

Here `UserInitSourceInput`/`InitialGroupSourceInput` are data types inferred from existing validation schemas, not authority. These consumers are **implemented only by the genuine registered API codec producer**. They resolve its private receipt records; they do not accept an input value and mark it proven. No arbitrary `decode(body)` callback is passed to Auth.

Birth sequence is mandatory:

1. MAIN's actual outer-context assertion resolves the existing original capture. Its genuine context factory creates/registers the final BackendContext and frame for the fixed selected command, packet and captured producer.
2. Auth issues an opaque, command-correlated input ticket for that frame, before library decoding. A ticket contains no asserted decoded input and is not sufficient authority.
3. API runs the **real** codec against the original Request. Its SDK standard-request accessor serves only the Auth-owned cached packet. It checks the codec's returned path and actual procedure identity against the exact selected leaf/registered factory, not normalization/descendant coincidence.
4. The SDK runs the actual leaf's schema. Only inside that real request-bound handler, after validation, does the producer's private code retain the ticket→packet/final-context/procedure/schema/input association. There is no exported “register this input” setter.
5. The handler passes the opaque ticket/frame to the corresponding Auth preparation. Auth resolves the same captured producer's fixed consumer, which verifies/consumes the actual private receipt and returns only its recorded schema result. Copied tickets, wrong packet/context/leaf/producer, repeat decode/consume or plain DTOs cannot create that record.
6. Auth revalidates/copies the canonical bounded own-data values and performs the real hash/IDs/authority preparation privately, without another body read. The existing matching fixed dispatcher consumes the real prepared operation once.

This is a narrowly registered codec owner, not a new all-mutation owner framework. **If the source author cannot establish this factory→startup→packet→SDK/schema→receipt lineage without an arbitrary input-registration callback, stop at that exact missing producer and keep wire activation held.** Present exports alone cannot satisfy it; passing a DTO alongside a packet brand is expressly not an alternative.

## 4. Final BackendContext and actual three handlers

Use a separate NEW `packages/api/src/nitro/assembly/onboarding-writes.ts` for exactly the three native-source procedures; preserve existing unsafe establishment/transition helpers and their historical binding statuses rather than mounting them. This file contains the concrete resource interface, real handlers, schema bindings, three-leaf contribution and generated RouterClient type. It is not an interface-only router.

Use the public `os.$context<BackendContext>()` builder and existing `sourceProcedureMeta` directly for these three procedures, **without middleware that clones context**. Extract the existing source access/demo guard into a named helper in `packages/api/src/nitro/procedure.ts`; the old sourceProcedure continues calling it with unchanged behavior. The three new handlers call that same helper explicitly, inside their tracked error/retirement boundary. Do not disable validation or manufacture clone equivalence.

Installed `executeProcedureInternal` then passes the exact initial context to these middleware-free handlers. `.input(userInitSchema)`, `.input(groupCreateSchema)` and nextStep's genuine no-input schema remain SDK validation; `.output(z.void())` preserves source void. A copied final context rejects rather than becoming a new registered context. The corresponding API factory closure verifies its exact captured final object, and MAIN's private map was populated **when the real factory returned it**, before handing it to the SDK. No arbitrary `bind(existingContext)` public enrollment is allowed.

The real resource port has only command-specific preparation/dispatch on opaque frame/ticket, currentness and retirement. It exposes no raw runtime/DB transaction/caller SQL, password-hash creator, firstRead, force, TTL, position, provider selector or auth predicate. The final context's DB/setup methods come from the real scoped `createSetupBackedContext`, never no-op resources. For authenticated requests its user is the existing private current SessionUser DTO; anonymous claim requests remain anonymous, not synthetic administrators.

Canonical behavior remains:

- nextStep: real privately read first welcome singleton and locked native second-read/no-op/provider choice, void result;
- initUser: actual userInitSchema/confirmation/username normalization, bcrypt cost 10 outside SQL, private two IDs, omitted email→null only, explicit empty email preserved, native credentials-admin/owner/member/permission/step writes;
- initialExternalGroup: actual groupCreateSchema/name, private ID, native LIKE/name/max-position/step/group/admin-permission writes, no fabricated owner/member/account;
- real credentials/external login is still separate, not proof supplied by a void setup result.

No new assembly includes register/create, existing setup planner/integration/Docker preparation, or completion. Their old helper/resource files remain unchanged. No broad legacy router is spread into the three-leaf native contribution.

## 5. Real SDK adapter, failures and physical publication

`onboarding-wire.ts` constructs `FetchHandler(new StandardHandler(recordingCodec, options))` using public classes. Its recording codec delegates matching/input/output/error serialization to the actual RPCHandlerCodec; it does not implement the RPC protocol. A real SDK routing interceptor replaces only the library-produced standard request's `resolveBody` with the verified owned-cache accessor and retains the matched request/frame association. That accessor is an ordinary library input accessor, **not permission proof**; authority remains the registered original operation and fixed native unit.

Do not call the old `prepareFiniteRpcRequestAsync`, create Request clones, call request.json/text twice, rebuild from decoded input, or present a replacement Request as original. Validate original Host/origin before adapter header handling; strip forwarded headers only in the adapter view as already authorized, not by mutating the captured Request/header witness. Preserve the empty basePath requirement and exact `/rpc` prefix/path selection before SDK normalization. No batch/lazy-router/general RPC entrypoint is admitted.

Every body, codec, schema, handler, hash, native, serialization, output-reader and cancellation task is published to its actual owner before invocation. The typed recording codec observes **encodeError**, including schema failure before a handler ran. It awaits genuine frame/Auth retirement before returning translated error output; if public disposal rejects the same primary, retain that identity rather than endlessly rethrowing it as another cleanup failure. Genuine cleanup errors remain separate. Handler catches likewise await retirement before calling the existing error translator.

Never infer success from `matched`, handler fulfillment, `reportError` not firing, HTTP 200 or an error-looking JSON shape. Track the actual output/error encoding decision and native settlement independently. A known commit followed by validation/encoding/publication failure remains known commit; native ambiguity retains quarantine/nonretryable classification. No auto resend, new claim nonce/force, second runtime or budget reset is authorized.

### Required publication-only producer

Add a separate fixed onboarding publication enrollment/producer beside the nine-path Auth producer, not within it. Its registration is `(actual original RequestContext, final BackendContext/frame where applicable, actual completed Response, selected method/path, actual source/native outcome)`, populated by the real factory/handler task before response publication.

New Auth source must supply a narrow **publication-only clock/outcome handle** bound to the same original pair/budget and captured lifetimes. Current Auth disposal stops its operation controller; simply calling the old operation's currentness after retirement would prevent a translated error response. The new publication-only state must distinguish live-success from failure-retired output, may never dispatch SQL, and may publish only that recorded finite response/outcome. It retains the original decreasing wall/monotonic deadlines and genuine CSRF/session/claim expiry witness where applicable; no caller expiry setter or fresh clock budget. A missing real stored-expiry/publication witness is a concrete held port, not a success assertion.

Application/MAIN integrate this producer at final header/bodyless/head/EOF/cancel boundaries using the existing physical retention primitives. Anonymous claim responses need this fixed onboarding producer; do not relax the authenticated private guard globally or forge a SessionUser. Preserve the existing nine Auth producer/route identities and handling. Register response publication before forwarding bytes, wait actual output readers/cancellation/reader.closed/release and request retirement before owner close, and retain abandonment/cleanup/known-commit outcomes. A returned Response promise alone is not publication proof.

## 6. Claim GET/POST and client propagation

The same MAIN issuer already has genuine `prepareCsrfCookie` (`origin.ts:115–128`), which uses the issuer-specific HMAC cookie/header protocol. Implement exact GET on `/api/onboarding/claim`, canonical Host/origin/GET/Fetch-Site checks, no request body/native command, finite `{token}` response plus actual returned cookie and no-store. Do not reinterpret Core `/api/auth/csrf` or manufacture a POST header server-side.

Extend the existing MAIN first-capture descriptor to the exact claim GET as well as POST, retaining command `claim` for this read resource and exact method-specific handling. GET gets the original Application registration and bounded publication producer, not a new native mutation arm. Existing claim POST preparation must still require POST and the real client-provided header/cookie. A GET record cannot be dispatched as a claim write.

The GET frame is a non-mutating, exact-method issuer-CSRF read. Its eligibility is selected by the concrete method/path producer, not a caller “readOnly bypass” option. Preserve the accepted `demoEnabled && readOnly` rejection on every POST/native preparation; do not globally weaken the mutation guard merely to issue a GET token.

POST maps only the actual confirmed native result: issued/active → 200 finite status/expiry JSON and actual claim cookie; locked → 423 `{code: 'locked', expiresAt}`; forbidden → 403 `{code: 'administrator_required'}`; finished → 409 `{code: 'finished'}` plus deliberate claim-cookie expiry. These statuses are the real legacy source branches at `apps/nextjs/src/app/api/onboarding/claim/route.ts:24–43` and match the inspected Nitro client. No token appears in RPC JSON/logs. Native uncertainty or confirmed-output failure is not relabelled as one of these ordinary result branches. Cookie policy remains the accepted Auth producer's approved-origin Secure/HttpOnly/Path=/SameSite=Lax, not the legacy route's forwarded-protocol derivation or an ambient Next cookie writer. Publication failure after issuance is not rollback or permission to retry issuance.

`apps/nitro/src/features/onboarding/claim.ts` currently sends no CSRF header. It must fetch genuine GET, validate/store its finite token with its own bounded request lifetime, then send that token in `x-homarr-csrf-token` on POST. A dedicated generated onboarding RPC link uses installed `RPCLink` headers/fetch options to send the same real token on the three writes, keeping same-origin credentials and redirect:error. No changes to other clients' headers or manually serialized packets. Reacquiring a CSRF token is not replaying a possibly committed mutation.

## 7. Exact phased source paths and registering callers

These are prospective leases requiring approval/freeze in order, **not authorization to edit them now**:

| Phase                                      | Exact paths                                                                                                                                                                              | Closed result                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A: Auth packet/input/publication seam      | `packages/auth/nitro/production-sessions/onboarding.ts`, `sql-persistence.ts`, `service.ts`, `index.ts`                                                                                  | Real original packet cache/tickets, captured fixed codec input source, from-codec preparations, GET token preparation and original-clock publication-only handles on existing OwnedSql. No Auth oRPC dependency or DB/shared-ledger edit.                                                                                                                    |
| B: API codec and real three-handler source | NEW `packages/api/src/nitro/assembly/onboarding-wire.ts`; NEW `packages/api/src/nitro/assembly/onboarding-writes.ts`; `packages/api/src/nitro/procedure.ts`; `packages/api/package.json` | Genuine codec/input producer registry, real SDK adapter, middleware-free exact-context handlers with reused policy helper and existing schemas, narrow public package exports/client type. No unsafe legacy helper invocation or fabricated resources.                                                                                                       |
| C: same-MAIN frame/claim/RPC producer      | `apps/backend/src/server/runtime-composition/contracts.ts`, `auth.ts`, `native-main-persistence.ts`; NEW `onboarding-rpc.ts`; NEW `onboarding-claim.ts` in that directory                | Native constructor calls exact API producer factory before issuer capture; real scoped context factory registers final context/frame; opaque receipt/native dispatch join and finite claim/RPC response records/tasks/drains. Extend exact claim GET capture. Do not reconstruct original clocks from old wall-only read bounds.                             |
| D: fixed physical publication join         | `packages/contracts/src/contribution.ts`; `apps/backend/src/server/application.ts`; `apps/backend/src/server/runtime-composition/native-main-persistence.ts`, `contracts.ts`             | Separate explicit onboarding producer/enrollment type and original-clock finite response/EOF/abandonment join. Reuse physical primitives without changing nine Auth membership or global anonymous/authenticated guard semantics.                                                                                                                            |
| E: exact enrollment caller                 | `apps/backend/src/server/runtime-composition/runtime.ts`, `assembly.ts`                                                                                                                  | Actual `persistence.createOnboardingWire(...)` call after retained issuer/resources exist, passes the real closed five method/path descriptors and producer to Application; source constructor/export alone is not enrollment. Keep all prior route sets byte/identity unchanged except their separately reviewed surrounding addition/collision validation. |
| F: actual generated client/header source   | NEW `apps/nitro/src/client/onboarding-writes.ts`; `apps/nitro/src/features/onboarding/claim.ts`, `types.ts`, `index.ts`                                                                  | Installed RPCLink/createORPCClient bound to the new native three-leaf type, genuine GET/POST CSRF propagation and nextStep method; no completion method. Existing UI/schema-normalization plan remains separate and must freeze before this lease.                                                                                                           |

In phase C the concrete ownership port is a **factory**, not an arbitrary-context binder:

```ts
createOnboardingBackendRequestAsync(
  originalContext: RequestContext,
  selectedCommand: "nextStep" | "initUser" | "initialExternalGroup",
): Promise<OwnedOnboardingBackendRequest>

createOnboardingWire(input: {
  readonly path: "/rpc";
  readonly basePath: "";
  readonly baseUrl: `${string}://${string}`;
}): OwnedOnboardingWireController
```

That factory performs the existing Application assertion/capture lookup, creates the final context through the real admitted setup factory, immediately registers its actual identity with the owned packet/frame/selected command/codec producer and returns only the narrow concrete ports. No supplied BackendContext, guessed user, replacement Request, input DTO, body/SQL/assertAuthorized callback or startup runtime is accepted. Auth preparation and dispatch remain same-runtime; DB readiness/domain initialization/adoption is not this factory's job.

The controller supplies exact claim GET/POST and three RPC contributions plus the separate publication producer. Only native-main-persistence's retained owner may construct it; runtime.ts must actually call that constructor and assembly.ts must actually forward/enroll it. Broad authenticated RPC/legacy factories and their resource files are not modified or reused as anonymous-write permission. Existing schemas in `packages/validation/src/{user,group}.ts` are imported unchanged; no packet schema is hand-copied into validation.

## Handoff and limits

Approve phase A/B's **actual codec registration and original-packet evidence bodies** before any handler/enrollment author consumes them. The remaining concrete source gaps are that cache, the startup fixed input producer/receipt association, the factory-born final-context binding, and the publication-only original-clock/outcome state. Neither current exports nor a type brand can close them. If any requires another file, return the exact additional lease rather than hiding it in a callback/stub or claiming whole bridge closure.

After every reached writer freezes, coordinator allocates fresh focused type/lint/format checks against those exact bytes. No command/check/hash/compile/evaluation/import execution/test/browser/network/SQL/Engine/private configuration/data or nested-agent action occurred in this report. Only this NEW Markdown report is written. No product source, source-only metadata report, old diagnostics/artifact/control, migration asset, data, protected port or counter was changed.

Source-authoring, exact enrollment, physical native settlement, generated-client compatibility and usable onboarding remain separate acceptances. Prior memory verification covers only the old frozen child generation, not these future sources. No native/file boot/adoption/runtime activation or full-app claim is granted. The four-command bridge does not complete setup or automatically sign in the newly established user.

## Controlling A/B amendment — co-located receipt and SDK handler producer

**Ready for the original A/B reviewer's rereview, not product authoring authority.** Coordinator supplies independent approval of phases C–F and the publication contract; those approved scopes/requirements are unchanged. This append addresses A/B's sole P1: the original receipt registry location at lines 98–117 and schema-handler location at 125–129 cannot communicate through an unmentioned setter/callback. Original lines 1–210 remain unchanged; this section controls that narrow ownership correction and A/B dependency order.

### Exact two-module relationship

**`packages/api/src/nitro/assembly/onboarding-writes.ts` owns both the receipt registry and all three actual SDK schema-handler closures.** Its internal factory, `createOwnedOnboardingWritesProducer()`, creates one lexical ownership scope containing:

- private producer/active-request/receipt registrations;
- the actual nextStep/initUser/initialExternalGroup schema-bound handler construction;
- their fixed three consuming functions;
- the actual per-request execution controller constructor, including its matched-procedure/decode/schema observations and owned-cache association.

That internal constructor takes no decoded input, input-registration setter, “onReceipt” function, custom decoder or body/SQL/auth-predicate callback. No public port can populate its receipt map. The actual handlers access that map **directly through their factory closure**, after the SDK has delivered the real schema result and the private execution observations have been verified. Their receipt production is a concrete handler body, not a type declaration or a callback supplied by onboarding-wire.ts.

**`packages/api/src/nitro/assembly/onboarding-wire.ts` is the fixed construction/verification facade.** Its exact public ports remain narrowly:

```ts
createOnboardingRpcInputProducer(): ProductionOnboardingRpcInputSource
assertOnboardingRpcInputProducer(producer: ProductionOnboardingRpcInputSource): void
createOnboardingRpcRequestController(
  producer: ProductionOnboardingRpcInputSource,
  requestBinding: OwnedOnboardingRpcRequestBinding,
): OwnedOnboardingRpcRequestController
```

Names above are prospective source targets, not existing callable exports. `ProductionOnboardingRpcInputSource` is the dependency-light Auth-defined interface containing only the three fixed consumers already specified at lines 104–107. `OwnedOnboardingRpcRequestBinding` is the real frame/context/cache/lifecycle binding produced by the approved MAIN factory, not a decoded-input DTO or an arbitrary context-registration request. The controller supplies only the actual request execution/lifetime/retirement ownership needed by approved C–F; no receipt setter is exposed.

The facade calls the **exact internal writes factory** and retains its returned owned bundle in its private producer-identity registry. `assertOnboardingRpcInputProducer` checks that real registry membership and the retained bundle's writes-factory ownership; it does not accept a revision string, frozen structural copy or a brand as producer identity. `createOnboardingRpcRequestController` resolves that same registered bundle and calls its owned request-controller constructor. It does not receive a “populate receipt” closure or register unknown request/context objects on lookup.

The writes bundle's three consumer references and controller constructor close over the **same** private receipt scope. Internal imports between these two existing proposed API paths carry that owned factory/bundle, not caller values or a registration hook. Only the wire facade's narrow ports and the existing planned client/contribution types are exported through the phase-B package entries; no extra package entry, file, library or metadata/enrollment lease is introduced.

To avoid recreating the defect for match/decode facts, the per-request execution controller and its SDK-bound observation closures are also constructed inside this writes ownership scope. The facade delegates actual controller construction there; this narrowly qualifies line 144's physical constructor location, not its SDK requirements. The real `RPCHandlerCodec`, `StandardHandler` and `FetchHandler` still perform match/decode/schema/error/output work. No cross-module fact setter, observer callback supplied by a caller, second body read or manual packet implementation is needed.

### Concrete corrected birth sequence

1. At startup the approved MAIN constructor calls `onboarding-wire.ts:createOnboardingRpcInputProducer`. That factory calls `onboarding-writes.ts:createOwnedOnboardingWritesProducer`; the latter creates the private receipt scope and returns its three consuming ports plus owned controller constructor. No per-request router or dummy handler/resource is instantiated at startup.
2. The wire facade registers the exact returned producer/bundle identity. MAIN immediately calls `assertOnboardingRpcInputProducer` from that facade, then supplies the **same** three-consumer producer to the real Auth constructor. Auth retains it once on the existing issuer/OwnedSql owner. Neither handler lookup nor first request can install/replace a producer.
3. Approved C creates and registers the actual final BackendContext/frame at the genuine setup-context factory call, after the Application root assertion resolves the original Request capture. Auth creates the frame-correlated packet/input ticket. These original identity/clock/lifetime registrations are unchanged; no TOFU occurs here.
4. MAIN obtains the request controller through `createOnboardingRpcRequestController` with that genuine binding. The resolved writes bundle constructs the real per-request three-handler contribution and SDK codec/controller together. Its private execution scope retains the original Request, frame/ticket, immutable original packet observation, exact final context and actual procedure/schema references before invocation.
5. The controller's actual SDK request execution serves only the Auth-owned cached packet through the ordinary StandardRequest accessor. The real codec matches the exact selected leaf/procedure and decodes through the installed serializer. The execution scope records those actual outcomes before permitting the SDK's schema-bound handler to proceed; no caller can assert that decoding happened.
6. In the corresponding actual handler closure, require the current exact final context, live controller/frame, correct ticket/packet/producer, matched procedure and the actual schema reference/result. Only then write the receipt entry directly into the co-located private registry. Wrong context/leaf/packet/procedure, stale execution, direct procedure invocation without the controller's actual decode lineage or an already-issued/consumed ticket rejects before receipt production.
7. That handler calls the appropriate real Auth from-codec preparation with only the frame/ticket. Auth invokes its retained producer's matching consuming port. The port resolves and consumes the handler's recorded receipt, verifies the same immutable packet/frame/context/procedure/schema lineage and returns only the recorded canonical source data. Plain input plus a ticket cannot populate or substitute for that entry.
8. Auth revalidates/copies bounded canonical values and performs the original hash/IDs/authority preparation and fixed native dispatch on the same owner. Input consumption/command consumption remain one-time. Errors still use the already approved retirement, SDK encodeError and publication paths; genuine cleanup/native outcomes are not reclassified.

Middleware-free exact-context handlers, reused source access/demo helper and existing schemas remain as originally specified. The amendment changes where the genuine receipt-producing closure lives, not validation, permissions, body format or source membership.

### Phase A/B dependency order and concrete Auth acceptance criteria

**A is authored first against its own dependency-light types; B supplies the actual API implementation afterwards.** Auth's existing phase-A files define the fixed three-consumer interface and opaque packet/frame/ticket/publication types using existing Auth/validation dependencies only. They must not import API/oRPC types or implementations. Phase A implements real owned read/cache/resolver, ticket/frame correlation, from-codec preparations, consumption and cleanup/publication bodies against that captured interface; it does not create an API producer implementation or execute a caller-supplied decoder.

Before the phase-B producer exists or is genuinely supplied by the approved constructor, the **new RPC seam is unavailable**; that is a missing construction dependency, not a fabricated receipt, dummy implementation, successful no-op or completion of the bridge. Existing accepted raw-canonical/claim paths and their security behavior are not relabelled as generated RPC support. Phase A's actual source review must verify:

- original registration and all four original clocks/budget/lifetimes survive the one real bounded read, cache access, input consumption, hash/native work and approved publication state;
- the packet promise/cache is populated only by the actual owned reader with tracked terminal/cancellation/release facts, never by a passed DTO/accessor callback;
- each frame/ticket resolves to the same private original packet, selected command, final context and captured producer; no public registration/input setter exists;
- from-codec preparation calls only its retained fixed consumer, validates/copies the real returned canonical data and performs actual preparation, without reading the consumed Request again;
- missing/foreign producer or invalid/unproduced/consumed receipt fails, with real task retirement and retained primary/native/cleanup classification rather than interface-only success.

Phase B then imports those completed Auth public types/ports, authors the actual writes-factory receipt/schema-handler/controller closures and the fixed wire facade/verification bodies, and checks that its returned source satisfies the exact phase-A interface. No Auth→API dependency, cycle-breaking stub, generic body-reader callback or extra file is required. The same approved MAIN constructor subsequently supplies this actual verified producer; no metadata lease is altered to make an absent source callable. Joint A/B source review must trace that concrete constructor and handler receipt producer before a C–F author consumes the seam.

### Limits retained

Approved phases C–F/publication, original clocks/cleanup, Application registration, private SessionUser DTO, immutable packet/body provenance, native quarantine/known-commit handling, cookie/CSRF/client propagation, counters and exact route sets remain unchanged by this amendment. completeSetup remains entirely deferred. This appendix makes no source/compile/native/activation claim and grants no product edit authority.

Only the plan append was written. No product edits, commands, hashes, checks, evaluation/import execution, tests, network, SQL, Engine, private configuration/data or nested agents occurred. MAIN source/static closure is treated as the supplied prerequisite. The active scratch-only staticcopyv2 executor and its live outputs were not read or modified.

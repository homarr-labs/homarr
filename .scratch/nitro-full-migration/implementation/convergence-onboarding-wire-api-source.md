# Onboarding wire API phase B — precise public-port gap / stopped

## Outcome

**Stopped before product edits under the explicit missing-Auth-port condition. Phase B is not authored or accepted.** Both proposed new API files remain absent; procedure/package bytes are unchanged. No stub, partial handler, producer/receipt registry, policy extraction, package export or guessed provenance interface was added.

Coordinator supplies phase A SOURCE ACCEPT on both axes and fresh 13/13 types, lint 0, format 0 at `TEMP/nitro-onboarding-wire-auth-repair-checks-02r_411r`. The current protected Auth4/DB3 associations below match the supplied frozen generation. Those results remain valid supplied prerequisites, not API source checks performed here. The approved wire plan/co-location amendment and C–F plans remain untouched.

## Exact missing source port

The required API constructor and schema handler must verify the **existing actual Auth frame/ticket/packet/context/producer association before receipt birth**. Auth owns that registration privately, but its current public entrypoint has no non-consuming verification/read port for it.

| Current source                                                                      | Actual capability / limitation                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/auth/nitro/production-sessions/index.ts:17–23` and `service.ts:1543–1610` | Exports original request bounds, owned packet read/resolution, frame creation and three consuming preparations. No existing-frame association assertion/read is exported.                                                                                                                             |
| `sql-persistence.ts:2122–2135`                                                      | Cache resolution validates the packet and original Request/owner. It does not take/check the proposed frame, ticket, final context or selected API producer. Successful cache access cannot prove those associations.                                                                                 |
| `sql-persistence.ts:2138–2155`                                                      | The actual `assertOnboardingFrame` checks the private frame/ticket/packet registrations, original context Request/signal, command, source and currentness. It is private and accepts private owned records, not a public API input.                                                                   |
| `sql-persistence.ts:2157–2195`                                                      | Frame creation performs real registration, but rejects if `record.frame` already exists. Calling it again is not a read/verifier for the frame which the approved MAIN C factory already created. Its returned frozen bundle is not registered as an independently verifiable public bundle identity. |
| `sql-persistence.ts:2198–2238,1930–1965`                                            | The three preparations resolve/verify a frame internally, then consume it, change request phase and perform real admission/authority work before invoking the fixed input consumer. They are not harmless association probes.                                                                         |

API may retain its own producer/controller/SDK match/schema observations, but it cannot consult Auth's frame/ticket map through the current public exports. Checking literal kinds, object freezing, equal Request/signal fields or a copied `ReturnType<typeof createProductionOnboardingRpcFrame>` bundle does not prove registered handle identity.

Creating the private API receipt first and relying on the subsequent Auth preparation to reject a copied/unregistered frame/ticket would still violate the requested **no receipt birth for copied/fake capabilities** sequence. This does not claim a bypass of Auth's accepted native authorization: the downstream real preparation already rejects invalid associations. The gap is the stronger required pre-receipt producer closure.

Do not solve it by calling a consuming preparation as a probe, recreating the frame, deep-importing Auth internals, adopting a context on first lookup, exporting a receipt setter, accepting a caller verification callback, moving receipt birth into a different unapproved stage, or making an API brand stand in for Auth registration. The future MAIN C factory's genuine context birth remains necessary, but its approved future existence is not a current public Auth association port.

## Precise additional lease needed

Approve a separate narrow Auth public-port cut in these existing paths before renewing B:

1. `packages/auth/nitro/production-sessions/sql-persistence.ts` — concrete non-consuming existing-frame lookup/currentness assertion using its actual private maps and `assertOnboardingFrame`, plus comparisons of the supplied original Request, packet, ticket, context and **same captured startup producer**. Require the pre-consumption live association for controller/handler receipt birth; do not create/adopt records on lookup.
2. `packages/auth/nitro/production-sessions/service.ts` — genuine issuer→OwnedSql wrapper for that assertion.
3. `packages/auth/nitro/production-sessions/index.ts` — narrow public reexport.

A prospective name is `assertProductionOnboardingRpcFrame(issuer, originalRequest, frame, ticket, packet, finalContext, inputSource): void`, using the **existing exported types**. This is a requested producer-port decision, not an existing callable export, completed design approval or permission to edit Auth now. It needs no API/oRPC dependency, new data registrar, SQL/body read, caller policy callback or new product file. Its implementation must compare against the actual registered references and captured source rather than trust its arguments. Original clock/signal/header/mode/currentness and once-consumption behavior must remain authoritative.

The four-file API lease cannot implement or export that Auth lookup safely. After its separate source review/freeze, B can import the actual port directly before registering a request controller/receipt. B's private consumer can then rely on its own actual SDK receipt and Auth's genuine preparation call sequence, without changing the approved co-location or fabricating a startup handler.

## SDK/dependency boundary established

Before considering product code, `packages/api/package.json` was read: API already declares Auth, validation, zod and `@orpc/server`/`@orpc/client` 2.0.0-beta.43. Installed server package exports/declarations confirm public `@orpc/server/standard` RPCHandlerCodec/StandardHandler/codec interfaces and `@orpc/server/fetch` FetchHandler. Parameter-derived types can reuse those public ports without introducing direct transitive imports. Their availability does not verify an Auth-private handle registry.

No network documentation retry, dependency installation, module import/evaluation or compiler was used. The missing capability is specifically the Auth existing-frame verifier, not an SDK serializer, transport class, library or additional API helper-file requirement.

## Unchanged source evidence

Private directory, mode 0700:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-api-source-a2a81a353e7334aabe60bc64`

Bounded pure Python `-I -S -B` file/hash/difflib I/O wrote O_EXCL/mode-0600 `before.json`/`after.json`, absence records for both new paths, images for existing paths and empty diffs for all 23 paths. No product write occurred between or after these captures. This is byte-preservation evidence, **not a new authored API freeze or test PASS**.

| Leased API path                                        | Before = after                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `packages/api/src/nitro/assembly/onboarding-wire.ts`   | Absent                                                                                      |
| `packages/api/src/nitro/assembly/onboarding-writes.ts` | Absent                                                                                      |
| `packages/api/src/nitro/procedure.ts`                  | `8352cd37cdc249192388a76347f1f314de71e88d0a382ff7e91fd9e53aad3701` — 3720 bytes / 96 lines  |
| `packages/api/package.json`                            | `7742bd2efe5a2ab541af4e28bc11887fd4b9232113348b2bc28057b121e0f457` — 6243 bytes / 129 lines |

| Protected Auth/DB path                                       | Identical before/after SHA-256                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/onboarding.ts`      | `80056246320eaee86fbebd627723cfe756f41dff91d537d7503777c69cd3b67e` |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `ad705fa8eb78e33f1ac29f61e4c35d3048de9c31a4d1eb10d196ee9c6e7405fd` |
| `packages/auth/nitro/production-sessions/service.ts`         | `dc15daabb694204dfdc9f6460e5252b301fab216550cf5efc87faba5df1646d8` |
| `packages/auth/nitro/production-sessions/index.ts`           | `41394d5335ea52e93d8645a64cde5f7de4532d45dd37b38ff8a0545a871ce2ef` |
| `packages/db/runtime-onboarding/contracts.ts`                | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` |
| `packages/db/transaction-gate.ts`                            | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` |
| `packages/db/runtime.ts`                                     | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` |

The same metadata records unchanged associations for the three legacy establishment/transition routers and their helper bodies, and API `nitro/index.ts`, `assembly/index.ts`, `assembly/client.ts`, `contribution.ts`, `context.ts`, `port-map.ts`. None was modified or mounted.

## Continuing holds

No new public API factory/assert/controller/contribution/client type exists yet. Middleware access/demo behavior and errors/meta/evaluation remain unchanged because no policy extraction was authored. B awaits the exact verifier-port decision above; genuine C–F context/response/CSRF/client/enrollment joins and completeSetup remain held. Existing nine Auth/two anonymous/twelve authenticated-read/three fixed-write memberships are unchanged.

Only this new report was patched. No product/Auth/MAIN/DB/contracts/validation/client changes, comments/tests/casts/any/suppressions, compiler/lint/format/checks, application imports/evaluation, SQL/native/Engine, network/private configuration/data, nested agents, commit or push occurred. Historical publication-envelope/native artifact reviews and live disjoint outputs were not read or used as API proof. Coordinator/joint A/B rereview must assess any renewed changed closure after freeze; no current SOURCE HOLD was self-cleared.

# Onboarding pre-receipt frame verifier — three-file source freeze

## Outcome

**The concrete non-consuming verifier, issuer wrapper and narrow export are authored and source-frozen for independent source rereview and coordinator checks.** Not SOURCE ACCEPT, a new compiler/style/native result or API/transport activation.

Controlling plan: `convergence-onboarding-wire-frame-verifier-plan.md`, including the controlling minimal-reuse appendix; independent PLAN APPROVE supplied for reviewer `ses_eca5fc894ffeP2TR4ZaIlDr80j`. Exactly these product paths changed:

- `packages/auth/nitro/production-sessions/sql-persistence.ts`
- `packages/auth/nitro/production-sessions/service.ts`
- `packages/auth/nitro/production-sessions/index.ts`

Prior Auth A SOURCE ACCEPT/13 type/style-zero results remain supplied historical prerequisites, not checks of these changed bytes. The API B STOP report, plans and old source captures remain unchanged.

## Actual public/internal port

At `@homarr/auth/nitro/production-sessions`:

```ts
assertProductionOnboardingRpcFrame(
  issuer: ProductionSqlSessionIssuer,
  originalRequest: Request,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInputTicket,
  packet: ProductionOnboardingRpcPacket,
  finalContext: ProductionOnboardingRpcContext,
  inputSource: ProductionOnboardingRpcInputSource,
): void
```

`service.ts` uses the genuine existing `onboardingSqlOwner(issuer)` mapping and calls `assertProductionSessionSqlOnboardingRpcFrame(owner, issuer, originalRequest, frame, ticket, packet, finalContext, inputSource)`. `index.ts` reexports only the new public assertion. The ticket union import already exists as a public type; no new type/signature/brand or dependency was introduced.

## Identity/currentness semantics

The SQL body first resolves the actual existing frame/ticket via `onboardingCodecFrameFor`. That helper calls the unchanged `assertOnboardingFrame`/`assertOwnedOnboarding`: private frame/ticket/packet/request map membership, issuer/owner, exact command/context Request/original signal, live owner/readiness, original headers/signals/dual-clock budget and lifetime remain authoritative.

The new body then requires:

- live request phase `captured`, unconsumed frame and no recorded request failure;
- actual registered original Request, ticket, packet handle and exact final context object equal the supplied references;
- a present owner input source and **`suppliedInputSource === registration.source === owner.onboarding.inputSource`**;
- rejection when the existing owned immutable policy is demo-enabled **and** read-only.

The owner's input source remains the actual original validated frozen constructor parameter; startup own-data/three-function validation and frame-source capture are unchanged. A frozen structural copy with the same function pointers fails direct object identity. No new WeakRef/snapshot/configuration field, function reflection/invocation, source replacement, constructor argument, registry or retired graph was added.

Success returns void. Failure uses existing `ProductionOnboardingError`. The assertion does not create/adopt records, read a body/cache, invoke a consumer, prepare/hash/run SQL, change phase/failure/consumption, return private data or create a permission token. Only the existing normal currentness clock observation may advance its monotonic high-water sample; no start/deadline/budget is recaptured.

Repeated assertions are allowed while that same association remains live/unconsumed. Copies, foreign/cross-paired handles/context/packet/source, changed request/header/signal, missing source, recorded failure, stale/retired/closing/consumed work and any non-captured phase reject. No post-retirement publisher/GET use is granted. Shared frame guards/preparations were not widened or changed; normal preparation still consumes the frame and changes phase before invoking its consumer.

These are authored source semantics for rereview, not executed case/test results.

## Required API/MAIN boundary remains

API B's actual controller and middleware-free SDK schema-handler can use this port before private receipt birth; the final assertion-to-receipt insertion must have no intervening await/caller callback. The later consuming port **must not** call this pre-consumption assertion after Auth's phase/consumption transition.

This verifies only the registered Auth association/currentness. Actual API factory registry membership, owned codec match/decode/procedure/schema/receipt lineage and genuine MAIN Application-root/final-context factory birth remain separate future proofs. It does not prove native/physical publication or enroll handlers. API B resumes only after this actual port is independently accepted; C–F/client/enrollment/completeSetup holds remain unchanged.

Old five-argument canonical construction, GET, owned packet/body-hint collection, native COMMIT/quarantine/weak clock reader, task/cleanup and publication bodies are unchanged by these additive diffs.

## Fresh private evidence

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-frame-verifier-source-44920b49b3c03ed1cf23cc9e`

Directory mode 0700; artifacts created O_EXCL/mode 0600. Authorized bounded pure Python `-I -S -B` file/hash/difflib I/O produced `before.json`, `after.json`, three product before/after images/diffs, protected-source byte joins and explicit absence associations. The three diffs were read as source, not executed. No product writes follow the after-capture freeze; only this report was added afterwards.

| Source under production-sessions | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes / lines |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------- |
| `sql-persistence.ts`             | `ad705fa8eb78e33f1ac29f61e4c35d3048de9c31a4d1eb10d196ee9c6e7405fd` | `9d0f069579d238e166a26a2f064a122629bc8677aa384b701e7f8023bfea3098` | 185851 / 4481       |
| `service.ts`                     | `dc15daabb694204dfdc9f6460e5252b301fab216550cf5efc87faba5df1646d8` | `86d09bfbd7308694fad44fff1392a357055b90b5e81770b10aebd5f86820a142` | 74124 / 1708        |
| `index.ts`                       | `41394d5335ea52e93d8645a64cde5f7de4532d45dd37b38ff8a0545a871ce2ef` | `4c14fb67eaf7f7817320f90fa6442580a7df084901100673b9b83ff9ac9b4d92` | 2670 / 72           |

| Protected source                                          | Identical before/after SHA-256 or absence                          |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/onboarding.ts`   | `80056246320eaee86fbebd627723cfe756f41dff91d537d7503777c69cd3b67e` |
| `packages/db/runtime-onboarding/contracts.ts`             | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` |
| `packages/db/transaction-gate.ts`                         | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` |
| `packages/db/runtime.ts`                                  | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` |
| `packages/db/runtime-onboarding/statements.ts`            | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` |
| `packages/auth/nitro/production-sessions/persistence.ts`  | `cc394f8f3ff84ae0426ee549d769187898e120b75906cf1171b2625aacf6911f` |
| `packages/auth/nitro/production-sessions/bounded-body.ts` | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |
| `packages/api/src/nitro/assembly/onboarding-wire.ts`      | Remains absent                                                     |
| `packages/api/src/nitro/assembly/onboarding-writes.ts`    | Remains absent                                                     |
| `packages/api/src/nitro/procedure.ts`                     | `8352cd37cdc249192388a76347f1f314de71e88d0a382ff7e91fd9e53aad3701` |
| `packages/api/package.json`                               | `7742bd2efe5a2ab541af4e28bc11887fd4b9232113348b2bc28057b121e0f457` |
| `packages/api/src/nitro/index.ts`                         | `23ea2f985a19b3d6679e502ad5dbf8083ea9b25772634c558e33a21dab420c2a` |
| `packages/api/src/nitro/assembly/index.ts`                | `7bbb14c690bdd84b5480d2715b9579061e1f8fdb5baa2505c7afdbb026abc185` |

## Review/check ownership

Independent source review remains required. Coordinator may allocate fresh source checks only after this writer freeze **and** the separate historical native attempt reaches terminal status. No compiler/style/check command, evaluation/import/tests, native SQL/Engine, network/private configuration/data, nested agents, commit or push was used. No comments/casts/any/suppressions, helper/framework/manifest/library or other product changes were added.

The historical external C/H/P memory executor's outputs, daemon and budget were not read/probed/affected. Its old artifact generation is not proof of these new source bytes. No SOURCE HOLD, native/init grant or transport activation was self-cleared.

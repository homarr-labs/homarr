# Invite authenticated-read enrollment — source freeze

## Outcome and allocation

Implemented approved phase A from `convergence-backend-completion-plan.md:93–105`: exactly one additional source-enrolled authenticated read, `invite.getAll`. This is source enrollment only, not activation, runtime acceptance, or full migration completion.

The only product-source writes were:

1. `packages/api/src/nitro/assembly/native-read-resources.ts`
2. `packages/api/src/nitro/assembly/authenticated-read.ts`
3. `apps/backend/src/server/runtime-composition/authenticated-rpc.ts`

This new report is the sole additional deliverable. No unexpected missing input was found during source inspection; no additional source allocation was taken.

## Retained before association

Before editing, all three current source texts were read and matched against their retained before-image contents, without computing hashes. The immutable association is:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-invite-enrollment-source-ozv9vpts/records/source-before.json`

Its three before images remain untouched:

- `packages-api-src-nitro-assembly-native-read-resources.ts.before`
- `packages-api-src-nitro-assembly-authenticated-read.ts.before`
- `apps-backend-src-server-runtime-composition-authenticated-rpc.ts.before`

All three are in that same `records` directory. The recorded hashes were not recomputed or used as new validation evidence. Post-edit source was read back; no after-snapshot or executable receipt was produced.

## Exact source delta

| File                       | Change                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `native-read-resources.ts` | Added existing `asc` to the `drizzle-orm` import, imported public `selectInviteSchema` from `@homarr/db/validationSchemas`, and added `invites` to the required admitted schema pick. Added `invites` resources containing `schema.invites`, `{ eq, asc }`, `{ selectInviteSchema }`, and the already supplied `createId` and `providers`. |
| `authenticated-read.ts`    | Imported `InviteProcedureResources` and `createInviteProcedures`; added the typed `invites` resource; appended exactly `invite.getAll` to closed membership; constructed the existing factory and selected only `invite: { getAll: invite.getAll }`.                                                                                       |
| `authenticated-rpc.ts`     | Added exactly `{ action: "read", resource: "invite.getAll", policy: { kind: "global-permission", permission: "admin" } }`. Changed the registry diagnostic to `Authenticated RPC registry must contain exactly twelve enrolled reads`. No guard expression or handler body changed.                                                        |

No router spread, invitation mutation enrollment, generic router injection, callback, helper, dependency, manifest change, test, comment, cast, suppression, or default secret was added. The existing factory constructs its other members, but `invite.createInvite` and `invite.deleteInvite` are not mounted or added to policies.

## Canonical behavior and preserved boundaries

The unchanged `packages/api/src/nitro/routers/invite.ts:20–41` remains the procedure implementation: query metadata, admin permission, guarded demo behavior, undefined input, canonical output schema, and the actual enabled-credentials-provider check. Its query orders by ascending expiration date, excludes `token`, and selects creator `id`/`name`; its output exposes invite `id`/`expirationDate` and creator `id`/nullable `name`. No alternate projection or provider stub was introduced.

Existing exact policy matching, explicit complete membership, metadata checks, schema identity, genuine principal/lease association, MAIN currentness, private response publication, finite request/response bodies, cancellation and physical settlement remain unchanged. Same-owner credential/session/epoch/native provenance, reservations, authorization, ambiguous-COMMIT quarantine, adoption holds and fail-closed guards were not edited.

`runtime.ts`, `compose.ts`, `assembly.ts`, Auth/native producers, nine-path publication, configuration, schema/manifest declarations and frontend files received no writes from this allocation. The reviewer-identified historical eleven-read description at `join-slots:173` is not an executable gate and was intentionally not taken as a fourth-file lease.

## Conservation and freeze

- Authenticated source-enrolled reads: **11 → 12**, solely by adding `invite.getAll`.
- Existing read policies and the three fixed writes: unchanged apart from that one new admin-read policy.
- Nine exact Auth HTTP paths and two anonymous settings reads: unchanged.
- Canonical totals: **334 / REST 52 / MCP 133**, unchanged.
- Central acceptance: **91/334**, unchanged. Twelve source-enrolled reads does not mean twelve runtime-approved reads; REST/MCP execution remains held.

The three authored source files are frozen for independent review. All other files remain outside this writer allocation. Old fixtures, protected outputs, accepted evidence, real installations/restores and the immutable fifth compiler artifact were not modified. This source change does not make historical compiler or exact-eleven closure receipts current.

## Validation handoff

No commands, checks, lint/typecheck, hashes, compilation, evaluation, SQL, Engine/native execution, environment/private configuration/data access, container work, network calls or nested agents were performed for this allocation. Source readback is not an executable validation result.

Independent review must associate this exact one-leaf/resource/policy delta with the retained before images. Fresh focused validation of affected API/Backend/Nitro source closures requires a separate controlled release after review/freeze; existing evidence must not be relabeled or overwritten. Any directly relevant existing check requiring a source edit needs its own exact allocation. No runtime, credential adoption, synthetic-file initialization or additional feature enrollment is authorized by this report.

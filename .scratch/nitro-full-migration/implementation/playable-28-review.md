# PLAYABLE-WAVE32 lane28 — independent security Spec + Standards review

## Reviewed boundary and exact evidence

Base: frozen pre-lane native behavior/contracts in `implementation/sprint-widgets.md`, `implementation/sprint-integration-operations.md`, and the original middleware/permission sources. Head: completed lane28's five-file inventory. No Git command or whole-file before/after byte-diff verification was performed; this is a bounded semantic review, not a preservation certificate.

Retained head directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-28-final-XsxeHK`. Read all five checkout files and the retained copies' changed authorization sections. Its `inventory.json` agrees with `implementation/playable-28.md:105–113`; the hashes below are recorded inventory hashes, not independently recomputed hashes.

| Exact reviewed source path | Recorded SHA-256 |
| --- | --- |
| `packages/api/src/nitro/routers/-widgets/helpers.ts` | `7840ea4d08ff7bdc5939223eece4b84c7aee3db01f1e6f0cbf32adfaf3414b31` |
| `packages/api/src/nitro/routers/-widgets/resources.ts` | `92d0ac58c3532fba3ad2b89d077688198b552f29b6d0e3305123cd4de940ad32` |
| `packages/api/src/nitro/routers/-integration-management/access.ts` | `5eca037ac428d2c636091735e175844cf2c011656593f94c05bcea80d00285ee` |
| `packages/api/src/nitro/routers/-integration-operations/helpers.ts` | `0a452b61e765e3160dbd4f83fa57c3554a4b42977cc2b372d2eaafcf6a68dbab` |
| `packages/api/src/nitro/routers/-resource-authority/repository.ts` | `69f5a8134f60506cfd5fa39e7c43c2ee1379e0f54a9de946800a782a1aba53ec` |

Sources: `PLAYABLE-WAVE32.md:59–72,82`, `Q16-Q18-PRODUCTION-JOINS.md:87–97` (§J4), `DESIGN.md:84` (Q18), repository/global AGENTS rules, frozen `packages/auth/nitro/policy/{identity,resources,index}.ts`, actual BackendContext and management/operations resources, DB driver/schema relations, original `packages/api/src/middlewares/integration.ts` and `packages/auth/permissions/{integration-permissions,integration-query-permissions}.ts`. Read prior `implementation/g3-postgresql-snapshot.md` contract evidence; did not consume active26 runtime/gate source as accepted.

## Spec checks

- **Principal SQL:** repository `:17–44,47–55,77–83` reads memberships by the actual authenticated user, replaces supplied membership IDs with SQL rows, and predicates Integration grants by that user/current memberships. Anonymous membership and user/group-grant predicates are literal SQL `false`, not empty-string identities. Board grants use the same predicates. Actual grant IDs remain available to frozen policy `resources.ts:36–45` for independent defensive filtering. No invented Everyone membership or foreign-owner principal.
- **Coherent snapshot:** repository `:46–96,123–128` uses only its callback database for memberships, Integration rows/grants/placements and relevant Boards/grants. SQLite reads are entirely synchronous `.sync()` within boundedTransactionSync; PostgreSQL reads are awaited within boundedSnapshotAsync. The prior producer contract specifies REPEATABLE READ READ ONLY. No pool escape, new control SQL, writer or credential admission. Actual native/type behavior is not proven here.
- **Scopes and isolation:** SQL restricts requested Integration IDs and kinds; Boards are restricted to explicit IDs plus selected Integrations' placement Board IDs. Repository `:137–149` additionally intersects lookups with private materialized IDs/kinds. Frozen query policy checks Board IDs against requested placement IDs (`resources.ts:118–125`). `snapshotPolicyIdentity` freezes identity arrays; repository `:117–156` copies selections, rejects a different identity/aborted or expired operation, and separately clones exposed evidence. Caller row mutation cannot alter private evidence. These checks constrain reads, not later mutation authority.
- **Query-only delegation:** Widget helper `:110–128` calls frozen Board delegation only for query; interact requires direct/global Integration interact access. Frozen policy `resources.ts:107–125` preserves public, actual-owner/user/group-granted Boards and board-view-all only with placement. Unplaced/foreign-private-only Integrations deny absent direct/global use. Widget arbitrary HTTP `:758–782` requires full access before capability/type details. Management selection retains its separate direct/global-use and full-access rules.
- **Cardinality/errors/secrets:** Widget helper `:90–108,134–148` preserves missing/wrong-kind NOT_FOUND, duplicate-ID count failure, empty-many results, native FORBIDDEN messages, external app URL projection and authorization before decryption. Board helper `:269–283` preserves NOT_FOUND concealment. Management access `:100–123` retains exact-one action selection and NOT_FOUND masking. Native stored-one helper `:157–207` uses filtered SQL before query/interact authorization and decrypts only after permission/kind checks. Arbitrary HTTP `:263–300` retains full-only ID/ordered-name/kind selection and source refusal messages. No new ciphertext/ACL response surface.
- **Frozen callsites:** inspected `routers/integration.ts:151`, `routers/integration-operations.ts:415,451` and all management/operations helper getIdentityAsync references: no remaining two-argument caller found. All three Widget sourceIntegrationPermissions references match the narrowed signature; all three authorization acquisitions pass selections. `createWidgetProcedures` and `assembly/{index,resources}.ts` consume/forward/re-export the same required resource interface, not an incomplete constructed object. Located frontend consumers use router return/client types, not producers. No concrete existing Widget producer missing the new required member was found in searched source references. Missing genuine host binding is a declared hold, not justification for a dummy/default producer. Native getAuthorizationRepository(snapshot) remains an existing held producer seam, not a newly supplied permissive repository.
- **No authority promotion:** the new repository supplies read evidence/lookups only. Existing operations writes/http unbound refusals and backend join-slot holds remain. Frozen `widgets.ts:230–243` retains public query-authorized stats refresh with guarded demo metadata; `:2534–2541` retains Board-view-authorized Custom API cache invalidation, not arbitrary Integration HTTP permission. Read snapshots do not establish locked current mutation/COMMIT authority; genuine issuer/resource/native currentness and dispatch ownership remain required.

## Standards checks

No actionable documented-standard or over-engineering finding in the reviewed repair. It reuses frozen policy, actual schema relations and existing bounded native ports; shared projections and separate dialect reads serve current consumers. No copied grant matrix, speculative writer framework or new permission setting. Intentional foreign-user/empty-group narrowing is authorized Q18 behavior, not an unapproved parity regression.

## Validation limits

Read retained repository-lint.log: 0 warnings / 0 errors for the new repository. Retained five-file lint.log `:704–713,742–743` reports 80 warnings / 1 error at unchanged `-integration-operations/helpers.ts:304`, eslint(no-control-regex); full focused lint is **BLOCKED**, not passed. Retained typecheck-blockers.json confirms types **BLOCKED before compiler launch**, including active26 runtime/gate and physical provider/request graphs. No lane28 compiler/native pass is established.

No checks, builds, installs, SQL, tests, project runtime imports, Git, network/provider actions, child agents or host activation were executed. The first scratch patch attempt failed because apply_patch was unavailable; the sole successful write is this canonical scratch review via /usr/bin/patch. Product source and manifests remain untouched.

## Findings

No findings (P0–P3). Checked principal grants/memberships, anonymous denial, Board query-only delegation, coherent native port usage, requested scopes/defensive IDs, clone/identity isolation, management/native selection, frozen source callsites and denial-before-decryption.

## Verdict

Correct — within completed lane28's source-level Q18 scope, no actionable security or standards defect was found. Compilation, native snapshot behavior, genuine issuer/resource/native bindings and compatible-writer/COMMIT authority remain unproven; this verdict neither accepts active26 nor authorizes private mounting/host activation.

**Not flagged:** retained pre-existing lint failure and already-declared unbound production joins; neither is a new lane28 defect or a validation pass.

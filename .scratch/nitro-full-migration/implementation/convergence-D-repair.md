# Convergence D repair — native freshness and nonallocating session paths

Frozen repair under D7 review P2 and Oracle `ses_ecf2846a7ffeLJjc2rhoTwfDAz` approval. Only `packages/db/runtime.ts`, `packages/db/runtime-auth-session/statements.ts`, and this new report were written. Historical D reports and failure evidence are unchanged; their file-backed provenance and retain/revoke allocation descriptions are not current repaired behavior.

## Native-only fresh adoption

`freshCredentialOwner` is now minted only for the actual retained newly created SQLite `:memory:` connection, with `mode: "fresh"` and the existing native empty-application-schema verification. This combines genuine native resource creation/retention and verification; an absent singleton or caller fresh flag alone is not authority.

Fresh file creation still uses exclusive `wx`/0600, verifies the created file is regular and empty, and closes its actual file handle. Existing-file regular-file checks, native opening, ordinary content initialization and reads remain. Removed the post-open pathname device/inode comparison and its purported native-identity attestation: a pathname stat does not establish which file the native connection retained. Native freshness verification is now confined to `:memory:` rather than unnecessarily rejecting ordinary file-backed opening.

File-backed credential adoption explicitly rejects with `File-backed credential adoption is held: native fresh-resource provenance is unavailable`, before constructing an adoption owner or entering maintenance. No native fd is inferred from a Bun handle/index; no undocumented fileControl, driver, FFI, bootstrap database, sentinel, pathname/platform attestation or replacement provenance was added. Existing-resource/pre-append and restart provenance remain held.

## Allocation is branch-local

Removed unconditional allocation from the session generator. The only allocator call sites are now:

| Native session path                   | Allocator/evidence behavior                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create                                | One allocation; the same checked sequence binds both lifetime and write in the original session INSERT.                                                                             |
| Expiry-changing renewal               | One allocation after exact original witness/pair recheck; CAS UPDATE changes expiry and write only, preserving lifetime. Existing preparation still requires strictly later expiry. |
| Existing-session establishment/retain | No allocation and no session sequence UPDATE. Exact captured lifetime/write pair is preserved and returned unchanged. Original profile/account/membership effects remain.           |
| Revoke                                | No allocation/head advance. Exact original witness plus pair CAS DELETE remains; result credential remains null.                                                                    |

Retain/revoke no longer invoke the increment/exhaustion path and can proceed at the signed64 maximum, provided all original domain, evidence, witness, lock, clock and operation preconditions pass. Create/expiry-changing renewal still fail closed at exhaustion rather than fabricate or reset a sequence. Result sequences have no default/fabricated initialization: create supplies the allocated pair; existing paths start from the exact validated captured pair, with only renewal replacing write.

## Preserved source and holds

Ready singleton/domain/evidence checks, exact SQL expiry comparisons, all original native/table/user/session locks, canonical TEXT reads and checked CAST binds, clock/final user/clock rechecks, pre-gate deadline and host-deadline clamping, result discriminators, physical drain, rollback/cleanup and nonretryable ambiguous-COMMIT classification are unchanged. Adoption task/lifetime prepublication and admission closure are unchanged. No schema, migration, assets, gate, other Auth/contracts/producer wrapper, body, backend or facade was edited.

All new methods remain unmounted; generic COMMIT dispatch remains unsupported. Auth dispatch/publication, enabled-writer closure, file-backed/pre-append/restart ownership, PostgreSQL Board/App activation, restore, real-data and protected publication holds remain.

No commands, lint/type checks, tests, runtime/native/SQL execution, data, credentials, secrets, providers or nested agents were used. This is a source freeze for the original reviewer's rereview, not a claim of rereview acceptance, compilation, runtime acceptance or activation. Coordinator retains focused-check ownership after freeze.

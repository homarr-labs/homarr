# Preservation observation owner — resource-free identity repair

## Scope

Source-only plan for the native review's P2. `runtime-preservation.ts` retains its prepared record's `owner` when publishing; the runtime currently supplies the actual `Connection`, so a retained handle pins its native/database resource graph. Original timing/activity/gate/cleanup paths had no additional findings. Representation's separate cap/erasure plan remains controlling for its cuts.

## Minimal cut

Only `packages/db/runtime.ts` needs this ownership change. Allocate one private frozen, resource-free preservation-owner token inside `createPersistenceRuntime`, alongside the existing owner-local state. It has no connection, configuration, callback, clock, signals or public accessor.

Pass that same token instead of `current` to `prepareSqlitePreservationRecords` and `publishSqlitePreservationObservation`. Existing private prepared/published registries retain and compare it by exact identity. Native dispatch/currentness, owner lifetime, target/epoch and post-unit checks still use the actual retained `current` connection inside the physical capture task; no runtime resource check is replaced by token equality.

The token records the actual runtime-owner association without retaining the owner resources. It is not accepted from a public caller, returned in the opaque handle, used as SQL authorization or shared with onboarding's publication store. The observation keeps its original operation clock and bounded private frame; its published record no longer contains the native Connection. No new identity framework, WeakRef record, helper file or public contract is needed.

Prepared/published identity rejection, zeroing/disposal, source-born handle creation and failure cleanup remain unchanged. No callback/configuration/scope reference may be captured by the token. Existing callback-scoped/native and publication error precedence is protected.

## Gates

Independent native reviewer approves the plan before authoring. Combine this runtime cut with the separately approved transfer/erasure repair under their exact two-file lease only after all source findings reconcile. Preserve original source/check receipts, freeze new diffs/protected joins, run fresh affected lint/type/format and independently rereview. No executed retention test, fixture, SQL/native or filesystem permission is implied.

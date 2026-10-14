# Integration acknowledged-outcome retention

## Confirmed source issue, not native transaction proof

Read-only planner `ses_ed0b0f90fffeGTSfVVpdr6zsco` identified `features/integrations/form.tsx`: real successful create response is acknowledged when `create.mutateAsync` returns a defined `result.integration`. Detached invalidation, notification and completion callback currently share the write catch; synchronous completion failure becomes creation failure and manual submission can repeat the acknowledged write. Async callbacks are not awaited. Edit conflates settlement and reconciliation too. Historical introduction is unverified.

Actual request-generation and keyed Integration provider guards do not retain outcomes. Existing native `CreatedIntegration` carries the real ID; do not invent a result from name/URL or a thrown mutation. Existing certificate/search/assistant patterns distinguish write settlement from read-refresh failure but have component-lifetime limits.

## Prospective exclusive implementation

Only `apps/nitro/src/features/integrations/{form.tsx,provider.tsx,feedback.tsx}` plus the exact modal completion wrapper currently at `pages.tsx:183–190`, after independent oracle review. All other pages.tsx content remains unallocated. Preserve Mantine layout/CSS, source validation, permissions, dirty/currentness guards, generated oRPC options/keys and translations already used. No new dependency, generalized transaction/evidence framework, tests, source/native owner amendments or runtime activation.

1. Capture actual client, user/authority scope, form target/generation, validated input and originating recipient before dispatch. Acquire a synchronous busy guard in the existing provider scope; rendered mutation state alone is insufficient. Scope retirement must suppress stale effects without losing a settled receipt while the provider remains alive.
2. Separate write settlement from refresh/notification/completion. Retain the actual returned result immediately, before any of those effects. Store unresolved state above keyed form content in the existing provider; acknowledged receipt or unconfirmed dispatched throw must block blind write replay through both submit controls and imperative embedded submit. Do not turn a post-write failure into `creation failed`.
3. Await captured-scope read invalidation independently. Track refresh and callback-delivery stages; a read retry must not dispatch another mutation or reinvoke an already-entered arbitrary completion callback. Preserve original ownership/currentness before all setters/callbacks. No automatic retry.
4. Reuse existing feedback primitives for distinct acknowledged-write/reconciliation failure and actual returned ID. A non-submit refresh action may retry captured read reconciliation only. An unconfirmed write has no invented ID or success claim and remains visibly blocked pending genuine reconciliation.

5. The exact modal wrapper must return/await the captured external `onCreated(result)` promise rather than discard it, then recheck its original selection/currentness before closing. That callback is already marked entered by the form before invocation; no arbitrary callback replay on failure. No other modal, host or route redesign is transferred.

Oracle `ses_ed0c73916ffeoAPMc1qAT9w9Jf` identified P1 missing async propagation in the original three-file scope. This added wrapper transfer addresses that exact source-backed gap; revision still requires approval before dispatch. Validation/permission rejection must create no dispatched or acknowledged receipt; acquire the synchronous provider guard after successful validation immediately before dispatch. Avoid retaining secrets unnecessarily: keep only the actual result and minimal matching/currentness/stage metadata needed for receipts and captured read retry, not a general submission archive.

Revised exact four-file allocation now APPROVED by the same independent oracle; implementation writer `ses_ed09b525effepIX5NiCc2XmeGo` dispatched source-only. No broader pages content or durable lifetime is transferred.

## Localization prerequisite discovered before editing

Writer returned HOLD without changing any files: existing labels do not truthfully distinguish unconfirmed dispatched writes and acknowledged completion-delivery failure. Coordinator inspected actual translation fallback: `packages/translation/src/standalone/catalogs.ts:67–71` removes empty selected strings and deep-merges English before returning the full typed catalog; `request.ts:21–26` has the same fallback semantics. No runtime loader change or blanket locale rewrite is needed.

Proposed smallest scope amendment, pending oracle: add only genuinely used new `integration.outcome` messages to `packages/translation/src/lang/en.json`, distinguishing saved-refresh failure, saved-completion failure, unconfirmed write, retired-workflow attention, actual integration ID and read-only refresh retry. Other languages keep their existing messages and use the established English fallback for these new messages; do not claim new non-English translations or populate them with fake translated strings. No Crowdin/remote action.

`catalogImports` currently requires every raw locale's pre-fallback JSON to already have the complete English shape. To represent the existing genuine partial-catalog/fallback contract, transfer only its `satisfies` type operand at `standalone/catalogs.ts:46` to the already imported `AbstractIntlMessages`. Keep all language keys/literal import destinations, runtime loader/merge/empty handling/freezing and full `TranslationObject` return type unchanged. No casts/helper/new dependency or weakened application message type. This exact type-only input amendment is independently reviewable; all other catalog source remains frozen.

Expanded potential allocation is the previously approved four sources plus only the new English message subtree and exact raw catalog import type operand. No source work until this amendment is independently approved. Failed public QueryClient doc fetch returned500; any new read-refresh option must be verified against existing installed declared Query APIs/patterns rather than guessed. Existing read failures must be observable, not silently turned into refreshed success.

Subsequent user-preferred Exa/web search recovered official https://tanstack.com/query/v5/docs/reference/QueryClient: refetch failures are swallowed unless the second options argument sets throwOnError=true. Invalidation defaults to active queries; disabled/static observers never refetch. Awaiting invalidation is not universal fresh read proof. Use existing genuine generated keys/currentness and permission-scoped reads, and keep acknowledgment distinct from native transaction proof. No more exhausted Context7 calls.

## Explicit limits and review questions

Provider retention covers descendant/keyed form remounts only, not destruction of that provider/route or process restart. No durable success/through-COMMIT/teardown retention claim follows; do not fabricate a broader lifetime owner. Arbitrary external completion callbacks may partially execute before throwing, so do not replay them absent a genuine idempotent host contract. Existing unresolved UI must remain observable rather than silently clearing on a replacement flow.

Oracle should approve the smallest truthful source fix or identify an essential host/lifetime prerequisite that makes the proposed three-file scope insufficient. If additional ownership is required, stop and enumerate a separate minimal transfer; do not quietly expand source scope. No source commands, compiler/lint/build/install, SQL/native, protected capture/reader/Darwin exception or runtime execution is granted by this plan. After frozen independent source review, ordinary focused lint and both existing app typechecks require a separate recorded development-check release with complete fresh statuses.

# Legacy widget adapters — five business repairs, three-file plan

**PLAN ONLY; independent review must precede a repair writer lease.** The coordinator reports all 37 typechecks and lint at numeric zero, but five source/business holds remain. Those results were not rerun here and do not establish these behavioral repairs. The existing six-file source and private `nitro-legacy-widget-adapters-source-536e93955447` captures remain frozen.

## Exact prospective cuts

1. `packages/widgets/src/_inputs/widget-custom-widget-configuration-input.tsx`: only `LegacyCustomOptionIcon` admission publication and captured field-owner callbacks.
2. `packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx`: only the selected-row save wrapper/expected-row observation around the existing validator and its own UI updates.
3. `packages/widgets/src/modals/embedded-app-edit-form.tsx`: only baseline/read/acknowledgement association, submission routing and actual icon-pending admission checks.

`widget-edit-modal.tsx`, file-2 `widget-app-input.tsx` helpers, Docker/QuickAdd adapters, CommonForm APIs, static owners, pure views, definitions/schema, API/Auth/server, manifests and source/native configuration remain unchanged. No new helper file or dependency is needed. Stop for a named allocation if implementation actually needs a producer outside these cuts; do not weaken a check or fabricate a substitute. Spotlight's independent format-only lane and the approved-but-not-authored Auth producer plan remain disjoint.

## 1. Custom field: admit a real replacement, keep the original dead

Evidence: `LegacyCustomOptionIcon:262–301` only admits when `admitted.current` is null; retirement leaves it non-null. The real producer already exists: `useStaticWidgetInputOwner` publishes a captured source handle tied to its committed internal record (`static-owner.tsx:27–52`). Parent validation completion can publish a fresh source record; definition/version/path and observed session changes are also actual binding changes.

- Extend the existing admission record with its actual mounted record. Replace `ready: boolean` with publication of the actual admitted record, following the existing static-owner publication pattern locally.
- In the committed layout observation, permanently retire an invalid record first. A new record may be created only when the mounted field has a current genuine source, authenticated observed session and a **different actual candidate association**: new published source record, changed binding data, changed observed session object/copied fields, or a genuinely new mount. An inactive record with the identical candidate stays inactive; ordinary renders, callback recreation and a returning boolean do not re-admit it.
- Publish a fresh object for the new admission; never set the retired object's `active` back to true. Bind `isCurrentOwner` and field `onChange` to the **published captured record**, checking that `admitted.current` is still that record, its captured mount is active, and its source/binding/session still match committed observations.
- Pass that record-bound predicate to unchanged `useLegacyWidgetIconResources`. Its upload already retains `fieldOwner` (`widget-app-input.tsx:67–74,143–148`). Old uploads therefore retain the old predicate and fail after replacement instead of following a generic callback through `admitted.current` to the new record. A fresh admission restores field interaction; it does not automatically clear or resend an old unknown/held upload.

**Review disposition:** failed widget validation followed by a genuine fresh source, and a genuine version/binding/session replacement, allow the current field again. A→B→A may create a new admitted A, but the original A's callbacks and upload remain dead. Identical retired observations never cause an admission loop. No parent/helper change is required.

## 2. Repository: recognize the guarded own row update

Evidence: `onRepositorySave:99–119` writes six parent fields and then invokes the actual `form.validate()`. The selection observer at `:185–190` treats the resulting serialized change as replacement. The actual release validator includes `providerUrl: z.string().url().optional()` (`packages/widgets/src/releases/definition.ts:61–76`). `form.validateField` on the old values would not validate the proposed row; do not invent a detached schema or change validation rules.

Use the allowed **guarded-own-update** alternative, retaining the existing validator and error UI:

1. In the selected modal's `onRepositorySave` wrapper (`:230–234`), capture its exact active selection, mount/binding/session, index/ID and expected serialized row before calling the existing save callback. Read the row through the latest committed form's genuine `getValues()` and verify that it still matches this selection. A method's identity is not a generation token.
2. Execute the existing six field updates and actual validation synchronously, with no await or new callback dispatch in between. Retain the returned field errors unchanged.
3. Read the actual resulting row from that same form. Accept it as the expected post-state only if the original selection is still active and installed, its mount/binding/session remain current, the same ID is at the same index, all six controlled fields match this guarded save, and untouched row fields retain their pre-write values. Copy/serialize the **actual resulting row**, not a guessed DTO, as the new `origin.fields` expectation before the next committed row observer runs.
4. This acknowledgement applies even when validation returns errors: the authorized UI update occurred, while Confirm remains unsuccessful. Keep the same selected-row association alive so the user can correct the error and retry. Never reactivate a selection already retired by another observation, acknowledge an external replacement, or accept a different row/index as the own result. If the actual post-state does not match, retain the error/retirement rather than rewriting expectations.

No new long-lived owner/epoch field is needed: the existing `origin.fields` stores the accepted actual post-state; before/after row witnesses are local to this synchronous guarded callback. The modal's real presentation owner and source checks stay intact. Existing-row Cancel behavior stays unchanged; newly added row Cancel can still remove exactly its owned row after a failed validation. Reorder/removal, ID/binding/session loss and changes outside the authorized six-field update still retire the selection; old callbacks are never rebound to a replacement.

**Review disposition:** invalid `providerUrl` produces the same validation errors without disabling the current dialog's subsequent edits/Confirm or new-row removal. No definition/schema/helper lease is requested.

## 3. Embedded: one coherent current-data/acknowledgement repair

Keep the supplied parent owner registered before static-input retirement, its exact handoff, independent presentation capture and every currentness check unchanged. Retain the real `app.byId`, `app.update`, typed cache/refetch paths, `retry: false`, original input/result/error and existing unknown-no-resend policy.

### Minimal private observations and their producers

- Make the existing displayed baseline state a small **baseline association** containing the actual `App` and copied `getAppBaselineIdentity` fields. Create it only on initial admitted baseline or a real approved baseline adoption/key change. This identifies an actual baseline-bound AppForm lifetime; it is not a callback/form-method identity, timer, counter or server revision. Keep the original AppForm key/initial values derived from that actual app data.
- Retain `currentAppData`: the admitted initial successful matching query result, a successful owner-checked reconciliation `refetch` result, or the actual successful query result accepted by clean baseline adoption. Bind it to the existing controller owner/app/session and copy its fields. Never construct it from submitted values or from a resolved `void` mutation. A dirty external query change alone does not silently adopt a new write baseline.
- Retain `unacknowledgedIntent` from the values actually captured and validated by AppForm submission, with their baseline association. It records that a real submission has not yet been acknowledged, not synthetic Mantine dirty state. Clear it only after actual AppForm submission succeeds under the same operation/association; inspect the real remaining dirty state separately. A failed, stale or mismatching attempt leaves it held.
- Attach a reusable form-baseline association to a settled write receipt. Its producer is the actual baseline captured by the operation. It may advance once to that write's own expected post-baseline only after successful matching read data and actual AppForm acknowledgement, with no remaining edits/held intent. Retain historical original source/result/error; do not rebind an obsolete receipt to an independent later baseline.
- Publish the genuine icon pending observation from unchanged `iconPickerProps.upload?.isPending === true` in the committed host used by imperative callbacks. That producer already includes mutation and upload-cache settlement (`widget-app-input.tsx:160–186`); no new pending flag, resource or helper API is invented.

All observations are local to the actual controller/form association. Existing owner/session loss and cleanup retire them and captured operations. Ordinary query object replacement with identical displayed fields is not a new form generation; an actual baseline A→C→A creates a fresh association without reviving the first A's records.

### Hold 3 / P1: “clean” does not acknowledge a known different write

At `submitIfDirty:291–326`, retain the real matching admitted baseline and mount/permission/form/operation checks, and add actual icon-pending exclusion. Permit the clean shortcut only for **idle**, no held unacknowledged intent, current successful nonfetching matching data and genuinely clean real form/dirty observation. Keep absent-form false. A retained known/unknown outcome may still attempt its guarded read-only retry after a transient query error; do not add a global query-success gate that prevents repairing the failed read. Success acknowledgement and new writes require their actual successful read witnesses; denied/not-found or retired ownership remains blocked.

Unknown keeps its existing read-only refresh and false result. Every retained confirmed/reconciliation-held/settled write otherwise routes through actual `AppForm.submit()`, even if `isDirty()` is false, to obtain the current captured values and its owner guard.

For baseline A → known write B → refresh failure → user reverts A, AppForm captures **A**. Reconcile B with reads only; record successful current data B, but reject acknowledgement because captured A differs from saved B. Retain A as unacknowledged and return false. Gate baseline adoption on absence of this held intent, not merely `isDirty() === false`, so the newly read B cannot overwrite reverted A after the operation finishes. A later explicit captured A may be a new different write against the real current-data witness B; it is never a resend of the original known B.

### Hold 4 / P2: settled receipt reuse belongs to its actual baseline

Replace `handleSubmit:243–255`'s global matching-old-values rule and stale `prior.read` write baseline selection:

- Confirmed/reconciliation-held receipts remain write-consumed: attempt only retained reads and compare the freshly captured values before any acknowledgement. They never enter the mutation branch.
- A settled receipt can supply read-only acknowledgement only within its actual reusable baseline association, with matching submitted values **and matching actual read/current-app fields**. After refresh, require the returned actual app data to still support that acknowledgement. A matching old submitted value alone is insufficient.
- On independent clean adoption of C (`:138–151`), install C's actual data/baseline association, while leaving B's historical receipt and old operation predicates untouched. B's old read/values no longer govern C's writes. Explicitly restoring B in the now C-bound form is a new intent: compare C's accepted current-data witness with the current successful query, then execute one new update. Do not reject it against obsolete `prior.read`, or read-only-acknowledge B while leaving C unchanged.
- If captured values already equal actual current app data, an owner-checked successful read matching those values can genuinely acknowledge them without an unnecessary write; there is no unconditional success shortcut or fabricated acknowledgement. If a known receipt is not yet acknowledged and refresh shows other values, retain the intent/hold rather than treating that read alone as permission to resend its original input.
- Keep the admitted baseline association frozen during the operation. After actual AppForm acknowledgement, its existing `resetDirty(submitted)`/per-field dirty logic preserves later edits. Remaining edits cause false and block adoption; successful own-post-baseline adoption must match the real expected read/acknowledgement, not an unrelated C. No new mutation is launched by an effect, adoption or reconciliation retry.

### Hold 5 / P2: pending icon work blocks parent completion

Check the committed genuine icon pending observation **before operation registration and every clean/read-only shortcut**, and again after awaits before returning true. Preserve the real AppForm pending guard on routed submission too. A clean form with an active upload or its cache settlement returns false; it cannot close the parent and lose the subsequent icon delivery. A later actual parent submission observes the completed upload's field value normally. Parent final-result/owner checks and its existing false→app-tab behavior require no change.

## Review boundary and completion criteria

Independent source-plan review must approve these exact three cuts before authorship. Required business dispositions are all five above, including held reverted values during post-read baseline adoption and old receipt scoping after an actual clean C adoption; interface compatibility alone is insufficient. Preserve CSS, modal/fieldset presentation, tabs, footer/buttons, pure views, parent capture ordering, native-source graph boundaries and original RPC per-call semantics. No schema/declaration/configuration weakening or speculative tests are proposed.

Only this new report was written after read-only inspection. No product writes, commands, hashes, compiler/lint/checks, evaluation, tests, native/SQL, Engine, browser/network, private configuration/data or nested agents occurred. Old receipts/captures remain unchanged. The three-file repair is ready for independent plan review; **SOURCEHOLD5 is not cleared here**, and the reported type/lint zero is not a substitute for that review.

## Controlling follow-up — one file, normalization and fresh pending reads

**PLAN ONLY; ready for independent review before any new writer release.** The coordinator's actual source review accepted custom/repository and the three original embedded control repairs. Preserve that approved plan, source and hold history above. The remaining business P1 is raw submission versus normalized real read (`embedded-app-edit-form.tsx:368–371`); fresh Widget TS2367 diagnostics at `:429,448` are a separate pending-reader cut. The reported batch is `TEMP/nitro-auth-ui-source-diagnostics-wfxrjc3k`, described by the coordinator as `14terminal10/14; lint0format0`; these receipts were not rerun here.

The sole prospective product file is **`packages/widgets/src/modals/embedded-app-edit-form.tsx`**, with exactly the two cuts below. Parent, shared resource hooks, custom/repository, Docker/QuickAdd, pure/CommonForm APIs, schemas, manifests and native graph boundaries remain frozen. Active Auth2 files were not read. No six-file rebuild, new producer/public helper, dependency or speculative test is proposed.

### Cut 1 — canonical managed comparisons, original raw intent/acknowledgement

Dependency/import verified from actual source: `packages/widgets/package.json:77` already declares `@homarr/validation`; its manifest exports `./*` to `src/*.ts`, and `packages/validation/src/app.ts:11–29` exports **`appManageSchema`**. Import it through the existing public **`@homarr/validation/app`** entrypoint. It is the authority for trimming and empty-string→null transforms, not a handwritten normalizer. Invalid inputs retain its validation failure; do not expand its accepted inputs or guess additional whitespace/URL rules.

Actual shared-form evidence: `_form.tsx:145,156–166,183–185` captures raw current values, passes that raw submitted tuple to the injected handler and acknowledges exactly it while comparing later edits field-by-field. `packages/form/src/resolver.ts` validates through the schema; validation does not replace that captured tuple with the transformed output.

1. Keep `matchesSubmittedApp` as the existing strict five-field comparator. Keep `pending.submitted`, `unacknowledgedIntent.values` and every receipt's `values` as immutable copies of the **raw captured tuple R**. Preserve the exact raw equality used for prior-input reuse and later-input mismatch (`:302,306`), actual AppForm acknowledgement and remaining-dirty comparisons.
2. In `handleSubmit`, derive only an operation-local **N(R) = `appManageSchema.parse(R)`** after raw capture and before dispatch/read comparison. It is a typed normalized requested payload, not app data, an acknowledgement, or a replacement raw tuple. Send this payload to the existing update RPC once; retain the original raw tuple/result/source/error in its receipt. A known confirmed/held outcome still cannot dispatch again.
3. Replace **read-versus-input** comparisons only: the current-data read/no-write branch (`:315`), its fresh read check (`:318`), retained-write read check (`:306`), and new-write successful read check (`:368`) compare the actual returned managed fields with N(R). Existing `matchesSubmittedApp` already examines only `name`, `description`, `iconUrl`, `href`, `pingUrl`; preserve separate actual app-ID, owner, session and baseline checks. Do **not** normalize or replace the returned read DTO.
4. In own-post-baseline advancement (`:179`), compare the actual recorded managed read with `appManageSchema.parse(known.values)`, keeping `known.values` raw and its actual baseline association intact. This allows a genuinely acknowledged raw empty/trimmed input to advance to its matching real canonical baseline, not an unrelated C.
5. `currentAppDataRef` remains populated solely by its existing successful real query/refetch/adoption producers. N(R) and the resolved `void` mutation never populate it. Clear held intent only through the existing real AppForm submission result and exact raw operation/association checks. Schema equivalence is not permission to erase a later raw edit, clear an unknown result, or reactivate a historical receipt.

**Exact transitions for review:**

- Ordinary R_B with `pingUrl: ''`, empty description/href, or schema-valid trimmed fields produces canonical N(R_B), e.g. empty values→null and surrounding name whitespace→trimmed name. One update is followed by actual read D_B. Matching managed(D_B)=N(R_B) permits actual AppForm acknowledgement of **R_B**, not N(R_B). A later raw edit differing from R_B stays dirty even when its normalized value is equal.
- Raw R_A → known R_B/read failure → revert R_A still requires **R_A=R_B raw equality** for acknowledgement of that retained submission. Reconciliation performs reads only. If raw tuples differ, retain R_A and return false even when N(R_A)=N(R_B); normalization cannot collapse the pending raw intent. A later explicit R_A may use a matching genuine current read without another write, or submit its different canonical intent once against that real witness. It never resends the unresolved known R_B mutation.
- After matching D_B and actual raw R_B acknowledgement, clean own-baseline advancement uses the real D_B descriptor. Later independent clean D_C creates its existing new association and leaves B's receipt obsolete. Explicitly restoring raw R_B from C remains a new intent under C's association; canonical comparison does not bypass that scope check or read-only-acknowledge B while D_C differs.

### Cut 2 — one named reader, fresh actual resource on every call

TS2367 results from directly narrowing the mutable ref's pending property before later checks. Do not use a cast, truthy coercion, diagnostic suppression, removed guard or resource object/boolean retained across an await.

Add one tiny local named boolean reader, using the already imported `useCallback` and existing resource ref:

```ts
const isIconWorkHeld = useCallback(() => {
  const resources = iconResourcesRef.current;
  return resources === null || resources.upload?.isPending === true;
}, []);
```

The only captured object is the stable ref itself. **Each invocation reads its latest committed resource structure**; null/unpublished is held, and pending remains the real shared hook's upload/cache-settlement signal. No cached flag, timer, counter, resource producer or public helper is added.

Replace the repeated direct null/pending conditions with this reader in baseline-adoption admission, `handleSubmit` admission, imperative pre-operation admission, the idle shortcut, and the post-`await appFormRef.current.submit()` true-result path. Invoke it again after each relevant await before any true/acknowledgement completion; never reuse a pre-await result or old resource object. Preserve publication in the existing committed host observation before adoption checks, and all owner/form/query guards. This removes the stale TypeScript narrowing while retaining the required live pending gate; pending work still prevents closing the parent and losing icon delivery.

### Boundary and completion disposition

Only the schema import, raw-versus-managed comparison/payload sites and this local current-ref reader are allocated for future source repair. Existing raw-input reuse, unknown/held no-resend, held reverted values, current real data, independent C baseline scoping, actual parent owner handoff/final checks and all accepted custom/repository fixes are unchanged. This is a normalization distinction and an actual fresh read, not an invented server revision or credential/SQL authority.

Independent plan review must approve the one-file cut before authorship. Later coordinator-owned validation and source post-review must establish ordinary valid raw submissions settle against canonical real reads while later raw edits remain unsaved, and newly pending work observed after await still returns false. No product changes, commands, hashes, checks/compiler/lint/format, evaluation, tests, network/SQL/Engine, private data or nested agents occurred here; only this controlling report section was appended.

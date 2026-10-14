# PLAYABLE-WAVE32 lane09

## Reopen09 P2 correction: exact writes declared before edits

- `apps/nitro/src/features/apps/selection.tsx`: replace create-and-add's captured selected records with a pending confirmed-app completion reconciled against current selected IDs and only the successful current non-placeholder selection read. Keep confirmed creation separately; hold completion on refresh failure/placeholder data.
- `apps/nitro/src/features/apps/app-form.tsx`: capture the originating generated query scope per submission; always finish that scope's reconciliation, but require the actual mounted form owner/current principal authority before presentation callbacks, reset, or routing. Receive actual source-form dirty notifications and reconsider a pending lookup when the child becomes pristine.
- `apps/nitro/src/source-ui/apps/contracts.ts`: require `onDirtyChange(dirty)` and `captureSubmissionOwner()` on the owned source-form binding. These are required producer seams, not optional no-op capabilities. Request their exact implementation from lane24 without editing or consuming its active shared AppForm.
- `.scratch/nitro-full-migration/implementation/playable-09.md`: publish revised binding requirements, correction evidence, raw validation logs and hashes.

No other path is reopened. Shared24/P1 consumer adoption and the absent admitted client app namespace remain held. No backend/runtime/routes/manifests, shared24 source, new tests, child agents or Git changes are authorized.

### Exact lane24 producer request for rereview

The owned `SourceAppFormProps` now requires both `onDirtyChange: (dirty: boolean) => void` and `captureSubmissionOwner: () => { isCurrent: () => boolean }`. The consumer supplies actual owner-bound implementations, not optional/no-op defaults. Lane24 must publish a frozen source binding which:

- Reports the real Mantine form's `isDirty()` on initial binding and every dirty/pristine transition, including reverting fields to baseline, initialize, reset and resetDirty. Notifications must come from actual form state, not DOM heuristics, polling or assumed pristine values.
- Calls `captureSubmissionOwner()` once when the real form submission starts and retains that returned owner's predicate across awaits. Checks that captured `isCurrent()` before submission/reset side effects and again after awaiting handleSubmit, immediately before its own imperative resetDirty/reset or successful submit result. It must not recapture a replacement owner after awaiting. Retired imperative submits return false or reject; they must not reset or claim presentation success. The producer must also retain its own actual source-form mounted lifetime guard.
- Preserves the actual existing imperative submit/isDirty ref and original rich source controls. An absent ref is not interpreted as pristine by the owned consumer.

Do not bind an old raw AppForm by ignoring these required props. No shared24 file was edited or consumed. Consumer adoption remains held until this exact producer seam is frozen and reviewed; the app client namespace and P1 consumer holds are unchanged.

### P2 corrections implemented, runtime proof held

- Create-and-add stores a confirmed completion independently of selectable fallback records. Its mounted-owner layout reconciliation reads the actual current generated query cache entry, requires success/idle/non-invalidated state plus a non-placeholder completed observer read, resolves the current selected IDs to that result, and resolves the confirmed ID there too. Removed IDs are omitted. A failed/placeholder/in-flight read or a successful read omitting the confirmed app cannot call onSelect. Retry can finish only against a later successful current read; the missing-confirmed-app state is visibly unavailable. Ordinary selection and Add likewise re-resolve IDs against that current cache entry rather than submitting rendered/captured stale records. Discard cancels completion. The layout phase avoids a deferred passive callback capturing a pre-interaction selection.
- Every form submission captures its actual origin QueryClient and generated scope key. Genuine successful writes always invalidate that origin scope, including after retirement. View acknowledgement, onCreated, the source afterSuccess reset, and onSaved/navigation each require the committed mounted source-owner token. The binding is bound to actual user/authority revision, client, QueryClient, mode/app ID, permission/read-only availability, supplied form and source mount. Every layout setup creates a distinct actual owner; cleanup retires it synchronously, so effect replay/reappearance cannot revive a captured old owner. A stale handler rejects and cannot clear a newer owner's pending submission. Current owner changes clear stale presentation mutation state. No principal/client method or backend success was fabricated.
- Required source onDirtyChange drives owned dirty state, so a held incoming lookup is reconsidered when the child becomes pristine even without a new query/parent update. Lookup adoption also requires the actual mounted owner and non-null imperative ref reporting pristine. Owned pending state covers the entire submit/invalidation/callback sequence, not just the Mutation observer's pending status; an invalidation refresh cannot remount a pristine form in the gap before its completion callback. Settlement then explicitly reconsiders the held lookup. Dirty drafts remain mounted with their original baseline. The required producer is still held, so this is a real typed consumer correction/request, not a claim that mutable shared24 already supports the hook.

The three review findings are provided source-level defects, not an unknown live-service investigation. Runtime reproduction and new regression tests are explicitly unauthorized, and the shared form/client joins are unaccepted; no runtime pass or bug-scenario execution is claimed. Installed React layout/ref/hook declarations and actual QueryClient getQueryState/isInvalidated/invalidateQueries and Mutation.execute/onSuccess ordering were inspected read-only. Lint and semantic snapshot evidence follows below; it does not discharge the runtime or producer holds.

## Exact writes declared before edits

- `apps/nitro/src/source-ui/apps/contracts.ts` (new)
- `apps/nitro/src/source-ui/apps/management.tsx` (new)
- `apps/nitro/src/source-ui/apps/selection.tsx` (new)
- `apps/nitro/src/source-ui/apps/search.tsx` (new)
- `apps/nitro/src/source-ui/apps/index.ts` (new)
- `apps/nitro/src/features/apps/context.tsx`
- `apps/nitro/src/features/apps/management.tsx`
- `apps/nitro/src/features/apps/app-form.tsx`
- `apps/nitro/src/features/apps/selection.tsx`
- `apps/nitro/src/features/apps/search.tsx`
- `apps/nitro/src/features/apps/index.ts`
- `.scratch/nitro-full-migration/implementation/playable-09.md`

No Next originals, collection packages, manifests, routes, or peer implementation files will be edited. Original P1 collection views are reused through supplied frozen components until their public export is admitted. The original rich shared AppForm is supplied through a structural source contract after lane24 freezes; an absent form remains visibly unavailable, never replaced by a simplified form.

## Declaration requests published immediately

No new runtime dependency is required: React, Mantine core/hooks, Tabler, oRPC client/server/TanStack Query, React Query, UI, translation, validation, definitions, and common are already declared in Nitro. Lane01 should publish the frozen P1 `ManageCollectionPage`/`ManageCollectionItem`/`ManageMobilePrimaryAction` through a public UI export if direct composition is preferred. Lane24 should return its frozen source AppForm with the original `buttonLabels`, `showBackToOverview`, `initialValues`, `handleSubmit(values, redirect, afterSuccess)`, `isPending`, `hideButtons`, and optional form-ref contract. Neither request authorizes consuming mutable code.

## Frozen implementation return

Lane09 code is frozen. Five source-presentation files and six existing feature files changed; existing `features/apps/feedback.tsx` is unchanged and included in the validation closure. No route is claimed mounted. Lane01 alone can copy these frozen files into its disposable3210 composition.

### Immediately usable exports and props

`apps/nitro/src/features/apps/index.ts` exports:

| Export                                                     | Required composition / behavior                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppsFeatureProvider`                                      | Existing real native `{ app: NativeAppClient }`, actual principal with current expanded permissions and authority revision, actual read-only state, localized unavailable copy. New required copy field: `sharedForm`. No principal or client is manufactured.                                                                                                       |
| `AppsManagement({ presentation })`                         | Genuine management read; URL `search`, `pageSize`, `page` come from existing `NavigationProvider`. `presentation` supplies frozen P1 CollectionPage, CollectionItem, MobilePrimaryAction, breadcrumb, original layout values and optional actual tour wrapper.                                                                                                       |
| `AppEditor({ id, form, onSaved, breadcrumb? })`            | Genuine `byId` lookup and update; required `onSaved` belongs to the real Router. `form` is a frozen lane24 source AppForm component or explicit `null`.                                                                                                                                                                                                              |
| `AppNewPage({ form, onSaved, breadcrumb? })`               | Original Container/Stack/Title and shared rich form, with create-another. `onSaved(createdApp)` belongs to the Router.                                                                                                                                                                                                                                               |
| `AppForm(props)`                                           | Real create/edit mutation controller around the supplied source form. Create branch takes `onSaved`, optional `onCreated` for every real creation and `createAnother`; edit branch takes actual app, query owner/dataUpdateCount lookup version and `onSaved`. Optional original buttonLabels, showBackToOverview and onPendingChange compose the original selector. |
| `AppSelection({ form, onSelect, multiple?, withCreate? })` | Original scrollable app grid, creation card, search, Enter-to-select, selected cards, discard/add footer, create-and-add and multi create-another. `onSelect` receives actual chosen app records; modal close and board placement are caller-owned.                                                                                                                  |
| `AppSearch({ onSelect })`                                  | Real limited native search with the original Spotlight app-row presentation. Full eight-mode palette/context/keyboard lifetime remains lane17-owned.                                                                                                                                                                                                                 |
| `AppDeleteButton({ app, onDeleted, onError })`             | Original inline confirmation icon, genuine delete mutation and generated-key invalidation. No replacement confirmation dialog.                                                                                                                                                                                                                                       |
| `BoardAppPlacementUnavailable()`                           | Explicit existing board-placement hold; no board write is simulated.                                                                                                                                                                                                                                                                                                 |

`apps/nitro/src/source-ui/apps/index.ts` separately exports `SourceAppsManagement`, `SourceAppManagementItem`, `SourceAppsNoResults`, `SourceAppDeleteButton`, `SourceAppSelection`, `SourceAppSelectionCard`, `SourceAppSearchOption`, `SourceAppSearchDetails`, `SourceAppSearchActions`, and their public props/contracts. These are data-only presentation inputs, not principals or clients. `AppDisplay` is the exact six displayed app fields: id/name/iconUrl plus nullable description/href/pingUrl.

`SourceAppDeleteButton` without an actual onConfirm is visibly disabled; its handler rejects if invoked without an available action. Source search actions use safe original destination links and actual edit-route links, with edit permission supplied explicitly.

### Original source mapping

| Read-only source specification                                                                                        | Frozen destination / retained controls                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nextjs/src/app/[locale]/manage/apps/page.tsx`                                                                   | `source-ui/apps/management.tsx`: collection page/item slots, original 36px avatar, split description lines, safe destination metadata, grouped subtle 44px edit/delete actions, original three empty states, search input, pagination, tour targets and mobile primary-action positions. `features/apps/management.tsx` replaces RSC/auth/redirect acquisition with actual context/query/navigation. |
| `apps/nextjs/src/app/[locale]/manage/apps/_app-delete-button.tsx`                                                     | `SourceAppDeleteButton` plus native `AppDeleteButton`; original InlineConfirmActionIcon remains the controller for timeout, focus, confirmation and submission.                                                                                                                                                                                                                                      |
| `apps/nextjs/src/app/[locale]/manage/apps/edit/[id]/_app-edit-form.tsx`                                               | `features/apps/app-form.tsx` native update binding around the shared source form; real success triggers caller routing only after mutation/invalidation.                                                                                                                                                                                                                                             |
| `apps/nextjs/src/app/[locale]/manage/apps/new/page.tsx` and `packages/forms-collection/src/new-app/_app-new-form.tsx` | `AppNewPage` and native shared-form create/create-another binding; no copied/replacement text-field form.                                                                                                                                                                                                                                                                                            |
| Original `packages/forms-collection/src/new-app/_form.tsx` contract                                                   | `source-ui/apps/contracts.ts` structural component/imperative-handle boundary. Actual icon picker, Zod/Mantine form, Collapse ping field, validation and source submit/reset body remain lane24-owned. No mutable lane24 implementation is imported.                                                                                                                                                 |
| Original `packages/modals-collection/src/apps/app-select-modal.tsx`                                                   | `source-ui/apps/selection.tsx` preserves original Input/Search icon, 70vh ScrollArea, responsive selectGridCols, dashed creation card, SelectableCard image/title/description/footer, back arrow and small selected-count/discard/add footer. Existing accepted selection acquisition/fallback ownership stays in `features/apps/selection.tsx`; registration is lane24-owned.                       |
| Original `packages/spotlight/src/modes/app-integration-board/apps-search-group.tsx`                                   | `source-ui/apps/search.tsx` preserves original app option/details and ExternalLink/Eye action trees. The palette itself is not duplicated.                                                                                                                                                                                                                                                           |
| Frozen P1 `packages/ui/src/source-views/manage/`                                                                      | Supplied accepted components are reused; no second collection layout implementation is created. Original constants must be supplied: floating bottom offset48, action min-width160, Affix bottom/right20.                                                                                                                                                                                            |

### Actual transport and preserved controller contracts

The native client still derives from public `RouterClient<ReturnType<typeof createAppProcedures>>`. Reads now use installed `createTanstackQueryUtils` generated `queryOptions`, keys and forwarded signal. The generated factory uses an identity/revision prefix derived only from the supplied actual principal. Mutations use actual create/update/delete client methods and generated mutation keys; invalidation uses `query.app.key()`, never a no-op refresh.

Create-only principals issue no management query and cannot render cached management records. Existing permission gates and read-only checks remain at mutation entry points. Edit lookup errors retain the mounted draft; a pristine imperative source form can adopt a new query owner/dataUpdateCount by remount, while dirty drafts retain their original baseline. Successful create-another resets only through the source form's afterSuccess callback, and errors throw back to that form rather than reporting success. Selection retains its per-instance/version generated-key extension and retires created-app fallback only on a successful current non-placeholder read. Placeholder/error selections cannot submit stale records.

###3210 route inventory and holds

- `/manage/apps` → `AppsManagement`, with actual provider/context or a clearly labeled synthetic display using `SourceAppsManagement` directly and `readOnly=true`.
- `/manage/apps/new` → `AppNewPage`; genuine creation needs the actual admitted client/principal and frozen shared form. `form=null` displays localized `unavailable.sharedForm`.
- `/manage/apps/edit/:id` → `AppEditor`; same real-client/form requirements, required Router-owned onSaved.
- Selector/search exports can be embedded without creating additional routes. Selection is local choice only, never board persistence.

Required host providers are Mantine, standalone i18n, React Query and the real public UI NavigationProvider. Source fixture presentation must be visibly labeled synthetic; it cannot supply fabricated AppsPrincipal or NativeAppClient. P1 components may be supplied directly from a completed accepted snapshot until lane01 publishes their public export. Lane24 rich-form consumer integration waits that lane's frozen return. Private authenticated joins remain subject to the existing lifecycle/SQL/resource holds; this contribution clears none of them. No listener, app build, installation, production activation or runtime/browser proof was performed.

## Installed API and dependency verification

Read current Nitro/UI/translation package manifests and public exports before implementation. All runtime imports are already declared. Verified installed React19.2.7 ref/component types, Mantine9.6.0 image/input/grid/action primitives, oRPC TanStack Query2.0.0-beta.43 queryOptions/queryKey/mutationOptions/mutationKey/prefix and actual signal forwarding, existing React Query version, public UI navigation adapter and original shared UI leaf contracts. Context7 was not called because the wave explicitly records exhausted quota. The actual NavigationAdapter exposes replace and Link, not push; post-save navigation is therefore a required caller action, not an invented method.

## Focused clean-environment validation

- Final lint: `env -i PATH=/usr/bin:/bin:/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin node node_modules/oxlint/bin/oxlint apps/nitro/src/features/apps apps/nitro/src/source-ui/apps --deny-warnings` → **0 warnings,0 errors**,12 files.
- TypeScript7.0.2 installed native snapshot API ran under the same clean environment with only the approved TMPDIR added, strict/noEmit/no cache. Own source strings were captured before checking and dependency reads cached in memory; no on-disk config, test or output was created, and no watch/installation occurred.
- The validation-only in-memory UI facade reexports the six already-public immutable leaves actually used; the DB facade reexports actual drizzle operators and the unchanged existing `Database = HomarrDatabase`/driver type. These are narrowed existing source exports, not handwritten API/client declarations or runtime replacements. Runtime application composition remains unchanged.
- Pure source presentation closure:5 roots,1549 source/declaration files, **0 syntax/semantic diagnostics**.
- Preliminary whole owned feature/source snapshot:12 roots,3790 source/declaration files, **0 owned diagnostics**. Its initial deny list missed a transitive lane28 access dependency; this snapshot is diagnostic evidence only, not acceptance of that mutable dependency. It also exits1 due to five diagnostics in existing `packages/integrations/src/unifi-controller/unifi-controller-integration.ts`: two TS7016 missing `@homarr/node-unifi` declarations, TS7006 site/health and TS7031 cookies.
- Final expanded peer-denial snapshot:12 roots,3789 source/declaration files, **0 owned diagnostics**. It explicitly refuses `packages/api/src/nitro/routers/-integration-management/access.ts`; the public app type graph transitively reaches the native integration router, so that router has27 missing-dependency/cascade diagnostics plus the five UniFi diagnostics above. No peer action/body is imported into lane09 implementation, and the refused access body is not consumed by the final check. A fully clean feature dependency check therefore remains held for frozen lane28/public type-closure admission and actual UniFi typings. No unsafe ambient stub or cast was added to conceal either hold, and no full-app clean typecheck is claimed.
- No tests, Git operation, child agent, provider/network call, environment credential read, protected output or port3100/3200/3210 operation occurred.

## Frozen code SHA256

| Path relative to `apps/nitro/src/` | SHA256                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| `source-ui/apps/contracts.ts`      | `1d50134ba7652ab473325202b730c5082de1f09666a12e1760b7fc2a782bffda` |
| `source-ui/apps/index.ts`          | `5c15db1e3d4cfc7131ac6b0104806b7614832ee65b9368b44a9f251333d3a224` |
| `source-ui/apps/management.tsx`    | `cf8b64d60270bb32504dde1964995493f88a55cf6046f14389064a121eba121f` |
| `source-ui/apps/search.tsx`        | `0982ae0ddb8e9790edff661c18825aece6540345c9fc6a851b332b0d4cc7e0d6` |
| `source-ui/apps/selection.tsx`     | `34e386c08ce95b61ed7f3ec341d3c11d43bccfadfbc47be6c15fabcd8174fb63` |
| `features/apps/app-form.tsx`       | `91cd0889101f97cfeba2490fbfbeab633336978c81b7e7babb35e4ff76589168` |
| `features/apps/context.tsx`        | `c2d131144e61b90b07e4054208b5be4a0608dd35d27267c9dcb11d4b7e4d586e` |
| `features/apps/index.ts`           | `6c5028f3bb45d49878c2f95664f8df161165e012a7625a5ccdb58261df64eb94` |
| `features/apps/management.tsx`     | `f1ca92c35db80a473cd4df8f52a86571fc976a177b22a470c6e33d9606d86555` |
| `features/apps/search.tsx`         | `72845ceecdb78dabb227e10154a80afb5f1b10e30707b2515e3fca3cd90819db` |
| `features/apps/selection.tsx`      | `5e33d55ae974a8af3bb9826d6f6d2312943a6cab76d1a272c7ff644affc21e59` |

Unchanged closure leaf `features/apps/feedback.tsx`: `9cd7c315c5c2c1fad296ffe5f19c162b312049c9c0d1e308c37956dd2bef1359`.

## Reopen09 P2 final frozen return and raw evidence

Only the three code paths enumerated in the reopen section changed, plus this handoff. The following hashes supersede the earlier fingerprints for those three paths. All other lane09 code remains unchanged. Shared24/P1 consumer adoption, the absent admitted client app namespace, private runtime joins and integrated clean types remain held. Return is for independent source rereview, not runtime acceptance.

| Reopened path                                | Final SHA256                                                       |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `apps/nitro/src/features/apps/selection.tsx` | `5ef088afb3d0af9600381a4efe3dcd94814b876607b9d1e82ed01845ec591041` |
| `apps/nitro/src/features/apps/app-form.tsx`  | `f9476c2bf179fdc3e007426bc09f33e2d85253ef836f8688fe4dab07f3c16276` |
| `apps/nitro/src/source-ui/apps/contracts.ts` | `a0e3e8ba5ceb695c55e99e52a5e53e63bcd8e951c84e30b0cab731b0b915d722` |

### Final lint invocation and raw stdout

```sh
env -i PATH=/usr/bin:/bin:/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin node node_modules/oxlint/bin/oxlint apps/nitro/src/features/apps/selection.tsx apps/nitro/src/features/apps/app-form.tsx apps/nitro/src/source-ui/apps/contracts.ts --deny-warnings
```

```text
Found 0 warnings and 0 errors.
Finished in 192ms on 3 files using 16 threads.
```

Exit0. No fix/formatter option was run.

### Final immutable typecheck invocation

The following is the actual final clean-environment snapshot command. It creates only in-memory configs/owned strings and cached source reads. Its two narrowed facades are the existing declared UI leaf exports and unchanged DB operator/driver type exports; no API/client/authority declaration is fabricated. Mutable peer paths are refused rather than treated as accepted. It emits no files, installs nothing and starts no application/backend runtime. Diagnostic groups below are raw output of this reporter; the prior invocation in the session also printed every dependency diagnostic's exact text.

```sh
env -i PATH=/usr/bin:/bin:/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode node --input-type=module <<'NODE'
import { readFileSync, existsSync, readdirSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { API } from "typescript/unstable/sync";
const root = process.cwd();
const dirs = ["apps/nitro/src/source-ui/apps", "apps/nitro/src/features/apps"];
const files = dirs.flatMap((dir) => readdirSync(resolve(root, dir)).filter((name) => /\.tsx?$/.test(name)).map((name) => resolve(root, dir, name)));
const contents = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const options = { target: "ES2023", lib: ["ES2023", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, allowArbitraryExtensions: true, types: ["react", "bun"] };
const configs = [resolve(root, "lane09-p2-source-snapshot.json"), resolve(root, "lane09-p2-feature-snapshot.json")];
contents.set(configs[0], JSON.stringify({ compilerOptions: options, files: files.filter((file) => file.includes("/source-ui/")) }));
contents.set(configs[1], JSON.stringify({ compilerOptions: options, files }));
contents.set(resolve(root, "packages/ui/index.ts"), 'export { Link } from "./src/components/link";\nexport { SearchInput } from "./src/components/search-input";\nexport { TablePagination } from "./src/components/table-pagination";\nexport { SelectableCard } from "./src/components/selectable-card";\nexport { selectGridCols } from "./src/select-grid-layout";\nexport { InlineConfirmActionIcon } from "./src/components/inline-confirm-action";\n');
contents.set(resolve(root, "packages/db/index.ts"), 'import type { HomarrDatabase } from "./driver";\nexport * from "drizzle-orm";\nexport type Database = HomarrDatabase;\n');
const denied = [];
const banned = /\/apps\/backend\/|\/apps\/nitro\/src\/(client|query|navigation|app|routes)\/|\/packages\/(settings|forms-collection|modals-collection|notifications|boards|spotlight|onboarding)\/|\/packages\/db\/(runtime|transaction-gate)|\/packages\/auth\/nitro\/production-sessions\/|\/packages\/core\/src\/infrastructure\/http\/(https-agent|ownership|runtime|proxy-connector)|\/packages\/api\/src\/nitro\/(assembly|browser-contracts)\/|\/packages\/api\/src\/nitro\/routers\/(-widgets\/(helpers|resources)|-integration-management\/access|-integration-operations\/helpers|-resource-authority\/repository)|\/packages\/redis\/src\/cache\/|\/packages\/widgets\/src\/common\//;
const api = new API({ cwd: root, fs: {
  readFile(file) {
    if (contents.has(file)) return contents.get(file);
    if (banned.test(file)) { denied.push(file.slice(root.length + 1)); return null; }
    try { const text = readFileSync(file, "utf8"); contents.set(file, text); return text; } catch { return null; }
  },
  fileExists: (file) => contents.has(file) || existsSync(file),
  realpath: (file) => { try { return realpathSync(file); } catch { return file; } },
} });
try {
  const results = configs.map((config) => {
    const snapshot = api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProject(config);
    if (!project) throw new Error("Immutable project unavailable");
    const diagnostics = [...project.program.getSyntacticDiagnostics(), ...project.program.getSemanticDiagnostics()];
    const groups = new Map();
    for (const diagnostic of diagnostics.filter((item) => !files.includes(item.fileName))) {
      const key = `${diagnostic.fileName?.slice(root.length + 1)} TS${diagnostic.code}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const result = { scope: config.slice(root.length + 1), roots: project.rootFiles.length, sources: project.program.getSourceFileNames().length, ownedDiagnostics: diagnostics.filter((diagnostic) => files.includes(diagnostic.fileName)), dependencyDiagnosticCount: [...groups.values()].reduce((sum, count) => sum + count, 0), dependencyDiagnosticGroups: Object.fromEntries(groups) };
    snapshot.dispose();
    return result;
  });
  const changed = ["apps/nitro/src/features/apps/selection.tsx", "apps/nitro/src/features/apps/app-form.tsx", "apps/nitro/src/source-ui/apps/contracts.ts"];
  console.log(JSON.stringify({ results, denied, hashes: Object.fromEntries(changed.map((file) => [file, createHash("sha256").update(contents.get(resolve(root, file))).digest("hex")])) }, null, 2));
  process.exitCode = denied.length || results.some((result) => result.ownedDiagnostics.length || result.dependencyDiagnosticCount) ? 1 : 0;
} finally { api.close(); }
NODE
```

### Final typecheck raw stdout

```json
{
  "results": [
    {
      "scope": "lane09-p2-source-snapshot.json",
      "roots": 5,
      "sources": 1549,
      "ownedDiagnostics": [],
      "dependencyDiagnosticCount": 0,
      "dependencyDiagnosticGroups": {}
    },
    {
      "scope": "lane09-p2-feature-snapshot.json",
      "roots": 12,
      "sources": 3789,
      "ownedDiagnostics": [],
      "dependencyDiagnosticCount": 32,
      "dependencyDiagnosticGroups": {
        "packages/api/src/nitro/routers/integration.ts TS2307": 1,
        "packages/api/src/nitro/routers/integration.ts TS7006": 18,
        "packages/api/src/nitro/routers/integration.ts TS7031": 7,
        "packages/api/src/nitro/routers/integration.ts TS7053": 1,
        "packages/integrations/src/unifi-controller/unifi-controller-integration.ts TS7016": 2,
        "packages/integrations/src/unifi-controller/unifi-controller-integration.ts TS7006": 2,
        "packages/integrations/src/unifi-controller/unifi-controller-integration.ts TS7031": 1
      }
    }
  ],
  "denied": [
    "packages/api/src/nitro/routers/-integration-management/access.ts"
  ],
  "hashes": {
    "apps/nitro/src/features/apps/selection.tsx": "5ef088afb3d0af9600381a4efe3dcd94814b876607b9d1e82ed01845ec591041",
    "apps/nitro/src/features/apps/app-form.tsx": "f9476c2bf179fdc3e007426bc09f33e2d85253ef836f8688fe4dab07f3c16276",
    "apps/nitro/src/source-ui/apps/contracts.ts": "a0e3e8ba5ceb695c55e99e52a5e53e63bcd8e951c84e30b0cab731b0b915d722"
  }
}
```

```text
Exited with code 1
```

Pure presentation types pass; all12 owned files have zero diagnostics. The full dependency check remains blocked by the intentionally refused lane28 access body (27 cascade diagnostics) and missing actual UniFi declarations (five diagnostics). No ambient stub, unsafe cast or success fallback was added. No tests, child agents, Git operation, backend/application runtime, new provider/client method or mutable shared24/P1 consumer adoption occurred.

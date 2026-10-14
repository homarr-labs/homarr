# PLAYABLE-WAVE32 lane 10

Status: FROZEN concrete exclusively owned Integration UI implementation, ready for copied preview composition. Original Next sources remain read-only. Native controller mounting and full parity acceptance remain held as specified below.

## Exact writes declared before implementation

- `apps/nitro/src/source-ui/integrations/action-hold.tsx` (new)
- `apps/nitro/src/source-ui/integrations/api-key-settings-link.tsx` (new)
- `apps/nitro/src/source-ui/integrations/secret-card.tsx` (new)
- `apps/nitro/src/source-ui/integrations/certificate-details.tsx` (new)
- `apps/nitro/src/source-ui/integrations/index.ts` (new)
- `apps/nitro/src/source-ui/integrations/form-fields.tsx` (new; added to inventory before edits)
- `apps/nitro/src/features/integrations/provider.tsx`
- `apps/nitro/src/features/integrations/form.tsx`
- `apps/nitro/src/features/integrations/secrets.tsx`
- `apps/nitro/src/features/integrations/access.tsx`
- `apps/nitro/src/features/integrations/pages.tsx`
- `apps/nitro/src/features/integrations/list-page.tsx`
- `apps/nitro/src/features/integrations/connection-error.tsx`
- `apps/nitro/src/features/integrations/index.ts`
- `apps/nitro/src/features/integrations/app-picker.tsx` (native app creation guard; added to inventory before edits)
- This handoff only.

Consume accepted P3 public `@homarr/ui/source-views/connections` views, not peer implementations. No manifests/dependencies, shared collection, route, backend, Core trust or API grants writes. Native actions default held; caller availability is not authorization. Existing principal/server grants remain necessary. Frozen transport/navigation joins are caller-owned.

## Concrete implementation and original mapping

Original prefix: `apps/nextjs/src/app/[locale]/manage/integrations/`.

| Original source                                                                                                          | Frozen implementation                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new/_integration-new-form.tsx` render 182–247; `edit/[id]/_integration-edit-form.tsx` render 208–295                    | `source-ui/integrations/form-fields.tsx` preserves actual Stack/TextInput/Fieldset/Checkbox ordering with typed controlled Mantine input bindings and actual secret/app/error/action nodes. `features/integrations/form.tsx` now consumes this presentation instead of duplicating the outer form tree. Create connection error is again before search/app fields; edit error remains after app linking.       |
| `new/_integration-new-form.tsx` ApiKeySettingsLink 312–343                                                               | `source-ui/integrations/api-key-settings-link.tsx` preserves key/external-link icons, Group gap 4 and Text/Anchor. Controller retains bare-host HTTP normalization, canonical integration settings URL lookup and safe-URL checking; no `javascript:`/unresolved settings href is rendered.                                                                                                                    |
| Same source IntegrationAppSelect 354–395; edit IntegrationLinkApp 313–383                                                | Existing controller retains selectable-app transport and source linked-app flows; restored original 20px selected/list images, name/href option stack, selected check, 32px linked-app image, ButtonGroup and unlink/pencil/plus icons. App selection is a local draft, never a save.                                                                                                                          |
| `_components/secrets/integration-secret-card.tsx`                                                                        | `source-ui/integrations/secret-card.tsx` consumes accepted P3 `IntegrationSecretCardView`, not a new Card tree. Controller passes public actual value or `{ kind: "redacted" }` with no private value property. Confirmed reset resolves the original Promise<boolean>; cancel/dismiss/unmount resolves false. Public reveal, original gray.6 timestamps, left tooltip, badge and Collapse are retained by P3. |
| `_components/secrets/integration-secret-segmented-control.tsx`                                                           | `features/integrations/secrets.tsx` consumes accepted P3 `IntegrationSecretKindsView`; original ordered alternative labels, empty option and empty-valued replacement drafts remain. Native disabled fieldset wraps the accepted uncontrolled view. Fieldset adds no authority.                                                                                                                                |
| `_components/secrets/integration-secret-inputs.tsx`                                                                      | Existing source-kind icon, public TextInput, private PasswordInput and multiline Textarea branches are retained, now with original full width. Private stored values cannot initialize/reset a draft even if a caller supplies an invalid plaintext DTO; only explicit new user-entered drafts can contain private values. Existing server `byId` itself redacts private values.                               |
| `_components/test-connection/test-connection-certificate.tsx` details 207–277 and PEM 283–311                            | `source-ui/integrations/certificate-details.tsx` composes accepted P3 `CertificateDetailsView` and `PemContentView` under real Mantine Modal. Controller supplies actual authorized certificate metadata/PEM and original full/long Intl date formatting. Restores original Card, five-field grid plus separate fingerprint grid and absolute copy/check feedback.                                             |
| `_components/integration-access-settings.tsx`; `apps/nextjs/src/components/access/access-settings.tsx`                   | Existing keyed grants controller, canonical full-replacement schema, use/interact/full hierarchy and user/group/inherited tables remain. Original user/group/inherited tab icons restored. Anonymous permission reads are disabled. Draft grant edits never claim persistence; saves require explicit native availability as well as actual server authorization.                                              |
| `_integration-buttons.tsx`, create/edit wrappers, embedded editor, connection-error branches and source app-select modal | Existing actual client calls, source request-generation/authority invalidation, save/test/error/notification/completion/embedded flows remain. No result is invented. Required Router-owned navigation callback replaces `window.location.assign`; source anchor hrefs remain real links.                                                                                                                      |

Accepted P3 files are unchanged. No source algorithm, secret definition, permission hierarchy, CA trust, grant repository or backend writer was recreated.

## Mountable named exports and props

Immediately usable presentation entry: `apps/nitro/src/source-ui/integrations/index.ts`.

- `IntegrationFormFields(IntegrationFormFieldsProps)`: `mode`, actual controlled `name: TextInputProps`, optional `url: TextInputProps`, `secretsTitle`, rich `secrets` and `app` nodes; optional original `searchEngine: CheckboxProps`, validation/error/holds/actions nodes. It is presentation only, creates no form submit handler/principal/client and performs no write/test. Use original translated copy and actual source secret/app controls in slots, not replacement textareas.
- `IntegrationSecretPresentation(IntegrationSecretPresentationProps)`: all exact accepted P3 `IntegrationSecretCardViewProps`, plus optional `disabled`. Redacted display must omit value; actual authorized public values only. Confirmation callback is Promise<boolean>, never an authority grant.
- `IntegrationCertificateDetails(IntegrationCertificateDetailsProps)`: accepted P3 details props except `onOpenPem`, plus actual already authorized `pem`, `contentTitle`, `closeLabel`. Dates are caller-formatted; no guessed dates/metadata. Opens/copies actual content locally.
- `IntegrationApiKeySettingsLink({ safeHref, label })`: source icon/anchor presentation; caller must independently safety-check href.
- `IntegrationActionHold({ availability })`, `IntegrationActionHolds({ availability: IntegrationActionAvailability[] })`: explicit yellow unavailable feedback, duplicate reasons consolidated.
- Exported types: `IntegrationAction`, `IntegrationActionAvailability` (`{ state: "available" } | { state: "held"; reason: string }`), `IntegrationActionAvailabilityMap` and the above props. `integrationActionHold` is the fail-closed default.

Feature entry: `apps/nitro/src/features/integrations/index.ts` retains all existing named exports and additionally exports source presentation, `IntegrationFormProps`, actual `IntegrationSecretInput`, `IntegrationSecretCard`, `SecretKindsControl`, `SecretDraft` and `IntegrationConnectionError`.

Controller props remain concrete:

- `IntegrationListPage({ initialSearch?, initialPage?, pageSize? })` → `/manage/integrations`.
- `IntegrationCreatePage({ kind?, initialUrl?, initialName?, enableMockIntegration? })` → `/manage/integrations/new`.
- `IntegrationEditPage({ integrationId })` → `/manage/integrations/edit/$id`.
- `IntegrationForm`: discriminated create `{ mode: "create", kind, initialUrl?, initialName?, onCreated, onCancel? }` or edit `{ mode: "edit", integration, onSaved?, onCancel?, formRef?, hideButtons? }`.
- `IntegrationCreateModal`, `IntegrationCompletion`, `IntegrationCatalog`, `IntegrationAccessSettings`, `EmbeddedIntegrationEdit` retain their existing exact props and real-source controllers. No routes were written.

`IntegrationFeatureProviderProps` now additionally requires `navigate(href: string): void` supplied by the real Router owner. It accepts optional `actions: Partial<Record<IntegrationAction, IntegrationActionAvailability>>`. Action names: `create`, `update`, `delete`, `test`, `grants`, `trust`, `uploadCertificate`, `appCreate`. Omitted actions and read-only mode are held visibly; actual callback/client methods still come from the existing concrete client type. Availability is a UI execution hold, NOT a permission, principal, production proof or override of server grants/admin checks. No synthetic authenticated scope is constructed.

Native create/update, stored-test, grant-save, delete, trust/upload and linked-app creation buttons/submit handlers are disabled/guarded by the corresponding hold. Existing admin/create permissions and backend resource authorization remain necessary. Held submit returns false; no green notice, completion, retry-ready state or fake save/test is emitted. Stored testing still requires pristine edit draft. Trust still uses the captured tested hostname and original leaf/root PEM; retry-ready only follows a real successful certificate mutation. Request generations and captured owner-scope cache invalidation remain intact.

## Dependency/API verification

Before new library code, read current `apps/nitro/package.json`, `packages/ui/package.json` and accepted P3 contracts/implementations. All new runtime imports are already declared: React 19.2.7, Mantine core/hooks 9.6.0, Tabler catalog (installed 3.44.0), `@homarr/ui` workspace; existing controllers already declare Common/Definitions/Translation/Validation/Query/oRPC/Zod. No new dependency request or manifest write.

Read installed Mantine 9.6.0 Fieldset, Select, Alert and accepted P3 API bindings. Native Fieldset disabled and current generic Select APIs are confirmed from installed declarations. Context7 is exhausted per authoritative amendment; no network documentation success is claimed.

## Immutable validation evidence and exact blockers

Final copied snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-10-frozen-relvdq6w`.

Copied both owned Integration directories, accepted P3 connections source, root lint config and recursively resolved external dependencies; no symlinks/watch into workspace peers. Checks used explicit Node 24.18.0 and installed oxlint 1.73.0 / TypeScript 7.0.2 with a clean PATH/HOME/NO_COLOR-only environment, no emit or protected cache/output. No `.env`, real credentials, appdata, provider calls, browser, builds, tests, Git or child agents.

- Owned lint: exit 0; 21 TS/TSX files; **0 errors, 6 retained source warnings**. Warnings: original provider status role, inherited array reverse, two translation-rich render callbacks, and two request-generation ref-cleanup warnings. New source-ui files have no lint diagnostics.
- Presentation typecheck: exact single external blocker `packages/ui/src/source-views/connections/app-item-view.tsx:53:11`, TS2322: public P3 barrel's `editLink: ComponentType<ComponentPropsWithRef<"a">>` is not assignable to installed Mantine polymorphic component's inferred ComponentClass. No owned presentation diagnostic. Did not cast, edit shared P3 or hide the error. Coordinator must allocate the AppItem type fix or publish narrow accepted Integration view exports before claiming a clean full graph.
- Full controller types deliberately not evaluated against active security/transport peers: `features/integrations/client.ts` still derives factory types via private API router source imports; those transitively include active lane 28 access/grant helpers and unaccepted private joins. Exact blocking seam is the existing `client.ts` imports of integration/integration-operations/certificates/app/user/group factories. No invented/stubbed client types were substituted.
- Existing controller Query keys remain its prior owner-scoped prefixes, not accepted generated oRPC options. **Do not mount native controllers as accepted Query consumers until lane 02 freezes generated public client/options and the coordinator binds/reconciles their keys/invalidation**. Pure source presentation does not require this join.
- Compared all 22 owned directory files to copied snapshot after checks: unchanged. Aggregate SHA256 over sorted relative paths + NUL + bytes + NUL: `2910ad85e14b2c89dbee419b99beac55aef673d2a8757856caef269d72a2d558`.

## Remaining acceptance boundaries

Lane 01 may immediately mount copied source presentation with visibly labeled disposable synthetic display values under the real Mantine host; no fake principal/client is needed. This lane launches no process and claims no mounted route or production/native proof.

Preserved controller holds still need accepted generated Query transport, authentic session/grants, native certificate policy, real route/search synchronization and final integrated types/runtime/browser proof. Source completion's board recipe/picker join, app icon-search/upload picker and original form-library change/blur validation were already absent from the accepted controller preparation; they are not falsely reported restored here. Source rich inputs, original secret/certificate views and local reset/reveal flows are concrete; whole Integration 1:1 parity is not claimed until those frozen cross-lane joins land.

## Authorized narrow shared-type follow-up

Pre-edit exact inventory: only `packages/ui/src/source-views/connections/app-item-view.tsx` and this handoff. Existing lane10 feature/presentation files and every other P3 file remain frozen. Authority: PLAYABLE-WAVE32 lane10 narrow shared-type appendix. Original mapping remains `apps/nextjs/src/app/[locale]/manage/apps/page.tsx` private `AppItem` lines 137–192, especially original ActionIcon lines 177–186.

Verified existing declared `@mantine/core` catalog dependency and installed 9.6.0 `ActionIcon`, `PolymorphicComponentProps` and `Box` APIs before editing; read `UnstyledButton` implementation before the final correction. The explicit polymorphic generic still distributes the ComponentType union and failed the actual compiler, so it is not the returned fix. No public prop/contracts/barrel/manifests change is allocated.

### Frozen exact correction

Only two source changes in `app-item-view.tsx`: type-only React `ComponentPropsWithRef` import; replace `component={EditLink}` with `component="a"` and supported `renderRoot={(props: ComponentPropsWithRef<"a">) => <EditLink {...props} />}`. No casts, explicit/implicit callback `any`, comments, suppressions, wrapper component or new framework seam. Public `AppItemViewProps`, caller-supplied `editLink`, barrel and all other render bodies remain unchanged.

Installed `Box` calls `renderRoot` with the same final root props it otherwise spreads onto its component: ref, computed className/styles, data attributes, children and remaining anchor props. The callback forwards every one to the same supplied `EditLink`, without picking/renaming/overriding fields or introducing an extra DOM node. `UnstyledButton` emits a button type only for `component === "button"`; both the original custom EditLink component and final anchor selection avoid that branch. Actual root remains the caller's edit anchor; exact href `/manage/apps/edit/${id}`, ARIA label, subtle gray 44px ActionIcon, pencil size18/stroke1.5, ActionIconGroup and optional delete action are unchanged. The callback is local implementation, not a new exported callback prop. This is source/runtime-implementation reasoning for independent review, not browser proof.

### Fresh real-closure checks

Final snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-10-p3-frozen-2hy2jse0`. All eight actual current P3 files, actual root lint config and freshly resolved/copied external packages are included, with no symlinks, workspace/active peer imports or type stubs. External package copies originate from the immediately preceding fresh snapshot `playable-10-p3-type-yet1wm_e`. Node24.18.0, TypeScript7.0.2 and oxlint1.73.0 ran with PATH/HOME/NO_COLOR-only clean environment, no emit/cache/build/test/Git/children.

- Full eight-file P3 lint: **exit0, 0 errors, 0 warnings**.
- Full P3 strict source typecheck: **exit0, no diagnostics**, `strict=true`, `noEmit=true`, normal project `skipLibCheck=true`, ES2023/DOM/DOM.Iterable, Bundler/ESNext and real React declarations. No owned or P3 type stub/suppression was added.
- Extra `skipLibCheck=false` external declaration audit: **exit1, five external-library diagnostics only**: MantineProvider.d.ts lines5–7 cannot resolve three shipped side-effect CSS imports; Mantine hooks use-set.d.ts:1 requires `ReadonlySetLike` absent from the project's ES2023 libs; Tabler declarations:2 import `ReactSVG` absent from installed React19 types. The former P3 ActionIcon TS2322 is gone in this stricter audit too. Those dependency/config blockers are outside this narrow lease; no claim of a clean external declaration audit.
- Source compared after execution to final snapshot: byte-identical. All seven unallocated P3 files also match the earlier accepted snapshot. Existing22 lane10 Integration files still match their returned frozen snapshot and retain aggregate SHA256 `2910ad85e14b2c89dbee419b99beac55aef673d2a8757856caef269d72a2d558`.

App pre-fix SHA256: `4a7a68993abf16ce2d43f6c2ca2ea32e80479240e346f1f5724efb817b506ad4`.

| Actual frozen P3 file               | SHA256                                                             | Follow-up status    |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------- |
| `app-item-view.tsx`                 | `bac50bf2c810ee33187c3b4cd4f0be965cf277a3d19a662b15f765522a5776dd` | Exact allocated fix |
| `certificate-details-view.tsx`      | `d6232498ba80f226f01c6f3e7529f56815cd4511d9e953a4ebbf4e640f196f5e` | Unchanged           |
| `certificate-upload-view.tsx`       | `f23a569774c1f06c72a6f444d3b86ca885e4c2399bd40561015249b564100467` | Unchanged           |
| `contracts.ts`                      | `c0000f47886523923e396a594984d69dfe8214eb8790e1dcf071179350f326d3` | Unchanged           |
| `index.ts`                          | `bbe6c082d8efa06b6d8d58870593bd6eca376cc7d0ee76b0f4ebf1ca0ed27369` | Unchanged           |
| `integration-secret-card-view.tsx`  | `edd182a307ab27b775dc216a7dd6389e5cd5bd2feccbf4dccdbcb0cc7ed63c32` | Unchanged           |
| `integration-secret-kinds-view.tsx` | `5dcde4fb8d0ac11b7c1f9b0e0fbed2d5184515fb5bee6bef0350a4a5076b98b3` | Unchanged           |
| `pem-content-view.tsx`              | `a7ec4886011cddcbb279b5cfd30b40edc91914116afc65876b335ee4a538325d` | Unchanged           |

Aggregate P3 SHA256 over sorted relative paths + NUL + bytes + NUL: `a2fc100f5e91db330de8610a6eb831d162b7957070e6a112bc4178ac7aeba2da`.

The earlier source-presentation ActionIcon blocker is resolved; all separate native/query/production holds remain unchanged. FROZEN for independent behavior review. No work outside this exact shared file and handoff was performed during follow-up.

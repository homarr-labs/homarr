# LC residual — current type closure and missing native joins

**Minimum compiler-graph allocation: three files, at the DB → original Widgets root type edge. Do not extract the suspected editor/UI contracts or repair the four legacy diagnostics. Native Docker rendering/modal ownership remains a separate, genuinely unmounted consumer join.**

Read-only source investigation after SD/ST/W-canonical and helper adoption. The supplied `nitro-convergence-next-1tPGwLQS/nitro.stdout` records App:233 twice, icons-updater:22 and Docker component:119; this report explains a current source path to all four, not a new compiler run. AW6 Auth implementation was not reviewed. Oracle5 mechanical repair scopes remain separate. No commands, tests, runtime/native/SQL execution, data/secrets, product edits or agents were used.

## 1. Concrete residual edge, not a root-barrel assumption

All paths below are repository-relative.

```text
apps/nitro/src/features/widgets-editor/contracts.ts:10
  → packages/api/src/nitro/routers/widgets.ts:32
  → packages/api/src/nitro/routers/-widgets/resources.ts:200–201
      typeof import("@homarr/db/queries").getServerSettingsAsync / getServerSettingByKeyAsync
  → packages/db/queries/index.ts:1 (export * from "./item")
  → packages/db/queries/item.ts:5
      import type { inferSupportedIntegrations } from "../../widgets/src"
  → packages/widgets/src/index.tsx:26–31 (re-export original registry types)
  → packages/widgets/src/registry.ts (all original index and component imports)
  → registry.ts:258 → packages/widgets/src/docker/component.tsx:119
```

From that same Docker component, `:5–6` imports root API types/client:

- `packages/api/src/index.ts:3–4` → `root.ts:13` → `router/app.ts:233`: old DB argument plus old `.sync` access.
- `root.ts:24` → `router/cron-jobs.ts:7` → `@homarr/cron-jobs` → `src/index.ts:2` → `jobs/icons-updater.ts:22`: old zero-resource invocation.
- Original registry import itself reaches Docker `:119`, independently of whether anything actually renders it.

The native query/client assembly is another ingress to the **same** edge: Nitro `query/{types,scope}.ts` → API `nitro/assembly/client.ts` → assembly `index.ts:4` → native Widget factory → resource contract `:200–201`. Native Assistant resources independently import the DB query barrel at `nitro/routers/-assistant/resources.ts:4`; onboard-transition resources do likewise at `:6`. Changing only the two Widget resource references to a narrow DB subpath would leave those ingress points and the actual DB→UI coupling intact.

Canonical definitions also still encounter this edge through their genuine native type dependencies: `widgets/definition.ts:13` → `definition-registry.ts` → e.g. `timetable/definition.ts:4` → published native Widget browser contract → Widget factory → the same DB query barrel. This does **not** mean the canonical registry imports the original registry directly.

Type-only and lazy imports do not remove imported source files from TypeScript's checking graph. No source alias, resolver plugin, include pruning or original-registry deletion is warranted.

## 2. Smallest public type producer/adoption — exact three-file allocation

1. **NEW `packages/definitions/src/widget-integration-contracts.ts`**: export only the required `inferSupportedIntegrations<TKind extends WidgetKind>` type, derived from the existing `WidgetKindWithIntegration` / `WidgetIntegrationKind` domain producer in `./widget-integration-map` and `WidgetKind` in `./widget`. No copied catalog, options schema, component import, acquiring resource, runtime constructor or new library.
2. **`packages/definitions/package.json`**: publish `./widget-integration-contracts` → `./src/widget-integration-contracts.ts` before consumer adoption.
3. **`packages/db/queries/item.ts:5`**: replace only the relative Widgets-root type import with that published Definitions leaf. Preserve the query body, result mapping and existing narrowing; do not add a cast or repair any legacy caller.

The exact required semantics are:

```ts
export type inferSupportedIntegrations<TKind extends WidgetKind> = [
  TKind,
] extends [WidgetKindWithIntegration]
  ? WidgetIntegrationKind<Extract<TKind, WidgetKindWithIntegration>>
  : string;
```

Preserve the **non-distributive** fallback of original `registry.ts:300–304`: an all-supported union yields its actual integration union; a union including a non-integrated widget falls back to `string`, not a partially filtered integration union. Do not replace the existing fallback with `IntegrationKind`, `never`, or a handwritten DTO.

Current source search finds 51 canonical per-kind definition uses of `getWidgetIntegrationConfig`, each naming its own kind, and no per-kind `supportedIntegrations:` declaration overriding that source domain producer. The existing integration-map owns those exact tuples/category-derived unions; other kinds have no supported-integration field. Thus this projection does not need to infer through component loaders or through canonical factories that themselves type-import DB resources. DB already declares Definitions; no DB→Widgets dependency is added. Leave the original registry aliases, all 69 index/component loaders, frozen canonical registry/manifest/definition and every extracted definition unchanged.

This is one common missing edge, not three independent caller fixes. It removes the demonstrated native→DB→legacy-widget path; coordinator must confirm complete graph closure after all reached writers freeze. It does not authorize native activation or assert that a compiler run has passed.

## 3. Suspected contracts refreshed — no speculative extraction allocation

| Suspect                                      | Actual current source evidence                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W editor `contracts.ts:5–6`                  | Published shared definition plus canonical manifest; no old manifest import remains.                                                                                                                                                                                                            |
| ST host/index                                | Host requires `definitionManifest`; index exports the canonical instance producer. Neither imports original manifest/loaders.                                                                                                                                                                   |
| `useForm` type/value                         | `widgets/_inputs/form.ts` → `@homarr/form` plus pure `edit-state.ts` → validation/shared. No old Widget modal import. Keep its real inferred form contract.                                                                                                                                     |
| Settings / UI types                          | Shared definition's Settings creator and UI icon root do not demonstrate a legacy API/Widget registry edge; Settings context is required-input based. No new Settings or icon contract is required to sever the proven leak.                                                                    |
| IntegrationSelect type                       | `widget-integration-select.tsx` includes a UI implementation, but its current imports are Definitions, translation/client and UI Link, not old API or registry. Not the demonstrated failure producer.                                                                                          |
| CustomWorkbench / renderer types             | Code editor has an existing `code-editor-types.ts`; source-view CustomWorkbench has pure `contracts.ts`. Custom JSX renderer reaches interpreter/runtime components, not the original Homarr Widget registry. Public type refinements may be useful later, but are not this closure allocation. |
| Stocks / Weather / PatchMon / select helpers | Native stock resource type uses `definitions/stock-price`; Weather format uses the native Widget output leaf; options uses pure select-contracts, Stats config and ReleasesRepository; PatchMon definition uses the extracted threshold validator. Do not re-open these accepted extractions.   |

## 4. Real missing consumer joins, separate from diagnostic disappearance

Current native `widgets-runtime/index.ts` exports no Docker renderer. `NativeWidgetHost` requires a real `Renderer` and manifest (`host.tsx:37–43`). Searches find no native construction/call site for `createNativeWidgetDefinitionResources` or the canonical manifest and no host mount outside its declaration/export. `BoardCanvasProps.renderItem` is the existing required renderer join (`boards/canvas.tsx:42`, `boards/contracts.ts:87`), not a license to invoke original loaders. The current routes directory contains only public routes and `__root.tsx`; no admitted private Widget host was found.

Bounded allocations, **only after the real supplying owners are frozen/admitted**:

| Missing edge                                           | Exact allocation                                                                                                                                                                                                    | Required genuine join / blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App/Docker namespace factory enrollment                | 2 files: `packages/api/src/nitro/assembly/index.ts`, `assembly/resources.ts`                                                                                                                                        | Current expansion assembly has only integration/widget/customWidget. Enroll actual App/Docker factories and their required resource types; real backend resources/transport admission remain upstream, not synthesized here.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Canonical resource/manifest → private host consumer    | 2 files: NEW `apps/nitro/src/features/widgets-runtime/private-owner.tsx`, existing `widgets-runtime/index.ts`                                                                                                       | A concrete required-input owner consumes ST's resource constructor, creates/disposes the canonical manifest, borrows matching Widget/App/Docker query owners, and passes it with a real Renderer to the host through `BoardItemRenderer`. Upstream must supply actual board/item/query/authority/Bookmark presentation owners and Timetable translations. A new export alone is unmounted preparation; do not invent a private route or release held capabilities.                                                                                                                                                             |
| Native Docker factory → source presentation            | 3 files: NEW `apps/nitro/src/features/widgets-runtime/renderers/docker.tsx`, existing `widgets-runtime/index.ts`, `packages/widgets/package.json`                                                                   | Publish existing direct `docker/native-view`, `common/homarr-data-table`, `common/use-persisted-table-layout` leaves; renderer uses the native Docker factory client (`features/docker/client.ts`), actual generated inventory key/QueryClient and existing Widget query-scope registration/recovery/polling. Supply real action/removal/log, byte formatting, zoom and captured layout owners to DockerView. Avoid broad `rendering/infrastructure.ts` and legacy component. Private-owner tranche supplies this factory to the host; exporting it is not adoption.                                                           |
| Add-to-Homarr operation + modal presentation ownership | 4 files: NEW `apps/nitro/src/features/docker/add-apps-owner.tsx`, existing `features/docker/add-apps.tsx`, existing `packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx`, `apps/nitro/package.json` | The shared direct modal export is already published; use its genuine `capturePresentationOwner` and retain unknown/confirmed/reconcileheld outcomes above disposable content. The target owner must consume actual App `createMany`, originating App cache reconciliation, pending observation, owner capture and outcome labels; route both native Docker entry paths through it instead of a second disposable submit flow. Its supplying through-COMMIT App operation owner is not present in the read sources. Coordinator declares the existing Modals Collection workspace dependency before target public-leaf imports. |

The target `docker/add-apps.tsx` currently exposes optional `onCreate`/`isCurrentOwner` and owns only idle/pending/error state in disposable content; it is **not** evidence of the required retained operation owner. Likewise `AppsFeatureContext` supplies client/principal/query utilities, not an admitted bulk-create/reconciliation owner. Native Docker `queries.ts` uses handwritten feature keys; do not silently treat those as the generated Widget inventory registration or owner protocol.

**Blocked minimum:** authorize the three-file Definitions→DB type-contract tranche, then coordinator rechecks the unchanged complete native roots after Oracle5/AW6 freeze. Independently, the named native renderer/private/modal consumers cannot be called complete until actual upstream owners and a real private mount exist. Leave App:233, icons-updater:22 and Docker component:119 untouched; no false-resource defaults, fake owners, `any`, pruned roots or discarded loaders.

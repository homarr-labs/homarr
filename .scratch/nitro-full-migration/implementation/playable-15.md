# Playable lane 15 — Kubernetes

## Exact write inventory declared before implementation

- `apps/nitro/src/source-ui/kubernetes/configmaps/configmaps-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/ingresses/ingresses-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/namespaces/namespaces-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/nodes/nodes-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/pods/pods-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/secrets/secrets-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/services/services-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/volumes/volumes-table.tsx`
- `apps/nitro/src/source-ui/kubernetes/table-hooks.ts`
- `apps/nitro/src/source-ui/kubernetes/contracts.ts`
- `apps/nitro/src/source-ui/kubernetes/kubernetes-context-selector.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/cluster-dashboard.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/error.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/header-card/header-card.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/header-card/header-icon.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/header-card/header-card.module.css`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/resource-gauge/resource-gauge.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/resource-gauge/resource-icon.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/resource-gauge/resource-gauge.module.css`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/resource-tile/resource-tile.tsx`
- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/resource-tile/resource-tile.module.css`
- `apps/nitro/src/source-ui/kubernetes/presentation.tsx`
- `apps/nitro/src/source-ui/kubernetes/index.ts`
- `apps/nitro/src/features/kubernetes/cluster.tsx`
- `apps/nitro/src/features/kubernetes/inventory.tsx`
- `apps/nitro/src/features/kubernetes/kubernetes.tsx`
- `apps/nitro/src/features/kubernetes/contracts.ts`
- `apps/nitro/src/features/kubernetes/models.ts`
- `apps/nitro/src/features/kubernetes/queries.ts`
- `apps/nitro/src/features/kubernetes/index.ts`
- `.scratch/nitro-full-migration/implementation/playable-15.md`

Source Next files are read-only. No routes, manifests, shared packages, backend or live cluster access. Frozen existing Kubernetes controllers are reused; candidate backend authority remains held. No mutable peer modules will be consumed.

## Dependency requests to 01

Existing declared Mantine 9.6.0, MRT catalog alias 9.0.3, translation, definitions, icons, React, Query and oRPC suffice for presentation. Source `dayjs` relative-time glue will use the existing declared translation formatter instead of introducing an undeclared import. Ensure MRT's existing peer dependencies (`@mantine/dates` 9.6.0, `dayjs` catalog, `clsx` catalog) and `mantine-react-table/styles.css` are present in the isolated preview closure.

04 owns original `/images/kubernetes/{nodes,namespaces,ingresses,services,pods,secrets,configmaps,volumes}.svg` asset copies. Resource tile asset base is injectable; these assets are required for exact source visuals.

Implementation is frozen for 01's immutable 3210 integration. Presentation is reusable now; no route is claimed mounted, no backend binding is accepted, and no cluster operation was executed.

Inventory amendment before the added edits: the pure presentation contracts and the existing models' type-only import are included above. This separates mountable display data from backend-inferred client types so a source-only immutable presentation closure does not consume mutable production database/authentication joins.

## Implemented presentation and original source mapping

Original source root: `apps/nextjs/src/app/[locale]/manage/tools/kubernetes/`. Destination root: `apps/nitro/src/source-ui/kubernetes/`.

| Original relative source                                             | Destination relative source                      | Preserved presentation                                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes/nodes-table.tsx`                                              | Same relative path                               | Ready/NotReady icon badges; CPU/RAM ring gauges and unavailable metrics; OS, pod capacity, architecture, version, age; selection, global search, sorting, copy |
| `namespaces/namespaces-table.tsx`                                    | Same relative path                               | Active/other icon badges, name copy, age, selection/search/sorting; actual string-or-undefined phase remains unasserted                                        |
| `pods/pods-table.tsx`                                                | Same relative path                               | Name, namespace, images, workload type, status, age; row selection, global search, sorting, grouping and initially expanded groups                             |
| `services/services-table.tsx`                                        | Same relative path                               | Name/namespace/IP copy; type; separate multiline ports/target ports; age; selection/search/sorting                                                             |
| `ingresses/ingresses-table.tsx`                                      | Same relative path                               | Class/name/namespace copy; original external host links, arrows and backend service/port detail; age; selection/search/sorting                                 |
| `secrets/secrets-table.tsx`                                          | Same relative path                               | Metadata name/namespace/type copy and age; selection/search/sorting; no values or encoded data                                                                 |
| `configmaps/configmaps-table.tsx`                                    | Same relative path                               | Metadata name/namespace copy and age; selection/search/sorting; no ConfigMap contents                                                                          |
| `volumes/volumes-table.tsx`                                          | Same relative path                               | Claim status, namespace, storage/class, mode, volume name, multiline access modes and age; copy/selection/search/sorting                                       |
| `cluster-dashboard/cluster-dashboard.tsx`                            | Same relative path                               | Original three header cards, capacity gauges, eight image resource tiles, responsive three-column grids, distinct loading/error sections and metrics warning   |
| `cluster-dashboard/header-card/*`                                    | Same relative paths                              | Original icons, gradient icon background, value/label order, RTL layout and original header CSS                                                                |
| `cluster-dashboard/resource-gauge/*`                                 | Same relative paths                              | Original brand color/icons, reserved/used measurements, progress threshold colors, units, RTL measurement ordering and gauge CSS                               |
| `cluster-dashboard/resource-tile/*`                                  | Same relative paths                              | Original image/count/arrow tiles, hover shadow/scale and context-bearing inventory hrefs                                                                       |
| `cluster-dashboard/error.tsx`                                        | Same relative path                               | Original cube-off error presentation and check-logs navigation                                                                                                 |
| `kubernetes-context-selector.tsx`                                    | Same relative path                               | Original configured context selector, translated availability badges, unavailable/degraded warnings and load/retry error presentation                          |
| `kubernetes-query-options.ts`                                        | `features/kubernetes/queries.ts`                 | Resource refetch-on-mount/focus/reconnect and 30-second error polling; contexts retain 30-second probes                                                        |
| `layout.tsx`, `page.tsx`, eight resource `page.tsx` files            | `presentation.tsx`, existing feature controllers | Stack/title composition becomes typed props and callbacks; Next RSC/auth/env/notFound/transport glue is not imported into presentation                         |
| Shared `packages/ui/src/hooks/use-translated-mantine-react-table.ts` | `table-hooks.ts`                                 | Existing localized MRT hook shape with explicit configured-locale lookup, no shared UI/Next barrel consumption                                                 |

All eight original MRT option sets remain: no pagination, no density toggle, no column actions or column filters, selection banner at top, no footer/bottom toolbar, right-positioned global search, xs density, visible search, original search placeholders and autofocus. There are no new Kubernetes mutation, logs/watch, YAML/content-detail or action endpoints: the actual original tools are inventory reads and navigation, not unimplemented administrative actions.

Framework-only adaptations: Next Image becomes a dimensioned `img`; Next Link becomes an anchor plus an optional host navigation callback; CSS mixins become native RTL/hover selectors. Stable cell/stat keys replace random IDs or percentage keys. Relative creation times use the already declared translation formatter with a one-minute clock; unavailable/invalid dates now say `Not reported` instead of the source's `dayjs(undefined)` behavior. This is not a claim of byte-for-byte date wording parity.

## Immediately mountable exports and props

Import from `apps/nitro/src/source-ui/kubernetes/index.ts` for a backend-free display mount:

- `KubernetesPresentation(props: KubernetesPresentationProps)` requires `contexts`, `contextId`, `view`, `displayLabel`, `unavailableReason`, `onContextChange(id)`, `onViewChange(view)`. `snapshot` is optional and explicitly carries its `contextId` plus optional `cluster`, `resourceCounts`, and discriminated `inventory`. Data from a different context or resource is never shown as the selected resource. Missing data is visibly unavailable, not a fabricated empty response. `assetBase` defaults to `/images/kubernetes`.
- The display mount always shows the host's required label/reason and a disabled `Live refresh unavailable` control. It makes no query or cluster call. Synthetic display data must be labeled as synthetic by 01; snapshots establish neither authentication nor availability of native execution.
- `KubernetesInventoryPresentation({ inventory: KubernetesDisplayInventory })` renders the actual resource-specific source table.
- `NodesTable`, `NamespacesTable`, `PodsTable`, `ServicesTable`, `IngressesTable`, `SecretsTable`, `ConfigmapsTable`, `VolumesTable` each accept `{ data }` using the corresponding public definition array. Their `*TableProps` types are exported; namespaces explicitly allow raw `string | undefined` phase.
- `KubernetesContextSelector({ data?, contextId?, error?, retrying?, onContextChange, onRetry? })` is a pure selector. Retry is disabled when no real handler is provided. The host owns URL/history; the live feature's accepted controller retains original `homarr-kubernetes-context` local-storage selection and requested/stored/default/first fallback.
- `ClusterDashboard({ contextId, cluster?, resourceCounts?, clusterLoading?, countsLoading?, clusterError?, countsError?, assetBase?, onResourceNavigate?, onCheckLogs? })` preserves independent source loading/error trees. Navigation callbacks intercept ordinary clicks only; modified clicks retain real anchor behavior.
- `HeaderCard`, `ResourceGauge`, `ResourceTile`, `KubernetesErrorPage` are individually exported. `HeaderCardProps`, `ResourceGaugeProps`, `ResourceTileProps`, context/display inventory/view/data types and `kubernetesViews` are exported.
- `resourceInventoryView(label)` converts the real source label `configmaps` to the existing controller's `configMaps` view; other labels are unchanged.

Providers: real `MantineProvider`, the existing standalone `I18nProvider` with a genuine translation snapshot, and a `QueryClientProvider` are required. MRT localization is loaded through the existing translation configuration and Suspense, not fabricated strings or a peer provider implementation. The presentation mount supplies its own table Suspense boundaries; direct table mounts need a host boundary.

Live mount remains `KubernetesFeature` from `apps/nitro/src/features/kubernetes/index.ts`. Existing `client`, `authorityKey`, requested context and `onContextChange` props remain. Additive props are `view`, `onViewChange`, `assetBase`, and `onCheckLogs`; use the view/callback pair for Router ownership, otherwise local view state works. The injected `authorityKey` is only a Query prefix; this lane creates no principal or authenticated scope. `KubernetesClusterSummary` now requires the actual `contextId` alongside `cluster`; cluster names are not fabricated context identities.

`createKubernetesQueries(client, authorityKey)` now returns the eleven real per-leaf generated option factories: `contexts()`, `cluster(id)`, `counts(id)`, `nodes(id)`, `namespaces(id)`, `pods(id)`, `services(id)`, `ingresses(id)`, `secrets(id)`, `configMaps(id)`, `volumes(id)`. Each uses `createTanstackQueryUtils({ kubernetes: client }, { prefix: authorityKey })`. The former union `.inventory(view, id)` wrapper is replaced by the existing inventory controller's typed leaf dispatch, so canonical generated cache keys hold raw backend output arrays, not transformed discriminator objects. Query cancellation remains the generated transport's signal behavior. Existing error classification/retry, updating and paused-connection feedback remain; unavailable contexts do not execute resource reads.

## Route inventory for 01/03

No route file was written or mounted by this lane. Source route paths and props to bind are:

- `/manage/tools/kubernetes` → cluster view.
- `/manage/tools/kubernetes/nodes`, `/namespaces`, `/pods`, `/services`, `/ingresses`, `/secrets`, `/configmaps`, `/volumes` → matching source tables.
- All resource links retain `?context=<encoded configured contextId>`; context replacement/history and route prefetch belong to the Router host.
- `/manage/tools/logs` is the original error-page target; host callback can route through the accepted navigation bridge after its freeze.
- `contexts` is an existing controller view, not an invented original Next route; its existing metadata table remains available without substituting it for any original resource table.

## Verified dependency surface and requests

Read current app/package declarations before importing. Checked installed Mantine 9.6.0 Card polymorphism, Select value/change signatures and local-storage overloads; installed MRT alias `mantine-react-table-open` 9.0.3 option defaults/types/locales; installed use-intl formatter/clock declarations; React hook types; Query declarations; and oRPC 2.0.0-beta.43 Query utility input/queryOptions/prefix/key declarations. Followed the authoritative installed-docs amendment; no exhausted Context7 request or undeclared direct `dayjs` import.

01: no new direct dependency is required. Include MRT CSS, its actual existing peers and the translation/definition source exports in the isolated closure. Do not mount `KubernetesFeature` against a fabricated client or fake cache authority. The existing backend-derived `KubernetesClient` type still references the frozen candidate factory at `packages/api/src/nitro/routers/kubernetes.ts`; materialize its genuine immutable declaration/source closure before integrated controller typecheck. No package export/manifest/lock was changed here.

04: the eight original Kubernetes SVG assets listed above remain required. This lane did not copy assets outside its ownership.

02/03: bind only after frozen returns. The own feature factory already uses actual generated oRPC options/keys; no mutable browser-client or navigation implementation was imported. Router callbacks are explicit host props, not invented compatibility APIs.

## Validation — exact scope and outcomes

Final copied immutable closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-15-ostj3o55`.

- `owned-final-sha256.json` records all 32 owned source files in the closure, including unchanged helpers. Source/config and installed third-party declaration files were copied physically; no workspace symlink or active peer source graph is checked. Existing installed tool executables were used; no install/build/output/process was created.
- Clean environment for both checks: `env -i`, `HOME` set to the disposable closure, `PATH=/usr/bin:/bin`, explicit Node `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`.
- Final lint: installed oxlint 1.73.0, copied root `.oxlintrc.json`, exactly `apps/nitro/src/source-ui/kubernetes apps/nitro/src/features/kubernetes`. **Exit 0; 29 TS/TSX files; 197 rules; 0 warnings, 0 errors.** The original ingress helper's scoping warning was fixed without changing its behavior.
- Final presentation typecheck: installed TypeScript 7.0.2, `tsc --noEmit --incremental false -p tsconfig.presentation.json`. **Exit 0; no diagnostics.** Strict/Bundler/React JSX configuration with the host's `skipLibCheck`; entry is the pure presentation barrel plus actual copied Vite CSS-module declarations. This checks all 20 source UI TS/TSX files and the actual transitive own `components.tsx`, `errors.ts`, and `models.ts`, plus copied unchanged public definitions/translation/common helpers and installed library declarations. No stubs, fake backend declarations, emit or cache.
- Full live-controller typecheck is **held**, not claimed clean: its existing canonical API type-only factory resolves backend context → `@homarr/db` public barrel → runtime/transaction sources owned by active 26. A fake declaration or active-peer baseline was not substituted. 01 must compile the full controller join only after the actual producer/type closure freezes.
- No tests added/run; no broad lint/type suite, Git, children, backend edits, source Next edits, environment/credential reads, provider/cluster calls, servers, browsers, Docker, CI or production activation. 3210 mounting, assets, interactive/browser proof and final integrated checks belong to 01.

## Frozen return

All enumerated source paths are ready for an immutable copy now. Eight rich source tables, original cluster presentation and a visibly held display-only mount are implemented. Native authority/lifecycle/authentication and live cluster routes remain held exactly as the accepted Kubernetes candidate report records. This return is presentation evidence, not a production/runtime acceptance claim.

## P2 rereview reopening — exact write inventory before edits

- `apps/nitro/src/features/kubernetes/inventory.tsx`
- `apps/nitro/src/features/kubernetes/kubernetes.tsx` — actual existing `onCheckLogs` caller prop forwarding only
- `.scratch/nitro-full-migration/implementation/playable-15.md`

Node/ingress failed reads now render the already ported original translated `KubernetesErrorPage` with the real caller's optional `onCheckLogs`, alongside unchanged classification/retry feedback. `KubernetesFeatureSession` forwards its existing callback to `KubernetesInventoryViewContent`, which passes it through `InventoryTable` to the node/ingress error presentations. `ResourceRead` shows the additional presentation only for a failed query; its existing `KubernetesReadContent` retry/error classification remains unchanged. The other six inventory dispatches and all eight source table files remain unchanged. No navigation, permissions, backend capability, context/namespace controls or synthetic native proof is introduced.

### P2 isolated validation and raw evidence

Fresh physically copied closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-15-p2-8fjuv1xi`. Reused the previous frozen dependency/config/presentation closure and overlaid only the two enumerated caller/controller files. Compared the other 30 owned source files against the previous freeze: **0 differences**, including all eight resource tables and the original error component.

Both checks ran for real with `env -i`, disposable `HOME`, `PATH=/usr/bin:/bin`, explicit Node 24.18.0, installed tools, no emit/incremental cache. Exact argv/exit records are `p2-lint.execution.json` and `p2-presentation-types.execution.json` in that closure.

- Focused oxlint: exactly `features/kubernetes/inventory.tsx` and `features/kubernetes/kubernetes.tsx`, copied root config, **exit 0; 2 files; 197 rules; 0 warnings/errors**.
- Presentation typecheck: `tsc --noEmit --incremental false -p tsconfig.presentation.json`, **exit 0; no diagnostics**. Scope remains the actual pure source-presentation barrel/error component and its transitive copied helpers, not the backend-inferred live-controller join. The earlier full-controller typecheck hold is not cleared by this presentation check.
- Raw unmodified process streams: `p2-lint.stdout.log`, `p2-lint.stderr.log`, `p2-presentation-types.stdout.log`, `p2-presentation-types.stderr.log`. Typecheck stdout/stderr and lint stderr are genuinely empty, not summarized replacement logs.

SHA-256:

| Artifact/source                                     | Hash                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/nitro/src/features/kubernetes/inventory.tsx`  | `d607826218556077ff1be86eb113de8f0528f6df2098d03217560932cf8a8843` |
| `apps/nitro/src/features/kubernetes/kubernetes.tsx` | `ac3cac14f045bd66db59a252aad2f546f76dcccb39e3860d2875d832c9e0b864` |
| `p2-lint.stdout.log`                                | `65d4af47f7eb0a39ae28aad1267b76cc829bfa784f8ca77b09f6d3079da7e5ec` |
| Each empty raw stream above                         | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

`owned-final-sha256.json` records all 32 copied own source hashes. No new dependencies, source table/error-component edits, backend changes, tests, comments, unsafe types, children, Git, runtime/browser or provider/cluster calls. P2 fix is frozen and returned for rereview; synthetic display remains presentation-only and is not native/runtime evidence.

## P2 unavailable Check logs — rereview `ses_ed4720983ffe2Egkm6l7zAKEUL`

Exact reopened write inventory, declared before edits:

- `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/error.tsx`
- `.scratch/nitro-full-migration/implementation/playable-15.md`

Verified the declared and installed `@mantine/core` 9.6.0 Anchor polymorphic declarations and actual implementation before editing. The accepted `packages/ui/src/source-views/connections/certificate-details-view.tsx` uses the existing `Anchor component="button" type="button" onClick={handler}` callback-only pattern. The error component now uses that pattern: the real supplied callback enables the original translated Check logs control, and is attached directly as its handler. An absent callback makes the native button disabled, dimmed and non-underlined, with the explicit `Log navigation unavailable` explanation. No href, form submission, invented router/client, replacement handler or fallback navigation remains. Revised inventory/prop-forwarding files, all eight tables and existing error classification/retry remain unchanged. Native/private/admin holds remain unchanged.

### Unavailable-control isolated validation and raw evidence

Fresh physically copied closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-15-p2-unavailable-fh90_9cp`. Reused only the previous frozen closure and overlaid the single allocated error component. Compared the other **31 owned source files** against the previous P2 freeze: **0 differences**, including the revised inventory/callback forwarder and all eight table trees.

Actual clean-environment commands used `env -i`, disposable `HOME`, `PATH=/usr/bin:/bin`, explicit Node 24.18.0 and installed tools. Full argv/exit records are `p2-unavailable-lint.execution.json` and `p2-unavailable-presentation-types.execution.json` in this closure.

- Focused lint: oxlint with the copied root config and exactly `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/error.tsx`: **exit 0; 1 file; 197 rules; 0 warnings/errors**.
- Presentation types: `tsc --noEmit --incremental false -p tsconfig.presentation.json`: **exit 0; no diagnostics**. This checks the changed error component through the actual presentation barrel and its immutable source/declaration closure; no stubs or mutable peer baseline. It does not establish a live backend/controller or native/admin acceptance.
- Raw process streams are preserved byte-for-byte as `p2-unavailable-lint.stdout.log`, `p2-unavailable-lint.stderr.log`, `p2-unavailable-presentation-types.stdout.log`, `p2-unavailable-presentation-types.stderr.log`. The latter three are genuinely empty.

| Source/evidence                                                   | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/nitro/src/source-ui/kubernetes/cluster-dashboard/error.tsx` | `c2a9364ce634fc987e3d9c1237cbe029f3fe632c25e66fe03adff93d59234ebf` |
| `p2-unavailable-lint.stdout.log`                                  | `c2db262c6679d94db2db5c9620d1e410cb437bb0853c828ff13009db4ed11b33` |
| Each empty raw stream above                                       | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

`owned-final-sha256.json` records all 32 frozen owned source hashes. Only the exact error component and this handoff were edited. No new dependencies, permissions, namespace controls, tests, comments, unsafe types, children, Git, runtime or provider calls. Returned frozen for independent rereview; synthetic display remains non-native, and private/admin/backend holds are not cleared.

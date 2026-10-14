# ST — canonical target adoption frozen

## Exact writes

- `apps/nitro/src/features/widgets-runtime/host.tsx`: requires a supplied `WidgetDefinitionManifest`, passes its cached promise directly to React `use`, and reduces defaults through the canonical manifest leaf. Existing Renderer injection, card/title UI, styles, runtime actions, query ownership, recovery boundaries and integration guard remain unchanged.
- `apps/nitro/src/features/widgets-runtime/index.ts`: exposes canonical `createWidgetDefinitionManifest`, types, `widgetKinds` and default reducer. Removes only the ambient original-manifest `loadWidgetDefinition` export; all existing native renderer exports remain.
- NEW `apps/nitro/src/features/widgets-editor/definition-resources.tsx`: all seven actual `DefinitionResourceBindings`, using the frozen `status: "ready" | "held"` contract. Required source inputs are independent native Widget, App and Docker factory-derived clients, corresponding supplied typed query-scope owners, complete cache identities/currentness assertions, Timetable translations, and captured Bookmark presentation. It never widens `WidgetEditorClient` to invent App or Docker.

## Public leaf needed from coordinator

Add `@homarr/widgets/bookmarks/add-button-view` → `packages/widgets/src/bookmarks/add-button-view.tsx`. This is the only additional public leaf used by ST. The canonical manifest/registry and native Widget/App/Docker router leaves are already declared in the current manifests. No package manifest or private relative package import was added by ST.

## Preserved resource behavior

Generated `queryOptions` come from the genuine supplied scope owner's `acquire(client, identity)` result and use its exact QueryClient. Scope creation therefore retains the existing generated-key, physical-request/currentness and retirement/drain implementation rather than creating kind-only global caches or substitute request functions. ST borrows these scopes; their supplying owners remain responsible for retirement. The supplied canonical manifest owns the definition promise cache and disposal.

- Timetable passes the full source search input unchanged, including query, base URL and item/board identity; its source leaf retains pending/error translation.
- Immich passes the source input/options unchanged: first integration, enabled condition, fifteen-minute staleness and all-photos choice remain in the actual canonical factory.
- Beszel passes the actual systems input/enabled condition; source selection and query matching remain untouched.
- Storage observes one actual generated query per integration in input order. Both bindings use the same owner-bound observation hook; canonical factories retain scoped values, deduplication, some-pending and every-error-with-no-options reductions.
- Bookmarks uses actual native `byIds` and `selectable` outputs, the genuine non-acquiring RK `BookmarkAddButtonView`, and a REQUIRED supplied genuine ItemComponent. Required `useAddButtonPresentation` supplies labels and the real groups editor with a captured presentation owner. Item addition/removal and legacy-URL migration callbacks check captured App/presentation ownership. Source URL resolution, ordering, migration behavior and view styling remain intact; neither original acquiring add-button wrapper nor original index/component is imported.

Missing Widget/App/Docker or Bookmark presentation capability is represented by an explicit required held binding and its supplied reason. No successful empty observation, no-op view, default owner, fabricated authority or zero epoch is installed. Construction captures owner assertions and presentation functions; later mutation does not upgrade held bindings or substitute presentation functions.

## Remaining dependencies and acceptance

Coordinator must publish the above view leaf. Upstream producers must supply genuine admitted native clients and matching query-scope owners/cache identities/currentness, the real Bookmark ItemComponent/group presentation owner and Timetable translations. No claim is made that these private producer inputs are already installed; callers must explicitly hold unavailable capabilities. The host's new manifest prop must be supplied by its real private owner when mounted. This source does not install providers, enroll namespaces in the backend assembly, authorize actions or release runtime/editor/native gates.

`widgets-editor/contracts.ts` remains exclusively W-owned and was not edited. Frozen SD registry/manifest/shared definition, original registry/loaders and separate Docker/source/helper lanes remain untouched.

Ordinary source reads and patches only. No commands, checks, lint, typecheck, tests, builds, browser, runtime, native/SQL execution, installs, real-provider access, credentials, nested agents, staging or commits. Coordinator performs focused validation after writers freeze; no compiler/runtime/procedure acceptance is claimed.

# EXPANSION35 apps frontend source freeze

## Delivered source, not mounted

Only `apps/nitro/src/features/apps/` and this note belong to this contribution. No routes, application providers, host, API implementation, manifests, board/grid/widget editor modules, or legacy source were changed. No active peer feature implementations were consumed.

`index.ts` exposes real React/Mantine management, create/edit forms, app search, and single/multiple selection. `AppsFeatureProvider` accepts an actual native oRPC app client and a current principal; it is feature-local, not an application-provider implementation. No demo records, substitute controllers, tRPC, or Next hooks are used.

| Surface            | Direct native calls                                        |
| ------------------ | ---------------------------------------------------------- |
| Management list    | `app.getPaginated({ search, pageSize, page }, { signal })` |
| Limited search     | `app.search({ query, limit: 10 }, { signal })`             |
| Edit lookup        | `app.byId({ id }, { signal })`                             |
| Bookmark creation  | `app.create(values)`                                       |
| Edit submission    | `app.update({ id, ...values })`                            |
| Confirmed deletion | `app.delete({ id })`                                       |
| Selection          | `app.selectable(undefined, { signal })`                    |

Client types derive from the public `createAppProcedures` factory using `RouterClient`, not handwritten API models. Search has a source limit, not invented pagination. Management uses source total counts, defaults to 10 rows, offers 10/25/50/100 rows, and repairs an out-of-range page after deletion. Selection retains source name/URL filtering, selectable results, creation, and multi-selection without pretending that selection persists board placement.

## Preserved semantics

- Shared `getAppManagementAccess` gates browsing and creation. Create-only users do not issue management-list reads. Editing requires `app-modify-all`; deletion requires `app-full-all`; limited search requires app or board modify-all permission. Selection follows the authenticated `app.selectable` policy.
- `appManageSchema` performs actual shared validation and normalization. Name, description, icon URL, destination URL, and custom ping URL are controlled fields. Disabling the custom ping field clears it. Server failures retain the draft; successful create-another resets only after success. Updates acknowledge the actual void API result rather than synthesizing a returned app.
- Mutation entry points recheck permission/read-only state, prevent double submission, and do not retry automatically. Deletion requires explicit confirmation and prevents dialog dismissal during submission. Leaving a dirty form requires discard confirmation.
- Loading, empty, create-only, filtered-empty, server error, and success states are rendered. Native access errors do not expose server exception text. App links reuse `getSafeAppHref`; custom schemes and blank destinations retain source behavior, with unsafe links omitted.
- Query keys include principal identity and authority revision. The feature provider remounts its subtree when that identity changes. Mutations invalidate this feature's native app keys. Host-wide session cache disposal and cross-feature refresh remain coordinator-owned.
- Existing app/common catalogs are reused through the standalone translation entrypoint. Additional unavailable-state copy and missing field labels must be supplied as localized `AppsUnavailableCopy`, not English demo strings.

## Coordinator dependency return

The inspected `apps/nitro/package.json` declares React, Mantine core/hooks, oRPC client/server, React Query, and Zod, but none of the following workspace edges. The source therefore remains blocked for composition until the coordinator accepts these dependencies. No manifest edits, installs, or copied business algorithms were made here.

| Required edge         | Existing public entrypoint used                            |
| --------------------- | ---------------------------------------------------------- |
| `@homarr/api`         | Type-only `@homarr/api/nitro/routers/app`                  |
| `@homarr/definitions` | Access rules, permission types, invariant technical labels |
| `@homarr/validation`  | `@homarr/validation/app`                                   |
| `@homarr/translation` | `@homarr/translation/standalone/client`                    |
| `@homarr/common`      | `@homarr/common/url`                                       |

The host must supply an admitted native client, the expanded current principal permissions, an authority revision that changes when identity/permissions change, read-only state, React Query/Mantine/standalone i18n providers, and localized unavailable copy. The current public render snapshot contains only session kind, not user permissions; it cannot be treated as this feature's authenticated data source. No account/provider SQL, credentials, environment keys, or current service data were read.

## Explicit unsupported joins

- **Icon library and uploads:** The form accepts the source-supported icon URL and preserves stored URLs. It does not claim parity with `IconPicker`. The existing collection picker depends on tRPC/session/upload hooks and cannot be imported into this native feature. `icon.findIcons` exists in native source, but its factory has no public export in the inspected API manifest; an accepted public type/client export, workspace edge, and admitted icon/media resources are needed. No copied image ranking, URL classification, repository arrangement, upload logic, or placeholder icon catalog was added.
- **Shared form helper:** Existing `AppForm` is tied to Next navigation and legacy client hooks. `@homarr/form` and Mantine form are undeclared here. This contribution uses real controlled fields with the authoritative shared app schema, not a copied validation implementation. Rich icon/form composition remains unsupported.
- **Integration detection:** No detection endpoint or accepted detection/resource join is available in the consumed public app contract. Integration management factories are not exported for this frontend. No name-to-integration guesses, fake connections, or credentials were generated. The form shows the supplied unsupported notice.
- **Health:** App rows do not carry measured health. Native `widget.app.ping` source is outside the exported app client and needs its own accepted public contract/resources. The form shows an unavailable notice instead of green status dots or arbitrary URL probes.
- **Board placement:** The inspected native board router lists `board.addItem` and `board.saveBoard` as pending; the mutation candidate is held behind unaccepted current-authority/atomic mutation admission. `AppSelection` returns actual selected apps only. `BoardAppPlacementUnavailable` exposes the hold. No board mutation, layout calculation, widget option defaults, board provider, or active peer editor was substituted.
- **Favorites:** Source apps are bookmarks/shortcuts created through `app.create`; the app contract has no separate favorite/star mutation. None was invented.

## Narrow three-finding correction freeze

- `search.tsx`: closed the native search result `map` call before the JSX expression closes.
- `app-form.tsx` and `AppEditor`: edit forms now retain an explicit draft and its original baseline. The editor passes the actual current query object and its `dataUpdateCount` together with that query state's app data. A new lookup version updates pristine drafts and their ping-field state before another interaction; dirty drafts keep both their values and original baseline. Restoring a draft to its original baseline permits adoption of the latest lookup. Background lookup errors keep the existing form mounted and its draft intact. No response-object identity, timestamp, optimistic merge, or invented server concurrency revision is used. The native update contract still has no compare-and-swap/conflict-resolution binding.
- `selection.tsx`: each selector owns its query through `useId` plus a monotonically increasing local read version. Successful creation advances that query key, so the replacement read starts after creation instead of reusing an earlier in-flight request. Previous results are explicitly placeholder data only. Created-app fallback entries retire on success of the current non-placeholder read, including a successful read that omits an already-deleted app. Error/cancellation cannot retire entries; later refreshes cannot revive a retired fallback. The query consumes and forwards TanStack's abort signal and checks it before returning, so abandoned read versions cannot publish late successes or errors into the current version. No data identity or wall-clock heuristics are used.

This note was relocated with a patch from `implementation/expansion-app-ui.md` to `scratch/implementation/expansion-app-ui.md`. The five missing workspace edges and every unsupported icon/form/integration/health/board/resource binding above remain held. The changed React/TanStack APIs were inspected in the already-installed declarations and implementation; no network lookup or command was run for this correction. The three fixes are frozen for independent re-review, not claimed tested, typechecked, mounted, or runtime-verified.

## Evidence and verification boundary

Source references: `packages/api/src/nitro/routers/app.ts`, `packages/api/src/nitro/routers/icon.ts`, `packages/api/src/nitro/routers/board.ts`, the board mutation candidate, shared validation/access/catalog files, the legacy management pages, `packages/forms-collection/src/new-app/_form.tsx`, and the legacy app selector/icon picker.

Context7 lookup returned a monthly-quota error. Installed declarations and checked-in source were read instead. No tests, lint, typecheck, build, install, formatter/check commands, browser, listener, Git operation, or nested agent was run. EXPANSION35 common notes were not found by the scoped Markdown search. This is an unvalidated, unmounted source freeze with the above workspace/resource blockers, not a working-route claim.

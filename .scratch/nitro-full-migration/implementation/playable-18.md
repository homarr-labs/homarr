# PLAYABLE-WAVE32 lane18

## Bounded reopening after review ses_ed470bb5fffe3W4g4TzfnhZghf

Exact writes enumerated before correction:

- `apps/nitro/src/features/boards/editor.tsx`
- `apps/nitro/src/source-ui/boards/selection.tsx`
- `.scratch/nitro-full-migration/implementation/playable-18.md`

Frozen for independent rereview. Only the two enumerated source files and this handoff changed; all other39 packet source hashes match the previous freeze.

- **P2 logical placement:** editor selection now stores only ID/type. Before mounting `ElementEditor`, the owner resolves the entry's original layout record by ID and the actual active layout, including its logical parent/coordinates/width/height. Collapsed display placement from either existing menu cannot seed the editor. Options-only application skips `placeBoardElement` and collision reflow, preserving current geometry in every layout; explicit geometry edits still use the existing placement transaction. `container-menu.tsx` and `fixed-grid-item.tsx` remain byte-for-byte frozen.
- **P2 paste authority:** a committed current-runtime ref replaces the captured-permission check. Both preflight and the dispatched updater call actual `getBoardAccess` against current supplied board/identity and check current administrator permission before adding any `customApi`. A pending clipboard read with the same `resourceKey` cannot retain revoked admin permission. Board/layout/resource-key currentness guards and existing owner edit/baseline guards remain; no permission revision, identity or capability is manufactured. Synthetic preview does not bypass the Custom Widget modify/admin requirement.
- **P3 heading compensation:** all six `--mantine-h1-font-size` through `--mantine-h6-font-size` declarations already match the read-only original exactly, including in the prior validated snapshot. Values remain `2.125rem`, `1.625rem`, `1.375rem`, `1.125rem`, `1rem`, `0.875rem`, each multiplied by `var(--board-canvas-ui-scale, 1)`. CSS is unchanged, with no layout/design alteration.
- Selection moves remain all-or-none **in the active layout only**; they are not all-layout moves. Clipboard paste still creates complete placements for every layout. Source grids, currentness, conflict baselines and disabled Save remain intact.

### Correction freeze evidence

New immutable evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane18-board-validation/review-corrections/`.

The closure is a copy of the previous frozen source/dependency snapshot with only `editor.tsx` and `selection.tsx` replaced. No mutable peer body or external dependency was refreshed. Zero snapshot symlinks. Clean environment and previously copied installed tools are retained; typecheck emits nothing and has incremental caching disabled.

- `lint.log`: exit0, **0 warnings / 0 errors on36 packet TypeScript files**,197 rules.
- `typecheck.log`: exit1, **zero owned diagnostics**; its five external `@homarr/node-unifi`/consequent integration diagnostics are exactly equal to the previous raw diagnostic set. These remain a genuine held dependency failure, not a passed typecheck.
- `freeze-hashes.json`: all41 source hashes, two old/new changed hashes,39 unchanged-source confirmation, original heading source hash/declarations, check commands/environment/statuses and zero-symlink evidence.
- Sorted path/NUL/hash/newline packet aggregate: `58df49c3115fa3f99859d021a057a0f6654461aa2dd63a618231c06ed72db1f5`.

| Corrected source                                | SHA-256                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `apps/nitro/src/features/boards/editor.tsx`     | `9ca6c449d743a8d1677331acc108430858978b9ddf0d3dfa7bf972ccbaae6c65` |
| `apps/nitro/src/source-ui/boards/selection.tsx` | `b1c76f79b1cecf9524016bf0e8c3bf55b47e400c79ddafa2e4a626da2414abba` |

No tests, runtime/browser/server execution, builds, installs, Git, children, providers, manifests, root routes or19/20 changes. The reviewed repro was addressed by source correction; no new behavioral/runtime acceptance is claimed. Prior packet evidence below remains historical; this correction section is the current freeze.

## Exact write inventory declared before implementation

- `apps/nitro/src/features/boards/canvas.tsx`
- `apps/nitro/src/features/boards/editor.tsx`
- `apps/nitro/src/features/boards/index.ts`
- `apps/nitro/src/source-ui/boards/index.ts`
- `apps/nitro/src/source-ui/boards/runtime.tsx`
- `apps/nitro/src/source-ui/boards/grid-editor.tsx`
- `apps/nitro/src/source-ui/boards/grid-editor.css`
- `apps/nitro/src/source-ui/boards/grid-editor-registry.tsx`
- `apps/nitro/src/source-ui/boards/grid-entry-memo.ts`
- `apps/nitro/src/source-ui/boards/grid-depth.ts`
- `apps/nitro/src/source-ui/boards/grid-interaction-store.ts`
- `apps/nitro/src/source-ui/boards/grid-preview-layer.tsx`
- `apps/nitro/src/source-ui/boards/grid-preview-geometry.ts`
- `apps/nitro/src/source-ui/boards/grid-resize-outline.ts`
- `apps/nitro/src/source-ui/boards/section-grid.tsx`
- `apps/nitro/src/source-ui/boards/fixed-grid-item.tsx`
- `apps/nitro/src/source-ui/boards/container-section.tsx`
- `apps/nitro/src/source-ui/boards/container-menu.tsx`
- `apps/nitro/src/source-ui/boards/item.module.css`
- `apps/nitro/src/source-ui/boards/board.module.css`
- `apps/nitro/src/source-ui/boards/empty-position.ts`
- `apps/nitro/src/source-ui/boards/create-item.ts`
- `apps/nitro/src/source-ui/boards/section-grid.module.css`
- `apps/nitro/src/source-ui/boards/scaled-board-canvas.tsx`
- `apps/nitro/src/source-ui/boards/scaled-board-canvas.module.css`
- `apps/nitro/src/source-ui/boards/selection.tsx`
- `apps/nitro/src/source-ui/boards/board-selection-toolbar.tsx`
- `apps/nitro/src/source-ui/boards/board-item-clipboard.ts`
- `apps/nitro/src/source-ui/boards/section-collapse-storage.ts`
- `apps/nitro/src/source-ui/boards/unload-guard.ts`
- `apps/nitro/src/source-ui/boards/layout/index.ts`
- `apps/nitro/src/source-ui/boards/layout/constants.ts`
- `apps/nitro/src/source-ui/boards/layout/types.ts`
- `apps/nitro/src/source-ui/boards/layout/geometry.ts`
- `apps/nitro/src/source-ui/boards/layout/reflow.ts`
- `apps/nitro/src/source-ui/boards/layout/semantics.ts`
- `apps/nitro/src/source-ui/boards/dnd/index.ts`
- `apps/nitro/src/source-ui/boards/dnd/types.ts`
- `apps/nitro/src/source-ui/boards/dnd/engine.ts`
- `apps/nitro/src/source-ui/boards/dnd/coordinates.ts`
- `apps/nitro/src/source-ui/boards/dnd/targeting.ts`
- `.scratch/nitro-full-migration/implementation/playable-18.md`

## Immediate declaration request to01

The original editor requires existing source-declared catalog packages `@dnd-kit/abstract`, `@dnd-kit/collision`, `@dnd-kit/dom`, `@dnd-kit/react`, and `clsx` in `apps/nitro/package.json`. Installed dnd-kit packages are `0.5.0`; installed clsx is `2.1.1`. At final inspection Nitro declares dom, react and clsx, but still omits abstract and collision. Lane01 must admit those two direct imports before mounting this candidate. No new library, manifest edit or installation was performed by18. The existing public `@homarr/ui/inline-confirm-action` export is available and used for container removal confirmation.

## Boundaries

Next sources read-only. No root route/provider/manifest/runtime20/editor19 edits. Original widget rendering remains the required `renderItem` seam. Dirty/conflict baselines, column layouts and complete placement snapshots retain the existing controller. Atomic backend writer absent: Save stays visibly disabled and synthetic preview edits remain explicitly nonpersistent.

## Frozen implementation

41 source files plus this handoff. `packages/boards/src/` needed no changes. The earlier prepared pointer canvas is replaced by original-source grid/editor presentation, not a new dashboard or renderer. Existing draft/history, complete placement snapshots, responsive layout controller and widget-editor callback ownership remain intact.

- Original transactional dnd-kit engine: immutable start/preview/commit/cancel, pinned collision reflow, swaps, cross-grid and nested targeting, eight-direction resize handles and continuous resize outline. Logical placement remains separate from collapsed display placement.
- Original scaled logical canvas, grid/portal registry, entry memoization, rail viewport sizing and independent nested column/row fitting. Collapsed ancestors disable descendant editor portals.
- Original selection ActionBar, item details, app icons, copy/paste format and destination menu. Ctrl/Cmd-click toggles selection; native copy/paste events respect text inputs. Paste places complete items across every responsive layout; active-layout-only selection moves fail as a whole when the destination cannot fit them. Removal is local and uses existing undo history. Custom Widget paste requires current modify/admin permission.
- Original container card/labels/collapse geometry and menu tree. Edit and move/resize bind to the existing `ElementEditor` seam; removal binds to `removeBoardContainer`, preserving descendants. Separate original Next modal providers are not imported or claimed composed.
- Anonymous collapse uses original versioned local-storage migration. Authenticated collapse remains explicitly local pending a genuine writer. Synthetic preview skips collapse storage and never manufactures grants or identity.
- Existing dirty/conflict baseline behavior retained. Native beforeunload, captured links and a standalone history guard request explicit discard confirmation. Save is always held; no board/cache/backend persistence call is added.

## Mountable exports and inputs

`apps/nitro/src/features/boards/index.ts` exports `BoardCanvas`, `BoardCanvasProps`, `BoardEditor`, `BoardEditorProps`, existing `BoardWorkspace` and controllers, plus `resolvePinnedGridCollisions`, `getCollapsedDisplayLayout` and `registerBoardUnloadGuard`. A narrow presentation barrel is also available at `apps/nitro/src/source-ui/boards/index.ts` with grid/selection/scale primitives.

Prefer direct `BoardEditor`/`BoardCanvas` mounting for the synthetic feedback route. Required `BoardCanvasProps`: complete typed `board`, active `layout`, measured `canvasWidth`, existing source `resources`, actual caller-supplied `identity`, and real `renderItem`. No fallback widget renderer is supplied. `BoardEditor` selects the layout from `viewportWidth` and adds `initialLayoutId`, `initialEditing` and the existing `renderWidgetEditor` callback. Lane19 owns the workbench and lane20 owns item rendering/acquisition.

Optional seams: `appsClient` for the genuine section app reader, `renderOpenAll` for supplied presentation, and `selectionApps` for supplied accessible app names/icons. Missing app composition is visibly disabled. `onUpdate` is a local immutable board updater; `onEditElement` opens the existing placement/options editor.

`syntheticPreview: true` permits explicitly labeled nonpersistent local edits without fabricating `identity.userId` or effective permissions. Widget `canModify` still comes from actual `getBoardAccess`; admin-only configuration/paste is not bypassed.

Router integration: pass `onNavigate(href)` for confirmed navigation, `onDirtyChange(dirty)` for the host blocker, and `routerOwnsHistoryGuard: true` when Router owns popstate. Programmatic Router transitions must consult the host blocker; they are not intercepted by the document link listener. Width measurement, route search parsing, providers and browser proof remain lane01 composition work.

Route intent remains `/`, `/boards/:name` and validated layout/edit search inputs. No route/root/provider file changed. Existing `BoardWorkspace` reads and hand-built query keys were not modified or accepted as generated Query integration by this lane; lane02/lane01 must bind the frozen real Query contract when composing canonical routes. The synthetic preview can mount `BoardEditor` directly without inventing a successful canonical read.

Use actual source resources from the prior board handoff: common ID/provenance utilities, root/lane definitions, validation schemas, `projectBoardLayout`, safe app URLs and the two newly exported original geometry helpers. No registry, domain schema or authority substitute was added.

## Exact original source mappings

All paths below are read-only specifications, not runtime imports.

| Owned destination under `apps/nitro/src/source-ui/boards/`                                                                                                                                                                                                                                 | Original source                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dnd/index.ts`, `dnd/types.ts`, `dnd/engine.ts`, `dnd/coordinates.ts`, `dnd/targeting.ts`                                                                                                                                                                                                  | Same filenames under `apps/nextjs/src/components/board/sections/grid/dnd/`                                                                                        |
| `layout/index.ts`, `layout/constants.ts`, `layout/types.ts`, `layout/geometry.ts`, `layout/reflow.ts`, `layout/semantics.ts`                                                                                                                                                               | Same filenames under `apps/nextjs/src/components/board/layout/`                                                                                                   |
| `grid-editor.tsx`, `grid-editor.css`, `grid-editor-registry.tsx`, `grid-entry-memo.ts`, `grid-depth.ts`, `grid-interaction-store.ts`, `grid-preview-layer.tsx`, `grid-preview-geometry.ts`, `grid-resize-outline.ts`, `section-grid.tsx`, `section-grid.module.css`, `fixed-grid-item.tsx` | Same filenames under `apps/nextjs/src/components/board/sections/grid/`; board/section hooks and commit binding adapted to the existing local draft                |
| `scaled-board-canvas.tsx`, `scaled-board-canvas.module.css`                                                                                                                                                                                                                                | Same filenames under `apps/nextjs/src/components/board/layout/`                                                                                                   |
| `container-section.tsx`, `item.module.css`, `section-collapse-storage.ts`                                                                                                                                                                                                                  | Same filenames under `apps/nextjs/src/components/board/sections/`                                                                                                 |
| `container-menu.tsx`                                                                                                                                                                                                                                                                       | `apps/nextjs/src/components/board/sections/container/container-menu.tsx`; public `packages/ui/src/components/inline-confirm-action.tsx` reused                    |
| `board-selection-toolbar.tsx`, `board-item-clipboard.ts`                                                                                                                                                                                                                                   | Same filenames under `apps/nextjs/src/components/board/selection/`                                                                                                |
| `selection.tsx`                                                                                                                                                                                                                                                                            | `apps/nextjs/src/components/board/selection/board-selection-context.tsx`, adapted to local draft actions instead of server writes                                 |
| `empty-position.ts`, `create-item.ts`                                                                                                                                                                                                                                                      | `apps/nextjs/src/components/board/items/actions/empty-position.ts` and `create-item.ts`; clipboard placement binds the existing complete board contract           |
| `board.module.css`                                                                                                                                                                                                                                                                         | `apps/nextjs/src/app/[locale]/boards/(content)/_client.module.css`                                                                                                |
| `unload-guard.ts`                                                                                                                                                                                                                                                                          | `apps/nextjs/src/components/manage/unsaved-changes-guard.ts`; original board unload intent in `apps/nextjs/src/app/[locale]/boards/(content)/_header-actions.tsx` |
| `runtime.tsx`, `index.ts`                                                                                                                                                                                                                                                                  | Local binding/barrel for original board/section contexts, source presentation and the existing draft controller                                                   |

Feature changes are confined to `canvas.tsx` composition, `editor.tsx` unload/synthetic/navigation binding, and `index.ts` named helper exports. `draft.ts`, `layout-editor.tsx`, existing API contracts and other feature controllers are unchanged.

## Immutable validation evidence

Disposable evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane18-board-validation/`.

- Copied source/declaration closure; zero snapshot symlinks. Final snapshot incorporates only owned changes plus the existing narrow public inline-confirm component and its declared export. Peer implementation bodies were not refreshed from the mutable checkout.
- Clean subprocess environment contains only `PATH`, disposable `HOME`/`TMPDIR`, and `NO_COLOR`. Installed lint/compiler binaries and compiler standard libraries were copied into disposable `tools/`; Node uses explicit `24.18.0`. No emit, incremental cache, protected output or real environment data.
- Final changed-file lint: `lint-freeze.log`, exit0, **0 warnings / 0 errors on36 TypeScript files** using197 rules. Five CSS files are included in the source freeze, not claimed covered by oxlint.
- Final focused typecheck: `typecheck-freeze.log`, exit1, **zero owned diagnostics**. Five diagnostics remain exclusively in frozen `@homarr/integrations/src/unifi-controller/unifi-controller-integration.ts`: missing `@homarr/node-unifi` on lines16/17 and consequent implicit parameter types on55/189/263. Full typecheck success is not claimed.
- `freeze-hashes.json` records every owned source SHA-256 and original specification hashes. Every owned source equals the validated copy. Sorted owned path/hash aggregate: `2829f3347c0a87502eb37abd6e8b64f52ec5888c0980d281d93c646e8813fc6d`.
- No tests added/run, installations, builds, Docker, deployments, browser sessions, Git operations or child agents. Framework APIs were checked against installed declarations/source; Context7 quota was already exhausted in the earlier board pass.

## Remaining holds

1. Lane01 must admit the two missing direct dnd-kit declarations and compose the original theme/translation/CSS processing, viewport measurement and frozen renderer/editor peers. This candidate is not yet proven mounted on feedback3210.
2. Atomic whole-board writer and current-authority repair remain unavailable. Save stays disabled. Canonical full-board routes remain held; do not activate piecemeal saves or imply synthetic edits are durable.
3. Authenticated collapse persistence is uncomposed. Anonymous browser-storage behavior and all browser interactions still require integrated browser proof.
4. Router programmatic-navigation blocking, identity remounts, stale callback/race handling and responsive behavior require lane01 integrated validation. Native history fallback is not a replacement for Router ownership.
5. Integrated lint/types, runtime/browser/race/restore/restart acceptance remains with the coordinator. Existing external typecheck diagnostics are not hidden, suppressed or repaired by this lane.

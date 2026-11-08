# Homarr widget patterns (audit for Home Assistant rework)

Paths relative to repo root. Read-only audit; nothing modified.

## 1. Size handling

- Grid: `LOGICAL_GRID_CELL_SIZE=200`, `LOGICAL_GRID_GAP=12`, pitch 212 (`apps/nextjs/src/components/board/layout/constants.ts:5-7`).
- Widget `width`/`height` are logical px: `getLogicalTrackSize(n)=n*200+(n-1)*12` (`layout/geometry.ts:6`). 1x1=200, 2x1=412x200, 2x2=412x412.
- `item-content.tsx:109-113` measures via `useDeferredElementSize` (ResizeObserver), falling back to `getLogicalTrackSize`.
- Whole canvas is CSS-`zoom`ed: `scale = availableWidth/logicalWidth` (`scaled-board-canvas.tsx:18-23,196`). Screen cell px ≈ 200*scale (logicalWidth origin not located).
- `calculateBoardUiScale(canvasScale)=1/canvasScale` (`packages/boards/src/scale.ts:1-5`).
- `--board-canvas-ui-scale` / `--board-canvas-inverse-scale` set on canvas (`scaled-board-canvas.tsx:193-194`) and nested grids (`section-grid.tsx:373`).
- `scaled-board-canvas.module.css` rescales `--mantine-spacing-*`, `--mantine-font-size-*`, h1-h6, `--mantine-radius-*` by `var(--board-canvas-ui-scale,1)` → Mantine tokens keep constant visual size.
- Raw px do NOT rescale. Use `zoomCompensatedSize(px)` (`packages/ui/index.ts:32`) and `iconSizes.xs..xl` (`ui/index.ts:17-23`), passed via `style`, not icon `size` prop.
- `displayScale` = `boardCanvasScale` (`item-content.tsx:233`). For screen-px breakpoints multiply `width*displayScale` (releases `component.tsx` ~99-107; uptime-kuma `component.tsx:108-110`; beszel-system-stats ~70-76; thingport `common/rendered-size.ts:13-16`).
- Advanced mode forces scale 1 (focus surface portaled outside zoomed canvas).
- Weather and smart-home use raw logical width/height, no scaling.
- Card inset `--board-grid-item-inset = spacing-xs/2`. `board.opacity` default 100, `board.itemRadius` "lg" (`packages/db/schema/sqlite.ts:289,292`).

### Breakpoints in existing widgets
- Uptime-kuma (`uptime-kuma/layout.ts:1-23`): `compactBreakpoint=230`; narrow w<230, short h<230. advanced→"board"; summaryOnly&&!short→"tile"; narrow&&short→"tile"; short→"strip"; narrow→"column"; else "board". Columns `min(3,floor(width/430))`; tags ≥600. Text width estimate 6.2px/char (small), 8.2 (headline).
- Releases: micro if w<240 or h<230 (`component.tsx:71`); split pane w≥620&&h≥300.
- Weather (`weather/layout.ts:12-17`): roomy ≥500x280, standard ≥280x180, compact ≥160x120, micro below. Advanced dailyColumns 1-4 at 320/480/700.
- Smart-home: `isSmartHomeTiny = width<128 || height<96`; entity-state compact `width<128` (`smart-home/entity-state/component.tsx:104`). Note 1x1 = 200px logical, so these thresholds almost never trigger on-board.
- Thingport library-stats: `singleRow = w>=360 || (h<120 && w>=200)`; nested `container-type:size`, `cqi` units, `clamp(4px,1.5cqi,8px)`.

## 2. Styling conventions

- `WidgetCardShell` (`widget-card-shell.tsx:32-63`): Mantine `Card` p=0, `containerType:"size"`, overflow hidden/auto. `--opacity` from `board.opacity/100`; `--border-color` from `advancedOptions.borderColor`.
- `widget-card-shell.module.css:1-14`: dark bg `rgb(from var(--mantine-color-dark-6) r g b / var(--opacity))`, border dark-4; light white / gray-3. Uses `@mixin dark/light`.
- Inner surfaces: `rgb(from light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6)) r g b / var(--opacity,1))` (thingport library-stats). Weather borders: `--mantine-color-secondaryColor-filled` at `calc(var(--opacity,1)*0.45)`.
- Reference widget = uptime-kuma (`component.module.css`): state via `data-status|tone|layout|columns|size|compact`; `--status-color`/`--status-text-color` vars with `light-dark(green-8, green-6)`; `color-mix(in srgb, var(--mantine-color-text) 5%, transparent)` fills; `mask-image: linear-gradient` scroll-edge fades; `rem()`, `tabular-nums`, weights 600/700; dot 9px, state icon 32px @ .6 opacity; `.overlay` top 4/right 6 z-2 for error indicator.
- Releases `.root`: local vars `--releases-tone`, `--releases-radius`; padding rem(12px) (8px micro); `data-density|layout|narrow|split|kind|edit`.
- `widgets-common.css`: `.hoverable-component`, `.clickable-component`, `.text-flash`, weather animations (all respect `prefers-reduced-motion`).
- Convention: CSS modules + data-attributes for layout/state; Mantine props for simple text/Stack/Group.

## 3. States

- `getUsableWidgetQueryData` (`common/query-state.ts:13-17`): throws on FORBIDDEN or error with `data===undefined`; otherwise returns data (stale kept on refetch error). `isInitialWidgetQueryPending` (`:20`).
- Loading: `WidgetQueryLoadingState` (`query-state-indicator.tsx`) = empty centered `output` + visually-hidden label. No skeletons in widgets.
- Empty: `WidgetEmptyState` (`common/empty-state.tsx`), dimmed sm text, default `widget.common.error.noData`. Uptime-kuma `CenteredState` icon+title+description; beszel `IconServerOff`/`IconQuestionMark` + Select to recover.
- Error / partial: `IntegrationErrorIndicator` (`common/integration-error-indicator.tsx`) takes `{integrationId,integrationName?,error?}[]`; orange `IconAlertTriangle` ActionIcon (28) + tooltip; null if none failed; absolutely positioned top-right over partial data. Routers use `settleIntegrationQueries` with per-integration fallback (`api/router/widgets/uptime-kuma.ts`).
- Thrown errors → `WidgetError` via ErrorBoundary (`item-content.tsx:356-371`) using `definition.errors[trpcCode]` `{icon,message,hideLogsLink}`; reset calls `removeWidgetDataQueries`. `NoIntegrationSelectedError` when integration required but none selected (`:372-379`); `NoIntegrationDataError` (`errors/no-data-integration`).
- Stale: `isFetching` small Loader (releases `:457`); `WidgetRuntimeActions.getDataStatus` → `{updatedAt,hasError,isRefreshing}`.
- Edit mode: content wrapped in `.editModeInertContent` (`inert`, pointer-events none) (`item-content.tsx:380-385`). `isEditMode` still passed; smart-home sets `pointerEvents:none`, `isActionable` requires `!isEditMode`.
- `useWidgetNow(precision)` (`common/use-widget-now.ts`): null on first render (hydration-safe).
- Gap: smart-home entity-state has no skeleton/error indicator; throws when `entityError && entity===undefined`.

## 4. Options UX

- Factory (`options.ts:153-380`): internal, switch, text, anchorNote, multiSelect(searchable), dynamicSelect, dynamicMultiSelect, select(searchable, withPlaceholder, allowDeselect, option icon), integrationSelect, integrationMultiSelect, number, slider, location, timezoneList, dateTimeEventList, multiText, multiReleasesRepositories, app, umami*, statsEntries, customWidget*, sortableItemList. Flags: `defaultValue`, `withDescription`, `skipContextMenu`.
- `optionsBuilder.from(factory=>({...}), { key: { shouldHide(options, integrationKinds) } }, superRefine?)` (`options.ts:408-440`).
- `internal` = widget-saved, hidden state (releases `collapsedSections`, beszel `systemId`).
- `dynamicSelect.useOptions(query, integrationIds, options, itemId?, boardId?)` → `{error?,isPending,isError?,options:{value,label}[]}`; input debounces search 300ms (`_inputs/widget-dynamic-select-input.tsx:32-38`). Example `timetable/index.ts:27-50`.
- `dynamicMultiSelect.useOptions()` → `{data,isPending,isError}`, `maxValues`; keeps selected values missing from data (example `docker/index.ts:36`).
- `integrationSelect.useOptions(integrationIds)` (example `beszel-system-stats/index.ts:40`, `getSystems.useQuery({integrationIds},{enabled:integrationIds.length>0})`).
- `sortableItemList<TItem,TValue>({ItemComponent, AddButton, uniqueIdentifier, useData(values)→{data,isLoading,error}})` (example `bookmarks/index.tsx:64`).
- Custom input registration: factory entry + component in `_inputs/` + line in `_inputs/index.ts` (`mapping satisfies Record<WidgetOptionType, unknown>`). Edit modal: `modals/widget-edit-modal.tsx`.
- Labels from `widget.<kind>.option.<prop>.{label,description,placeholder}` (`option-translation.ts`); select options `label:(t)=>t("widget.<kind>.option.<prop>.option.<value>")`.
- Current smart-home options: entityId, displayName, entityUnit, clickable (free text; candidate for dynamicSelect over entities).

## 5. Data flow

- `clientApi.widget.<router>.<proc>.useQuery(input)`. Definition fields `queryKey`/`queryKeys`, `queryMatcher(query, scope)` (`widgetQueryInputMatches`, `matchesWidgetRuntimeQuery`), `refetchInterval` (s, null=none).
- `packages/widgets/src/refetch-intervals.ts` `widgetQueryRefetchIntervals`: add entry for polling widgets (healthMonitoring 10s, weather 600s/stale 300s).
- `useWidgetRuntimeQueries(ref, [getQueryKey(...)])` (`runtime-hooks.ts:10`) for dynamic queries.
- Saving widget state: `clientApi.widget.options.saveItemOptions.useMutation` guarded by `hasChangeAccess` + optimistic `setOptions` with rollback (beszel, releases).
- Subscription: `subscribeSystemStats.useSubscription(enabled ? input : skipToken,{onData,onError})`, 60-entry buffer, visibility gating (`beszel/_shared/use-live-stats.ts`); server `BoundedAsyncQueue` (`api/router/widgets/bounded-async-queue.ts`, max 4 pending). Candidate for HA state_changed websocket.
- Interaction access: `useIntegrationsWithInteractAccess()` (`@homarr/auth/client`). Spotlight: `useRegisterSpotlightContextActions`. Mutation errors: `showErrorNotification`.
- Mock: `mockWidgetData` (`packages/integrations/src/mock/widget-data.ts:54`); routers branch on `integration.kind==="mock"`. `MockIntegration` already implements `ISmartHomeIntegration`.
- MCP: `.meta({mcp:{enabled:true,description}})` (`api/router/widgets/beszel.ts:25`). Middleware `createManyWidgetIntegrationMiddleware("query","<kind>")`.
- Smart-home files: router `packages/api/src/router/widgets/smart-home.ts`, handler `packages/request-handler/src/smart-home-entity-state.ts`, integration `packages/integrations/src/homeassistant/homeassistant-integration.ts`.

## 6. Advanced / compact mode

- `definition.supportsAdvancedFocus` (`definition.ts:139`) set on most widgets; false for vpn, video, paperless-ngx. Smart-home currently doesn't use a rich advanced layout.
- Board renders hover/shift preview + "open" button (`item-content.tsx:401-428`); card portaled, `displayMode="advanced"` (`:236`), opacity 0.98.
- `getAdvancedFocusRect` (`advanced-focus/geometry.ts`): max(source, min(800x560, viewport−margin)); margin 8px <640 else 16.
- Pattern: `isAdvanced = displayMode==="advanced"`, scale 1, richer layout (uptime "board", releases inbox, media-server search/sort, weather `AdvancedWeather`, system-resources multi-panel ≥960). `deferUntilVisible` (releases).
- Props: `WidgetComponentProps` (`definition.ts:183-194`); definition shape `:111-137`.

## 7. Translations

- `useI18n("widget.<kind>")`; others `"common"`, `"widget.common.error"`, `"widget.common.select"`, `"common.widgetQuery"`.
- Keys in `packages/translation/src/lang/en.json`: `widget.<kind>.{description, option.<prop>.{label,description,option.<v>}, error.*, empty.*, state.*}`. uptimeKuma at ~5137; `smartHome-entityState` ~3055; `smartHome-executeAutomation` ~3092; integration category `smartHomeServer` ~1479.
- `definition.errors` messages: `(t)=>t("widget.<kind>.error.<x>")`. Name via `getWidgetName(kind,t)`.

## 8. New widget kind checklist

1. `packages/definitions/src/widget.ts`: `widgetKinds` (~52), `widgetDefaultSizes` (~83).
2. `packages/definitions/src/widget-name.ts`.
3. `packages/definitions/src/widget-integration-map.ts`: kind list (~111), `widgetIntegrationConfigs` (~178; supportedIntegrations incl. `"mock"`, integrationsRequired, maxIntegrations).
4. `packages/definitions/src/docs/widget-doc-slugs.ts`.
5. `packages/ui/src/widget-icons.ts`.
6. `packages/widgets/src/registry.ts`: type import (~62), definition loader (~124), `WidgetImports` type (~193), component loader (~269).
7. `packages/widgets/src/<kind>/index.ts` (`createWidgetDefinition(...).withDynamicImport`), `component.tsx`, css module.
8. `packages/widgets/src/refetch-intervals.ts` if polling.
9. `packages/translation/src/lang/en.json` (`widget.<kind>` + name/description).
10. `packages/api/src/router/widgets/<x>.ts` + `index.ts` (lazy router ~21-42); optional `.meta({mcp})`.
11. `packages/request-handler/src/<x>.ts` for cached handlers.
12. `packages/integrations/src/mock/widget-data.ts` + mock integration interface.
13. Seed demo board `packages/db/migrations/seed.ts` (~841 pattern, options ~852-896).
14. Docs only if user-critical: `apps/docs/docs/widgets/<slug>/index.mdx` + `index.ts` (existing: smart-home-entity-state, smart-home-execute-automation).
15. Optional: `packages/integrations/src/stats/existing.ts`, `packages/integrations/src/base/creator.ts`.

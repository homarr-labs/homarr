---
name: Widget Refresh Indicator
overview: "Add a board-header refresh indicator for widget/server-state queries using TanStack Query as the shared state source, then continue the PR #5768 pattern by removing widget-level blocking spinners where needed."
todos:
  - id: switch-branch
    content: After approval, switch the workspace to `agent/cebd0dad` and confirm the PR diff is present.
    status: completed
  - id: cache-hook
    content: Create a TanStack Query cache-inspection hook that returns refresh counts and normalized query status rows.
    status: completed
  - id: header-ui
    content: Add the hoverable orange/green header indicator immediately before the board edit button.
    status: completed
  - id: calendar-cleanup
    content: Reconcile the calendar widget PR change with the new global indicator, removing redundant widget-local loading UI if appropriate.
    status: completed
  - id: verify
    content: Run targeted typechecks and manually validate refresh, completion, hover details, and beep behavior.
    status: completed
isProject: false
---

# Widget Refresh Indicator Plan

## Findings
- PR [#5768](https://github.com/homarr-labs/homarr/pull/5768) is on `agent/cebd0dad` and currently only changes [packages/widgets/src/calendar/component.tsx](packages/widgets/src/calendar/component.tsx): `useSuspenseQuery` became `useQuery`, with a small widget-local loader.
- The current workspace is on `feat/add-integration-from-dashboard`, so implementation should first move to `agent/cebd0dad` after approval.
- Homarr already uses Jotai for small client UI state in [apps/nextjs/src/components/layout/header/burger.tsx](apps/nextjs/src/components/layout/header/burger.tsx), but there is no Zustand pattern. For this feature, TanStack Query itself should be the shared store.
- The client `QueryClient` lives in [apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx](apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx). TanStack Query v5 supports `useIsFetching()` for a global fetching count and `queryClient.getQueryCache().subscribe()` / `findAll()` for cache inspection.
- The board header actions are in [apps/nextjs/src/app/[locale]/boards/(content)/_header-actions.tsx](apps/nextjs/src/app/[locale]/boards/(content)/_header-actions.tsx); the indicator should be inserted immediately before `<EditModeMenu />`, which places it to the left of the edit button.

## Implementation Approach
- Add a small client hook/component, likely [apps/nextjs/src/components/layout/header/query-refresh-indicator.tsx](apps/nextjs/src/components/layout/header/query-refresh-indicator.tsx), that reads from `useQueryClient()` and subscribes to the query cache.
- Derive a normalized list from cached queries: query path/key, fetching status, `status`, `dataUpdatedAt`, stale state via the query object, error state, and integration IDs found in query inputs/data where present.
- Count active refreshes with `fetchStatus === "fetching"`, using a `useIsFetching()` value as a cheap re-render trigger and cache subscription for details.
- Render a Mantine `HeaderButton`/`ActionIcon` with a tiny `Indicator`: orange while one or more relevant queries are fetching, green briefly after a refresh batch completes, then idle/disabled when nothing is active.
- Use a Mantine `HoverCard` for the details: overall status, number of refreshing queries, last updated/stale state, and a compact list of current integration/widget query entries.
- Add a small Web Audio beep when the indicator transitions from fetching to complete. It should be best-effort and fail silently if the browser blocks audio before user interaction.
- Add translation keys only to [packages/translation/src/lang/en.json](packages/translation/src/lang/en.json); other locales fall back to English through the existing merge in [packages/translation/src/request.ts](packages/translation/src/request.ts).

## Widget Migration Scope
- Keep PR #5768’s calendar behavior, but remove the widget-local loader if the header indicator fully replaces it.
- Do not attempt to convert all `useSuspenseQuery` widgets in the same pass unless the branch goal expands. The first version can show global activity for all query cache entries, while follow-up widget migrations replace blocking `useSuspenseQuery` with `useQuery` where each widget can render meaningful stale/empty content.

## Verification
- Run a targeted typecheck such as `pnpm -F nextjs typecheck` and `pnpm -F widgets typecheck` after implementation.
- Skip lint cleanup unless explicitly requested, matching your preference to ignore linter errors.
# E3 — frozen ordinary canonical definitions

## Exact source changes

Each row adds only `packages/widgets/src/<module>/definition.ts` and adapts that module's existing `index.ts`.

| Module                            | Exact literal kind         |
| --------------------------------- | -------------------------- |
| downloads                         | downloads                  |
| media-requests/list               | mediaRequests-requestList  |
| media-requests/stats              | mediaRequests-requestStats |
| media-missing                     | mediaMissing               |
| network-controller/summary        | networkControllerSummary   |
| network-controller/network-status | networkControllerStatus    |
| rssFeed                           | rssFeed                    |
| bazarr                            | bazarr                     |
| indexer-manager                   | indexerManager             |

The original configuration bodies and local option constants are extracted without reductions. Each leaf exports raw `definition` with its literal `kind` and `satisfies WidgetDefinition & { kind: <literal> }`; option creator signatures and return inference are not widened. Existing indexes pass this canonical object to the original `createWidgetDefinition` and retain the exact `() => import("./component")` loader and original exported names. The existing RSS standards comment stays in its original index.

Preserved behavior includes downloads column/sort tuples, defaults, validators, category-specific visibility and query input matching; request-list statuses/fallback/recent-days matching; genuine media-search actions; media-missing runtime-query matching; network-controller null refetch intervals and error translations; RSS query inputs, validators/defaults and BAD_GATEWAY handling; all Bazarr switches and errors; and indexer interaction permission/edit-mode/action-availability checks plus the genuine runtime action invocation.

Media-request leaves import the same original `openMediaRequestSearch` implementation through the existing public `@homarr/spotlight/open` export. The root Spotlight barrel also exports `SpotlightProvider` from `src/modes/home/context.tsx`; the existing direct entrypoint avoids that presentation edge without replacing the action or editing Spotlight. Downloads retains `./helpers` for its canonical accessor tuple; that helper has only an integration type import and no component acquisition.

Bookmarks, all components/helpers, original registry/manifest, shared `definition.ts`, package declarations and every unallocated source file remain untouched. No extra source write allocation is needed for E3.

## Remaining required dependencies and acceptance boundary

- Shared assembly must provide the approved exhaustive canonical registry/manifest and change shared option inference away from original `WidgetImports`. At the ordinary source read, `packages/widgets/src/definition.ts` still imported the original registry and derived `WidgetOptionsRecordOf` from it. E3 does not claim transitive compiler closure while that shared adoption remains outstanding.
- These leaves keep the existing options builder, query-matching helpers, integration metadata and genuine action implementations. No observations, native resource owners, permissions or successful outcomes were fabricated; these nine configurations require no new observation factory.
- Native target adoption and resource-dependent kinds remain their separate owners' work. Extraction does not activate target renderers or release Widget0/9.

All E3 writes are frozen. Verification consists only of ordinary source reads before and after extraction; no commands, lint, typecheck, tests, builds or runtime/procedure execution were performed. Coordinator acceptance checks remain required; compiler/runtime/procedure acceptance is not claimed.

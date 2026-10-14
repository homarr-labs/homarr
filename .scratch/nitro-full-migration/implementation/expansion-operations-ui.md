# EXPANSION35: operations frontend

## Scope

Added only `apps/nitro/src/features/operations/` and this report. No root provider, route, manifest, API, job runtime, Core, legacy, or global-tools file is part of this implementation. The global-tools peer owns chrome, not the log panel. No backing under concurrent development is imported into the browser feature.

`index.ts` exports actual React/Mantine task and log panels plus their typed host inputs. A host must supply the authenticated principal, authority key, read-only flag, direct oRPC client, and the existing locale/theme context. The logs panel additionally requires the source-configured default level; it does not read server environment data. No route or provider integration is claimed.

## Frozen contracts

The client is derived with `RouterClient` and explicit `Pick` from the existing native procedure factories. Inputs, outputs, job names, status events, and log events are inferred, not recreated or widened.

| Source leaf                         | Consumer                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `cronJobs.getJobs`                  | Visible job registry/configuration, manual refresh, confirmed configuration refetch |
| `cronJobs.subscribeToStatusUpdates` | Real iterator, latest delivered status by name                                      |
| `cronJobs.triggerJob`               | Manual execution                                                                    |
| `cronJobs.startJob`                 | Optional scheduler controls                                                         |
| `cronJobs.stopJob`                  | Optional scheduler controls                                                         |
| `cronJobs.updateJobInterval`        | Source preset selection                                                             |
| `cronJobs.disableJob`               | Persisted disabling                                                                 |
| `cronJobs.enableJob`                | Persisted enabling                                                                  |
| `log.subscribe`                     | Real history/message iterator                                                       |

This is eight cron leaves and one log leaf, not eleven new contracts. No history query, event-source endpoint, status snapshot query, or invented payload field was added. Existing source-entry bounds are unaffected.

## Exact source flows retained

Sources inspected: `apps/nextjs/src/app/[locale]/manage/tools/tasks/_components/tasks-table.tsx`, the corresponding tasks page, and `apps/nextjs/src/app/[locale]/manage/tools/logs/{page,terminal,log-context,level-selection,font-size-slider}.tsx`.

### Tasks

- Source `admin` permission gates mounting and calls. Read-only mode prevents actions, not reads.
- `getJobs` remains the authoritative visible registry. Its backend filters hidden jobs. Stream events never manufacture configuration rows or reveal hidden jobs in the table.
- The fourteen source cron presets and their existing translated labels are retained. Selection immediately submits the source `{ name, cron }` input. Unknown persisted expressions can be displayed, but the UI does not invent a custom cron parser or accept additional expressions. Preset membership is checked locally; the frozen backend remains responsible for scheduler validation before persistence.
- `preventCustomInterval` hides the interval control. `preventManualExecution` hides manual execution. A delivered running status disables manual execution.
- Per-job locks prevent duplicate submissions before React rerenders. Pending controls, translated success/error feedback, refresh errors, and backend validation messages are rendered. Focus is restored to the original or replacement control after pending ends, without the source's retry timers or stealing a new focus target. Enable, disable, and interval changes refetch confirmed configuration. No optimistic enabled, cron, running, or completion result is manufactured.
- Disabled, running, idle, prior execution error, and last execution timestamp retain the source meanings. Missing status is not fabricated as idle.
- Optional start/stop controls are off by default, preserving the source table. They call the existing scheduler leaves, not enable/disable aliases. Stopping a schedule is not represented as cancelling a running job or persisting a disabled configuration.
- Source search, translations, and relative last-execution display remain. Mantine `Table` replaces the unlisted table dependency without adding a package.

### Logs

- Source `other-view-logs` permission is required explicitly; admin is not assumed to imply it.
- Like the source terminal, the subscription requests all four source levels once. The selected threshold displays the prefix of `error`, `warn`, `info`, `debug`; both received history and subsequent messages pass through the same display filter. Level changes do not reconnect or erase retained levels.
- A `history` event replaces the bounded client mirror; a `message` event appends. The source 5,000-entry bound is retained. Arrival/storage order remains oldest-first as delivered, without timestamp sorting, reversal, fake initial history, or synthetic events.
- Rendering consumes the actual structured `id`, `timestamp`, `level`, and `message` fields. Message text is escaped by React, displayed as multiline text, and stripped of terminal CSI decoration. No HTML execution or invented structured payload is introduced. No log payload is persisted to browser storage.
- The source focus timestamp validation, insertion position, and expired-history marker are retained. Both marker strings come from existing translations.
- The source `homarr-log-font-size` preference, 14px default, and 10–24px range remain, with storage-denial handling and an accessible slider. Scrolling follows live messages when already at the bottom; inspection can scroll away.
- The log panel is a bounded, keyboard-scrollable React/Mantine surface, not a placeholder shell or a fake xterm/event stream.

## Subscription and cancellation boundary

`stream.ts` passes an `AbortSignal` into the actual typed client call and uses installed oRPC `consumeAsyncIterator`. Its cancellation callback calls the resolved iterator's `return`, including when acquisition completes after teardown. Cancellation is joined through a single stored disposal promise; optional cleanup reporting receives failures. Late callbacks cannot update a disposed scope.

Private client mirrors are cleared on reconnect, completion, error, and unmount. Authority, user, permissions, and read-only changes remount the feature scope. Authorization errors render denial rather than retained log/status payloads. A cron status authorization error also aborts configuration/action work and clears its state. Configuration reads use a scope identity and monotonic read token so stale responses do not overwrite a newer refresh.

The backend listener-first snapshot and source coalescing mechanisms are deliberately untouched:

- `packages/cron-job-status/src/runtime.ts` registers the backing listener before snapshot reads, compares source revisions, and coalesces latest records by name before delivery. The frontend only reduces delivered status values and does not reconstruct revisions or query private snapshots.
- `packages/core/src/infrastructure/logs/runtime/log-history-stream.ts` registers before replay, retains source level filtering, overlap-ID deduplication, bounded queues, and oldest-first replay. The browser does not replace any of those guarantees with a separate history request.
- The existing native iterator helpers own procedure/request disposal and backing leases. No new physical listener or backing implementation was wired here.

## Explicitly missing joins

These files are frontend consumers of frozen contracts, not evidence that the production backend joins are complete. Physical private-publication authorization, production SQL persistence/configuration adapters, real status/log backing ownership, source publication connections, transport-to-request disposal, and complete application shutdown/lifetime joins remain with their owning peers. End-to-end cancellation and absence of private publication races have not been exercised. Existing Core/source semantics are not certification of those production joins.

The host still needs to mount the panels with its real direct client and authority context. No fake client, history store, event stream, timed demo, provider installation, or production-readiness claim bridges a missing join.

## Dependency/documentation evidence and validation limits

Read `apps/nitro/package.json`: React 19.2.7, Mantine 9.6.0, and oRPC 2.0.0-beta.43 are already dependencies. Installed oRPC iterator implementation/declarations and Mantine table/slider declarations were inspected. Context7 lookup was attempted and quota-blocked; official [oRPC iterator documentation](https://orpc.dev/docs/client/event-iterator), [React effect cleanup documentation](https://react.dev/reference/react/useEffect), and [Mantine table documentation](https://mantine.dev/core/table/) were consulted instead, with installed declarations used for the pinned API surface.

Per EXPANSION35 constraints: no check commands, new tests, browser, install, build, live SQL, provider/environment data reads, service/listener startup, Git operation, or nested agent was used. No executed lint/typecheck/test result is claimed.

## Narrow P2 source fix: focused log scrolling

The reviewer identified that the log scroll effect repositioned to the focus marker on every appended message, including after manual scrolling had disabled following. The focused change is confined to `apps/nitro/src/features/operations/logs-panel.tsx`; this original handoff was moved by patch from `implementation/expansion-operations-ui.md` to `scratch/implementation/expansion-operations-ui.md`, preserving the earlier evidence above.

The panel now tracks whether the requested timestamp has been positioned in the current subscription epoch. A focus change or new iterator acquisition resets positioning; authority/context remounts reset the local ref naturally. Initial positioning waits until retained source messages reach the requested timestamp and the marker exists. Empty/loading payloads and a timestamp not yet reached leave positioning pending, so subsequent source deliveries retry rather than treating a placeholder marker as a successful position.

Once positioned, appends no longer force a marker jump. The existing `following` flag controls subsequent scrolling: manual scrolling away remains respected, while following at the bottom and the no-focus path keep their existing behavior. Marker placement/text, terminal layout, source order, retention, level filtering, API contracts, and iterator cancellation ownership are unchanged. No backend, host, peer, shared route, manifest, status, or log-store file was changed for this correction.

Freeze for independent rereview: one focused log-scroll fix and this owned handoff only. Production, private-publication, physical ACK, graph, and mount holds remain unchanged; this correction provides no new evidence that those joins are complete. No commands, lint/typecheck/build/test, install, formatting command, browser, network, runtime SQL, provider/environment/key/data access, listener startup, Git operation, new test, or nested agent was used for this follow-up. Validation is source inspection only, not an executed-check or production-readiness claim.

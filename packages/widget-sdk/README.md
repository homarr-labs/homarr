# Homarr Widget SDK 1

The SDK is the shared host contract for trusted dashboard packages and native widgets. A package exports React components for its tile, optional advanced view, and optional configuration view. Server handlers run in an owner-trusted child process with Homarr-level access. The worker provides cancellation and process isolation; it is not a security sandbox.

Import client hooks from `@homarr/widget-sdk`, server helpers from `@homarr/widget-sdk/server`, and shared transport types from `@homarr/widget-sdk/shared`. React, React DOM, Mantine, Tabler, TanStack Query, and the SDK resolve to the host's existing modules. Package dependencies are compiled locally; never load another React copy from a CDN.

## Client contract

| Export                                                              | Purpose                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWidgetHost()`                                                   | Board/item/installation identity, actor, locale, timezone, theme, reduced motion, edit/preview state, visibility, compact/advanced mode, logical dimensions, display scale and visible dimensions.                      |
| `useWidgetOptions<T>()`                                             | The active placement's options after applying installation defaults and migrations.                                                                                                                                     |
| `useWidgetQuery<T>(name, input, options)`                           | Authorized server query with cancellation, shared query cache, optional polling, visibility suspension and transient stale-data retention. Authorization failures hide cached data.                                     |
| `useWidgetAction<TOutput, TInput>(name)`                            | Authorized server mutation. Successful mutations invalidate this widget's queries. Actions are disabled during board editing; the preview transport simulates actions unless the owner enables live actions.            |
| `useWidgetSubscription<T>(name, input, { enabled, maximumEvents })` | A bounded event buffer with `data`, `events`, `error`, `connected`, and `reconnect()`. The stream unsubscribes when hidden, replaced, or unmounted.                                                                     |
| `useWidgetState<T>(key, initial)`                                   | Transient instance state shared across tile, advanced and configuration surfaces. Use for selected rows, filters, chart windows, form drafts and zoom positions.                                                        |
| `useWidgetStorage<T>(scope, key, initial)`                          | Managed `user`, `instance`, or `installation` JSON storage. Returns query status, `data`, `set(value)`, `saving` and `saveError`. The server enforces the actor's storage rights.                                       |
| `useWidgetCommands(commands)`                                       | Named command descriptors registered with Homarr's tile context menu and command palette. Each descriptor has `id`, `label`, `run`, optional description/disabled/hidden/destructive metadata.                          |
| `useWidgetClock(intervalMs)`                                        | A real-time clock that pauses updates while hidden and catches up on return. Returns `null` before the first client tick.                                                                                               |
| `useWidgetServices()`                                               | Host notifications, navigation, `openAdvanced()`/`closeAdvanced()` for native focus, detail modal, confirmation modal, and `updateOptions(options)`. The configuration preview reports option changes to the workbench. |
| `WidgetScope`                                                       | Compose components with isolated state, query caches, managed storage keys and command IDs. `handlerPrefix` maps each component's handler names to the composed server manifest.                                        |

React `useState` belongs to a rendered component and resets when the surface component is replaced. SDK state lives in the placement host and survives tile/advanced switches. It also survives package updates using the same SDK and configuration schema version. Server query/event caches remain revision-specific. Use managed storage when data must survive a reload or be shared with other viewers.

`useWidgetQuery` accepts `{ enabled, refetchInterval, staleTime }`; all durations are milliseconds. No polling occurs unless requested. The native widget Refresh command refreshes active SDK queries. Package lifecycle events deliver activation, connection changes, disablement and storage invalidation across viewers without polling the package definition. Transport permissions remain authoritative even when a UI hides or disables a control.

A source-free package needs no connections, handlers or server file. Clocks, calculators, SVG compositions and browser-local tools can render directly. Host-managed persistence still calls Homarr's storage API; it requires no external service.

## Server contract

```ts
import { defineWidgetServer, fetchWidgetConnection } from "@homarr/widget-sdk/server";

export default defineWidgetServer({
  status: async (_input, context) => {
    const response = await fetchWidgetConnection(context, {
      connection: "service",
      path: "/api/status",
    });
    if (!response.ok) throw new Error(`Service returned HTTP ${response.status}`);
    return response.data;
  },
});
```

Declare each handler in `manifest.handlers` as a query, action, subscription, or migration. Query handlers require view access by default; actions default to modify and migrations to full access. Anonymous access also requires the package's explicit handler opt-in and an owner-managed local guest grant. A handler receives `context.signal`, `instanceId`, `boardId`, optional `userId`, and `sdk.invoke(operation, input)`.

| Helper                                                                                                    | Result                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchWidgetConnection<T>(context, {connection, path?, method?, query?, headers?, body?, responseType?})` | `{data, ok, status, contentType, durationMs, updatedAt}`. Response type can be JSON, text, or base64. Bound credentials, local DNS, TLS policy, timeout and response bounds remain server-side.                                                                                                      |
| `getWidgetConnection<TSettings>(context, {connection, serviceType?})`                                     | `{configuration, secrets}` for server adapters using SQLite, MQTT, SSH, database drivers, local files or another native protocol. Service settings are typed with `TSettings`; an optional `serviceType` asserts the expected connection type. Never return this object to a browser handler result. |
| `getWidgetServerContext<TOptions>(context)`                                                               | `{options, installationId, bindingNames, isPreview}`. Use placement options for server-only filesystem paths and request configuration, and binding names for optional configured sources.                                                                                                           |
| `callWidgetIntegration<T>(context, {connection, capability, input?})`                                     | Versioned native adapter result. Reuses Homarr's normalization, integration credentials, caching and native query/interact authorization.                                                                                                                                                            |
| `subscribeWidgetIntegration<T>(context, {connection, capability, input?})`                                | Async generator that releases the native subscription when cancelled or completed.                                                                                                                                                                                                                   |
| `callWidgetRunner<T>(context, {connection, handler, input?})`                                             | Runs a handler on an owner-configured remote runner through a named HTTP connection.                                                                                                                                                                                                                 |
| `subscribeWidgetRunner<T>(context, {connection, handler, input?})`                                        | Bounded remote-runner subscription with cancellation. Remote packages use their own environment and do not inherit a Homarr SDK backchannel.                                                                                                                                                         |

`fetchWidgetConnection` returns non-2xx responses for the author to inspect. Network, TLS, timeout and parsing errors reject. Relative paths resolve against the configured base URL; a leading `/` addresses the origin root. Different origins require separate named connections. Private LAN, Docker service names and loopback addresses resolve from the Homarr process/container. A browser URL is distinct from that server address.

Trusted server code can import Node modules, read mounted files, use child processes and execute installed dependencies. Only the owner should install reviewed packages. Secrets may be read through the trusted server bridge and must not be returned to the browser or included in shared source. Queries should remain observational; keep state changes in declared actions so previews and guest policy can handle them correctly. Honor `context.signal` and release resources in `finally` for long-running work.

## Native capabilities v1

| Capability                                                            | Kind and input                                  | Result                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beszel.systems`                                                      | Query, `{}`                                     | `{data: BeszelSystemRow[], timestamp}` with normalized CPU/memory/disk percentages, byte rates, uptime, hostname, agent and hardware metadata.                                                    |
| `beszel.stats`                                                        | Query, `{systemId, timePeriod, includeDocker?}` | `{data:{systemStats,containerStats}, timestamp}`. Periods: `1m`, `1h`, `12h`, `24h`, `1w`, `30d`. Native Beszel history records retain their source units; the reference demonstrates conversion. |
| `beszel.containers`                                                   | Query, `{systemId}`                             | Native container inventory.                                                                                                                                                                       |
| `beszel.alerts`                                                       | Query, `{includeHistory?, maxHistoryItems?}`    | `{data:{alerts,history}, timestamp}`.                                                                                                                                                             |
| `beszel.live`                                                         | Subscription, `{systemId}`                      | Native live metric events.                                                                                                                                                                        |
| `downloads.queue`                                                     | Query, `{limit?}`                               | `{data:{status,items}, timestamp}` for any native download-client integration. Item progress is `0..1`, speed is bytes/s and time is milliseconds.                                                |
| `downloads.pause`, `downloads.resume`                                 | Action, `{}`                                    | `{ok:true}` after native queue control and cache invalidation.                                                                                                                                    |
| `downloads.pauseItem`, `downloads.resumeItem`, `downloads.deleteItem` | Action, `{item, fromDisk?}`                     | `{ok:true}`. Pass the actual normalized item; deleting downloaded files requires explicit `fromDisk:true`.                                                                                        |
| `media.sessions`                                                      | Query, `{showOnlyPlaying?}`                     | `{data:StreamSession[], timestamp}`, including playback position/duration and available transcoding metadata.                                                                                     |
| `sonarr.calendar`                                                     | Query, `{start,end,includeUnmonitored?}`        | Native calendar events; dates accept ISO strings.                                                                                                                                                 |
| `sonarr.missing`, `sonarr.queue`                                      | Query, `{limit?}`                               | `{items,totalCount}` with native links, episode metadata and queue progress.                                                                                                                      |

## Composition

```tsx
<WidgetScope name="downloads" handlerPrefix="downloads.">
  <Downloads />
</WidgetScope>
```

The child calls `useWidgetQuery("queue")`; its composed server manifest declares `downloads.queue`. A child command `pause` becomes `downloads:pause`. Scoped storage keys and SDK state keys cannot collide with sibling scopes. Options can be supplied to a scope explicitly. Author-defined configuration saves still operate on the parent placement; pass a deliberate parent option update when composing independent configuration components.

## Reference packages

Import `widgetReferencePackages` from `@homarr/widget-sdk/examples` or open an individual JSON package in `examples/`. Every reference includes source and can be compiled/imported through the same management flow as a shared package.

- `clock`: local/UTC/world time, native command, source-free tile and advanced surface.
- `timer`: deadline-based focus timer with shared selection and hidden-tab correctness.
- `beszel`: two attributable sources with partial-failure handling, persisted native table layouts, eight history panels and bounded live metrics.
- `checklist`: managed JSON persistence and user/instance/installation scopes.
- `downloads`: two independently queried torrent/Usenet clients, source-qualified controls and confirmed removal. Batch pause/resume reports each client's result; buttons and commands honor exact guest-approved inputs through `useWidgetCapabilities`.
- `sonarr`: upcoming episodes, missing releases and queue progress.
- `rack`: arbitrary SVG, keyboard interaction, package CSS and native system details.
- `backup`: Node filesystem metadata with no upstream API; requires a readable mounted backup directory.
- `household`: Home Assistant HTTP connection, confirmed controls and an executable configuration surface.
- `overview`: independently authored rack/download/media components composed using SDK scopes.
- `media`: responsive native media sessions with progress and host-native detail modals.
- `sqlite`: bounded read-only named SQL queries and optional local JSON through a URL-free service connection.
- `mqtt`: authenticated broker subscriptions, retained messages and allowed-topic publishing through a server adapter.

References use real adapter responses and empty/error states, without fabricated live metrics. They are implementation examples, not an assertion that every upstream application or deployment has been exercised. Native adapters and arbitrary trusted package code remain complementary extension paths.

## Shared native tables

`@homarr/widget-sdk/ui` exports `HomarrDataTable`, `usePersistedTableLayout`, and `useTableLayoutPersistence`. Native Beszel and other Homarr tables consume these same implementations through their existing import paths. Columns support ordering and resizing with the native proportional-width preview, sorting, selection, pagination and row actions. The Beszel reference persists each viewer's layout in browser storage and shows two source results with source-qualified row IDs, partial failures and source-specific history/live drilldowns.

For large datasets, `MantineReactTable` and `useTranslatedMantineReactTable` expose Homarr's existing localized table engine, including its row-virtualization options. Keep column definitions and rows memoized. Use SDK state for transient table state, browser-local persistence for viewer layout preferences, or managed storage for shared state. None of the table entrypoints import the database, integration executors or custom-widget compiler.

## Viewer capabilities and live connections

`useWidgetCapabilities()` returns query status and `canRun(handler, input)`. Use it to disable or hide controls before attempting a server action. It includes board permissions and exact approved guest inputs, and fails closed while unavailable. Scoped components resolve their handler prefix automatically. This is presentation guidance; the server checks authorization again on every invocation.

Subscriptions with the same viewer, placement, artifact, configuration, handler, and input share one connection. The host retains only the latest event for a newly mounted consumer, with a 500 ms release grace during native advanced-view transitions. Each SDK consumer controls its own bounded event history. Binding changes reconnect; authorization errors and disabling remove retained events immediately. A different viewer or artifact never reuses the connection.

A retained authoring preview sets `host.executionEnabled` to false and pauses SDK queries, clock updates, subscriptions and controls. Existing cached data remains visible while an invalid draft or replacement is being reviewed. The prior preview session and styles retire only after the replacement React surface commits successfully. Query freshness defaults to the requested polling interval, or one second without polling, so ordinary compact/advanced transitions reuse recent data; authors can override `staleTime`.

Optional host libraries load from the surface's compiled import list. New artifacts bundle only the Tabler icons actually imported by their source, and record the installed icon package version. Clocks without chart, table or legacy imports do not load those adapters. Older artifacts retain compatibility with their original host-module declarations.

## Converting Custom JSX v2

An administrator can convert a saved v2 definition into a separate disabled trusted package. The converter copies the JSX, request declarations, options, and dynamic option choices. Local source URLs and credentials become named encrypted connections; exported package source contains neither those connection values nor the original definition ID. Preview and explicit activation remain required.

`@homarr/widget-sdk/legacy` supplies `LegacyWidget` and `LegacyConfiguration` through the Homarr host. The compatibility tile reuses the existing interpreter and components, including bound inputs, manual/load queries, confirmations and invalidations. Bound input values use SDK state across compact and advanced views. Load queries respect the dashboard placement's refresh interval. Dynamic option queries run from the configuration surface against the selected local bindings. These adapters let an owner replace individual sections with ordinary React and SDK components without rewriting every behavior at once.

Conversion leaves all original definitions and placements unchanged. After activation, `customWidget.package.migrateV2Placement` explicitly changes one selected original placement to the converted package. It preserves its ID, geometry, refresh interval, existing options and materialized original defaults, rejects concurrent placement changes, and keeps the original definition readable. Local conversion provenance is installation metadata and is excluded from exported source.

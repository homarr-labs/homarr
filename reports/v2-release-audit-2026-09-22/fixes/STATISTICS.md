# Statistics failure-isolation addendum

## Change

- Statistics providers can return successful metric groups together with the keys whose upstream requests failed.
- A partial refresh writes the successful values, retains the previous stored values for failed keys, and records those keys in `unavailableMetrics`.
- Partial snapshots retry failed groups after one minute instead of waiting for the normal one-hour freshness window.
- Native Statistics provider execution has a 30-second deadline nested under the 60-second source signal. Each request also combines that provider signal with its caller signal and its own 30-second deadline. A stalled endpoint or sequential pagination therefore becomes one unavailable group while the source remains alive long enough to persist healthy sibling groups. The request signal is also passed through response-body reading and Axios cancellation.
- Cards, tables, and metric details display recorded failed keys as unavailable. Other metrics from the same integration remain usable.
- A refresh where every independent group fails remains a source failure and retains the previous snapshot with the existing retry/error behavior.
- Multi-endpoint isolation is applied to Autobrr, Homebox, Komga, Linkwarden, Tandoor, Tube Archivist, Unmanic, Your Spotify, Sonarr, Radarr, Lidarr, and Readarr. Scrutiny's summary and threshold endpoints jointly determine every exposed metric, so neither response can produce an independently valid metric group.
- Existing persisted snapshots remain readable; the new unavailable-key list defaults to empty when absent.

## Focused validation

- `pnpm exec vitest run packages/integrations/src/stats/existing.spec.ts packages/integrations/src/stats/providers/linkwarden.spec.ts packages/integrations/src/stats/types.spec.ts packages/request-handler/src/stats.spec.ts`: 4 files, 12 tests passed.
- `pnpm --filter @homarr/integrations typecheck`: passed.
- `pnpm --filter @homarr/request-handler typecheck`: passed.
- `pnpm --filter @homarr/ui typecheck`: passed after adapting custom SVG nodes to Tabler's current `SvgElementName` contract.
- The root audit subsequently reported successful root typechecks after dependency installation was reconciled; the earlier transient duplicate-package errors are superseded.
- `git diff --check`: passed at validation time.

The new tests cover a failed metric group alongside a successful group, rejection when every group fails, the default 30-second request deadline preserving a healthy sibling group, Linkwarden's slow tag pagination preserving collection metrics at the provider deadline, a Sonarr adapter boundary where the missing-items group times out while library and queue metrics survive, preserving prior values when a partial refresh omits failed keys, partial-refresh persistence and retry metadata, complete-failure snapshot retention, and concurrent isolation between a failing and successful integration.

The 60-second source deadline remains the outer cache/refresh bound. Native provider work and its individual requests are bounded at 30 seconds, including sequential pagination. Legacy Sonarr/Radarr/Lidarr/Readarr adapters bound each parallel metric group to 30 seconds through their scoped HTTP signal, so a stalled legacy group becomes unavailable while healthy sibling groups finish.

## PR #6863 validation provenance

The merged PR body reports a final forced sweep of **34/34 configured integrations**. This is the supported live-tested set, not all catalog entries. It explicitly excludes Your Spotify because it required a real Spotify application/account and excludes unconfigured legacy integrations. The PR separately reports catalogs for 88 registered integration kinds and 286 metrics; that is catalog coverage rather than live proof.

The archived [`development/integration-stats/README.md`](https://github.com/homarr-labs/homarr/blob/788a9a826f62374b5319a48572a56a5123e78bf4/development/integration-stats/README.md) says its validation script used Homarr's authenticated integration connection check, catalog query, and forced Statistics refresh. Its clean-restore verification covered the same 34 configured integrations across 53 containers. Provider-by-provider evidence is in the archived result files at commit [`ac67f8747`](https://github.com/homarr-labs/homarr/tree/ac67f8747af1fafff4d13249cc5c34c9d187fd56/development/integration-stats), including `content-results.md`, `infra-results.md`, `media-results.md`, and `next-monitoring-results.md`. Recorded limitations include Scrutiny without physical disks, Frigate without cameras, and NetAlertX backend API validation without its web UI. The historical workspace note records that 62 selected Homarr containers were later stopped with volumes preserved. No container or Docker validation was run for this addendum.

The original focused evidence also recorded 22 runtime/query-scope tests, isolated demo/testing seed checks, deterministic mock-provider verification, lint, and the docs production build. Those historical checks validate the merged implementation at that commit; they do not validate this addendum.

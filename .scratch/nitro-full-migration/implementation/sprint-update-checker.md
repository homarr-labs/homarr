# Update checker sprint — unmounted candidate

## Inventory and disposition

The entire source router has one leaf: `updateChecker.getAvailableUpdates`, query, authenticated `admin`, guarded demo base. There is no input/output schema, input default, OpenAPI metadata, MCP metadata, public projection, subscription, mutation, platform selector or independent changelog/version leaf in this router.

One procedure body is implemented in `createUpdateCheckerProcedures`; no source body remains pending. This is a source-preparation count only: **0 newly accepted/live leaves**. The central 91/334 acceptance count remains unchanged. The procedure is not registered or mounted and every production binding remains held.

## Exclusive files

- `packages/api/src/nitro/routers/update-checker.ts`
- `packages/api/src/nitro/routers/-update-checker/resources.ts`
- `packages/api/src/nitro/routers/-update-checker/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-update-checker.md`

No shared files, legacy handlers, manifests, lockfiles, host, DB, Core or Auth files were changed.

## Source comparison

Read `packages/api/src/router/update-checker.ts`, its authorization/error regression source, `packages/api/src/trpc.ts`, `packages/request-handler/src/update-checker.ts`, `update-checker-state.ts`, update/cache/state regression sources, accepted `@homarr/redis/state` channels/backing, Core trusted HTTP runtime/request exports, and source external-policy configuration. No runtime environment or current version was read.

- The oRPC query uses the existing authenticated/source procedure middleware: demo query remains readable; anonymous and non-admin access fail before cache/provider acquisition. No projection or schema was invented. Source cache/provider failure logs `Failed to read the cached update check` with its cause and returns `[]`.
- The release algorithm is the source algorithm with injected concrete pinned-library primitives, not a controller callback. Octokit construction retains trusted fetch and `throttle.enabled=false`; the single default `repos.listReleases` request retains `homarr-labs/homarr`, without pagination, platform assumptions, media overrides or a synthetic latest version. Raw release name, optional `body_html`, `html_url`, `tag_name` and provider prerelease flag map unchanged. Invalid tags are logged/skipped; prerelease current versions include prereleases; stable versions exclude provider-flagged prereleases; only greater versions survive and descending semantic order is retained. Parse failure retains the source false-prerelease fallback. Invalid current version retains `ErrorWithMetadata` and the exact message/currentVersion metadata.
- The cache implementation follows the accepted `update-checker-state.ts` algorithm and its public `UpdateStateResources`/`StateChannels` contracts. It locally specializes that algorithm because the accepted factory has no injectable clock or provider signal. Versioned fresh/stale/lock names remain `update-checker:{fresh,stale,lock}:v2:<currentVersion>`. Fresh successes/failure suppression expire at 86,400,000 ms; stale success is persistent; lease is 120 seconds. Contenders serve stale immediately or wait 50 × 100 ms for fresh, then read stale and retain the exact timeout error. Successful fresh/stale publication is atomic and owner-conditioned; provider failure only owner-conditionally writes fresh using previous releases/checkedAt and a new attemptedAt. Expired owners cannot publish. Cleanup uses the same token and preserves release warning behavior. Timestamp is checkedAt or attemptedAt; the query still returns only the release array.
- Accepted dynamic external-policy checks are retained at provider/read/write/final-return boundaries, including return after cleanup. Denial yields empty releases/current attemptedAt/null checkedAt and does not initiate a refresh/suppression write. The trusted fetch wrapper also checks policy on each actual SDK fetch/retry. No ambient environment import or legacy request-handler singleton is used.
- Request signal and request disposal fence new work and late results. Wait and trusted fetch receive the combined signal. Cancellation/stopping is not misclassified as provider failure or converted into successful empty data. Disposal aborts the request-owned lifetime and joins tracked handler promises, including admitted token cleanup. Cleanup channels intentionally do not inherit the cancelled work signal. Injected channels/transports are not globally closed by an individual request.

The accepted state port's owner-conditioned atomic publication and dynamic-policy handling intentionally supersede the legacy singleton's unfenced two-write block; this is not a claim of byte-for-byte equivalence to that old block. Signal propagation, abort-aware clock waits and settled request disposal are explicit lifecycle adaptations. These local adaptations have not been independently validated or accepted.

## Dependency/API inspection and genuine holds

`@orpc/server` is directly declared and installed at `2.0.0-beta.43`; existing `authenticatedProcedure` and installed handler signatures were inspected. `superjson` is directly declared; existing accepted state uses its `stringify`. `@homarr/core`, `@homarr/redis` and `@homarr/request-handler` are declared; public ErrorWithMetadata, trusted-fetch type, state exports and request-handler wildcard export were checked. No undeclared library import was introduced.

Pinned `octokit@5.0.5` and `semver-parser@4.2.1` source/types were inspected locally. Octokit is declared by request-handler, semver-parser by cron-jobs, but neither is declared directly by API. Their concrete constructor/three semver functions are therefore required injected resources, not new API imports or guessed replacement parsers. The constructor contract retains source SDK defaults; installed SDK forwards `request.signal` to fetch. Semver primitives must use the source non-strict defaults, including optional v-prefix and safe-integer exceptions. A composition adapter still needs structural/API verification; no manifest/lock edit was attempted.

Held production joins:

1. Genuine BackendContext credential/session/admin authority and authenticated transport; no manufactured principal or registration.
2. Physically backed atomic StateChannels, expiry/clock agreement, cross-process raw-token lease ownership, and cancellation/currentness/physical-settlement evidence. No in-memory cache substitute or actual SQL/state write was performed. The accepted channel timeout alone does not certify native settlement; request promise joining alone cannot clear that physical-resource hold.
3. Explicit source-equivalent application version and dynamic external-policy configuration, plus a real epoch-millisecond clock and abort-aware 100-ms wait primitive. No real environment/version probing or constant version default.
4. A real source Octokit constructor and semver-parser bindings, owned certificate/proxy/trust-aware fetch and provider response/body/native-lifecycle settlement. No provider/GitHub/registry call or transport construction was performed. Request disposal does not claim to dispose host-owned certificate agents or SDK retry resources.
5. Coordinator metadata/contribution/export composition and final independent equivalence review plus requested verification. No source expansion is requested by this return.

## Verification and freeze

Source-only comparison. No lint, typecheck, build, test, format, install, Git command, nested agent, network, listener, browser, container or live-data operation was run. No tests were added. Validation and acceptance are outstanding. This lane is frozen on return; drafts are not accepted/live parity.

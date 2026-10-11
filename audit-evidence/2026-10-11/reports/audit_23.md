# Audit 23: operations CLI, homarr-dev, and converter

Reviewed all 66 assigned source, manifest, and test files in full, including each file's concrete callers and relevant database schema. The 788-line `tools/homarr-dev/internal/tui/model.go` received a dedicated full-file pass in two halves plus caller review. The converter's executable loading path was reviewed; vendored `legacy/v1.77.1/schema.json` content was explicitly excluded as requested.

Four resource candidates were identified. None was measured against a production installation. No tests, builds, benchmarks, Docker commands, or production edits were performed.

## Finding: completed developer-CLI tasks accumulate until the user clears them

**Call path and trigger:** TUI actions in `internal/tui/actions.go` start work through `task.Manager.Start`. Every task is appended to `Manager.tasks` and retained after completion. A task can retain up to 500 output lines plus its progress steps, title, detail, and error. The only normal removal path is the explicit `x` clear action in the task overlay (`internal/tui/keys.go`); task completion does not prune history. This applies to repeated builds, pulls, and container actions during one long-lived TUI session.

**Dimensions and cause:** This is retained Go-process heap, not memory used by Docker itself. The per-task line cap bounds each task but there is no bound on completed task count. It also increases transient allocations: `Manager.Snapshots()` copies the task pointer slice and each task's line and step slices; `Manager.Running()` calls `Snapshots()` just to count running tasks. TUI `applyTasks` refreshes snapshots on task notifications, and `Running()` is used by render/layout paths. The task-state map in `Model` also keeps an entry per ID, including after the manager's explicit prune. No heap or allocation measurements were taken.

**Minimal compatible fix and tradeoff:** Automatically drop the oldest completed tasks above a modest history cap while always preserving running tasks, and remove their IDs from `taskStates`. Have `Running()` count task state under the manager lock without creating snapshots. A cap limits how much old task detail remains available; a direct count changes only allocation behavior.

**Baseline measurement and confidence:** Compare `runtime.MemStats` or heap profiles and `Snapshots`/`Running` allocations after 1, 10, 100, and 1000 completed tasks with representative retained output; record retained heap, bytes allocated per snapshot, and time per call. Confidence is high for unbounded retention and repeated slice-copy mechanism; practical impact depends on session length and build log sizes.

## Finding: PR check snapshots are retained for every visited PR

**Call path and trigger:** Selecting the CI sidebar for a PR calls `fetchCIChecks` from `internal/tui/data.go`, then `gh.GetPRChecks`. The TUI stores results in `Model.ciChecks[pr]` (`internal/tui/model.go`), while the package-level `prChecksCache` in `internal/gh/gh.go` also stores each result. The 15-second TTL only controls whether an entry is fresh; it never removes stale entries. The maps are not cleared when selection changes. Repeatedly selecting CI for distinct PR rows/PR-backed containers grows both maps for the TUI process lifetime. On a fresh fetch, both maps reference the same check slice; this is duplicate reachability, not a second copy of the payload.

**Dimensions and cause:** Retained TUI heap scales with the number of distinct PRs inspected and their check count/field lengths. `gh pr checks` output is also captured wholesale by `CombinedOutput` and decoded into a slice during each fetch, so a large check response has a transient output-plus-decoded allocation peak. No check-count distribution, output-size, or heap measurement is available. The `ci` shell command is short-lived and does not itself create long-lived retention.

**Minimal compatible fix and tradeoff:** Keep a bounded recent-entry cache (or only retain the currently selected PR in the model) and evict old entries from both locations; a bounded CLI fetch may additionally reject unusually large output. Eviction can cause a revisited PR to fetch again. Avoid keeping two independent cache policies if one bounded owner can serve both callers.

**Baseline measurement and confidence:** In one long TUI process, inspect CI for increasing counts of distinct PRs and record check response bytes, retained heap, and map entry counts before/after navigation. Confidence is high that entries persist without eviction; impact is medium/uncertain because each PR's check list and normal navigation count are workload-dependent.

## Finding: volume-size enrichment captures every Docker volume on the host

**Call path and trigger:** `docker.ListVolumes(ctx, true)` first discovers Homarr volumes, then calls `volumeSizes`. That helper runs `docker system df -v --format '{{json .Volumes}}'`, captures all stdout with `Output`, unmarshals the entire volume array, and retains a map entry for every volume even though the caller only looks up discovered Homarr names. The TUI calls this on initial/full loads, explicit refresh, and after a completed background task (`internal/tui/data.go`); `homarr data` also requests sizes. The three-second lightweight container poll passes `false` and does not run this path.

**Dimensions and cause:** This is transient memory in the Go CLI process: captured output bytes, the decoded rows slice, and the all-volume map coexist during enrichment. The Docker CLI and daemon have their own separate working sets; no claim is made about their memory. Time and memory scale with all volumes on the Docker host, not just Homarr volumes. No host-volume count or byte measurement was available.

**Minimal compatible fix and tradeoff:** Build a set of Homarr volume names from the first query, then decode the JSON array item-by-item and retain sizes only for those names. This reduces output/row/map duplication in the CLI while Docker still has to enumerate its volume inventory; streaming decode adds parsing code and should preserve unknown-size behavior on command/JSON errors.

**Baseline measurement and confidence:** On a host with increasing total Docker volume counts and a fixed small Homarr subset, capture `docker system df` output bytes and Go heap profiles around `ListVolumes(true)`. Compare peak allocated and retained bytes while confirming the same Homarr sizes are returned. Confidence is high in the full-capture/whole-array mechanism and medium in impact because installation size is unknown.

## Finding: user maintenance commands materialize unused user columns

**Call path and trigger:** `users list` calls `db.query.users.findMany()` and prints only id, name, and email. `fix-usernames` loads all credentials users and reads only id/name before sequential updates. The SQLite and PostgreSQL user schemas include password hashes, preferences, IDs, and serialized `headerPreferences`; `findMany` without a `columns` projection loads every column for every matching row.

**Dimensions and cause:** Each invocation retains a full result collection in the Node CLI process until the handler completes, even though only a small projection is consumed. Memory scales with user count and the size of per-user strings/serialized preferences. Password values are loaded into process memory but are not printed by these commands. This is command-duration allocation, not a persistent leak. No user-count or heap measurement is available; ordinary installations may have only a few users, so practical impact is likely low.

**Minimal compatible fix and tradeoff:** Use Drizzle `columns` projections (`id`, `name`, `email` for list; `id`, `name` for username repair). This reduces database result construction and retained row width while preserving output and update behavior. Baseline-check query result bytes/heap with representative user counts; confidence is high in the unnecessary projection and low-to-medium in user-visible memory impact.

## Buffering, lifecycle, and runtime boundaries reviewed

The Docker Engine pull path decodes JSON incrementally, uses a 64-message channel, closes the response body, and bounds error bodies at 4 KiB. `StreamCommand` uses a pipe and a scanner with a 1 MiB maximum line and a 256-line channel; build and PR-fetch callers drain it. The Docker foreground stderr tail is capped at 32 KiB. The log registry caps active streams at six and retained output at 2000 lines each, and detach/retain/exit cancel subprocesses. GHCR tag listing requests at most 20 pages of 1000 tags and caps error bodies at 2 KiB. Harness `execFile` calls cap output at 10 MiB; build and container foreground output is streamed. These bounds cover per-stream/per-command memory, while the task and check histories above remain process-lifetime collections.

The Node operations CLI's dynamic imports defer operational module evaluation for the harness branch; normal operations load all registered command groups so the parser can expose their commands/help. The esbuild script emits a single bundle, so the dynamic import branch is a runtime initialization distinction; no bundle-size change is claimed. The converter statically loads its vendored schema/migration files at module initialization, performs rowwise 250-row MySQL paging, and closes SQLite/MySQL resources and removes its temporary file in `finally`. The Dockerfile copies that vendored data into the converter image. No converter buffering/lifecycle finding was established from the reviewed executable path.

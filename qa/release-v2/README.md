# Release-v2 dogfood QA

This directory is the fixed coverage contract for the release-v2 browser dogfood campaign. The candidate is always the checkout's exact `HEAD` commit when the harness runs. `coverage-manifest.json` owns the matrix and agent assignments; `ledger.json` and `master-report.md` are generated from the tracked reports in `reports/<agent-id>/report.md`.

A dirty pre-commit checkout can be used for focused harness checks, but its runtime provenance still identifies the underlying `HEAD` and does not claim that uncommitted files belong to that SHA. Start fresh campaign instances after the campaign changes are committed so runtime, fixture, coverage, ledger, and report metadata all record the exact final commit.

## Required commands

Use Node 24 and the repository toolchain. These package commands are the supported entry points:

```bash
pnpm qa:release-v2:fixtures
pnpm qa:release-v2:seed -- --profile <profile> --output <directory> [--reset]
pnpm qa:release-v2:verify
pnpm qa:release-v2:report
pnpm qa:release-v2:zoom -- --origin <app-origin> --factor <0.8|1|1.25|2> --output <new-absolute-directory>
```

The fixture command binds to an explicit loopback host on an automatically allocated port and prints only its non-secret readiness metadata. It accepts `127.0.0.1`, `localhost`, and IPv6 loopback origins such as `[::1]`, while rejecting wildcard and non-loopback hosts. Pass `--ready-file <path>` when another process needs to consume the selected URL. Direct seeding also requires an isolated migrated SQLite `DB_URL`, a credential-free loopback HTTP origin in `QA_FIXTURE_URL`, and a password for populated profiles. Candidate provenance is derived from the actual checkout; optional `--candidate-sha` or `QA_CANDIDATE_SHA` input is accepted only when it exactly matches `HEAD`. Supply the password through `QA_PASSWORD_FILE` where possible; the file content is never written to a manifest or command output, and neither password environment variable is forwarded to the spawned Next.js process after seeding. `onboarding-fresh` does not require a password.

Each populated fixture manifest keeps the human-readable persona label in `personas[].name` and exposes the non-secret credentials username in `personas[].loginUsername`. Board route names are deterministic, unique, and validation-safe in `boards[].name`; shared board names exactly match the IDs in `coverage-manifest.json` (including `qa-scroll-lab`), while the human-readable title remains in `boards[].label` and the board page/meta titles. The login username is the deterministic lowercase persona handle; the password remains available only through `QA_PASSWORD_FILE`.

Generated placements are validated before the seed transaction commits. Root items and containers must fit the active main/left/right lane after gutters, nested containers must fit their parent content grid without cycles, and every item must fit its selected root or container in every layout. `qa-grid-24` includes a dedicated unguttered 24-column custom layout that preserves exact width coverage `1–24`; its guttered Base layout and all narrower layouts keep lane-valid projected widths.

Use `report -- --init` to create missing agent reports. Use `report -- --refresh-placeholders` only after changing manifest templates; it refuses to overwrite reports with execution results, widget results, measurements, limitations, or reproduction data.

## Managed runtime

The runtime command provisions Redis, the deterministic fixture server, the isolated SQLite database, seed data, and Next.js:

```bash
QA_PASSWORD_FILE=/secure/path pnpm qa:release-v2:runtime -- start --slot 1 --profile main-writable
pnpm qa:release-v2:runtime -- status --slot 1
pnpm qa:release-v2:runtime -- stop --slot 1
```

Slots `1`, `2`, and `3` have separate database files, Redis containers and ports, cookie prefixes, logs, fixture ports, app ports, and `.next-qa/slot-<n>` build directories. The runtime manifest is written only after the app is ready and records the watcher interval. Status checks the owned processes, app, fixture, and Redis. Stop is idempotent for a stopped manifest and refuses to signal a live PID that does not carry the recorded QA run ID.

Every start, reset, and stop holds an exclusive per-slot filesystem lease outside the resettable slot tree. A second operation on the same slot fails deterministically. Stale recovery compares both the recorded PID and its operating-system process-start marker; it never signals a lease owner or an unrelated process. An incomplete fresh lease is preserved for a short grace period instead of being guessed stale.

The fixture child receives an explicit environment allowlist containing only its non-secret QA run ID; ports and ready-file paths are command arguments. Password, database, authentication, encryption, API, and unrelated inherited environment values are not forwarded. The app keeps its required runtime environment but never receives `QA_PASSWORD` or `QA_PASSWORD_FILE` after seeding.

The selected app port remains bound by a temporary loopback reservation through migration and seeding. The reservation is released immediately before Next.js binds. If another process wins that unavoidable release-to-bind window and Next.js reports `EADDRINUSE`, startup retries with a newly reserved, dynamically selected port. No application port is hard-coded.

`--reset` is intentionally narrow: after validating the QA run-root marker, it stops only the selected running manifest, removes only that slot directory, and clears only that slot's `.next-qa` cache. The run root must be a direct child of the canonical operating-system temporary directory returned by Node, its basename must be `homarr-release-v2-qa` or start with `homarr-release-v2-qa-`, and only safe suffix characters are accepted. Temporary-directory aliases are canonicalized before containment checks. Existing run roots and slot paths must not be symlinks or contain symlink components, and destructive paths are rechecked immediately before mutation. The Linux default `/tmp/homarr-release-v2-qa` remains unchanged.

This host's `fs.inotify.max_user_instances=128` is too low for concurrent native Watchpack watchers. Spawned QA apps keep Turbopack and set `WATCHPACK_POLLING=1000`, avoiding reliance on another inotify instance while keeping all three isolated slots available. Filesystem changes can take up to one polling interval to reach HMR. This is Watchpack's watcher mode, not a switch to the Webpack bundler.

## Profiles

| Profile            | `DEMO_MODE` | `DEMO_READ_ONLY` | `UNSAFE_ENABLE_MOCK_INTEGRATION` |
| ------------------ | ----------- | ---------------- | -------------------------------- |
| `main-writable`    | `true`      | `false`          | `true`                           |
| `main-readonly`    | `true`      | `true`           | `true`                           |
| `onboarding-fresh` | `false`     | `false`          | `true`                           |
| `degraded`         | `true`      | `false`          | `true`                           |

The verifier enforces this exact matrix. For a live check, pass either a run-root or one or more runtime/fixture manifests:

```bash
pnpm qa:release-v2:verify -- --run-root /tmp/homarr-release-v2-qa
pnpm qa:release-v2:verify -- --manifest /tmp/homarr-release-v2-qa/slots/1/runtime-manifest.json
```

Live verification checks the checkout-derived candidate, profile flags, paths, counts, personas, board names against both the fixture and coverage manifests, board-name validity and uniqueness, layouts, lane and recursive container geometry, item placements, board permissions, fixture health, app readiness, and reset-safety invariants. The default command remains a static coverage/report check and needs no running services.

## Evidence contract

Each base case ID is expanded through its wave's `caseDimensions`. Allowed statuses are `passed`, `failed`, `blocked`, and `not-reached`; never turn an unrun check into a pass. Every failed, blocked, or not-reached case or assigned widget check is a critical gap.

Every widget is assigned all nine required viewports. The high-risk widget list must exercise every width `1–24` × every height `1–6` at mobile, breakpoint-edge, and desktop viewports. Other widgets must cover minimum, canonical, wide, tall, maximum, overflow, and behavior-changing thresholds. Keep structured `widgetChecks` and the matching human rows synchronized.

Execution metadata always carries the exact checkout candidate SHA. URL, actual port, runtime flags/profile, persona, browser session ID, timestamp, viewport, input, and zoom may remain unset only while execution is not reached. Record performance measurements and limitations structurally, and attach independent reproduction outcomes to finding fingerprints without inventing results.

Screenshots and traces stay untracked under `.screenshots/release-v2/<agent-id>/`. Reports must link absolute local artifact paths. Never copy passwords, credentials, cookies, tokens, secret-bearing response bodies, or environment dumps into evidence.

The decision is `GO` only when there are no P0/P1 findings and no critical gaps; otherwise it is `NO-GO`. The report command itself treats missing, null, malformed, wrong-candidate, incomplete, assignment-inconsistent, or case-rollup-inconsistent metadata as an explicit critical metadata gap. It does not depend on a separate verification run to force `NO-GO`.

Aggregation refuses symlinked packet reports, `ledger.json`, and `master-report.md`. Artifact and evidence paths must exist, be absolute, and ultimately resolve inside the assigned `.screenshots/release-v2/<agent-id>/` directory; a lexically contained symlink that resolves outside is rejected.

## Native browser zoom

The zoom helper creates a disposable Manifest V3 extension containing only `manifest.json` and `background.js`. Its host permission and runtime URL check are restricted to the exact supplied HTTP(S) origin. The factor whitelist is `0.8`, `1`, `1.25`, and `2`; factor `1` is supported as a deterministic extension baseline, though an unmodified browser session needs no extension for the same 100% baseline. The output must be a new direct child of the canonical operating-system temporary directory named `homarr-release-v2-qa-zoom-<unique>`. The helper canonicalizes temporary-directory aliases, never removes or resets an existing path, and never accepts credentials in the origin.

Generate one extension per factor, then launch it in a fresh session and profile:

```bash
pnpm qa:release-v2:zoom -- \
  --origin http://127.0.0.1:<actual-port> \
  --factor 1.25 \
  --output /tmp/homarr-release-v2-qa-zoom-125-<unique>

npx -y --package agent-browser agent-browser \
  --session release-v2-zoom-125-<unique> \
  --profile /tmp/homarr-release-v2-qa-zoom-profile-125-<unique> \
  --extension /tmp/homarr-release-v2-qa-zoom-125-<unique> \
  --headed false \
  --args '--no-sandbox,--headless=new' \
  open http://127.0.0.1:<actual-port>
```

Keep the session and profile unique for every factor. Restart the session when changing factors. Native browser zoom must preserve `window.visualViewport.scale === 1`; record the actual CSS viewport and `devicePixelRatio` alongside that invariant. A changed `visualViewport.scale` indicates page scaling rather than native browser zoom and must not be reported as zoom coverage.

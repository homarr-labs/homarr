# Homarr Developer CLI

Build and launch local Homarr images and GHCR pull-request builds, then manage them from responsive terminal dashboards.

## Requirements

- Docker or OrbStack
- Go 1.25+ to build from source
- GitHub CLI authenticated with `gh auth login` for pull-request features

## Setup

```sh
pnpm install
```

Create `.env` from `.env.example` and set `DB_URL` to an absolute path for the SQLite file before running the migration. In a POSIX shell, use `cp .env.example .env`; in PowerShell, use `Copy-Item .env.example .env`.
Then run `pnpm db:migration:sqlite:run` to create or update the database. The migration command also seeds a new database. Use `pnpm db:seed` explicitly when you need to seed an existing database. Start Redis separately with `pnpm docker:dev:up` when it is needed.
The examples below use `pnpm dev:cli -- ...`, which works from POSIX shells and PowerShell. If you prefer a global command, install it with `pnpm dev:cli:install` and add your Go bin directory to `PATH`.

## Build

```sh
pnpm dev:cli -- build feature
pnpm dev:cli -- build --pr 6441
pnpm dev:cli -- rebuild feature
```

Checkout builds are tagged as `homarr:<name>`. The source checkout and revision are recorded on the image so `homarr rebuild` and the development dashboard can rebuild it later. PR builds use a temporary checkout and default to `homarr:pr-<number>`.

## Launch

```sh
homarr --pr 6441 --env WORKSHOP_WEB_URL=https://app-v2.preview.homarr.dev/
pnpm dev:cli -- run dev
pnpm dev:cli -- run --detach dev
pnpm dev:cli -- run --pr 6441
pnpm dev:cli -- run --pr 6441 --demo
pnpm dev:cli -- run --env FOO=bar --env FEATURE=true dev
```

PR launches always pull the latest GHCR tag before starting. Local tags remain local.
The installed binary accepts `--pr`, `--demo`, `--detach`, and repeatable `--env KEY=VALUE` flags directly, so
`homarr --pr <number> --env KEY=VALUE` is shorthand for `homarr run --pr <number> --env KEY=VALUE`.
The first launch generates a per-user encryption key in the OS config directory and reuses it for later launches. Set `HOMARR_DEV_SECRET_ENCRYPTION_KEY` to a 64-character hexadecimal key to override it.

The command reference below assumes the optional `homarr` installation. Without it, prefix each command with `pnpm dev:cli --` (for example, `pnpm dev:cli -- dev`).

## Commands

```text
homarr                     Interactive local and remote image browser
homarr --pr <number>       Pull and launch a PR image, with optional --env overrides
homarr dev                 Explicit alias for the main browser
homarr dash                Start on the instance dashboard
homarr build <name>        Build this checkout as homarr:<name>
homarr build --pr <number> Build a PR locally from a temporary checkout
homarr rebuild <name>      Rebuild from recorded provenance
homarr images              List local images with build provenance
homarr data                List instance data volumes
homarr prune               Remove stopped instances
homarr list                Script-friendly instance list
homarr logs <container>    Follow logs
homarr shell <container>   Open an interactive shell in a running instance
homarr ci [pr] [--watch]   View or watch GitHub CI checks for a pull request
homarr open <container>    Open in browser
homarr stop <container>    Stop
homarr restart <container> Restart
homarr remove <container>  Force-remove
homarr doctor              Check Docker, Engine API, and optional integrations
```

## Development Browser

```text
/              Filter by PR number, title, author, branch, CI, image, state, or port
↑/↓ or j/k     Select row
Enter or Space Start the available image; choose local or remote when both exist; stop when running
R              Build locally in background (or rebuild local image)
p              Pull remote PR image in background and start container
m              Manage mode (chords: b rebuild, i delete image, d delete data, c remove container, p prune)
t              Background tasks overlay (status, progress, cancellation)
Tab            Cycle sidebar tab (logs / build / ci)
l              Toggle sidebar visibility
L              Pin logs to currently selected container
f              Follow or pause logs
Page Up/Down   Scroll logs
M              Toggle demo mode for next launch
b              Toggle bot PRs
o              Open PR on GitHub
a              Open running instance in browser
c              Copy instance URL to clipboard
r              Refresh data
1 / 2 / d      Switch screen (development / instances)
?              Help overlay
q              Quit (cancels background tasks)
```

Pull progress with live layer bytes, throughput, BuildKit step streaming, local build provenance, CI rollup badges, container health status, and live output streams are non-blocking. When a background pull completes, the sidebar automatically transitions to streaming the running instance's live logs.

## Instance Dashboard

```text
/              Filter by name, image, state, health, port, or URL
↑/↓ or j/k     Select row
Enter or Space Start / stop selected instance
s              Stop instance
S              Restart instance
x              Remove container (keeps data)
m              Manage mode for selected instance
t              Background tasks overlay
Tab            Cycle sidebar tab (logs / build / ci)
l              Toggle sidebar visibility
L              Pin logs
f              Follow / pause logs
Page Up/Down   Scroll logs
o              Open running instance in browser
c              Copy URL to clipboard
R              Rebuild from recorded provenance
r              Refresh
1 / 2 / d      Switch screen
?              Help overlay
q              Quit
```

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
pnpm dev:cli -- run dev
pnpm dev:cli -- run --detach dev
pnpm dev:cli -- run --pr 6441
pnpm dev:cli -- run --pr 6441 --demo
pnpm dev:cli -- run --env FOO=bar --env FEATURE=true dev
```

PR launches always pull the latest GHCR tag before starting. Local tags remain local.
The first launch generates a per-user encryption key in the OS config directory and reuses it for later launches. Set `HOMARR_DEV_SECRET_ENCRYPTION_KEY` to a 64-character hexadecimal key to override it.

The command reference below assumes the optional `homarr` installation. Without it, prefix each command with `pnpm dev:cli --` (for example, `pnpm dev:cli -- dev`).

## Commands

```text
homarr dash                Interactive instance dashboard
homarr dev                 Interactive local and remote image browser
homarr build <name>        Build this checkout as homarr:<name>
homarr build --pr <number> Build a PR locally from a temporary checkout
homarr rebuild <name>      Rebuild from recorded provenance
homarr list                Script-friendly instance list
homarr logs <container>    Follow logs
homarr open <container>    Open in browser
homarr stop <container>    Stop
homarr restart <container> Restart
homarr remove <container>  Force-remove
homarr doctor              Check Docker and optional CLI integrations
```

## Development Browser

```text
/              Filter by PR number, title, author, branch, CI, image, state, or port
↑/↓ or j/k     Select
Enter or Space Pull latest image and start, or stop when already running
R              Build a remote PR locally or rebuild a local image
p              Pull a remote PR image and redeploy, preserving port and volume
m              Toggle demo mode for the next launch
o              Open PR on GitHub
a              Open running app
l              Toggle inline logs for the selected running PR
f              Follow or pause inline logs
Page Up/Down   Scroll inline logs
b              Show or hide bot PRs
r              Refresh
q              Quit; during a pull, cancel it
```

Pull progress, layer completion, local build provenance, selected PR details, CI state, image availability, inline logs, and the final port remain inside the TUI.

## Instance Dashboard

```text
/              Filter by name, image, state, health, port, or URL
↑/↓ or j/k     Select
l              Toggle inline logs
f              Follow or pause logs
Page Up/Down   Scroll logs
s              Stop
R              Restart
x              Remove with confirmation
o              Open in browser
c              Copy URL
r              Refresh
q              Quit
```

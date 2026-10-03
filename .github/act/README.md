# Running CI locally

Install [Act](https://nektosact.com/installation/index.html) and ensure Docker is running, then use:

```bash
bun run ci:act:fast
bun run ci:act:docker
bun run ci:act:all
bun run ci:act:cleanup
```

`fast` runs the database checks and quality gate. `docker` and `all` use the manual validation event to run those checks, build the container once, and run the converter boot/restart smoke test. `cleanup` validates the manual cleanup path without calling GitHub. The wrapper supports regular clones and Git worktrees, including non-default Docker contexts. Linux dependencies are kept in Docker volumes instead of overwriting host `node_modules`. The first run downloads the Act runner and Playwright browser dependencies.

For rootless Docker, set `ACT_TESTCONTAINERS_HOST` to a host address reachable from the runner when loopback callbacks are unavailable.

Remote caching is optional locally. Copy `.github/act/.secrets.example` to `.github/act/.secrets`, populate it with rotated credentials, and run with:

```bash
ACT_SECRET_FILE=.github/act/.secrets bun run ci:act:all
```

Act never publishes or deletes GHCR images. The secret file is ignored by Git.

## PR preview images

Successful non-draft pull requests from this repository publish an amd64 image:

```bash
docker pull ghcr.io/homarr-labs/homarr-test:pr-<number>
```

The tag is replaced when the pull request is updated and deleted when it closes. Production Homarr images remain the supported multi-architecture releases. The `homarr-test` package must be configured as public in GHCR for unauthenticated testers.

## Dokploy preview cache

Keep `needs-demo` as the Dokploy preview label. Under the application's **Preview Build-time Secrets**, configure `TURBO_API`, `TURBO_TEAM`, `TURBO_TOKEN`, and `TURBO_REMOTE_CACHE_SIGNATURE_KEY`. Dokploy passes these to the Dockerfile as BuildKit secrets. Do not configure the token or signature key as Docker build arguments.

Rotate any credentials that have appeared in chat, logs, or committed configuration before enabling the cache.

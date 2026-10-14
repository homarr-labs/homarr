# Disposable Nitro fixture

Requires Bun 1.4.2 and Docker Compose v2 with `--wait`. From the checkout root:

```sh
bun --no-env-file apps/nitro-experiment/scripts/container/run.ts
```

This snapshots only the experiment source, approved manifests/lockfile and patches into a temporary build context, builds one Bun/Nitro container, and waits for a database-backed public-board read. Open <http://127.0.0.1:3100/boards/public>; keep this exact browser origin. Internal listening is `0.0.0.0:3100`, but host publication is loopback-only. Fixture identity selection is not production authentication: never expose this container publicly or provide real Homarr data, environment files or credentials.

The dedicated Compose volume mounts `/app/.fixture-data`, relative to the server's `/app` working directory, never `/appdata`. Committed edits survive restart; sessions and process-local caches do not. Bun runs directly as PID 1 and Nitro owns signal handling and database close.

```sh
docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml restart fixture
docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml down
```

`down` retains the disposable volume. Always use the command above to build; direct repository/app-directory build contexts are not supported.

# Bun worker packaging

## Current contract

- `bun scripts/assemble-backend.mjs --worker` bundles `apps/worker/src/index.ts` to `apps/worker/build`.
- `docker build --target worker -t homarr:worker .` builds an Alpine worker with Bun 1.4.2 and no Node binary, Nginx, dashboard, or Redis server.
- HTTP binds directly to `0.0.0.0:3002`; data lives under `/appdata`.
- `docker exec <worker> homarr --help` runs the operational CLI with Bun.
- `docker exec <worker> homarr-worker pair` explicitly prints the local pairing information, including the one-time claim URL while the worker is unclaimed. This information is not served over HTTP.
- The existing `backend` and default `runner` targets remain separate compatibility targets.

The worker assembler rejects emitted Next/React/Mantine modules and legacy `@trpc/*` / `@orpc/trpc` modules. The API migration must make that guard pass; a compatibility wrapper does not satisfy this worker build.

## Size changes

The previous headless image shipped a 122.6 MiB Node binary plus a 70.1 MiB Bun binary. The worker contains Bun alone. Its base installs only the C++ runtime, CA certificates and `su-exec`.

The shared Bun assembly now bundles Drizzle with a static Bun SQLite adapter rather than copying its complete 17 MiB multi-driver package and the 13 MiB `better-sqlite3` package. Migration, CLI and HTTP entrypoints share chunks. Optional SSH native accelerators, build output, native build tool symlinks, source maps, declaration files and test fixtures are omitted from runtime package copies. This also avoids copying a 7.7 MiB Python binary through an SSH build symlink.

Only SQL migrations and their `_journal.json` files are needed at runtime: about 312 KiB together, versus several MiB of development snapshots and Node bundles. Bundle metadata remains a local build artifact and is omitted from the image. Unicode is preserved as UTF-8 rather than expanding translations into ASCII escape sequences.

Before the separate native worker exists, these shared improvements reduce the compatible backend artifact from about 103 MiB to 58 MiB on disk. This is an intermediate artifact measurement, not the final worker image size or RAM usage.

## Lifecycle and compatibility

The shell entrypoint supports `_FILE` secrets and defaults to UID/GID 1000. On first launch, a small Bun helper creates persistent encryption and authentication secrets under `/appdata/worker` before migrations. The directory is mode 0700 and the files are 0600; no secret is printed. Explicit environment secrets are preserved on first launch, and a mismatch with an existing stored secret aborts rather than silently replacing the encryption key. An existing SQLite database without a stored worker key requires the original encryption key to be supplied. The helper reuses stored keys on later launches. `homarr` also loads these keys for operational commands run through `docker exec`.

The entrypoint migrates SQLite or PostgreSQL with Bun, then starts the worker. Migration failure prevents HTTP startup. SIGTERM is forwarded to the active child. A successful worker exit requests reopening the database after backup restore; other failures propagate as container failures. The shell supervisor avoids paying for an additional resident Bun process.

SQLite keeps foreign keys enabled and `busy_timeout=5000`, including read-only backup connections. The existing SQLite format and database-driver configuration stay compatible. PostgreSQL keeps its existing migration path.

The worker image and single-service Compose file select `HOMARR_STATE_BACKEND=memory`; integration caching and Pub/Sub use the worker's in-process adapter. External Redis remains an explicit alternative when needed. No Redis binary is embedded in the worker image.

## Evidence recorded during implementation

- 2026-10-16: copied assembled compatible backend outside the checkout to `/tmp/homarr-worker-package-yy6SkX`; Bun SQLite migration and `cli.js --help` both exited 0 without a repository dependency fallback.
- Initial full worker Docker build reached dependency installation and exposed an in-progress workspace manifest reference before `@homarr/remote-protocol` had been created. Rebuild once concurrent manifest/lock updates settle.
- Built `homarr:worker-runtime-fixture` from that intermediate artifact to validate the runtime independently of concurrent API edits: image ID `sha256:de102020f64c88e99ee5b2f9136cfcb82130f221813d2be54614a37deeb7485c`, Docker size 135,947,767 bytes (129.65 MiB), versus 353,019,421 bytes (336.67 MiB) for `homarr:headless-hono-local`. This fixture still contains the former compatible API and is not the native worker release candidate.
- In the fixture: no Node/Nginx/Redis executables, Bun 1.4.2, actual HTTP process UID 1000, fresh SQLite migration and repeated migration successful, 41 SQLite tables, ready endpoint HTTP 200, Bun CLI users/help successful, and SIGTERM completed with exit 0.
- The same Alpine/Bun artifact successfully ran a fresh PostgreSQL 17 migration. The compatible fixture consumed 254.3 MiB in one Docker stats sample; it still initializes the old jobs and icon data. That measurement is not a native worker memory claim.
- Persistent-secret bootstrap was checked separately: creation and a second run both exit 0; the key remains unchanged; a mismatched configured key fails; file/directory modes are 0600/0700; stdout is empty.
- The next compatible-artifact fixture (`homarr:worker-memory-fixture`, 132,417,669 bytes / 126.28 MiB) verifies zero-config startup without supplied secrets. With `--network none` and `NO_EXTERNAL_CONNECTION=true`, its readiness endpoint returns 200, the persistent files have correct permissions, and `docker exec ... homarr users list` succeeds without Redis. One loaded compatible-runtime sample was 202.9 MiB. Native lazy-worker measurements still remain separate.

## Native worker image and runtime evidence

The full source Docker build succeeded for `homarr:worker-small-local`, image ID `sha256:7804a6fc4ad56c5be337447eb780bf72ae55227eb87edc1a4d7d39bc2db99d43`. Docker reports 128,656,911 bytes, or **122.70 MiB uncompressed**, versus 336.67 MiB for the original headless image: about **63.6% smaller**. This is image storage, not RAM.

The actual native worker image starts with no supplied secrets, migrates SQLite and reaches readiness 200 without Redis. The only resident processes are the small shell supervisor and Bun, both UID 1000. No Node, Nginx or Redis executable is present. Identity, pairing and encryption-key files are mode 0600 beneath a 0700 worker directory.

The assembler's local metafile contains 2,561 emitted modules across 453 files and a 484-byte entrypoint. Its emitted graph contains no Next.js, React, previous backend app, tRPC or oRPC tRPC bridge modules. Domain APIs and their SDKs load through dynamic imports after the encrypted connection has authenticated.

The same running container was exercised through the actual pinned-identity encrypted WebSocket protocol and the oRPC client:

| Phase              | Functional result                                             | Docker working-set sample |
| ------------------ | ------------------------------------------------------------- | ------------------------- |
| Fresh idle worker  | Readiness 200                                                 | 8.145 MiB                 |
| Claimed owner      | Encrypted `/remote/info` 200                                  | 8.895 MiB                 |
| Board read         | Encrypted list and seeded board 200; four apps, three widgets | 33.88 MiB                 |
| Native oRPC        | `client.info.getInfo()` returned its result                   | 73.77 MiB                 |
| OpenAPI generation | Encrypted document 200 with 42 paths                          | 95.96 MiB                 |

These are sequential phase-specific samples from one container, not a sustained-load benchmark or a controlled comparison with the old monolith. CPU samples after requests were below 0.3%. The initial unclaimed pairing URL was available only through the local operator command; after claim, the pairing file reports `claimed: true` and no longer contains the claim secret.

A clean worker exit was requested to exercise the supervisor's database-reopen path. The Bun PID changed, readiness returned 200, and hashes of the persisted identity and encryption key remained identical. This verifies the restart mechanism used by restore; it does not replace an actual encrypted backup export/import acceptance check.

The same image also ran against a fresh PostgreSQL 17 service with `DB_DIALECT=postgresql` and `DB_DRIVER=node-postgres`. Its Bun migrations and seeds succeeded, 40 public tables were present, readiness returned 200, and `docker exec ... homarr users list` queried the database successfully. No Redis service or supplied secrets were required.

That check exposed a CLI-only delay: the server's PostgreSQL pool kept a completed operational command alive for 60 seconds. The worker CLI wrapper now sets internal `HOMARR_CLI=true`; the shared PostgreSQL driver sets `allowExitOnIdle` only for that mode. A Bun/Alpine check against the same PostgreSQL fixture with the current source confirmed prompt successful command exit. Server pool lifetime remains unchanged. The next final image rebuild must include this fix. [PostgreSQL pool option](https://node-postgres.com/apis/pool).

All packaging smoke containers, databases and networks were cleaned up after recording evidence. The native worker image remains available locally. Obsolete fixture images and one exact obsolete failed-build dependency cache were removed when disk space became constrained; unrelated caches and images were preserved.

Final-source rebuild after integration fixes, actual backup restore, relay integration and sustained-use measurements remain integration acceptance work. Avoid using the first image as proof of source changes made after its build context was captured.

## Final frozen-source verification

This section supersedes the earlier **122.70 MiB** image and **33.88 MiB** board-read sample. The final image includes later authorization, REST, scheduling and share-data changes; earlier measurements describe an intermediate implementation.

Built from the final runtime source freeze with `docker build --target worker -t homarr:worker-small-final --progress=plain .`:

- Image ID: `sha256:3baf78c324bc9c625c1ab91966078eaf035d231f84452ee16483b8c7d6cd2523`.
- Docker image size: **128,682,138 bytes / 122.72 MiB uncompressed**, approximately **63.5% smaller** than the original 336.67 MiB headless image.
- Bun is pinned to 1.4.2. The emitted dependency guard passed without Next.js, React, tRPC or the oRPC tRPC bridge. Node, Nginx and Redis executables are absent.
- Actual worker processes run as UID 1000; the worker directory is 0700 and identity, pairing, encryption-key and access-database files are 0600.

The completed encrypted acceptance run measured these sequential Docker working-set samples. They are not a sustained-load benchmark; a separate fresh start of the same image sampled 7.027 MiB idle.

| Phase               | Final image RAM sample |
| ------------------- | ---------------------- |
| Idle, unclaimed     | 11.48 MiB              |
| Claimed owner       | 12.16 MiB              |
| Seeded board read   | 84.80 MiB              |
| Native oRPC request | 84.77 MiB              |
| OpenAPI generation  | 100.60 MiB             |

Actual requests against the packaged image passed:

- Encrypted owner claim, board listing and seeded board read with four apps and three widgets.
- Native oRPC `info.getInfo()`, OpenAPI document generation with 42 paths, parameterless REST reads and string-to-number pagination coercion.
- MCP initialization, listing 133 tools and executing `info_getInfo` through the trusted encrypted owner session.
- A separate relay container carried an encrypted shared-board request successfully; the same viewer received 403 for an owner API.
- A 21,804-byte ZIP backup was exported over the encrypted connection. The board was renamed through native RPC, then restored from that archive. Bun restarted, the original board name returned, the same owner device/grant reconnected, the share grant reconnected through the relay, and the worker identity, encryption key and claimed state remained unchanged.
- Plain HTTP requests to private RPC/API/MCP/control/pairing paths returned 404.
- Fresh PostgreSQL 17 startup applied migrations and seeds, produced 40 public tables and returned readiness 200. The actual packaged operational CLI queried it and exited successfully in **316 ms**, confirming the idle-pool fix is included.

Approximate image contents, measured without reading secrets:

| Component                                                           |               File bytes |   MiB |
| ------------------------------------------------------------------- | -----------------------: | ----: |
| Bun binary                                                          |               73,475,696 | 70.07 |
| External runtime dependency closure                                 |               26,069,973 | 24.86 |
| Backend JavaScript chunks                                           |               16,490,731 | 15.73 |
| SQL WASM assets                                                     |                  659,730 |  0.63 |
| SQL migration files and Bun migration entrypoints                   |                   71,123 |  0.07 |
| Base OS, libraries, certificates, scripts and Docker layer overhead | approximately 11,915,000 | 11.36 |

The Node binary previously cost about 122.6 MiB by itself and is now absent. Bun's approximately 70 MiB binary and the complete integration SDK/dependency set account for most remaining storage. These file measurements are approximate components of Docker's layer total; `du` reports larger allocated sizes for many small files.

The final worker and relay images are retained locally. Packaging smoke containers, their attached anonymous volumes, private test databases and test networks are removed after evidence collection. No task-owned listeners remain from these checks. This verification establishes local packaged behavior; it is not publication, production deployment or every upstream integration/provider acceptance.

References: [Bun SQLite](https://bun.com/docs/runtime/sqlite), [Bun Docker guide](https://bun.com/guides/ecosystem/docker).

# Bounded Linux public-fresh runtime envelope

## Decision: containment is practical; boot is still HELD

Coordinator-approved envelope amendment: the supervisor, its actual child and the cleaned `/usr/bin/env -i` launcher now require exactly SIX keys, adding the fixed literal `BUN_RUNTIME_TRANSPILER_CACHE_PATH=""` to the five listed below. Independent source review confirmed Bun1.4.2's empty-value cache disabling; source correction is frozen at `convergence-LINUX-cache-fix.md`. This supersedes the five-key cache hold, not the fresh-dummy runtime/static-check gates. No image-default environment may be inherited, no fixture freshness relaxed, and no boot or cache-free execution claimed from the amendment.

The coordinator reports the approved `oven/bun:1.4.2` image digest is cached: `sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`. Use that exact digest with pull disabled, not the mutable tag. This report does not independently establish image architecture, binaries, mount UID behavior or artifact availability. K complete-target acceptance and D consumer acceptance are pending; the coordinator's local compiler-only build is not runtime release. Do not boot, import the application, migrate or seed until those gates and final artifact verification pass.

This worker only read source/reference documentation and wrote this report. No shell commands, build, Docker operation, runtime/native/SQL probe, tests, product changes, data/env/secret access or delegation occurred. No K catalog, migration catalog or build-graph work is duplicated here.

## Actual public-only closure: not an auth/native exemption

The following are source edges, not claims about the final bundler's retained output:

| Reached source                                                                                            | Unconditional edge / actual selected behavior                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/server/entry.ts:1–7`                                                                        | Nitro, `srvx/bun`, host close and startup configuration are static imports; configuration is loaded before serving.                                                                                                                                                                                                                         |
| `apps/backend/src/server/host.ts:2,12–47`                                                                 | Composition is statically imported. The first application request initializes one retained promise, not a fresh owner per request.                                                                                                                                                                                                          |
| `apps/backend/src/server/compose.ts:1–8,17–58`                                                            | Statically imports both public runtime and `@homarr/auth/nitro/verifiers`; public-only avoids constructing authenticated resources but does not conditionally import these modules.                                                                                                                                                         |
| `apps/backend/src/server/runtime-composition/runtime.ts:3–33,78–92,129–185`                               | Public construction always opens/prepares native main persistence, settings, culture and the two real public RPC leaves. Authenticated-read assembly/resources are nevertheless static imports.                                                                                                                                             |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts:2–14,411–417,486–500`             | Statically imports production sessions, DB runtime, seed, proxy reader, epoch and auth helper. Production issuer construction is conditional; loading its module is not.                                                                                                                                                                    |
| `packages/auth/nitro/verifiers/index.ts:1–8,21`                                                           | Verifier barrel exports basic/LDAP verification, LDAP client and security. `ldap-client.ts:1` imports `ldapts`. `basic-authorization.ts:5` and `security.ts:1` reach `bcrypt`.                                                                                                                                                              |
| `packages/auth/nitro/production-sessions/service.ts:1,24–31,43–57`                                        | Reaches `@auth/core`, basic/LDAP verifiers, OIDC provider and SQL authority. `sql-persistence.ts:24` → `sql-authority/authority.ts:13` → security is another static bcrypt path.                                                                                                                                                            |
| `node_modules/bcrypt/bcrypt.js:1–2`, `package.json:14,32–35`                                              | Observed installed bcrypt 6.0.0 calls `node-gyp-build` at module load. Not calling compare/hash does not avoid native loading when that import survives packaging. This installed source observation is not a Linux binary verification.                                                                                                    |
| `packages/db/runtime.ts:8–18,49–56,217–325`                                                               | Both migrators, both schemas and core driver barrel are static imports. Fresh SQLite creates the absent file exclusively, applies packaged SQLite journal SQL, seeds and applies custom migrations.                                                                                                                                         |
| `packages/core/src/infrastructure/db/{index.ts,drivers/index.ts,drivers/sqlite.ts,drivers/postgresql.ts}` | Selected SQLite uses built-in `bun:sqlite` + `drizzle-orm/bun-sqlite`, not `better-sqlite3`. PostgreSQL's `pg` and Drizzle driver remain static imports through the barrel, without selecting/creating a PostgreSQL pool. A manifest dependency on better-sqlite3 alone is not an unconditional native load.                                |
| `runtime-composition/persistence.ts:45–65`, `packages/db/migrations/seed.ts:1–31,39–61`                   | Seed runs with `allowMockIntegration:false`, `demoMode:false`; it reaches SuperJSON, common IDs/grid utilities, definitions, server settings, bundled custom-widget definitions/validation and DB queries/schema. Fresh checks require no users and onboarding `start`. Seeded external URL strings are data, not permission to fetch them. |
| `apps/nitro/src/{entry-server.tsx,ssr/render.tsx}`                                                        | SSR reaches the same host plus generated client/server asset manifests, public React/router/provider rendering and standalone translations. Reached JS/CSS/catalog/font/image assets must be in the final artifact.                                                                                                                         |

Public RPC is explicitly limited to `serverSettings.getCulture` and `serverSettings.getBranding` (`public-rpc.ts:14,119–129`); real handlers read SQL settings (`packages/api/src/nitro/routers/server-settings.ts:57–83`). No CLI, pre-migrator, Redis, jobs or provider enrollment is needed for this public-fresh run. Do not mount those runtimes to repair a missing import.

**Final closure gate:** inspect the completed coordinator artifact, not intermediate SSR output or the host installation. All entry/chunk/package imports, conditional requires, dynamic assets and native loaders reachable at Linux startup/first public request must resolve entirely inside that artifact or the cached image's verified built-ins. Record artifact identity, image/platform identity and the resolved retained native files. In particular, `apps/nitro/vite.config.ts:126` forces SSR host externals; final output must still resolve one physical host module for SSR, entry and lifecycle, without checkout/source/workspace escape.

For retained bcrypt, verify packaged loader/helper files and an actual Linux ELF addon compatible with the cached image's CPU architecture, libc and Bun Node-API support, including its dependent shared libraries. Darwin Mach-O output is not portable. Some packages distribute several platform prebuilds; that is a possibility, not observed presence or working compatibility. Do not assume all native dependencies are Darwin-only either. Missing addon, loader, shared library, source external or Linux resolution is a precise **artifact/native-closure HOLD**. Do not copy/mount host `node_modules`, substitute bcrypt, install, compile in Docker or claim cross-platform binary parity. If the approved local build cannot package the required existing Linux dependencies, return the blocker for separate authorization.

## Minimum mount and UID contract

Before any later authorized execution, allocate a fresh coordinator-owned canonical synthetic fixture outside the checkout, build root and all real data. No existing product/database paths. No automatic source-directory creation by Docker. Only these three explicit bind mounts:

| Container target  | Source and access                                                                 | Required contents/permissions                                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/artifact`       | Exact completed artifact directory, read-only, private bind propagation           | Entry, chunks/dependency closure, public assets and accepted migration SQL/meta. No escaping symlinks or sockets. Runtime UID can read/traverse it without changing the artifact.                                |
| `/fixture-config` | Newly owned fixture config/control directory, read-only, private bind propagation | Mode `0700`; `host.json` private regular file `0600`, at most 1 MiB; reviewed non-product supervisor/verifier control code, if used, also private regular files. No env files, credentials or socket references. |
| `/fixture`        | Newly owned synthetic run directory, writable, private bind propagation           | Mode `0700`; separate `data`, `home`, `tmp`, `records` directories, each `0700`. `/fixture/data/main.sqlite` and its sidecars absent. Nothing except synthetic run output.                                       |

Choose explicit numeric nonzero `U:G` that owns the mounted config/file and data parent **as observed inside Linux**, and can read the private artifact. Use `--user U:G`; no supplementary group additions or in-container root/chown/chmod repair. Docker Desktop sharing/user namespaces can change presented ownership: host `stat` is insufficient. Contained preflight must establish `process.getuid() === stat.uid`, private modes, no symlink, canonical `realpath` equality and read/write permissions for the intended mounts. Failure holds rather than loosening modes. No fixed guess of UID 1000, and no claim that UID mapping establishes native credential provenance.

`startup-configuration.ts:333–411` enforces these properties for the config parent/file and DB parent, opens the config no-follow and refuses an existing DB. Migration directory must already exist, be canonical and separate from the DB parent/path. Read-only mounting is containment; it does not prove migration/schema completeness.

Use this exact JSON with container paths, not host paths or shell variables:

```json
{
  "version": 1,
  "authentication": { "kind": "public-only" },
  "listener": { "hostname": "127.0.0.1", "port": 3220 },
  "host": {
    "baseUrl": "http://127.0.0.1:3220",
    "basePath": "",
    "persistence": {
      "engine": "sqlite",
      "mode": "fresh",
      "path": "/fixture/data/main.sqlite",
      "migrationsFolder": "/artifact/db/migrations/sqlite",
      "epochInitializationTimeoutMs": 10000
    },
    "localeMutationBodyLimit": 4096
  },
  "culture": { "timeZone": "UTC" }
}
```

Supply exactly one `--homarr-host-config=/fixture-config/host.json`. Do not add issuer/API-key/provider/build fields to public-only configuration. The epoch budget only bounds the epoch operation after migration/seed; it is not an initialization or shutdown deadline.

## Docker containment envelope (prospective, not executed)

Create only one run container, retaining its exact ID for supervision and evidence. Required options/values:

```text
image: oven/bun@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895
--pull=never
--network=none
--read-only
--user=U:G
--cap-drop=ALL
--security-opt=no-new-privileges=true
--pids-limit=64
--memory=1g
--memory-swap=1g
--cpus=1
--ulimit=core=0
--restart=no
--no-healthcheck
--stop-signal=SIGTERM
--stop-timeout=10
--init
--workdir=/artifact
--mount=type=bind,source=ARTIFACT,target=/artifact,readonly,bind-propagation=rprivate
--mount=type=bind,source=CONFIG,target=/fixture-config,readonly,bind-propagation=rprivate
--mount=type=bind,source=SYNTH,target=/fixture,bind-propagation=rprivate
```

`U:G`, `ARTIFACT`, `CONFIG`, `SYNTH` are mandatory measured/prepared values, not literal defaults. Verify cached platform selection before creation; do not request a missing platform or allow another pull. Keep Docker's default seccomp and applicable default LSM protection. No privileged/unconfined mode, devices, host PID/IPC/network namespace, `-p`/`-P`, port 3100/3200, extra hosts, host gateway, additional network, socket/pipe mounts, Docker/API credentials or API endpoint mounts. No checkout/home/SSH/cloud/browser-profile/real-data mounts. No new image build, installs or browser download. Do not mount an image-provided writable volume outside the three mounts; inspect actual container mounts before spawning the app and fail on unexpected writable storage. The read-only root plus synthetic writable bind supplies required SQLite sidecar/temp writes without writable application code.

Override the image entrypoint/command explicitly with its verified Bun executable and `--no-env-file` followed by the reviewed supervisor control entry (or equivalent inline control code). Image-default entrypoint, healthcheck or default command must not start another application. Supervisor and child use a cleaned environment, retaining only `PATH` for verified image binaries, `HOME=/fixture/home`, `TMPDIR=/fixture/tmp`, `TZ=UTC`, `NODE_ENV=production`. No host environment forwarding, env files, DB_URL, proxy, NODE_OPTIONS/NODE_PATH, telemetry/provider/secret variables or ambient fallback. `umask 077` applies before fixture writes. Environment clearing is hygiene, not the egress mechanism.

Inspect the exact created container before application spawn: NetworkMode `none`, zero port bindings, no extra network attachments, correct UID, read-only root, capability/security settings, resource limits and exactly the allowed bind sources/access. Inside it, validate loopback and no external interface/default route. Unexpected state is a hold; never connect a network to debug. Network-none denies external IP connectivity, including host/daemon loopback; absent mounted host IPC/API endpoints avoids that separate escape. It does not prove no attempted outbound calls. Inspect before start with the supervisor's application-spawn gate, then recheck while that gate is waiting; no Docker control access belongs inside the container.

Official Docker documentation confirms [network-none has only loopback](https://docs.docker.com/engine/network/drivers/none/) and documents [run isolation, bind mounts, user, capabilities and resource controls](https://docs.docker.com/engine/containers/run/). Context7 was attempted but reported monthly quota exhausted; official read-only documentation was used instead. No runtime control was tested here.

## One supervisor, one application owner, finite execution

Use a small reviewed fixture supervisor, not a product patch/new test. Its implementation is a coordinator execution prerequisite; this report does not assert one already exists. Run it in the container beneath Docker init. It must never import host/runtime modules or independently open/migrate/seed the live database. It spawns exactly one child with the verified image Bun binary, `--no-env-file`, `/artifact/server/index.mjs`, and the one config argument, cleaned environment and working directory `/artifact`. No CLI/dev/start wrapper, watch mode, worker replicas, retries or restart. Source host singleton and final physical-module identity both matter.

1. **Preflight ≤10 seconds:** verify mounts/UID/paths/config/absent DB/entry/migrations and contained namespace, then check port 3220 in this namespace. A short loopback bind check may close before launch; it is not a reservation. The real entry uses `reusePort:false`; collision fails with no alternate port. Do not inspect/reserve host loopback ports.
2. **Startup ≤30 seconds from child spawn:** retain child handle/PID and bounded stdout/stderr. Wait for the source's literal bound message or child failure, within the same overall startup deadline. Binding alone is not ready. Send exactly one real GET `/about/runtime/foundation?view=summary` to `http://127.0.0.1:3220` using supervisor `fetch`, explicit abort deadline and redirects disabled. This reaches the application's retained initialization and real migration/seed/epoch. Require successful prepared SSR/bootstrap with anonymous principal and public-fresh setup, request ID and local asset manifests; error/timeout/non-success stops immediately, no retry and no second initialization owner.
3. **Public probes ≤30 further seconds:** same supervisor process and network namespace, HTTP only to the exact fixture origin, no proxies and no cross-origin redirect following. Require a second independent request ID, same-origin manifest assets with expected types, genuine POST `/rpc/serverSettings/getCulture` and `/rpc/serverSettings/getBranding` using the accepted existing oRPC request encoding, locale-cookie mutation/replay, `/manage` 401 and missing-route 404. Never treat a bound socket, generic 200, static page, reader fallback or fabricated RPC body as success. Per-request maximum five seconds (startup GET may use the remaining startup budget), streamed response limit 1 MiB and total stored probe/log evidence limit 8 MiB; exceeding a bound fails. Use current source contracts/existing accepted probes for payload validation, not invented wire formats or schema tables.
4. **Shutdown ≤10 seconds:** stop probing, TERM the retained application child and await its actual numeric exit and stream completion. The entry installs TERM/INT handlers and closes the host, server and Nitro hooks (`entry.ts:27–60`); host disposal is retained/idempotent. Native initialization/draining can still stall, so a parent watchdog is essential. Retain both application and supervisor exit status, not just Docker CLI success.
5. **Escalation ≤5 seconds:** if unreaped, KILL that retained child and await reap. Forced kill, shutdown rejection, nonzero app exit, OOM or leaked child is failure, never graceful-cleanup proof. Confirm listener disappearance with a bounded one-second loopback connect attempt while the supervisor still occupies the same namespace. Docker init reaps orphans; the application must not create untracked descendants. On inability to reap/verify, stop this exact container rather than opening a replacement owner.
6. **Stopped-DB verification ≤15 seconds, only after clean reap:** no application restart or live second DB handle. A reviewed verifier may use the same image's `bun:sqlite` read-only on `/fixture/data/main.sqlite`, launched/awaited by this supervisor in the same network-none container. Do not import product runtime/seed/migrator or use an unapproved sqlite executable. Compare actual stored serialized settings, no users/onboarding start, initialized epoch and accepted current D/K journal/schema against their frozen expectations; no historical fixed count. Keep credentials/identities out of records. Verification must not update SQL or recover/checkpoint/migrate/seed the file. If read-only opening would require recovery or a write, report that hold. After forced kill preserve data only as failure evidence, not a completeness result.

An independent trusted coordinator watchdog enforces **120 seconds total from container start**, even if supervisor/native code blocks or the client disconnects: TERM only this retained container, allow ten seconds, KILL only this retained container if necessary, and obtain stopped state/exit. Configure bounded daemon/client operations; if the daemon cannot establish stop/reap, return an operational hold without starting another attempt. The container never receives the Docker socket/API to perform its own cleanup. Retain state/logs and synthetic evidence before scoped container cleanup; do not use automatic removal that loses exit/OOM evidence or delete broad paths. Neither the parent nor the container probes host app ports.

The existing `apps/nitro/tests/public-browser.ts` still hardcodes 3200 and stale preview text. It is **not runnable in this envelope unchanged**. Browser/hydration proof remains separately held until its designated repair, a pre-existing verified Linux browser/dependency closure and same-container containment are accepted. Do not copy a Darwin browser or install one. HTTP SSR/assets success alone does not prove hydration.

## Release checklist / precise remaining holds

- K complete-target and D consumer acceptance, including the current exact schema/migration/seed set, must be supplied by their owners. This plan does not approve them.
- Completed local artifact must pass final standalone/Linux dependency closure and one-physical-host-owner verification. Retained native bcrypt/addons must have working compatible Linux files; host build success is not parity evidence.
- Verify the cached image's platform/Bun/init availability and actual contained UID/private mount behavior; no default assumptions or privilege repair.
- Reviewed finite supervisor and current stopped-DB verifier must be available as synthetic control inputs before execution. No runner was created or executed here.
- Fresh file path/mount/network namespace does **not** satisfy credential first-adoption provenance. `packages/db/runtime.ts:394–397` explicitly holds file-backed credential adoption without native fresh-resource provenance. Do not use this envelope to remove that hold or claim private-auth/K/D consumer acceptance.

Outcome available now: an actionable contained public-fresh plan within the approved cached-image/no-build/no-install constraints, **not permission or proof to boot yet**. Missing final artifact/native closure remains a material blocker; no host runtime, dependency copying, network fallback, schema repair or spec redesign is proposed.

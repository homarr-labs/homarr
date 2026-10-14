# AJN-505 packaging handoff

**Packaging editing-complete; container acceptance remains unverified.** Read AJN-505 and its relations read-only (assigned to Thomas), the approved local spec/coordination, foundation interface v1 and relevant architecture/packaging research. No Linear, roster, planning, manifests, lockfile, shared configs, application source, existing Homarr packaging, branches, commits or worktrees were changed.

## Changed paths and consumption

- `apps/nitro-experiment/{Dockerfile,.dockerignore,compose.yaml,README.md}`.
- `apps/nitro-experiment/scripts/container/{run,package-output,healthcheck}.ts`.
- This note only. No application registrations or new dependencies required.

Consumes exact app `package.json`, root `package.json`/`bun.lock` and its declared patch files, Nitro/Vite config, complete `src/**`/`server/**`, optional `public/**`, fixture database lifecycle, and `GET /rpc/board/read` with oRPC beta.43 JSON envelope. Root diagnostics currently report foundation-only and are not readiness evidence. The health probe instead verifies the public committed board, its positive safe-integer revision and populated label through the repository-backed API, which awaits `initializeDatabase()`; it does not use TCP acceptance or a separate SQLite connection.

## Implemented packaging boundaries

- `run.ts` creates a temporary allowlisted snapshot (prefer the harness temporary parent when present), hashes every input including dirty source, records HEAD as context rather than pretending it identifies dirty bytes, and invokes Compose with that context. Root/application environment files, existing outputs, node_modules, data and symlinks are excluded/refused. It never copies the entire Homarr repository. Root patch files are install metadata, not runtime packages.
- Installed Bun 1.4.2 official documentation explicitly supports frozen installation with absent unneeded workspace manifests. Docker installs using `--frozen-lockfile --ignore-scripts --filter @homarr/nitro-experiment --filter '!./' --minimum-release-age 0`; root dependencies are excluded, approved exact prereleases remain allowed only for this command, no source manifest/lock pruning or new resolution is performed. This pruned-context install still needs its first actual Docker verification.
- One builder compiles all currently registered feature modules through the app build script, then inventories the emitted graph/assets. One final stage copies the entire `.output`, not a hard-coded feature/chunk list, plus one health script and provenance JSON. No builder installation tree, compiler tools, root sources, Next/tRPC/Redis services or Homarr packages are copied into the application runtime. The Bun base retains its own standard OS tools and package-manager executable; no claim of a scratch/distroless image is made.
- Output audit checks the exact Nitro Bun preset/layout/version, bundled `bun:sqlite`, all literal imports and generated package-region/traced-package metadata; forbids Next/tRPC/Redis/Homarr packages, better-sqlite3 and unbundled builder packages, rejects imports/symlinks escaping `.output`, and inventories file bytes plus symlinks. Bundled Nitro runtime code is permitted; the Nitro builder package is not. Computed imports/erased minified package attribution still need final graph inspection; this is not a proof of every executed path.
- Runtime is direct exec-form Bun PID 1, with no shell launcher or competing listener. `SIGTERM` and a 15-second Compose grace period leave Nitro's existing close hook in control. It runs UID/GID 1000; the Dockerfile verifies the base's `bun` account and version and owns the empty `/app/.fixture-data` directory before switching user. The new Compose named volume copies up that ownership; existing/bind-mount permissions and actual graceful close remain unverified.
- Cwd is `/app`, with fixture SQLite at `/app/.fixture-data/fixture.sqlite`; volume mounts only `/app/.fixture-data`, never `/appdata`. Internal bind is `0.0.0.0:3100`, host publication only `127.0.0.1:3100`, configured browser/upstream origin `http://127.0.0.1:3100`. Restart reuses the same image/fixture volume; application lifecycle owns durable edits, cold sessions/caches and absent-only seeding.
- `/app/container-provenance.json` records staged input hashes, exact application manifest, Bun/OS/architecture, target platform, base reference, actual Nitro metadata, full output file/link hashes and literal import/package inventory. Build UUID remains Nitro's per-build identity rather than an invented source hash. Final image identity, native/emulated status, layer/distribution sizes and all performance observations belong to integration.

## Read-only evidence and precise integration concern

Existing `.output/nitro.json` identifies Nitro `3.0.260903-beta`, preset `bun`, entry `server/index.mjs`, public directory `public`. File inspection found lazy `_chunks/ssr-renderer.mjs` -> `_ssr/ssr.mjs`, several `_libs` files, and three initial public JS/CSS artifacts. `_libs/db0.mjs` imports `bun:sqlite` and bundles the selected connector; there is no external node_modules/native addon tree in this foundation artifact. No alternative SQLite driver was loaded or tested.

**Coordinator inspection/rebuild required:** the existing `_libs/@orpc/server+[...].mjs` has literal `./client+[...].mjs` and `../orpc__contract.mjs` imports, while the available files are `_libs/@orpc/client+[...].mjs` and `_libs/orpc__contract.mjs`. These emitted relative paths appear unresolved. This read-only finding conflicts with the foundation note's earlier successful runtime probes; no runtime was launched to settle the discrepancy. Rebuild exclusively during AJN-506 and inspect those exact emitted imports. If reproduced, reconcile the central Nitro/Vite bundling/tracing configuration at the coordinator boundary; do not hide it by copying the workspace install or rewriting capability source. The new artifact audit intentionally fails on such missing imports.

No Docker build/start, app build, install, health invocation, tests, lint or typecheck were run. Shell use was limited to a read-only existing-output file/size inventory. There are no measured footprint/startup/native-platform outcomes or benchmark claims.

## Documentation and image provenance

Context7's exhausted quota was already recorded by foundation; no retry or credential change was attempted. Verified released Bun docs/source directly:

- [Bun 1.4.2 install docs](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/pm/cli/install.mdx): pruned frozen workspace installs, scripts, linker, platform selection and release-age behavior.
- [Bun 1.4.2 filter docs](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/pm/filter.mdx): app selection and explicit root exclusion.
- [Bun 1.4.2 transpiler docs](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/runtime/transpiler.mdx): literal static/dynamic/require scan API and its accuracy limits.
- [Bun 1.4.2 environment docs](https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/runtime/environment-variables.mdx): automatic env loading and `--no-env-file`.
- [Official Debian Dockerfile](https://github.com/oven-sh/bun/blob/bun-v1.4.2/dockerhub/debian/Dockerfile): CA trust, UID/GID 1000, amd64 baseline/arm64 Linux binaries, inherited entrypoint (overridden here).
- [Docker build contexts](https://docs.docker.com/build/building/context/) and [Compose build reference](https://docs.docker.com/reference/compose-file/build/): ignore-file location, staged context resolution and build args.
- Read-only [Docker Hub tag metadata](https://hub.docker.com/v2/repositories/oven/bun/tags/1.4.2) returned the active OCI index digest `sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`; this is pinned in both stages. Returned Linux platform manifests were amd64 `sha256:296a79bbc988bb0a91ef11099af70a78a8cba98b73fd53f7b2a7715b7c86ced2` and arm64 `sha256:3121e24dc54514f0e37bcc996a9e6df64519b4caff03a33bbb9993baca7c403b`. Metadata availability is not a successful pull/build/native execution. No Docker platform is forced; the actual target/runtime architecture is recorded during build.

## Intended next commands and pending checks

After all source writers finish and coordinator reserves build/port/volume resources, from checkout root:

```sh
bun --no-env-file apps/nitro-experiment/scripts/container/run.ts build
bun --no-env-file apps/nitro-experiment/scripts/container/run.ts
docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml restart fixture
docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml exec fixture bun --no-env-file -e 'console.log(await Bun.file("/app/container-provenance.json").text())'
docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml down
```

Integration must verify frozen filtered installation against the pinned Linux image, whole final artifact import resolution/assets, UID/volume writes, actual initialization-gated readiness, browser/API access and updates, owner edit/restart persistence without reseeding, cold sessions/caches, PID 1 signal/SQLite disposal, native amd64/arm64 behavior where available, and exact final image/platform provenance. Record unavailable platforms/native binaries rather than implying multiarch validation. Run deferred scoped lint/typecheck, including these standalone packaging scripts (app tsconfig currently excludes `scripts`), only after all modifying workers finish. Health runs a short auxiliary Bun process every ten seconds; account for that observation overhead in any runtime measurements. No additional central manifest/registration change is requested unless the emitted-import concern reproduces or the frozen filtered install fails.

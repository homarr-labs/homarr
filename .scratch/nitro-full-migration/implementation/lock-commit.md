# #01 commit lock closure candidate

2026-10-10. #01 Bun r2 is accepted per coordinator/reviewer `ses_ed8e74a03ffeq5fG56QjWknEfm`. This handoff isolates the lock required by accepted foundation and UI manifest declarations from the separate experiment work. **The unchanged 216-addition lock candidate is commit-ready for the reviewed source-owned boundary: frozen installation and actual installed resolution checks passed after copying the four explicitly authorized HEAD dependency-installation patches into the disposable fixture.** No app source, working lock, manifest, index, branch, runtime or subsystem source was changed during this task.

## Candidate and commit boundary

- Base HEAD: `66e2199f9cd1e4026249c3763413988bab8664c4`.
- Owned temporary evidence directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-lock-closure.TRky6A`.
- Candidate patch: `staged-lock.patch` in that directory, addressed only to `bun.lock` and based on HEAD, **216 insertions, zero deletions**.
- Candidate lock: `candidate.lock`; machine-readable package origins and dependency chains: `closure.json`; range/manifest checks: `verification.json`; reproducible preparation/verification helpers: `closure.ts`, `verify.ts`.
- Patch SHA-256: `19a45ddd3e1aec96895fd25c10a919163372c64ade81530d14569ac34fdb0dae`.
- Candidate SHA-256: `a49637661907ff614e5d961c7edc960b5972b9783c491ef3528118ce5acce3cb`.
- Successful installation evidence: `frozen-with-head-patches.log`, `frozen-repeat-with-head-patches.log`, `frozen-install-proof.json`. Native resolution evidence: `installed-resolution.json` and `installed-resolution.log`. Patch-input hashes: `patch-fixtures.json`; final fixture-input hashes: `fixture-final-hashes.json`; unchanged-state/cleanup proof: `unchanged-state.json`. All paths are in the same owned evidence directory. Reproduction helpers additionally include `prepare-fixture.ts`, `run-frozen.ts`, `verify-installed.ts` and `capture-and-clean.ts`.

The candidate adds only the `apps/nitro` workspace, the approved UI Query workspace dependency, and **93 package keys: 39 foundation additions + 52 required pre-install-baseline additions + two scoped copies of the baseline crossws resolution**. All **2497 existing HEAD package entries** remain identical; all other lock configuration/catalog/override/patch/trust metadata remains identical. Existing workspaces are unchanged except the approved UI dependency. No experiment workspace or package registration is included.

Root manifest was checked structurally against HEAD with only build/dev/start targeting `@homarr/nitro`. UI manifest was checked against HEAD with only `./navigation` and `@tanstack/react-query: catalog:` added. The copied Nitro manifest matches the accepted working app manifest. Their respective SHA-256 values are:

```text
package.json                 b02a615d94491fc42221d707e1a5aba3c362522f396a861bb0c1b2263be652bc
packages/ui/package.json     3f5771032803e3f66366d2218125e622cd998ee4cbc8c6bf071f6ceaefac13dd
apps/nitro/package.json       ffe41fa6ff5a6b617802dd93168d60abc5c31b48d442c8c4d6a67f0c1d956d1e
```

The installation gate is complete; the coordinator may use the unchanged patch at the approved commit boundary. `git apply --cached --check <owned-directory>/staged-lock.patch` passed against the current empty index; this was a read-only check, not staging. Do not apply the patch to the working lock, stage the whole working lock, or include `apps/nitro-experiment`. No new package key, relocation repair or upgrade was needed after installation.

## Required pre-existing baseline entries: exact selection

The following **52 keys** already exist in the pre-install experiment baseline but not in HEAD. They are selected for actual foundation dependencies, not by copying the baseline wholesale:

```text
@orpc/client
@orpc/contract
@orpc/server
@orpc/shared
@rolldown/binding-android-arm-eabi
@standard-server/aws-lambda
@standard-server/core
@standard-server/fastify
@standard-server/fetch
@standard-server/node
@standard-server/peer
@standard-server/shared
@tanstack/history
@tanstack/react-router
@tanstack/react-store
@tanstack/router-core
@tanstack/router-core/cookie-es
@tanstack/store
@types/bun
bun-types
consola
db0
env-runner
exsolve
httpxy
isbot
nf3
nitro
nitro/h3
nitro/h3/rou3
nitro/rolldown
nitro/rolldown/@oxc-project/types
nitro/rolldown/@rolldown/binding-android-arm64
nitro/rolldown/@rolldown/binding-darwin-arm64
nitro/rolldown/@rolldown/binding-darwin-x64
nitro/rolldown/@rolldown/binding-freebsd-x64
nitro/rolldown/@rolldown/binding-linux-arm-gnueabihf
nitro/rolldown/@rolldown/binding-linux-arm64-gnu
nitro/rolldown/@rolldown/binding-linux-arm64-musl
nitro/rolldown/@rolldown/binding-linux-ppc64-gnu
nitro/rolldown/@rolldown/binding-linux-s390x-gnu
nitro/rolldown/@rolldown/binding-linux-x64-gnu
nitro/rolldown/@rolldown/binding-linux-x64-musl
nitro/rolldown/@rolldown/binding-openharmony-arm64
nitro/rolldown/@rolldown/binding-win32-arm64-msvc
nitro/rolldown/@rolldown/binding-win32-x64-msvc
nitro/rou3
ocache
radash
srvx
unenv
unstorage
```

Dependency-chain evidence:

| Foundation root                                 | Required chain                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@orpc/client` / `@orpc/server` `2.0.0-beta.43` | Client/server → shared and contract → `@standard-server/*` `0.10.2`, `radash` `12.1.1`; existing HEAD `cookie` satisfies the server requirement. No OpenAPI, JSON-schema, Zod adapter or TanStack-query adapter is required.                                                                                      |
| `@tanstack/react-router` `1.168.8`              | Router → history `1.161.6`, react-store/store `0.9.3`, router-core `1.168.7`, isbot `5.2.2`; core needs nested `cookie-es` `2.0.1`. Router plugin `1.167.7` accepts Router `^1.168.5`; plugin/generator retain their separate core `1.168.5` resolutions from the 39 foundation additions.                        |
| `@types/bun` `1.3.10`                           | Bun types → `bun-types` `1.3.10` → existing HEAD `@types/node`.                                                                                                                                                                                                                                                   |
| Nitro `3.0.260903-beta`                         | Nitro → consola, **db0**, env-runner, nf3, ocache, scoped H3/rolldown/rou3, srvx, unenv and unstorage. Env-runner → exsolve/httpxy and crossws. H3 `2.0.2` → rou3 `1.0.0` and srvx. Rolldown `1.2.13` → scoped OXC types and its platform optional bindings. Existing compatible HEAD dependencies remain reused. |

**db0 is explicitly approved as a required transitive dependency:** pinned Nitro's lock metadata declares `db0: ^0.4.1` under mandatory `dependencies`, not optional dependencies or peers. It is required installation closure despite having no configured application database use. Removing it would deliberately leave an unresolved mandatory edge. This does not select a relational adapter, change the Drizzle decision, initialize a database or choose an authentication engine.

### Placement without changing existing HEAD keys

HEAD has root `crossws@0.3.5`, used by existing `h3@1.15.11`. The pre-install baseline upgrades root crossws to `0.4.15` and adds `h3/crossws@0.3.5`. This candidate does **neither**:

- Preserve HEAD root `crossws@0.3.5` and root `h3@1.15.11` byte-for-byte.
- Add `nitro/crossws@0.4.15` for Nitro's mandatory `^0.4.12` dependency and scoped H3's optional matching peer.
- Add `env-runner/crossws@0.4.15` for env-runner's mandatory `^0.4.12` dependency.
- ORPC's optional `crossws >=0.3.4` peer remains compatible with HEAD root `0.3.5`.

Retain `nitro/h3@2.0.2` to avoid upgrading HEAD H3; retain `nitro/rou3@0.9.2` and `nitro/h3/rou3@1.0.0` because those incompatible mandatory ranges need distinct placement. The baseline's separate root `rou3@1.0.0` is not needed. Retain Nitro's scoped rolldown `1.2.13` and bindings without upgrading HEAD's root rolldown. Platform-specific optional binding entries remain in the lock for portable installation; they are not feature mounts.

Excluded baseline-only keys:

```text
@homarr/nitro-experiment
@openapi-spec/downgrader
@openapi-spec/types
@orpc/json-schema
@orpc/openapi
@orpc/tanstack-query
@orpc/zod
rou3
@homarr/nitro-experiment/zod
@orpc/zod/zod
h3/crossws
```

`apps/nitro-experiment` workspace is also excluded. Root HEAD Zod remains unchanged; only the required new app/plugin/generator scoped Zod entries remain. `closure.json` records each selected entry's original resolution/integrity and immediate incoming dependency edges. `verification.json` checks **195 edges** from the added packages using nearest scoped resolution and semver: no missing mandatory dependencies or incompatible selected ranges were found. This is static closure evidence, **not** Bun installation or build proof.

## Frozen-install gate: passed with authorized HEAD patch fixtures

Recreated the disposable, non-git copy containing HEAD `package.json` files (44), plus the new Nitro manifest (45 total), substituting the approved root/UI manifests and the **same candidate lock**. The only additional installation inputs were the four exact HEAD dependency patches authorized by the coordinator. No uncommitted current patch, workspace feature source, source fixture workspace, `.env`, assets, certificates, real data or repository Bun config was copied. A separate explicit fixture config sets hoisted installation and the public npm registry; clean HOME is owned temporary storage, and the native Bun package cache is explicitly selected.

Actual command, run in the disposable manifest copy:

```sh
env -i PATH="$PATH" HOME="$owned/home" bun --no-env-file install --config="$owned/fixture.toml" --cache-dir=/Users/ajnart/.bun/install/cache --frozen-lockfile --ignore-scripts
```

**First real install: exit 0**, preserved in `frozen-with-head-patches.log`:

```text
bun install v1.4.2 (744846f84)
Resolving dependencies
Resolved, downloaded and extracted [4]
2052 packages installed [6.62s]
```

**Repeated frozen install: exit 0**, preserved in `frozen-repeat-with-head-patches.log` and captured directly from the installer process in `frozen-install-proof.json`:

```text
Checked 2327 installs across 2314 packages (no changes) [361.00ms]
```

Both installations retained the exact candidate SHA-256 `a49637661907ff614e5d961c7edc960b5972b9783c491ef3528118ce5acce3cb`. No scripts, typechecks, builds or tests were run in the disposable copy, and no installation was performed in the working checkout. The earlier manifest-only failures remain available in `frozen-install.log` and `frozen-filtered-install.log` as historical evidence, not current blockers.

The four fixtures were obtained only with `git show HEAD:<path>`, checked byte-for-byte against that output, and verified unchanged after both installations. Their SHA-256 values are captured in `patch-fixtures.json` and `fixture-final-hashes.json`:

```text
patches/dns-caching.patch                318202089fc2269311563ab964016aee8144e8f228dee846b26c67556baa80c4
patches/@types__node-unifi.patch         5e6ae51e2a17a7f9729bfa30b0eb3d0842a5810ac6db47603ab4a6efa1ed84c5
patches/mantine-datatable@9.3.1.patch     8b83a773610215e619e3f5acbec2d26fb6f27b089852e2bc754d10d8515c1254
patches/trpc-to-openapi.patch            8d283209f305edbcee7f0ba3834d693afa36b4e6340173ce14075ee170e05355
```

No patchedDependencies metadata was deleted, no patch content/hash was fabricated, no existing workspace was omitted, and frozen mode remained enabled. All 45 manifests and four patch inputs were verified unchanged after installation.

### Actual installed Bun resolution and target ranges

`verify-installed.ts` reads installed package manifests and resolves dependencies from each consumer's actual directory using `Bun.resolveSync`; packages without a runtime entry use their installed manifest location. It does not import package runtime code or initialize the app/database. Starting from all accepted Nitro runtime/dev dependencies and the UI Query declaration, it checked **544 installed dependency/peer edges across 334 graph contexts**, with **zero version, required-dependency or effective range errors**. Existing HEAD overrides were respected without modification. It records 19 absent optional peers and 163 unsupported-platform optional dependencies, rather than claiming they are installed on Darwin arm64; the 14 absent added binding keys are all platform-specific optionals. The full portable binding metadata stays in the lock.

Observed physical locations relative to the disposable view:

| Consumer / logical lock key            | Installed version | Actual package directory                                                 |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| HEAD root crossws / H3 consumer        | `0.3.5`           | `node_modules/crossws`                                                   |
| `nitro/crossws`, also used by Nitro H3 | `0.4.15`          | `node_modules/nitro/node_modules/crossws`                                |
| `env-runner/crossws`                   | `0.4.15`          | `node_modules/env-runner/node_modules/crossws`                           |
| HEAD root H3                           | `1.15.11`         | `node_modules/h3`                                                        |
| `nitro/h3`                             | `2.0.2`           | `node_modules/nitro/node_modules/h3`                                     |
| `nitro/rou3`                           | `0.9.2`           | `node_modules/rou3`                                                      |
| `nitro/h3/rou3`                        | `1.0.0`           | `node_modules/nitro/node_modules/h3/node_modules/rou3`                   |
| `nitro/rolldown`                       | `1.2.13`          | `node_modules/nitro/node_modules/rolldown`                               |
| Router's `@tanstack/router-core`       | `1.168.7`         | `node_modules/@tanstack/react-router/node_modules/@tanstack/router-core` |
| Plugin/generator scoped router-core    | `1.168.5`         | `node_modules/@tanstack/router-core`                                     |
| `@homarr/nitro/zod`                    | `4.6.5`           | `apps/nitro/node_modules/zod`                                            |

Bun can physically hoist a logical scoped key while retaining the exact lock bytes; the per-consumer versions above, rather than an assumed directory layout, were verified. ORPC client/server `2.0.0-beta.43`, Router `1.168.8`, plugin `1.167.7`, Bun types `1.3.10`, UI/app Query `5.101.2` and transitive db0 `0.4.1` were also verified. `installed-resolution.json` contains every checked edge, range, version, location and optional skip. These gates establish dependency-installation closure on Darwin arm64, not a new app build, feature mount, DB restore or authentication approval.

## Unchanged state and resources

Before and after preparation, the historical failed attempts, both successful frozen installations, native/static resolution checks, cleanup and read-only index check:

```text
working bun.lock SHA-256       c54c7275e6ef5a56de90fa9891a1d71f8d5f353570088af094fe2d29eca00118
pre-install snapshot SHA-256   3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210
working index SHA-256          362772aa357157aeb7e525752e80c6a73251a530276f8ef4be956ccada82db65
```

The working index remains empty (`git diff --cached --name-only`). No staging, commits, worktrees, branch switches, nested agents, app source changes or manifest changes occurred. The exact owned `manifest-view` (including all installed node_modules and the four copied patches) and clean `home` directory were removed after evidence capture; candidate/patch/logs/JSON evidence/helpers remain in the owned temporary evidence directory for review. `unchanged-state.json` records cleanup and matching source/index/snapshot hashes. No temporary listener or application runtime was started. Accepted public server **PID 89683**, **127.0.0.1:3200**, remains running untouched; 3100, the person browser, appdata and pre-existing experiment work are untouched.

## Stop boundary and future declarations

Stop here for coordinator review and capture of the source-owned commit boundary. No use-intl/auth manifests or export graphs were inspected or changed. After the boundary is captured, a separately authorized phase may declare accepted **unmounted** use-intl `4.13.1` standalone/client/server subpaths and auth Nitro/policy/verifiers/session-primitives exports. Actual feature/provider mounting remains a later phase. Q16 remains unanswered; this handoff selects neither JWT nor an authentication bypass.

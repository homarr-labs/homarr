# Stage A public package ports — declaration handoff

2026-10-10. **Eight selected existing-file exports and three direct dependencies declared; no source or host work.** Base HEAD is `32fa336ce5ab27d7cb3f5590d1a84acf6e43c796`. Domain v2 declarations passed reviewer `ses_ed8ae7ec6ffe8NmVoNYNnNePfk`; oracle approved Stage A of `PUBLIC-HOST-JOIN.md`. These new declaration artifacts are returned for coordinator capture/review, not automatically committed or permission to mount B/C. D remains optional/held and received no new exports.

## Exact owned changes

| Manifest                         | Public path → existing target                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/db/package.json`       | `./runtime` → `./runtime.ts`                                                                 |
| same                             | `./driver` → `./driver.ts`                                                                   |
| same                             | `./copied-sqlite` → `./copied-sqlite.ts`                                                     |
| same                             | `./trusted-hostnames` → `./trusted-hostnames.ts`                                             |
| `packages/core/package.json`     | `./infrastructure/certificates/resources` → `./src/infrastructure/certificates/resources.ts` |
| `packages/settings/package.json` | `./context` → `./src/context.tsx`                                                            |
| `packages/ui/package.json`       | `./theme` → `./src/theme.ts`                                                                 |
| same                             | `./language-combobox` → `./src/components/language-combobox.tsx`                             |

All eight targets exist and resolve in the working installation. Resolving a filename does not inspect/accept an active producer graph. Existing seed/proxy-reader/API settings helpers and translation runtime declarations remain unchanged. No D context/contribution/steps, auth-type, HTTP/provider aggregate or wildcard widening was added.

| Actual consumer                                                                       | New direct dependency                       | Verified installed/catalog version and limit                                                                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| UI owner's imminent source branding relocation into `packages/ui/src/theme.ts`        | `@homarr/server-settings: workspace:^0.1.0` | Workspace `0.1.0`; declaration made before producer type imports. No duplicate theme implementation/library                                |
| Returned `packages/api/src/nitro/routers/certificates.ts:1`, six certificate adapters | `zod-form-data: catalog:`                   | Catalog, working/HEAD lock and installed metadata agree on `3.0.2`; adapter behavior review is separate, no consumption/mounting           |
| Separately allocated actual Bun sanitizer proof in API/media preparation              | `isomorphic-dompurify: catalog:`            | Catalog, working/HEAD lock and installed metadata agree on `3.18.0`; **not imported/evaluated, no SVG execution or runnable binary added** |

The sanitizer field supports the expressly selected imminent proof, not a newly demonstrated current consumer or Bun compatibility claim. Its existing lock closure includes DOMPurify/jsdom; no duplicate sanitizer dependency, new vendor entry, SDK upgrade or catalog/root edit. Existing zod-form-data closure is reused. Both vendor packages and the workspace dependency have six verified consumer metadata/resolution records across the working and closed HEAD installation views. Workspace fixture resolution checks its manifest/symlink, since that fixture intentionally contains no source.

Owned checkout writes are exactly the five manifests above, `bun.lock`, and this handoff. No app dependency preparation was necessary/selected, so `apps/nitro/package.json` is unchanged. No source/import cleanup, peer tsconfig, provider/route/session/SQL mounting, coordinator tracker, stage/commit, branch/worktree, build or listener change. Original uncommitted peer sources and experiment additions remain preserved.

## Fresh baselines and two lock views

Evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-package-ports-public.JKGtpg
```

`before/**`, `head/**` and `before.json` retain the exact new HEAD, all 42 tracked manifests, working experiment manifest, working/HEAD locks, index hash and original pre-install hash. Existing older evidence was not overwritten. The old fourteen-addition HEAD patch is **stale and was not reused** after the coordinator's curated commits.

| Artifact                                                     | Exact base/delta                                                                                      | Preservation                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `working-owned-manifests.patch`                              | Before-step working manifests → five owned current manifests; eight exports + three dependency fields | Structural additions only; textual 12 additions/one deletion is the terminal `zod` comma adjustment, not field removal                                                    |
| `working-owned-lock.patch`                                   | Before-step working lock → current working lock                                                       | Exactly three workspace dependency-field additions, zero deletions; all **2,601 package entries**, experiment workspace, root/catalog/metadata and other fields identical |
| `commit-declarations.lock`, `staged-declarations-lock.patch` | **HEAD `32fa336ce…`** → curated remaining declarations                                                | Exactly **ten additions, zero deletions**: seven still-pending reviewed fields plus three new fields; all **2,590 HEAD package entries** and other metadata identical     |
| `head-all-reviewed-manifests.patch`                          | Same new HEAD → ten pending reviewed composition manifests                                            | Prior reviewed declarations plus this step; textual 42 additions/two comma-line deletions, structurally additive; broader than this step's five files                     |

The ten HEAD lock fields are API dependencies oRPC client/server `2.0.0-beta.43`, isomorphic-dompurify and zod-form-data; API development drizzle-zod; Core dependencies Axios/Undici; integrations dependency Axios and development bun-types `1.3.10`; UI server-settings workspace dependency. Already committed backup/Bun/Common/culture fields are not repeated. Full exact keys/values and manifest comparison are in `declarations.json`.

Working-only experiment entries were neither copied into the candidate nor discarded. Working root crossws remains `0.4.15`; HEAD retains root `0.3.5` and its existing scoped copies. Structural comparisons validate every package entry, not just counts. Both HEAD-based patches passed read-only `git apply --cached --check`; **nothing was staged**. Empty index bytes and HEAD remain identical to the new snapshot.

### SHA-256 coordinator anchors

```text
before working lock             645c2edec4303bf70480befaf0c8a8ec76c543c0fc8ab1050f6dd94d4a897470
current working lock            d76adbf7da5151ca28c75f7cdb0e605b959ed463a444c4284333d26d44c4dfe6
current HEAD lock               96e011e06af293fe0e9c36881aef78cbc31437a97a45f9eca2cdcd0d15e996f2
closed declaration candidate     b370248201d1a765db89c139d03568841983ebb3343d4224f104182fc609e7cb
working-owned-manifests.patch    f7f81ea5ca663acf11d662bb63c308279fd8578d07ef543c6a4a2160320789b3
working-owned-lock.patch         be1f69b4e0455af805435384a71492e9c9c436eb9eae3e4b280622ad0f6a0651
head-all-reviewed-manifests.patch 42ecea11fe7bdd61df082e83eb2aa197c15c2813ed1170028b6164e1c8d1972a
staged-declarations-lock.patch   f4f2d43a26c37bad57df64d9a0ac9d1a378fc62c557af5c3a517233d0354bd39
graphs.json                     ac4996105bcc166e3cbe8cb5bf07cb298450001aba8773254ccb68e919d07fb9
resolution.json                 38c5f8d0be76fbe00ef20b897e18887ea5a86e6350eacf9978e190347c9953dd
unchanged empty index           e59e8f4982f0c9579ec21c104acafdb27e959014172d0e8d50438d68a7d997f8
original pre-install snapshot   3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210
```

Current manifest hashes:

```text
API      c73df99a30ca7e61161ba63cb3166b9ccf09a90bce0cd64beb67c6eddae352dd
Core     f454e3021ba3e2558bde3e07ed9a8439739376cd2456977d0b5d2becc625fd82
DB       7e29dc80a63aed1f6142a7e16263d39deeafd5675947e44ff86e98cb76c284ce
Settings d8f56678465fde37b54b01ee68b60db8951e88d6f469fe4bc194388c98e78307
UI       a4fa87f9dcf7eb921429ecf1b928e129774f31b7a42544650a2f909ad3e7ca47
```

## Exact installation and scoped checks

All Bun invocations used **`--no-env-file` with `env -i`**, explicit PATH and a new isolated HOME. Installs additionally used `--config=<owned>/clean.toml`, hoisted linker, **public `https://registry.npmjs.org`**, existing native cache and **`--frozen-lockfile --ignore-scripts`**. No package lifecycle scripts executed. No `.env`, credentials, current data, provider/paid call, browser, database, TLS operation, migration, build or server restart was used.

- **Working install:** exit 0, `Checked 2336 installs across 2321 packages (no changes)`. This intentionally preserves the experiment; it is not an experiment-free install. `frozen-working-install.log`.
- **Fresh source-free HEAD candidate:** 42 exact HEAD manifests, substituting only ten reviewed composition declaration manifests, four exact HEAD installation patches and the candidate lock. No producer/application source or uncommitted patch was copied. Exit 0, **2052 packages installed**. Repeated frozen install: exit 0, `Checked 2327 installs across 2314 packages (no changes)`. `fixture-provenance.json` records all 46 input hashes; both install logs remain retained.
- **Resolutions:** eight new public paths resolve in working; six direct dependency records verify actual consumer resolution/metadata/version in both views. NPM module resolution is not importing/evaluating the sanitizer/form-data library or testing conditional Bun exports. `resolution.json`.
- **Format:** all five edited manifests pass `oxfmt --check`. **Lint:** sixteen frozen copy/hostname/driver/certificate/backup files pass oxlint, zero warnings/errors. Source was not formatted/edited.
- **Typecheck:** the accepted **Core certificate resources entrypoint** and its actual pure source/type closure pass strict scoped TypeScript (`ES2024`, `ESNext`, bundler resolution, node types, noUncheckedIndexedAccess, existing skipLibCheck convention), zero diagnostics. `typecheck-certificates.log`.
- Copy/backup/driver/hostname type compilation was **not broadened across active runtime/driver/schema type dependencies**. No whole-repo, broad API/provider/trust, active metadata, UI/settings or Stage G compiler/test run. No tests were added/executed, no ambient Bun shim/assertion/diagnostic workaround and no vendor upgrade.
- Owned diff whitespace checks pass. Final artifact/source guard confirms current/fixture lock hashes, all 43 working manifests, 46 fixture inputs, original snapshot, unchanged empty index and **83 unchanged scanned frozen inputs**. `source-drift.json`/`final-state.json` preserve individual comparisons; the latter also records certificate hostname type-source and all artifact hashes. Active producer paths are excluded, not silently rebaselined.

Installed fixture dependencies and its isolated HOME remain in the owned evidence directory for review; no existing installation or baseline artifact was cleaned up.

## Frozen runtime graph evidence and honest holds

`graphs.mjs` parses imports/re-exports and uses Bun's transpiler import scan, including dynamic imports, **without evaluating modules or calling `Bun.build`**. It walks selected frozen workspace runtime edges only; type-only edges are recorded separately and not recursively followed/typechecked. NPM runtime internals are external references, not certified by this scan.

| Public entrypoint                                    | Scanned workspace inputs / type-only edges | Result                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@homarr/db/driver`                                  | 1 / 5                                      | Runtime erases completely; no runtime imports or evaluation calls. Physical/Bun/schema type dependencies remain separate, not a complete compile claim                                                                                                      |
| `@homarr/db/trusted-hostnames`                       | 1 / 1                                      | Runtime closure contains only external Drizzle import and the injected factory. `PersistenceRuntime` is type-only; it was not read/hashed/compiled                                                                                                          |
| `@homarr/core/infrastructure/certificates/resources` | 5 / 9                                      | Complete selected workspace runtime closure, node crypto/fs/path/tls only; no DB/HTTP/Next/Redis/server-common import or evaluation-time env access. Six certificate source files including the pure hostname type are in the scoped compiler/lint boundary |
| `@homarr/db/copied-sqlite`                           | 70 / 64                                    | **Partial/held closure**, stopped at active `DB/runtime` and Core PostgreSQL driver; no traversal of those sources                                                                                                                                          |
| `@homarr/api/backup-runtime`                         | 77 / 71                                    | **Partial/held closure**, same transitive active boundaries; frozen joined backup bytes recorded, no whole graph clearance                                                                                                                                  |

Complete ready workspace graphs have no top-level call/new/await expressions. Certificate files still contain legacy convenience functions that call `getCertificateFolder`/process.env **when invoked**; these are not evaluation-time initialization and are not the explicitly configured resources being declared. Do not call the entire file literally environment-free or consume the legacy wrappers. The scanned copy/backup prefix likewise includes the deferred `packages/definitions/src/docs/index.ts` environment lookup and source schema/Day.js/Zod metadata setup. No Next/Redis/legacy env-initialized connection edge appeared in that scanned prefix; its blocked active tails prevent certifying the whole closure.

Frozen entrypoint hashes:

```text
packages/db/driver.ts                                          df58ae6e03a2c874958432809543d5647351726de74135288bf79baebcc4c5b0
packages/db/copied-sqlite.ts                                   5ec3eff15753c331489250adf8a0a8443bdf62b150c8083be699c67d8b304b08
packages/db/trusted-hostnames.ts                               04f37c6b4d8e401b46b89faae06833494a08ec864a4e6d4f825903a30058c3d3
packages/core/src/infrastructure/certificates/resources.ts      06f89b442d67fcd05176fc0909c8cf56ca4d589d358a635cc7559152f11fc185
packages/api/src/backup-runtime/index.ts                       91362b63e6eafad7314bcbaa1ea259f79670397462be8797c127220e856777d1
packages/api/src/backup-runtime/sqlite.ts                      c7b86906a027661ec5e3d0f07f32b756196057c879e3417e0c4613fa1110f775
```

The backup hash is the authorized joined source now frozen/committed, not the historical parser-only hash. Its existing `sqlite.ts:1` imports `createSqliteCopyEngine` from `@homarr/db`; no cross-owner replacement was made. Copy custom migrations also reach that accepted tracked facade transitively. `packages/db/index.ts` re-exports `./runtime`; Core's `infrastructure/db/index.ts` and `drivers/index.ts` reference `drivers/postgresql.ts`. Those exact runtime edges are recorded as held rather than accepted from an older hash. Narrow copy export alone does not magically sever the migration/Core barrel closure.

### Active owner reservations — not scanned, hashed or compiled

- **SQL Stage G:** `packages/db/runtime.ts`, private `packages/db/transaction-gate.ts`, `packages/db/runtime.spec.ts`, its owner-only scoped config, and possibly `packages/core/src/infrastructure/db/drivers/postgresql.ts`. Ordinary copied engine, schemas, SQL assets and signatures are unchanged per coordination; current runtime/seed transitive graph remains **held**. No runtime source hash or old-HEAD graph substitution is offered here.
- **UI:** `packages/ui/src/theme.ts` receives the actual source branding algorithm; language control/icon imports under `packages/ui/src/components/{language-combobox,language-icon}.tsx` are being cleaned by the owner. Public paths resolve, but current theme/language graphs remain **held until return**.
- **Settings:** `packages/settings/src/creator.ts` byte-unit Common import and associated byte-format consumer cleanup remain with its owner. Declared context graph reaches creator and is **held until return**, not traversed as frozen.
- **Certificate adapters:** direct zod-form-data declaration only; their API behavior graph is not compiled, mounted or implicitly accepted by this dependency work. No Core HTTP/provider/root or public auth-type widening.

Producer return is required before exact new graph review and separate B/C allocation. Source owners alone clean public imports; this lane neither edits them nor waits/polls for their return. Existing seed/proxy/locale exports need no redundant declaration and receive no fresh active-runtime validation here.

## Coordinator stop boundary

Review the five-file step delta and the **new ten-addition HEAD lock patch**. Only coordinator stages/commits accepted declarations; never stage the full experiment-containing working lock or reuse the stale fourteen-addition patch. Ready evidence is declaration/install closure plus the bounded frozen graphs above; active/transitive holds survive.

No public host implementation begins without exact dependency/graph acceptance and new explicit allocation. No B/C/D feature, private authority/session reader, PostgreSQL runtime, SVG/binary endpoint, backup live apply/restore/restart, provider parity or ticket completion is claimed. Q16 remains open. Services at 3000/3100, 3100's image/volume, the person's browser and compiled **3200 PID 89683** were not accessed or changed; no 3210 listener was created.

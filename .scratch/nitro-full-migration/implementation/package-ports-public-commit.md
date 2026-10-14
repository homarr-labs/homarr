# Stage A-only curated commit artifacts

2026-10-10. **Fresh narrow candidate returned; nothing staged or committed.** Stage A passed independent review. HEAD was verified once as `32fa336ce5ab27d7cb3f5590d1a84acf6e43c796`; every candidate input below uses that explicit Git object. This delivery excludes all older pending declarations from the accepted ten-field candidate and does not alter that broader evidence.

Evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-package-ports-public-commit.w7GkHF
```

## Exact coordinator declaration artifacts

| Artifact                  | Scope                                                                  | SHA-256                                                            |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `stage-a-manifests.patch` | Exactly five HEAD manifests, eight exports and three dependency fields | `7b77015c4b9ff1917fbf503a1cffcbf02e35afb6a20981f2ea747080f8ddfb65` |
| `stage-a-lock.patch`      | HEAD lock plus exactly three fields, zero deletions                    | `c255ed4248b2cc333c5fd2c71ac0a8ca8778ac7f03560d597135870e96180920` |
| `stage-a.lock`            | Complete narrow candidate lock                                         | `a4c192514e0b907f2564c417aa553c99c1be86f57c1d91137bf11db9c1368581` |
| `head.lock`               | Exact HEAD lock baseline                                               | `96e011e06af293fe0e9c36881aef78cbc31437a97a45f9eca2cdcd0d15e996f2` |
| `candidate-proof.json`    | Structural comparisons, input provenance and source allowlist          | `8d42266593dfa64e9c1260c50b958e8dc9c44e724bfb8f19016a9a22a37f5d37` |
| `resolution.json`         | Six dependency records and eight public-path records                   | `13b92b046b7d892d3f1081ff9aa4f1a565e0a6282d238909f9c6415fac767bda` |

Manifest patch has 12 added lines/one removed line: the sole removal replaces the terminal API `zod` line with the same value plus a comma. **No field is removed or changed.** Both patches passed read-only `git apply --cached --check`; this did not modify the index.

| HEAD manifest                    | Only additions                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/api/package.json`      | Dependencies `isomorphic-dompurify: catalog:` and `zod-form-data: catalog:`                                                                            |
| `packages/core/package.json`     | `./infrastructure/certificates/resources` → `./src/infrastructure/certificates/resources.ts`                                                           |
| `packages/db/package.json`       | `./runtime` → `./runtime.ts`; `./driver` → `./driver.ts`; `./copied-sqlite` → `./copied-sqlite.ts`; `./trusted-hostnames` → `./trusted-hostnames.ts`   |
| `packages/settings/package.json` | `./context` → `./src/context.tsx`                                                                                                                      |
| `packages/ui/package.json`       | `./theme` → `./src/theme.ts`; `./language-combobox` → `./src/components/language-combobox.tsx`; dependency `@homarr/server-settings: workspace:^0.1.0` |

The lock patch adds **only** API's two dependencies above and UI's server-settings dependency. It preserves all **2,590 HEAD package entries**, every other workspace field, root/catalog/metadata and existing installation patches. Catalog versions remain isomorphic-dompurify **3.18.0**, zod-form-data **3.0.2**, server-settings workspace **0.1.0**. No upgrade, vendor/package entry or app declaration is introduced.

This is generated directly from HEAD, not the working manifests or ten-field candidate. It excludes older pending API/oRPC/router exports/dependencies, Core Axios/Undici, integrations, Redis and cron declarations. Already committed fields remain exactly as HEAD. Working-only experiment entries are not in this candidate and are not deleted from the checkout.

## Exact isolated install proof

New `fixture/` contains **42 HEAD manifests**, substituting only the five minimal Stage A candidates, candidate lock, and four exact HEAD installation patches:

```text
patches/dns-caching.patch
patches/@types__node-unifi.patch
patches/mantine-datatable@9.3.1.patch
patches/trpc-to-openapi.patch
```

All 46 manifest/patch inputs have SHA-256 provenance in `candidate-proof.json`. **No source was copied**, including the uncommitted certificate files or active producer files. No install ran in the checkout.

Both installs used Bun 1.4.2 with `env -i`, `--no-env-file`, isolated `HOME`, explicit PATH/cache, `--config=<evidence>/clean.toml`, public `https://registry.npmjs.org`, hoisted linker, **`--frozen-lockfile --ignore-scripts`**. No lifecycle script, `.env` or credential access.

- Fresh install: exit 0, **2052 packages installed**. `frozen-install.log`, hash `4536c4c0779575c21e787d1ac52467e39c73d95988fbab84a6ceb305e4737baf`.
- Repeat: exit 0, **Checked 2327 installs across 2314 packages (no changes)**. `frozen-repeat.log`, hash `6045f40834602f9de40a075aef4e7ee4cd745acf8b2185d9a5a5319d9b9f70e4`.
- Six dependency metadata/resolution records: three actual consumers in unchanged working installation and three in Stage A-only fixture. Versions match the catalog/workspace. Form-data/sanitizer modules were **not imported/evaluated**; fixture workspace record checks its metadata/symlink, not nonexistent fixture source.
- Eight candidate exports match exact repository paths and existing filename resolution/stat. **Seven targets are already in HEAD; only certificate `resources.ts` is absent.** Filename resolution does not accept active runtime/theme/settings graphs.
- Five fixture candidate manifests pass read-only `oxfmt --check` using defaults (fixture contains no formatting config). No source lint/typecheck/build/test rerun in this task.

## Minimal frozen certificate source-stage allowlist

Coordinator must include these **six files**, not just the new `resources.ts`, for its actual accepted runtime/type closure. Three files are absent from HEAD; three differ from HEAD. All six remain byte-identical to the already checked pure certificate set. This lane only compared that existing hash set; it did not copy, rewrite or stage source.

All paths below are under `packages/core/src/infrastructure/certificates/`:

| File                        | HEAD state / coordinator action | Exact accepted SHA-256                                             |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `resources.ts`              | Absent; include new file        | `06f89b442d67fcd05176fc0909c8cf56ca4d589d358a635cc7559152f11fc185` |
| `runtime.ts`                | Absent; include new file        | `04e514c5a9a7f5b076393bc0fe770fef3aa79e2a691172f1d6e0f05d1fdbab41` |
| `files/index.ts`            | Changed; include accepted delta | `f0df9652be6504a9f930440bb69ef88a8a32ec36e3932212cd7a47f3f974bb17` |
| `files/root-certificate.ts` | Changed; include accepted delta | `dfd21d6a8eeafc294728864a48ec560b51b8b340e76fd1b3027e10db71b6166d` |
| `hostnames/index.ts`        | Changed; include accepted delta | `51185a40011551799b53422123a1df1f35e81db549349cb29bdcd5a532b15540` |
| `hostnames/types.ts`        | Absent; include new type file   | `f59237040cabc4c0379bc2b1ec47d93e04e6fbb427ba36b5c4477541b8c9ecb7` |

Historical pure graph has **five workspace runtime files/nine type-only edges**; `hostnames/types.ts` supplies the sixth source in the type closure. Runtime externals are node crypto/fs/path/tls; no DB, HTTP, Next, Redis or evaluation-time environment initialization. Legacy convenience wrappers still read environment when invoked; declaration does not authorize their use as explicit resources.

Historical checks, retained unchanged under sibling `nitro-package-ports-public.JKGtpg/`:

- Strict scoped certificate entrypoint typecheck passed with zero diagnostics: `typecheck-certificates.log`, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty successful log).
- Six certificate source files were among sixteen frozen source files passing scoped lint, zero warnings/errors: `scoped-lint.log`, hash `e97b005bfafc83e42b57dd885571e137ff9ad88efac44bbfb6b0ef4cf365b763`.
- Historical static graph: `graphs.json`, hash `ac4996105bcc166e3cbe8cb5bf07cb298450001aba8773254ccb68e919d07fb9`. Only its already checked certificate record/hash set was consulted here, not broader graph rescanning.

These are **historical source-only checks**, not fresh whole-package/product acceptance. Do **not** stage/copy `trust.check` or any broad check importing active HTTP, the HTTP runtime, PostgreSQL/Stage G driver/private gate, UI theme changes, SVG proof, other trust barrels or certificate adapter source as part of this narrow allowlist.

## Preservation and stop boundary

`verify.mjs` / `final-state.json` assert 44 unchanged checkout manifest/lock hashes (42 tracked manifests, experiment manifest and lock), all 46 unchanged fixture inputs, six unchanged frozen certificate sources, and **28 unchanged prior reviewed artifact files**. Working lock remains `d76adbf7da5151ca28c75f7cdb0e605b959ed463a444c4284333d26d44c4dfe6`; empty index bytes remain `e59e8f4982f0c9579ec21c104acafdb27e959014172d0e8d50438d68a7d997f8`; original pre-install snapshot remains `3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210`. Broader accepted ten-field artifacts were not reused or altered.

Coordinator alone curates/stages the two HEAD-based patches and six accepted source files. **Do not stage whole working manifests or the experiment-containing working lock.** If the commit base changes, these explicit-base artifacts require reconciliation, not blind reuse.

Active DB Stage G/driver, UI theme/language producer, Settings join, Bun SVG sanitizer proof and HTTP managed proof remain outside this task. Copy/backup runtime tails through DB runtime and Core driver remain held. Dependencies do not approve certificate adapter consumption or sanitizer execution. No fresh active graph hashes were read or rebaselined.

Only this new handoff and owned temporary evidence were written. No checkout source/manifest/lock edit, checkout install, index/stage/commit, build, nested agent, credentials/data/DB/browser/provider/paid call/container or listener operation. Services at 3000/3100/3200 and reserved 3210 were untouched. This does not commit/accept host, private identity, proxy or a whole feature. **Stage B/C waits for G/UI acceptance, exact graph review and separate explicit allocation.** No producer wait/poll was performed.

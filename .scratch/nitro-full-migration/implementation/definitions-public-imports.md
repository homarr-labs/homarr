# Definitions public-object import cleanup — four-file frozen return

## Exact delta and fifth-file hold

**Freeze these four producer files for narrow read-only review.** The only source changes are the first-line module specifiers below; symbols, function bodies, iteration/order, permission parents, integration/release maps, types and existing comments remain byte-identical.

| Owned source                                             | Unchanged imported symbols    | Old edge         | New edge                |
| -------------------------------------------------------- | ----------------------------- | ---------------- | ----------------------- |
| `packages/definitions/src/permissions.ts:1`              | `objectEntries`, `objectKeys` | `@homarr/common` | `@homarr/common/object` |
| `packages/definitions/src/widget-integration-map.ts:1`   | `objectEntries`               | `@homarr/common` | `@homarr/common/object` |
| `packages/definitions/src/docker-integration-match.ts:1` | `objectKeys`                  | `@homarr/common` | `@homarr/common/object` |
| `packages/definitions/src/release-provider.ts:1`         | `objectKeys`                  | `@homarr/common` | `@homarr/common/object` |

Verified before editing: Definitions already declares `@homarr/common: workspace:^0.1.0`; Common already exports `./object → ./src/object.ts`. The Common root originally reexports `./src`, whose index reexports `./object`. Public resolution from the Definitions package resolves to the same physical `packages/common/src/object.ts`, not duplicate helpers or altered types.

**Fifth source HOLD:** `packages/definitions/src/integration-url-template.ts` remains frozen, unedited, with its existing `removeTrailingSlash` import from `@homarr/common`. Its `/url` import cleanup is not allocated until COMPOSITION returns the declaration. No polling, wait loop, manifest fix or premature edit was performed. The four-file return does not claim all five edges are closed or authorize a Settings browser build.

## Source hashes and original-body proof

SHA-256 before → after:

```text
packages/definitions/src/permissions.ts
fd1ed4153fe2a903663e80e0991dcaafffc5ae5d4dba7f78deedf9916425c327
13ed37057c8060094a6dd4d00a7fc3c0911f6c5d437a29686d2f99fa4b8918cf

packages/definitions/src/widget-integration-map.ts
76da1d98481d88afd1dda081ad7b0007c4b5187141d181f3ea72829b2171ea2d
01b1558f32a8ddf9637f733337d651692ad2c588cf50747d04a30cf87c908d84

packages/definitions/src/docker-integration-match.ts
e5df33d42c1eb6cfcaac80267f125598ff7b0b74d55a196f3e804976ff5d1893
305fabc0f3eacd18223ed1d3ec5adea6c30fe34f1351839f4e60bd5493768cc4

packages/definitions/src/release-provider.ts
5b0b5ecf3e1e1da0b9ef4e2c171349caad13dc01091b775858e3bd32640c0c4a
9c8c4186f978a7b557f6c84669614652b20df380500dd3777487e7ecb2a01496
```

Reversing only `@homarr/common/object → @homarr/common` in memory reproduces every recorded original file hash exactly. This proves all bytes outside those four module specifiers are unchanged, including source comments and type declarations.

Readonly leaf and held-file hashes, unchanged before/after:

```text
packages/common/src/object.ts
99b969a659f7a959f257883b22f7d1e95f5fcd53aef32dea4eb6731c24f91921

packages/definitions/src/integration-url-template.ts
5399a0edd1c8bacd698f3e2e046070a7527a0a286addc867ae6506d0bacdc68a
```

Common's actual `object.ts` imports public `hashKey` from installed `@tanstack/query-core` **5.101.2**. `objectKeys`/`objectEntries` remain the same Object-based functions. Its existing `hashObjectBase64` contains a dormant `Buffer.from(hashKey([obj]))` body; that helper was not invoked, altered, copied or polyfilled. At initial manifest inspection Common's missing direct query-core declaration and `/url` declaration were COMPOSITION-owned active work. Installed resolution and these bounded checks do not waive that manifest-owner handoff or establish whole-browser dependency readiness.

## Scoped checks and source erasure

From repository root:

```sh
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --esModuleInterop --resolveJsonModule --target ES2024 --module ESNext --moduleResolution Bundler --jsx react-jsx --types node,bun --pretty false packages/definitions/src/permissions.ts packages/definitions/src/widget-integration-map.ts packages/definitions/src/docker-integration-match.ts packages/definitions/src/release-provider.ts
node node_modules/oxlint/bin/oxlint packages/definitions/src/permissions.ts packages/definitions/src/widget-integration-map.ts packages/definitions/src/docker-integration-match.ts packages/definitions/src/release-provider.ts
node node_modules/oxfmt/bin/oxfmt --check packages/definitions/src/permissions.ts packages/definitions/src/widget-integration-map.ts packages/definitions/src/docker-integration-match.ts packages/definitions/src/release-provider.ts
```

- Four-entrypoint typecheck: **exit 0**, with installed `@types/node` **24.13.3** and `@types/bun` **1.3.10** explicitly selected. No diagnostic filtering, assertion/stub workaround or shared configuration edit. This is source checking of the named roots and resolved types, not acceptance of other mutable producer/type graphs.
- Four-file lint: **exit 0 with one unchanged source warning**, `permissions.ts:182` `unicorn(no-useless-spread)` on `[...permissionMatrix[category].levels.slice(0, level)]`. The original-body hash proof covers that same line. It was neither fixed nor suppressed because algorithm bytes are frozen.
- Four-file formatting check: **exit 0, all four files already formatted**; no formatter write was needed.

All four changed edges are runtime value imports. Existing `IntegrationKind`, `WidgetKind` and Common `AtLeastOneOf` type edges remain type-only and erase during transpilation; this cleanup adds no runtime type import. Types and emitted domain algorithms were not reshaped.

## Bounded closed test graph and existing critical tests

Before executing tests, installed esbuild inspected exactly these existing test entrypoints:

- `packages/definitions/src/test/permissions.spec.ts`
- `packages/definitions/src/test/widget-integration-map.spec.ts`
- `packages/definitions/src/test/docker-integration-match.spec.ts`
- `packages/definitions/src/test/release-provider.spec.ts`

The in-memory build used `platform:"node"`, `format:"esm"`, `bundle:true`, `metafile:true`, `write:false`, `external:["vitest"]` and a logical `outdir:"packages/definitions/.closed-check"` that was never written. Its 36 inputs include the four tests, four owned sources, actual Common object/query-core resources and source `docs/index.ts`, `integration.ts`, `widget.ts`. Every changed import resolves to the actual `packages/common/src/object.ts`. No Common root/Stopwatch/hooks, Next/NextAuth/Next-intl, auth/DB/Core/Settings/widget-runtime/translation root or held `integration-url-template.ts` appears. This is a four-helper/test closure, **not** the actual Settings browser graph or all Definitions.

Those tests actually cover permission inheritance/matrix/access, widget integration relationships, Docker matching and release normalization. They were therefore run unchanged with installed Vitest **4.1.10** using an explicit in-memory configuration, not the repository test configuration. The Node child received only `{NODE_ENV:"test"}`; the documentation-link source's environment lookup therefore used its existing fallback, not a real installation setting. No browser or documentation/network fetch occurred.

Executed configuration through installed `startVitest`:

```js
const files = [
  "permissions",
  "widget-integration-map",
  "docker-integration-match",
  "release-provider",
].map((name) => "packages/definitions/src/test/" + name + ".spec.ts");
const context = await startVitest(
  "test",
  files,
  {
    config: false,
    watch: false,
    api: false,
    ui: false,
    cache: false,
    maxWorkers: 1,
    include: files,
  },
  {
    envDir: false,
    server: { watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  },
);
await context.close();
```

**4 existing test files passed, 118 tests passed, zero failures**: permissions 93, Docker matching 19, widget integration map 3, release provider 3. No new test, fixture, config or cache file was authored. Other suites were not run; in particular `api-key-url.spec.ts` still imports Common's aggregate root and the held URL-template test remains outside this allocation. No old test import was rewritten to manufacture a closed graph.

## Stop boundary

Only the four allocated Definitions files and this report were written. No Common/source algorithm, manifest, lock, dependency/export, auth/culture/client, URL-template, Settings/provider or app/host source was edited. No Bun command was executed; all fixture/test configuration was explicit and clean without `.env` loading. No credentials/app data, provider/network/browser, DB, server listener, container, Git mutation, installation or nested agent was used.

COMPOSITION owns the dependency declarations, fifth-edge release and later whole selected Settings browser/runtime/type graph after all five producer sources are returned frozen and reviewed. This return changes no Day.js/public-host/private-auth decision and claims no feature, host mounting, browser parity or whole-graph readiness.

## Fifth import cleanup — declaration returned, producer frozen

The historical fifth-file HOLD above is now superseded by the explicitly allocated follow-up. Read `implementation/common-public-ports.md`: COMPOSITION returned the actual `./url → ./src/url.ts` declaration and direct `@tanstack/query-core: 5.101.2`; independent declaration review remains active. Verified both fields in the current Common manifest and the existing Definitions Common dependency before writing. No declaration/lock/dependency change was made by this owner.

Exactly one source edit:

```text
packages/definitions/src/integration-url-template.ts:1
import { removeTrailingSlash } from "@homarr/common";
→ import { removeTrailingSlash } from "@homarr/common/url";
```

SHA-256 before → after:

```text
5399a0edd1c8bacd698f3e2e046070a7527a0a286addc867ae6506d0bacdc68a
a8491a22c5eafeea90ee03ee5c8856f9006f2e480deaf2948781adb34bac971b
```

Reversing just that first module specifier reproduces the original hash exactly: every other import, function/type/comment, URL template, normalization/case/encoding/order and algorithm byte is unchanged. The prior four frozen source hashes still match their recorded accepted after-hashes; none was edited.

`createRequire` from `packages/definitions/package.json` resolves `@homarr/common/url` to the exact physical `packages/common/src/url.ts`. That existing leaf has SHA-256 `5d13a39fd18be4e89b5af964c6b7bc35c2a1bcdcd5162aefc627c3eb05148e6a`, matching COMPOSITION's returned source hash. The old Common index reexport chain exposes the same leaf/function; no utility was copied or evaluated. Its existing `ReadonlyHeaders` import remains **type-only Next**, unchanged; the returned declaration evidence records zero runtime imports after erasure. Scoped TypeScript resolves the installed declarations, not a fabricated stub. No mutable Core/G or other server source was hashed/evaluated, and no new whole-graph scan was performed.

Exact fifth-only checks from repository root:

```sh
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --skipLibCheck --esModuleInterop --resolveJsonModule --target ES2024 --module ESNext --moduleResolution Bundler --jsx react-jsx --types node,bun,react,react-dom --pretty false packages/definitions/src/integration-url-template.ts
node node_modules/oxlint/bin/oxlint packages/definitions/src/integration-url-template.ts
node node_modules/oxfmt/bin/oxfmt --check packages/definitions/src/integration-url-template.ts
```

All three **exit 0**: typecheck zero diagnostics, lint zero warnings/errors, formatting already correct. No diagnostic filtering/config broadening was used; installed Node/Bun/React declarations were selected explicitly. No tests were added or rerun, including the earlier 118-test suite. No Bun execution, generated config/cache/fixture, install, provider/network/DB/listener/browser/container or Git mutation occurred.

**Freeze the fifth producer source at the after-hash above for narrow review.** All five producer import cleanups are now returned, but declaration review and whole selected Settings/browser/type graph validation remain independently owned gates. This is not host/provider readiness, feature parity or ticket closure; all previous public-host/private-auth/Day.js policy and integration holds remain unchanged.

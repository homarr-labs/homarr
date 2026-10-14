# Current public browser graphs — frozen check handoff

2026-10-11. **UI theme/language/navigation and standalone/culture browser bundles pass; full Settings browser closure and legacy Day.js client remain held.** Explicit UI, Settings and translation typechecks pass with real installed Bun declarations. No host implementation or B/C readiness is implied; G's two P1 findings, mutable Core scope/driver and server/runtime/seed/copy graphs remain held.

This captures current producer bytes for independent graph review, not retroactive Stage A declaration evidence. UI relocation was accepted under `ses_ed8e606d5ffeklGKAMsD3aK9eT`; Settings' number-import cleanup and home's policy-type cleanup retain their separate acceptance. No private API/auth type boundary was added or inspected as browser runtime.

Evidence directory:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-public-browser-graphs.2EQsXv
```

## Actual declared entrypoints and bounded closure

Each selected path was checked against its actual package `exports` and current filename resolution. No `/config`, `/culture/client`, byte-format export or other invented public port was used.

| Selected public path                    | Actual target                                      | Scanned workspace files / type-only edges | Runtime result                                                                                                             |
| --------------------------------------- | -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@homarr/ui/theme`                      | `packages/ui/src/theme.ts`                         | 2 / 3                                     | Complete selected workspace closure; Mantine plus existing modal leaf                                                      |
| `@homarr/ui/language-combobox`          | `packages/ui/src/components/language-combobox.tsx` | 48 / 12                                   | Complete selected workspace closure; actual translation root/config/mapping, unchanged LanguageIcon and lazy locale assets |
| `@homarr/ui/navigation`                 | `packages/ui/src/navigation/index.tsx`             | 1 / 1                                     | React/context boundary only; no Next navigation import                                                                     |
| `@homarr/settings/context`              | `packages/settings/src/context.tsx`                | 37 / 23                                   | **Partial/held** at five Definitions → legacy Common-root imports                                                          |
| `@homarr/settings/creator`              | `packages/settings/src/creator.ts`                 | 36 / 21                                   | **Partial/held**, same five imports; accepted number leaf is not enough to certify all remaining runtime imports           |
| `@homarr/translation/standalone/client` | `packages/translation/src/standalone/client.tsx`   | 7 / 6                                     | Complete selected workspace closure; real React/use-intl/config resources                                                  |
| `@homarr/translation/runtime`           | `packages/translation/src/runtime/index.ts`        | 53 / 23                                   | Complete selected workspace closure for the plan's culture/formatter/resource boundary                                     |
| `@homarr/translation/dayjs`             | `packages/translation/src/dayjs.ts`                | 7 / 4                                     | **Held**: line 1 imports `next/navigation`; not bundled or evaluated                                                       |

`graphs.json` records every source hash and runtime/type-only edge separately. `runtime-inputs.json` contains **63 unique files in complete selected closures** and **99 unique browser-reachable scanned files including held prefixes**. **Zero mutable server/runtime files were hashed**: no DB/schema/G gate, Core scope/driver/HTTP, auth, API, Redis, seed or copy source was traversed as runtime. Hashes in a held prefix establish only observed frozen bytes, not a complete graph certificate.

The scanner uses actual Bun browser TypeScript erasure, then parses static/reexport/dynamic imports. Explicit type-only declarations and otherwise erased imports are listed without walking/hashing their mutable dependencies. Translation's existing `mapping.ts` template `./lang/${language}.json` is bounded by its actual 36 JSON files; actual bundler inputs/output imports are checked separately. Lazy Day.js/MRT/config loaders remain lazy, not executed to inspect them.

All traversed workspace runtime imports have declared owner dependencies, recorded in `dependency-ownership.json`. Vendor boundaries include Mantine 9.6.0, React 19.2.7, Tabler 3.44.0, Day.js 1.11.21, Zod 4.4.3, use-intl 4.13.1 and deepmerge 4.3.1. The existing `mantine-react-table` catalog alias is **`npm:mantine-react-table-open@9.0.3`**, verified against installed metadata; no alias/version/dependency was changed. These are boundary/version records, not an audit of every vendor function.

### Exact Settings stop

The unresolved source chain is:

```text
settings/context → ./creator
settings/creator → @homarr/validation/user
validation/src/user.ts → @homarr/definitions
definitions/index.ts → src/index.ts → sibling exports below
```

Each of these five frozen siblings imports **`@homarr/common` at source line 1**:

```text
packages/definitions/src/permissions.ts
packages/definitions/src/widget-integration-map.ts
packages/definitions/src/docker-integration-match.ts
packages/definitions/src/release-provider.ts
packages/definitions/src/integration-url-template.ts
```

The scanner and actual guarded browser build stop before resolving/loading that legacy Common root. It was not secretly externalized, aliased to a pure leaf or replaced with a stub. No source repair belongs to this lane. `definitions/src/docs/index.ts:10` also has a **deferred** `process.env` reference inside a function; it is recorded, not called or described as environment-free. This observation alone is not evidence of evaluation-time environment access.

Creator's accepted `@homarr/common/number` edge still resolves to the real number leaf, with producer hash `bf76764d66046975c32838bbf28d37d73f4e8c25cbdb7273815644cb2a6ded38`. The separate byte-format producer remains `dcae24a1a65d30276ce9f4456d6acbe2cce27c5ff1168ddfb78c7fcc8ba4831e`, importing the same public number leaf for its three formatters. **Byte-format is not runtime-reachable from the selected context/creator exports.** It is checked as the requested separate producer type-root and recorded outside the runtime hash set; no Settings root or undeclared byte-format public path was introduced.

### Actual culture versus legacy Day.js boundary

PUBLIC-HOST-JOIN uses the declared `/runtime` resource/formatter functions and `/standalone/client`, not `/dayjs`'s Next hook. `/runtime/resources.ts` reaches the same-package `standalone/server.ts` pure translator/catalog implementation: its name does not introduce Next, environment configuration, SQL or server IO. The selected culture graph uses public Common date/number leaves and the exact source locale configuration/catalogs.

The legacy `/dayjs` source still calls the Next `useParams` hook, keeps module-wide promise/loading/previous-locale state and calls `dayjs.locale` when its asynchronous loader is invoked. That path is **not a standalone culture client**, and no browser bundle success is claimed for it.

The accepted culture/date sources do install existing Day.js plugins at module evaluation (`relativeTime`, `utc`, `timezone`, Common's `isBetween`). They are not literally side-effect-free. Culture formatting localizes individual instances and preserves explicit clock ownership, undefined `now`/`timeZone` defaults, source catalog/Intl aliases and date-only UTC normalization. No locale/time-zone algorithm, UTC default, provider composition or fake context was supplied by these checks.

## Actual offline browser bundles

Generated temporary entries contain only namespace reexports of the selected public leaves. They do not mount providers, render/hydrate, create application state or call source factories. Bun **1.4.2** builds ESM/browser, splitting enabled, minified, no sourcemap, **`packages: "bundle"`, `external: []`**. The sole define is production `process.env.NODE_ENV` for vendor build-mode branching; no workspace configuration or time-zone preference is fabricated.

| Temporary entry                                     | Result                                                   | Workspace load files / metadata inputs   | JS outputs | Entry bytes / all output bytes |
| --------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------------ |
| `ui.entry.ts`: theme, language-combobox, navigation | **Pass**, no build diagnostics                           | 16 / 830                                 | 71         | **592,731 / 758,671**          |
| `translation.entry.ts`: standalone/client, runtime  | **Pass**, no build diagnostics                           | 54 / 212                                 | 106        | **142,773 / 8,671,473**        |
| `settings-held.entry.ts`: context, creator          | **Guarded BuildFailure** at the five Common-root imports | Prefix only; no completed metadata claim | 0          | No successful bundle size      |

Sizes are actual uncompressed validation artifact bytes, **not a performance benchmark or application bundle budget**. Translation's entry preserves the complete public namespace and lazy catalogs/resources; it is not a tree-shaken future host composition. UI's compiled input set is smaller than the scanner's conservative lazy/reexport closure. The translation build includes the actual catalog imports; no JSON/catalog content was changed.

All **143 UI and 144 translation emitted module-import edges** were parsed from actual JS outputs and resolve to owned emitted chunks. No bare/workspace/vendor external import or unresolved dynamic import is emitted. Guards reject held sources before bundler reads; every loaded workspace file matches its recorded source hash. Bundles/metafiles/output hashes remain in the evidence directory and were **never executed**. No Vite config, app build, SSR, browser or listener was used.

Raw Bun input metafiles mark 6,281 UI and 114 translation input edges `external`, including pruned/unemitted imports. Those flags are retained verbatim, not conflated with emitted externals. The initial overly strict input-flag assertion failed and is retained in `bundle.log`; final validation checks both emitted output metadata and actual parsed output imports. The real Settings BuildFailure remains a failure (`settings-held.build-failure.json`), not a diagnostic suppressed into success.

## Scoped type checks — installed Bun declarations, no suppression

All three native TypeScript **7.0.2** checks exit **0**, zero diagnostics. Each log is retained in full with `--listFiles`; no diagnostic filtering, `skipDiagnostic`, ambient stub, `any`, assertion, alias/path override or source modification was used.

Common compiler flags:

```text
--noEmit --ignoreConfig --target ES2024 --lib ES2024,DOM,DOM.Iterable
--module ESNext --moduleResolution Bundler --jsx react-jsx --strict
--skipLibCheck --allowArbitraryExtensions --resolveJsonModule --esModuleInterop
--noUncheckedIndexedAccess --experimentalDecorators --types node,bun,react,react-dom
--pretty false --listFiles
```

| Check       | Explicit source roots                           | Compiler file-list count |
| ----------- | ----------------------------------------------- | ------------------------ |
| UI          | theme, language-combobox, navigation            | 1,514                    |
| Settings    | context, creator, separate byte-format producer | 1,906                    |
| Translation | standalone/client, runtime/index                | 1,414                    |

These are explicit-root checks, not a whole-repository compiler run. Exact command arrays and file-list evidence are in `types.json`/raw logs. Installed **`@types/bun` and `bun-types` 1.3.10** are selected through `--types ...bun...`; each compiler log includes the real `bun-types/sqlite.d.ts`. This correctly resolves the previous two `bun:sqlite` declaration errors rather than hiding them. Runtime Bun is 1.4.2; no general SDK-version parity is asserted.

**`skipLibCheck: true` is the preexisting producer/runtime policy**, including the prior conditional Settings check and accepted theme check. It skips declaration-file checking, not source diagnostics; this handoff does not claim full vendor declaration verification.

Settings' `User` DB/schema projection is still **type-only**. Its actual compiler traversal reads Core DB mapping/constants/shared/sqlite/PostgreSQL drivers, **mutable `db/scope.ts`**, driver/DB barrels, both certificate-hostname driver types and both physical schemas. The full 13-path list is in `types.json`. Those sources were not evaluated or hashed as browser runtime; this pass is **type-only evidence for the command's observed files**, not a freeze, acceptance of G's opt-in fix or public/server readiness. UI and translation compiler lists contain no Core/DB/API/auth runtime source. Existing next-intl translation types remain erased from browser runtime; no private auth type export was widened.

Scoped oxlint on twelve selected frozen source/producer files also passes, **zero warnings/errors**. No tests were added or run.

## Reviewed theme identity

`theme-identity.json` compares against the producer's original-source snapshot, without evaluating the shared theme or importing Next application source:

```text
current accepted theme.ts                607b1221953784ba5f7a9d56a48ae2051a07acd5314212ab6d1e4eaf31a7b206
exact original/current theme-body bytes  e8a864313e7568cd156ec1c44e90c9c2bd8fb563f23713462f9f14a66d2f539b
unchanged generateColorScale function    beb969b231d650f0e9957a8b2c989944e8f70b83edf27940492ade160d50df2f
original createBrandTheme function       e246848e94ca7325313bbdd91233b1f58a2889fec027202b4e4a2b5364e04c25
shared createBrandTheme function         29023886b3893ecabb052147d798eb5c94633db453af99d6464cbc95c750c8e3
```

The existing theme object's body is **exact byte-identical**, including typography, scales, spacing, shadows, component/modal defaults and scroll-area props. Color-scale function text is identical. Brand-theme function text differs **only** by the same-object identifier `homarrTheme → theme`; both colors, ten shade steps, original parsing/fallback/type bridge and all four radius overrides remain unchanged. Modal and both language component hashes also match the captured original. Producer's historical deterministic equivalence results remain separate; no new runtime theme evaluation or redesign occurred here.

## Artifact anchors and preservation

```text
graphs.json                4d54fe2bd0c8050d45866e3cc629a71d89318f055ad228ecd1db03b37af96645
runtime-inputs.json        5959864eff3739d720db283a09ab53ce6a742c3a54fe322b01412490abd49080
bundles.json               134352512f38f2f005e39b8fce3d0fd51ff08ab81f63e687021bb5f1f6e8318e
types.json                 d982e2234513a725464c6e7046f4649cd0eab977e9a3b75ed7f0453bb36517be
theme-identity.json        fa42a1ecb265a42441cb3378ba2ba3b896da0bd5fe4be2fa1f8b21172fe87c9e
dependency-ownership.json f87b74028e1b00ecc07a4371d51c93b23102a215853f554a72d8291320489ede
preservation.json          6c8d48a1555efd0b24de89f66561935d06205ea32e03a078cebfbd9d12046879
typecheck-ui.log           16c3b4cc6f1dad084f8e4028b3916f3607b3d46bbed585b888749e4a5b169158
typecheck-settings.log     ce55026c2ecbabe50b5e31959f75bb5ec51477b9c1717e0fcf1f4623fc0fba7b
typecheck-translation.log  c5540673765eae619110269ace3de3d9540f545874f737d5d8e0c8042b9fad6c
scoped-lint.log            68ae70967b295eb750564f7d15faa94d02191380588ddf73727e4b1023310eaa
```

Final guard checks all 99 scanned browser-runtime bytes, five selected manifests, all 44 baseline checkout manifest/lock hashes, sixteen prior narrow-commit artifact files and its handoff, plus actual successful bundle output hashes. None drifted; Stage A commit artifacts remain untouched. Raw early harness failures remain retained: the first scanner assertion stopped on Settings, the initial metafile assertion misclassified input flags, and installed MRT metadata required recognizing its already declared catalog alias. No source failure was repaired or silently rebaselined to obtain a pass. Final evidence separates genuine holds from successful selected checks.

All Bun calls used **`--no-env-file`, `env -i`, isolated HOME, explicit PATH and the owned clean config**. Existing local dependency files only; the owned directory's node_modules symlink points to that unchanged installation. **No install or network** occurred. No actual workspace code was imported for execution; scanners parse/transpile, the browser bundler emits, and type/lint tools read source without mounting it.

Only this handoff and owned temporary evidence were written. No repository source/manifest/lock/dependency edit, Stage A artifact change, Git operation, nested agent, host/provider composition, SSR, fake context, credential/.env/current-data/DB access, browser/listener/container/provider/paid call or 3000/3100/3200/3210 operation. Artifacts are frozen on return. **Settings and legacy Day.js stops require producer-owned resolution; G/server graphs remain held independently. B/C awaits those exact graph acceptances and a separate explicit allocation.**

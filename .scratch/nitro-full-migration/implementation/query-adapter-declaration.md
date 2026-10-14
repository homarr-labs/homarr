# Query adapter dependency — scoped before evidence

New dependency-only lease after the reviewed/frozen family-declarations.md return. Parallel cap is now **32**, not the historical 35; no worker is dispatched here. Only Nitro's dependency object, its matching lock workspace dependency object and this report may change. All prior family fields/exports and other source/manifests/nodes remain outside the lease.

## Captured before objects

Dedicated reads before edits show these identical dependency objects in `apps/nitro/package.json` and `bun.lock` `workspaces["apps/nitro"].dependencies`:

```json
{
  "@homarr/api": "workspace:^0.1.0",
  "@homarr/common": "workspace:^0.1.0",
  "@homarr/core": "workspace:^0.1.0",
  "@homarr/custom-widgets": "workspace:^0.1.0",
  "@homarr/definitions": "workspace:^0.1.0",
  "@homarr/docker": "workspace:^0.1.0",
  "@homarr/translation": "workspace:^0.1.0",
  "@homarr/ui": "workspace:^0.1.0",
  "@homarr/validation": "workspace:^0.1.0",
  "@homarr/widgets": "workspace:^0.1.0",
  "@mantine/core": "9.6.0",
  "@mantine/hooks": "9.6.0",
  "@orpc/client": "2.0.0-beta.43",
  "@orpc/server": "2.0.0-beta.43",
  "@tabler/icons-react": "catalog:",
  "@tanstack/react-query": "5.101.2",
  "@tanstack/react-router": "1.168.8",
  "@xterm/addon-fit": "catalog:",
  "@xterm/xterm": "catalog:",
  "mantine-react-table": "catalog:",
  "nitro": "3.0.260903-beta",
  "react": "19.2.7",
  "react-dom": "19.2.7",
  "zod": "4.6.5"
}
```

`@orpc/tanstack-query` is absent in both objects. Scripts, development dependencies (including existing Sass), prior 19 family dependency fields/22 exports, root catalog, all lock package nodes and the experiment dependency are preserved. No HEAD/index/hash/installed-resolver command or whole-file comparison is claimed.

## Existing installed and lock evidence — no fresh install

Read-only `node_modules/@orpc/tanstack-query/package.json` reports version **2.0.0-beta.43**, `type: module`, `sideEffects: false`, and public root exports:

```json
{
  ".": {
    "types": "./dist/index.d.mts",
    "import": "./dist/index.mjs",
    "default": "./dist/index.mjs"
  }
}
```

Its declared peer is `@tanstack/query-core: >=5.89.0`; runtime dependencies are exactly `@orpc/{client,contract,openapi,shared}: 2.0.0-beta.43`. Existing lock records agree on those beta.43 dependencies and peer range. Root catalog has no oRPC/query-core pin to add or alter; use the explicitly requested exact adapter version, not `catalog:` or a guessed latest pin.

The existing immutable adapter resolved record read before edits is:

```text
"@orpc/tanstack-query": ["@orpc/tanstack-query@2.0.0-beta.43", "", { "dependencies": { "@orpc/client": "2.0.0-beta.43", "@orpc/contract": "2.0.0-beta.43", "@orpc/openapi": "2.0.0-beta.43", "@orpc/shared": "2.0.0-beta.43" }, "peerDependencies": { "@tanstack/query-core": ">=5.89.0" } }, "sha512-ezTglhKxmhaMf/l74TPpHW5W16ONiKzDdDSFmVKH+dhAwbm9UafJfncSJXNhNo5h1i5wX2U+22VSM5y2riNzmg=="]
```

Existing experiment workspace already directly declares this same adapter version. Nitro client/server remain beta.43. Installed Query Core and React Query manifests both report **5.101.2**, and the existing React Query lock node depends on Query Core **5.101.2**. That pin is within the adapter's recorded `>=5.89.0` range; package development-only Query `^5.101.4` entries are **not** peer requirements and do not justify an upgrade. This is static package/record evidence, not a fresh install or native/runtime compatibility test.

The installed public type entry exists and was read, not evaluated or compiled. Its first imports reference the four declared oRPC packages and Query Core's real query/infinite/mutation/key/context types. It declares `createRouterUtils<T extends AnyNestedClient>(client, options): RouterUtils<T>` and exports the same function as `createTanstackQueryUtils`; procedure types expose `queryOptions` and `mutationOptions`. This records the actual installed public API, **not** permission to implement an adapter or assurance of application type/lifecycle compatibility. No runtime `.mjs` entry/application module was imported or executed.

## Frozen exact two-field delta

Both additions are now present in the resulting scoped objects, confirmed by dedicated file reads. The before object above plus exactly this single field is the after object in each location:

```diff
 apps/nitro/package.json — dependencies
     "@orpc/server": "2.0.0-beta.43",
+    "@orpc/tanstack-query": "2.0.0-beta.43",
     "@tabler/icons-react": "catalog:",

 bun.lock — workspaces["apps/nitro"].dependencies
         "@orpc/server": "2.0.0-beta.43",
+        "@orpc/tanstack-query": "2.0.0-beta.43",
         "@tabler/icons-react": "catalog:",
```

Exactly **two new dependency fields**, no removals/replacements, no export additions, no source/API entries. Local patch edits preserve all existing fields; no whole-lock replacement, catalog mutation, dependency upgrade or resolved-node change. Existing experiment adapter record remains untouched. Before/after evidence is scoped text, not an automated equality/hash certificate.

**Freeze for independent narrow review before executable frontend-region consumption.** Source adapter implementation waits for frozen API and separately verified documentation; this lease retrieved no network documentation and makes no usage/implementation recommendation. Lifecycle/cache/request-identity/authority/browser/server/native graph holds remain unchanged. Installed public types and `sideEffects: false` do not certify application safety, source closure or successful execution.

Existing-node evidence only: no fresh install, resolver invocation, compiler, lint/typecheck/build/tests/format or runtime evaluation. Required final lint/typecheck remains deferred until convergence, not passed by this task. No commands, source changes, API export work, environment/credentials/data/output/network/provider/SQL/browser/listener/Git mutation or nested agents. No subprocess or application graph consumption remains active from this lane. The prior family declaration work and frozen handoff were not repeated or edited.

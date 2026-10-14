# BUILD — isolated compiler failure / minimal source-plan approval

## Decision

**APPROVE one Vite-file correction, but NOT removal of both SSR externals.** Remove only the bare `"@homarr/backend/host"` entry at `apps/nitro/vite.config.ts:126`; retain the backend-source regular expression and `makeAbsoluteExternalsRelative: false`:

```diff
-            external: ["@homarr/backend/host", /\/backend\/src\/server\//],
+            external: [/\/backend\/src\/server\//],
             makeAbsoluteExternalsRelative: false,
```

This is a proposed product diff, not an edit performed here. No backend Nitro configuration extension, alias, resolver plugin, dependency, source copy, or new workspace/node_modules symlink is needed for this observed failure. Keep `apps/backend/nitro.config.ts`, the candidate packaging script and all output/path fences unchanged. Approval is source-plan approval only; successful compilation and single-owner artifact closure remain unproven.

## Actual failed attempt

Evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-artifact-attempt-SkDTX9wH`.

- `records/build.exit:1` is numeric **1**.
- `records/build.stdout:2–4` records the initial SSR stage and **238** transformed modules; lines 158 and 421 record completed SSR and client stages. Line 423 starts final Nitro compilation.
- Lines 524–545 record failure: Rolldown cannot resolve `@homarr/backend/host` imported by `build-work/build/vite/services/ssr/index.js`; Vite and the workspace build exit 1.
- That intermediate file's first line actually preserves `import { fetchApplication } from "@homarr/backend/host";`.
- Lines 500–522 list partially emitted final chunks, including `artifact/server/index.mjs`. Those files are **FAILED partial output**, not a successful candidate or a bootable acceptance artifact. Do not boot, promote, overwrite, repair in place, or erase them.

The failure occurs inside the frontend Vite/Nitro compilation. Later candidate-script packaging remains unchanged and unreached; nothing here establishes migration assets, CLI bundles, native dependencies or packaging postconditions.

## Why the one-entry removal is the minimal honest repair

1. **The bare external bypasses package resolution too early.** Rolldown checks `external` before resolving a raw specifier, then again after resolution. The exact string matches the first check, so SSR emits the bare workspace import instead of resolving the declared package export. The actual failed intermediate confirms this behavior. Installed Rolldown's external binding preserves string/RegExp entries and the `isResolved` distinction (`node_modules/rolldown/dist/shared/bindingify-input-options-BsDhfYrS.mjs:2065–2072`; `define-config-BBz954-q.d.mts:3116–3124`). Current official documentation explicitly describes both checks.
2. **Resolve the real package while its importer is still in the checkout.** `apps/nitro/package.json:20` already declares `@homarr/backend`; `apps/backend/package.json:6–8` exports `./host` to `./src/server/host.ts`. The installed `node_modules/@homarr/backend/package.json:6–8` agrees. Removing the bare match lets SSR resolve this existing export from `apps/nitro/src/entry-server.tsx`, without an invented mapping or runtime import evaluation.
3. **Retain the resolved-path external as the inter-stage seam.** The resolved backend host path matches the existing `/\/backend\/src\/server\//` expression at the second check. Consequently the host remains outside the intermediate SSR bundle, but its import identifies the resolved source path rather than a bare package that the external intermediate directory cannot find. Keep `makeAbsoluteExternalsRelative: false`: the intermediate lives outside the checkout, so this path must not be reinterpreted relative to that generated directory. Installed declarations explicitly say this option also covers paths made absolute by plugins/core (`define-config-BBz954-q.d.mts:3810–3816`). This source path is permitted in the **intermediate**, not in the final artifact.
4. **The final Nitro environment bundles that same source module.** `node_modules/nitro/dist/_build/vite.env.mjs:29–54` sets production Nitro `resolve.noExternal: true` and uses its final bundler configuration, separately from the SSR service's configuration at lines 66–99. `apps/backend/nitro.config.ts:10` already includes backend/contracts source paths in `noExternals`. Nitro's `getNoExternals` includes TypeScript/source path exclusions and these explicit patterns (`_build/common.mjs:5697–5706`); the externalizer respects exclusions on both import and resolved path (`9855–9864,9907`), and production tracing is configured separately (`10083–10094`). There is no need to add `@homarr/backend/host` to final externals or set blanket `noExternals: true`.
5. **The external intermediate directory is the concrete resolver problem.** Nitro's generated service table imports the intermediate entry by absolute build path (`node_modules/nitro/dist/vite.mjs:166–192`), then final compilation consumes it (`77–92,120–127`). Vite's JS resolver uses an existing absolute importer's directory as its package lookup base unless deduplication overrides it (`node_modules/vite/dist/node/chunks/node.js:32242–32267`). Merely supplying Nitro `workspaceDir` is not a demonstrated Vite package-lookup override. The approved correction removes this particular bare lookup altogether, without moving output into the checkout.

## Singleton constraint: why deleting BOTH is not approved

`apps/backend/src/server/host.ts:8–10` owns a module-local abort controller plus initialization/disposal promises. `startup-configuration.ts:326–330` owns a module-local configuration promise. SSR calls `fetchApplication` (`apps/nitro/src/entry-server.tsx:3–16`); the server entry and lifecycle plugin call `closeApplication` through the same package export (`apps/backend/server/entry.ts:4–7,44–47`; `server/plugins/lifecycle.ts:1–4`). The entry also imports the startup loader directly.

Without either SSR external, the linked TypeScript host is eligible to be bundled into the independently compiled SSR intermediate: Vite does not normally externalize linked workspace source, and its JS externalization logic does not treat a resolved `.ts` file as an externalizable JS dependency (`node.js:26768–26787,26801–26803`). Final Nitro compilation would then consume already-flattened SSR code alongside the original host/config source used by entry/lifecycle. No observed production Nitro plugin reconstructs original source module identity from flattened code; the `nitro-env-proxy` plugin is serve-only and limited to `nitro` imports (`nitro/dist/vite.mjs:194–225`). Thus removing both creates an unjustified duplicate-owner risk, not a proven fix.

Keeping the path external allows final compilation to see the real host module from all consumers, including its relative startup-loader import, and deduplicate by resolved file identity. Vite uses real paths unless `preserveSymlinks` is enabled (`node.js:32441–32459`; default false at 35312). This is the intended single graph, **not yet an observed one-physical-owner artifact result**. No global singleton hack, generated-source rewriting or alias is approved.

## Native/builtin boundary and deferred acceptance

- Retain Bun preset, custom listener entry, lifecycle registration, export conditions, and existing native-dependency tracing. Installed Bun preset selects `exportConditions: ["bun"]` (`nitro/dist/_presets.mjs:294–299`); the final configuration/externalizer remains untouched. Do not bundle/polyfill Bun/Node builtins or externalize Homarr workspace source at runtime to silence errors. Native-package completeness and actual builtin imports still require fresh artifact inspection.
- K/DB4 is active. Its mutating bodies and SQL/data were not read or approved. No compiler/rebuild or source-clean claim until the coordinator freezes all reached source and D/K accepts its current asset set. Prior DP/DP-current runtime and containment holds remain in force.
- After freeze and separately authorized focused lint/typechecks, a new compiler attempt must use another absent isolated external build root through the unchanged candidate entry. Preserve the failed attempt. This report does not execute or authorize a boot.
- Inspect the new SSR intermediate: require a resolved backend host source import, not bare `@homarr/backend/host`, and no embedded second host/config initialization state. Then require numeric build success and completed packaging, not output-file existence.
- Inspect the complete new final graph: no unresolved workspace/source imports, escaped checkout paths, unsafe dependency symlinks, or second host/config owner. Trace SSR fetch, entry shutdown and lifecycle shutdown to one emitted host owner and entry/host configuration reads to one emitted configuration owner. Absolute source imports allowed at the intermediate seam must be gone from final runtime imports. A duplicate or unresolved edge is a failure; no bootstrap/import evaluation to manufacture proof.
- If the fresh compiler contradicts the predicted resolved-path seam, stop and retain its evidence. Do not silently introduce aliases, add final externals, copy workspace source, change bundler/runtime lanes, retry against the same root, or treat this approval as an unconditional success claim.

## Documentation and work boundary

Installed versions observed: Nitro `3.0.260903-beta`, Vite `8.1.4`, root Rolldown `1.1.4`. Installed implementation is the version-specific authority. Context7 returned monthly-quota exhaustion; current official read-only fallback references were consulted, not used to override installed behavior:

- https://rolldown.rs/reference/InputOptions.external — raw/resolved external checks and resolver bypass.
- https://vite.dev/guide/ssr.html#ssr-externals — linked dependencies are not externalized by default (live site identifies Vite 8.3.4, not the installed 8.1.4).
- https://nitro.build/config#noexternals — bundling versus runtime externals; path patterns.

Only this new report was written. No shell commands, compiler, lint/typecheck/test, application import/evaluation, bootstrap, runtime/native/SQL, data/env/secret access, nested agent, product edit, or output-directory write occurred. The approval narrows the original two-entry proposal to the smallest source-grounded one-file repair while preserving all source-only and runtime holds.

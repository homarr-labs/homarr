# Legacy Spotlight format-only attempt — BLOCKED

## Actual outcome

**BLOCKED: canonical formatter bytes were not retained after the single permitted product patch.** The actual source is byte-identical to the accepted read-repair source. Both reviewed media read fixes and every other source value/behavior remain unchanged. No whitespace retry, syntax restructuring, configuration workaround or additional formatter attempt occurred.

Sole product lease: `packages/spotlight/src/modes/external/search-engines-search-group.tsx`.

Report absolute path: `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/.scratch/nitro-full-migration/implementation/convergence-legacy-media-format-source.md`.

New private allocation: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-legacy-media-format-source-tdiaae2h`.

| Image                                      |  Bytes | SHA-256                                                            |
| ------------------------------------------ | -----: | ------------------------------------------------------------------ |
| Authenticated before / actual frozen after | 27,169 | `6dc7af33e30b506b9013b9561774a31ea09c1751e7cc959380bf12c800951c97` |
| Canonical stdout candidate                 | 27,223 | `c2fcff9c3cd66aede1f6d2d53ddc2527ca5cd6aeec6ca5155a3ad847fa31408b` |

## Single authorized invocation and patch

Exactly one installed Bun1.4.2 formatter invocation ran from the checkout:

`/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run oxfmt --stdin-filepath /Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/packages/spotlight/src/modes/external/search-engines-search-group.tsx`

It received the authenticated `before.tsx` on stdin. `/usr/bin/env -i` supplied only fixed `PATH=/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin:/usr/bin:/bin` and this allocation's private `HOME=…/home`, `TMPDIR=…/tmp`. It emitted the preserved candidate, empty stderr and immediate numeric exit **0**. This is formatter-candidate generation, not a repository format check or type/lint validation.

One `functions.patch` attempted precisely the emitted two formatting hunks. The tool returned success; the subsequent bounded source capture found that the source still matched the before-image exactly. The byte restoration/non-retention is measured; its mechanism was not investigated. No private/global formatter configuration was read, disabled or changed, and no second patch to this product file was attempted.

## Exact remaining canonical difference

The full immutable difference is `remaining-canonical.diff`; `actual.diff` is empty. At actual source lines689–707, the canonical candidate still requires exactly these two map-call layouts:

```diff
-      const engineOptions = engineData.map((engine): ExternalOption => ({
-        key: `engine-${engine.short}`,
-        kind: "engine",
-        engine,
-      }));
+      const engineOptions = engineData.map(
+        (engine): ExternalOption => ({
+          key: `engine-${engine.short}`,
+          kind: "engine",
+          engine,
+        }),
+      );

-        .map((bang): ExternalOption => ({
-          key: `ddg-${bang.t}`,
-          kind: "ddg",
-          bang,
-        }));
+        .map(
+          (bang): ExternalOption => ({
+            key: `ddg-${bang.t}`,
+            kind: "ddg",
+            bang,
+          }),
+        );
```

The intervening existing `ddgData.filter` expression is unchanged. No arrow/method/type-annotation restructuring was attempted; an independent next syntax plan and renewed lease are required before any such change. Do not repeat this whitespace patch or recreate this attempt allocation.

## Frozen evidence and validation boundary

Allocation/home/tmp directories are0700. Source images, invocation/exit/streams, candidate and actual/remaining diffs, before/after receipts and `freeze.json` were created O_EXCL0600. `freeze.json` binds all eleven preceding evidence files with raw size/SHA pins and records one formatter attempt, one product patch, actual before equality, candidate inequality, `authorFrozen: true`, and no typecheck/lint/format-check/runtime execution. All older read-repair images, cancelled-source disposition, attempts/artifacts/failure history and protected3100/3200/data remain untouched.

Only bounded Python-I-S-B file I/O/SHA/difflib capture and the single explicitly permitted formatting-tool invocation ran. No compiler, type/lint/tests, application evaluation/import, browser, network, Engine, SQL, native operation, private configuration/data inspection or nested agent occurred. No other product file was edited or formatted.

The coordinator's prior37/37 type0/lint0 and format1 evidence is historical evidence supplied with this lease, not rerun or relabeled as this attempt's validation. Actual source remains unchanged, but this report claims no new format0 or activation/runtime/through-COMMIT result. Source/token **91/334** and runtime **0/9** remain unchanged. Independent next-plan review and separately released fresh Spotlight/Backend/Nitro types and scoped style checks after all reached writers freeze remain the next steps.

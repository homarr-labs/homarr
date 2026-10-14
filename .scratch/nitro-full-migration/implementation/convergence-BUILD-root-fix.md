# BUILD — frozen project-root resolver implementation

## Outcome and scope

Implemented exactly the approved addition at `convergence-BUILD-external-inventory.md:55–82` in `apps/nitro/vite.config.ts`: `environments.nitro.resolve.dedupe` contains the ordered 20 package roots covering all 31 captured bare specifiers across 19 direct npm roots plus the observed ReactDOM renderer peer. This is a source-only implementation, frozen for independent review and focused static checks; it is not compilation, singleton identity, npm-context closure, native closure or runtime PASS.

Only the product configuration and this new receipt were written. The installed Vite 8.1.4 / Nitro 3.0.260903-beta / Rolldown 1.1.4 mechanism and official-source evidence remain the approved plan's evidence at lines 88–94 and 115–119; no Context7 quota retry was made.

## Manifest reads before implementation

- `apps/nitro/package.json`: existing Nitro/Vite/plugin dependencies; DnD, router/query, React/ReactDOM 19.2.7, Mantine, icons, clsx, dayjs, Jotai and Zod.
- `packages/translation/package.json`: existing deepmerge, use-intl and dayjs dependencies.
- `packages/common/package.json`: existing cookie, cuid2, dayjs and Zod dependencies.
- `packages/ui/package.json`: existing crypto-js and shared UI dependencies.
- `packages/notifications/package.json`: existing Mantine notifications dependency.
- Root `package.json`: existing workspace catalog versions. No manifests, dependency declarations or installed packages were changed.

## Exact product delta

The following is the exact implementation delta against the configuration read before this task, not a claim about unrelated pre-existing working-tree changes:

```diff
--- a/apps/nitro/vite.config.ts
+++ b/apps/nitro/vite.config.ts
@@ -129,6 +129,32 @@
         },
       },
       client: { build: { rollupOptions: { input: "./src/entry-client.tsx" } } },
+      nitro: {
+        resolve: {
+          dedupe: [
+            "@dnd-kit/dom",
+            "@dnd-kit/react",
+            "@mantine/core",
+            "@mantine/dropzone",
+            "@mantine/hooks",
+            "@mantine/notifications",
+            "@paralleldrive/cuid2",
+            "@tabler/icons-react",
+            "@tanstack/react-query",
+            "@tanstack/react-router",
+            "clsx",
+            "cookie",
+            "crypto-js",
+            "dayjs",
+            "deepmerge",
+            "jotai",
+            "react",
+            "react-dom",
+            "use-intl",
+            "zod",
+          ],
+        },
+      },
     },
   };
 });
```

## Preserved boundaries

- SSR `external: [/\/backend\/src\/server\//]` and `makeAbsoluteExternalsRelative: false` remain exactly unchanged. Nitro's generated production `noExternal: true` is not overridden.
- Existing Vite root, export conditions, aliases and bundler externals are unchanged. No extra external/noExternal rule, resolver plugin, framework change, source copy, symlink or install was introduced.
- Activation, fresh external build-root creation, checkout/data disjointness, physical directory ancestor checks, output/cache/router paths, `envDir: false`, `dotenv: false`, route-generation freeze and all other build fences remain unchanged.
- Both failed artifacts, `nitro-artifact-attempt-SkDTX9wH` and `nitro-artifact-second-azwaqh4V`, remain untouched; neither was retried or promoted.

## Deferred validation and holds

No commands, lint/typechecks, tests, builds, module evaluation, native SQL, env/data/secrets access or nested agents were performed. Independent review and focused static checks remain pending. A third fresh build requires separate release after acceptance; it is not authorized or executed by this receipt.

After that separately released third fresh build, final singleton/private-owner identity, npm canonical paths/export contexts and all 31 captured specifiers' closure, packaging and target-native closure still require independent inspection. The resolver list alone proves none of these. K/D, adoption and native boot remain held, including physical pin/PK/FK/collation, boot/authentication/native-SQL and containment holds. A compiler zero would not release them.

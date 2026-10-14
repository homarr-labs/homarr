# PACK — frozen two-source correction

Implemented only the allocation approved in `convergence-PACK-root-plan.md`. The two source diffs below are frozen for coordinator review; this new report is the only additional file written.

## Frozen source diffs

```diff
--- a/scripts/build-nitro-candidate.sh
+++ b/scripts/build-nitro-candidate.sh
@@
-mkdir "$ARTIFACT/db/migrations"
+mkdir "$ARTIFACT/db/migrations" "$ARTIFACT/db/migration-runners"
@@
-    cp "$BUILD_ROOT/migration-build/$DIALECT/migrate.cjs" "$TARGET/migrate.cjs"
-    test -s "$TARGET/migrate.cjs"
+    cp "$BUILD_ROOT/migration-build/$DIALECT/migrate.cjs" "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
+    test -s "$ARTIFACT/db/migration-runners/$DIALECT.cjs"
```

```diff
--- a/scripts/migrate-nitro.mjs
+++ b/scripts/migrate-nitro.mjs
@@
-  const bundle = require(fileURLToPath(new URL("../db/migrations/sqlite/migrate.cjs", import.meta.url)));
+  const bundle = require(fileURLToPath(new URL("../db/migration-runners/sqlite.cjs", import.meta.url)));
@@
-  const bundle = require(fileURLToPath(new URL("../db/migrations/postgresql/migrate.cjs", import.meta.url)));
+  const bundle = require(fileURLToPath(new URL("../db/migration-runners/postgresql.cjs", import.meta.url)));
```

## Preserved scope

The existing engine loop now copies each isolated staged runner to its sibling destination and checks that actual destination for nonempty content. SQL/meta copying and journal checks remain unchanged; executable runners are no longer copied into the closed engine asset roots. This describes source intent, not an inspected artifact inventory.

Both existing explicit `migrationsFolder` fields remain unchanged. Activation, flags, fresh-root isolation, symlink rejection, byte-preserving SQL/meta copies, compiler inputs and staging, CLI build/output paths, entry checks, Bun and driver/path validation, fresh-only seed options, export checks and awaited failure flow are unchanged.

No Docker/default sources or outputs, K, D, CLI sources, facades, manifest or dependencies were edited. AW5 mutating sources were excluded. No existing partial artifact was cleaned or changed.

## Acceptance limits

K physical-history review remains **WITHHELD**. Any new metadata experiment is independent and is not app boot. D authentication/required-root joins, independent callers, Docker/default packaging, native/CLI closure and activation/adoption/restore/production holds remain outstanding. Ordinary source intent authorizes this narrow correction only, not production cutover.

No packaging, build or native PASS, relocation proof, authenticated root inventory or app-boot acceptance is claimed. Those require the coordinator's fresh checks, build and inspection. No commands, checks, tests, builds, evaluation, native/SQL execution, environment/data/secret access or nested agents were performed during this correction.

# BK required migration root — frozen one-file amendment

Applied only the approved source amendment from `convergence-BK-required-root-plan.md`:

```diff
diff --git a/packages/api/src/backup-runtime/sqlite.ts b/packages/api/src/backup-runtime/sqlite.ts
--- a/packages/api/src/backup-runtime/sqlite.ts
+++ b/packages/api/src/backup-runtime/sqlite.ts
@@ -7 +7 @@
-  migrationsFolder?: string;
+  readonly migrationsFolder: string;
```

The factory, forwarding, validation, capture, other interfaces and fields remain unchanged. No defaults, fallbacks, comments, casts, tests, dependencies or manifests were added or changed. Existing test callers remain untouched; custom old migration roots are not new acceptance evidence.

Only `packages/api/src/backup-runtime/sqlite.ts` and this new report were written. No commands, checks, builds, evaluation, native or SQL execution, environment/data/secret access or nested agents were used. AW5's currently mutating sources were excluded.

This amendment is frozen. Compiler and lint acceptance are not claimed. The coordinator must run fresh lint, owner checks and typechecks after all reached authors freeze, retaining the existing owner roots and reporting any missing required-root producer to its owner without defaults or suppressions.

K source acceptance remains WITHHELD pending the native-history metadata experiment. No native, adoption or copy PASS is claimed. Packaging/configuration production and activation remain outside this amendment; broad restore, supervision, sanitization and real-data authorization remain held.

# COPY1 root capture handoff

Changed only the constructor prefix in `packages/db/copied-sqlite.ts`: capture `config.temporaryDirectory`, then `config.migrationsFolder`, once each before the existing absolute-path validation; validate those captured locals.

The signature and error remain unchanged. All file content outside that prefix is preserved byte-for-byte by the scoped patch; no remaining body was edited or reordered. Catalog, pin, PK/FK, reset, native behavior, copy file opening, and root authority are unchanged. No readonly field, comments, casts, helpers, dependencies, fallback, guards, tests, exports, or other product-file changes were added.

No commands, checks, tests, evaluations, SQL, environment/data/secret access, or nested agents were run. Coordinator lint and typecheck remain required after Auth publisher freeze.

COPY1 is frozen for independent Oracle rereview (`ses_ece745d66ffe8YruU1v89Wrgqk`). This handoff does not authorize catalog/root-default/runtime D changes or data/adoption/activation.

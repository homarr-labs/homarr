# SR RTL correction frozen handoff

Frozen for rereview by the original reviewer. Followed `WRITER-RULES.md`; no commands or checks were run, and no compiler/runtime/procedure acceptance is claimed.

The approved correction replaces exactly three `ar` literals with `he` in `apps/backend/tests/public-fetch.test.ts`: the fixture locale union at line 17, concurrent-request preparation at line 158, and expected bootstrap locale at line 179. Current source confirms `he` is supported at `packages/translation/src/languages.ts:20` and configured RTL at `packages/translation/src/config.ts:172`. Unsupported Arabic had resolved through the actual culture resolver to English/LTR; Hebrew exercises the existing genuine RTL path.

All other assertions, cancellation bodies, theme alternation, request isolation, functions, and runtime source remain unchanged. The original `convergence-SR.md` handoff is immutable and was not edited. No imports, dependencies, tests, settings, or runtime configuration were added.

## Exact source diff

```patch
*** Begin Patch
*** Update File: apps/backend/tests/public-fetch.test.ts
@@
-  locale: "en" | "ar" = "en",
+  locale: "en" | "he" = "en",
@@
-        await prepareSyntheticPublicPage(context, details ? "ar" : "en", details ? "dark" : "light"),
+        await prepareSyntheticPublicPage(context, details ? "he" : "en", details ? "dark" : "light"),
@@
-      expect(bootstrap.snapshot.locale).toBe(index % 2 ? "ar" : "en");
+      expect(bootstrap.snapshot.locale).toBe(index % 2 ? "he" : "en");
*** End Patch
```

Remaining dependencies: original-reviewer rereview, then coordinator-owned focused lint/type validation and any authorized relevant existing checks after writer freeze. This correction does not change activation holds or establish runtime acceptance.

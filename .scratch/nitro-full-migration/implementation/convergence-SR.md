# SR frozen source handoff

Status: frozen for independent review. No commands, checks, tests, builds, installs, application execution, live calls, commits, or nested agents were run. Coordinator owns lint/type validation after all writers freeze and independent review completes.

## Scope and repair

- `apps/nitro/src/contracts/render.ts`: optional rounding increments now validate the exact supported numeric literal union at runtime. Existing strict format objects and the `TranslationSnapshot` compatibility check remain intact.
- `apps/nitro/src/ssr/render.tsx`: parse the actual prepared server settings before obtaining metadata translations; use that validated branding app name for the title and the same parsed settings for bootstrap. No casts, new fallback, fabricated production settings, renderer-arity relaxation, or host changes.
- `apps/backend/tests/public-fetch.test.ts`: replace the two stale renderer calls with three-argument calls. A request-local, explicitly synthetic helper is checked against the actual renderer preparation parameter type, validates its complete synthetic public settings, and uses the actual `resolveRequestLocale`, `loadRequestCulture`, `resolveCulturePreferences`, and `createCultureFormatter` exports. Arabic/English direction comes from the real locale resolver. The helper uses an explicit synthetic clock, UTC, and fixture locale/theme inputs, with the actual contract's required preparation revision literal.
- This new report is the only additional write.

All existing test declarations and assertions remain unchanged, including alternating locale/theme/direction, unique request IDs, memo isolation, forged-identity denial, HTTP outcomes, HEAD, multiple cookies, and physical asynchronous cancellation/disposal ordering. Cancellation test bodies are untouched. Synthetic fixture data does not read production configuration, environment, databases, media, or credentials.

Read inputs: current convergence instructions; fresh backend, Nitro, and lint diagnostics in `TEMP/nitro-evening-convergence-1lQoyI`; current renderer/provider schemas; backend preparation/projection contracts; translation runtime exports and source; relevant declared manifests. Zod and translation are already declared dependencies. The Zod literal-union/parse APIs follow existing source patterns; no new API lookup or SDK-internal inspection was needed. Remaining legacy app/icon/Docker diagnostics are outside SR and were not modified or hidden by root pruning.

## Exact frozen source diff

The following patch records the source changes against the files read at enrollment, including the resulting formatting. The report itself is newly added with the content shown in this file.

```patch
*** Begin Patch
*** Update File: apps/nitro/src/contracts/render.ts
@@
-        roundingIncrement: z.number().int().optional(),
+        roundingIncrement: z
+          .union([
+            z.literal(1),
+            z.literal(2),
+            z.literal(5),
+            z.literal(10),
+            z.literal(20),
+            z.literal(25),
+            z.literal(50),
+            z.literal(100),
+            z.literal(200),
+            z.literal(250),
+            z.literal(500),
+            z.literal(1000),
+            z.literal(2000),
+            z.literal(2500),
+            z.literal(5000),
+          ])
+          .optional(),
*** Update File: apps/nitro/src/ssr/render.tsx
@@
-import { bootstrapSchema } from "../contracts/render";
+import { bootstrapSchema, publicSettingsSchema } from "../contracts/render";
@@
-  const t = prepared.culture.i18n.getI18n("metadata");
+  const publicSettings = publicSettingsSchema.parse(prepared.settings.serverSettings);
+  const t = prepared.culture.i18n.getI18n("metadata");
@@
-    publicSettings: prepared.settings.serverSettings,
+    publicSettings,
@@
-      dashboardTitle: t("dashboardTitle", { appName: prepared.settings.serverSettings.branding.appName }),
+      dashboardTitle: t("dashboardTitle", { appName: publicSettings.branding.appName }),
*** Update File: apps/backend/tests/public-fetch.test.ts
@@
-import { bootstrapSchema } from "../../nitro/src/contracts/render";
 import type { RequestContext } from "@homarr/contracts/request";
+import {
+  createCultureFormatter,
+  loadRequestCulture,
+  resolveCulturePreferences,
+  resolveRequestLocale,
+} from "@homarr/translation/runtime";
+
+import { bootstrapSchema, publicSettingsSchema } from "../../nitro/src/contracts/render";
 import { createApplication } from "../src/server/application";
 import { renderPublicPage } from "../../nitro/src/ssr/render";

+async function prepareSyntheticPublicPage(
+  context: RequestContext,
+  locale: "en" | "ar" = "en",
+  colorScheme: "light" | "dark" = "light",
+): Promise<Parameters<typeof renderPublicPage>[2]> {
+  context.signal.throwIfAborted();
+  if (context.principal.kind !== "anonymous")
+    throw new Error("Synthetic public rendering requires an anonymous request");
+  const capturedClock = 1_700_000_000_000;
+  const timeZone = "UTC";
+  const resolved = await resolveRequestLocale({
+    preferences: { get: () => undefined },
+    readDefaultLocale: async () => locale,
+  });
+  const culture = await loadRequestCulture(resolved, { now: new Date(capturedClock), timeZone });
+  const culturePreferences = resolveCulturePreferences(null);
+  const serverSettings = publicSettingsSchema.parse({
+    board: {
+      homeBoardId: null,
+      mobileHomeBoardId: null,
+      enableStatusByDefault: false,
+      forceDisableStatus: false,
+    },
+    search: { defaultSearchEngineId: null },
+    user: { enableGravatar: false },
+    branding: {
+      appName: "Synthetic public fetch",
+      greeting: "",
+      logoImageUrl: null,
+      faviconImageUrl: null,
+      primaryColor: "#fa5252",
+      secondaryColor: "#fd7e14",
+      lockPrimaryColor: false,
+      signInBackgroundImageUrl: null,
+      signInBackgroundOverlay: 0,
+      authBranding: { showAppName: true, showLogo: false, showGreeting: false },
+      defaultRadius: "md",
+      customCss: "",
+    },
+  });
+  context.signal.throwIfAborted();
+  return {
+    revision: "homarr.public-resource-preparation.v1",
+    principal: context.principal,
+    setup: context.setup,
+    settings: {
+      culture: { defaultLocale: resolved.defaultLocale },
+      appearance: { defaultColorScheme: colorScheme },
+      serverSettings,
+    },
+    colorScheme,
+    culture,
+    resolved,
+    culturePreferences,
+    formatter: createCultureFormatter(culture, culturePreferences, { now: () => capturedClock }),
+    routingPathname: new URL(context.request.url).pathname,
+    cultureSeed: { capturedClock, nowEpoch: capturedClock, timeZone },
+  };
+}
+
 test("unconfigured protected contributions deny forged identities before their handler runs", async () => {
@@
-    render: (context) => renderPublicPage(context, { css: [], js: [] }),
+    render: async (context) =>
+      renderPublicPage(context, { css: [], js: [] }, await prepareSyntheticPublicPage(context)),
@@
-        {},
-        {
-          locale: details ? "ar" : "en",
-          theme: details ? "dark" : "light",
-          direction: details ? "rtl" : "ltr",
-          renderRevision: "isolation-probe",
-        },
+        await prepareSyntheticPublicPage(context, details ? "ar" : "en", details ? "dark" : "light"),
*** End Patch
```

## Review and coordinator follow-up

Independent review should confirm exact increment membership, validation before metadata, shared validated settings, genuine prepared-parameter compatibility, real Arabic direction resolution, and preservation of every original assertion/cancellation body. No validation success is claimed; lint/type results and any authorized focused test execution remain coordinator work.

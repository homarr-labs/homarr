# SELFHOST Batch B — frozen locale/public-origin source return

## Disposition

Frozen for independent source review. Locale portability is **SOURCE ONLY**, not active ordinary-listener, public SSR, authentication, native-resource or production PASS. Backend typecheck has the fixture integration blocker recorded below; the required prepared origin is not downgraded to optional.

Authorization is the coordinator's supplied Batch B lease after Oracle `ses_ece32b93effedhwzCMim6TCcW2` APPROVE. The coordinator explicitly superseded the frozen plan's A-before-B ordering, identifying progress 51/144. This return does not independently verify or edit that progress record. Batch A remains unallocated here, including startup's required empty basePath and the ingress API-evidence gate.

Only these product files were edited:

- `apps/backend/src/server/runtime-composition/public-culture.ts`
- `apps/backend/src/server/runtime-composition/contracts.ts`
- `apps/nitro/src/ssr/render.tsx`

This new return file is the only additional write. No startup, entry, router, hydration, asset, build, client, auth, manifest, translation, style, test or dependency file was edited.

## Source disposition

- Remove only the locale POST's loopback-host eligibility throw. Retain POST-only behavior, strict Origin equality against the captured configured origin, missing/literal-null/mismatched Origin rejection, cross-site Fetch Metadata rejection, JSON media type, the existing configured streamed body limit, sole `{locale}` shape, exact culture-catalog membership, anonymous principal, abort and currentness checks, response effects and statuses. No CORS, CSRF fallback, token endpoint/cookie, HMAC secret or new security configuration is introduced.
- Derive `secure` once from captured `configuration.baseUrl` protocol. Overlay it after the existing cookie attributes in both SSR locale synchronization and locale POST serialization. Captured HTTPS emits Secure; captured HTTP does not. Existing host-only, Lax, max-age and root-path semantics remain unchanged. QA's HTTP 127.0.0.1 origin/body/cookie semantics are unchanged at source level, not newly runtime-validated.
- Extend only `CookieCodec.serialize` attributes with optional `secure?: boolean`. Locale factory shapes and all other contracts remain unchanged.
- Add required `baseUrl` from captured configuration to the frozen prepared result; the existing inferred preparation/renderer types carry it without runtime/assembly/host changes. SSR derives bootstrap routing origin and document website origin directly from `prepared.baseUrl`, never from ingress canonicalization, request authority, forwarding headers or a localhost fallback. The inspected SSR file had request-derived `url.origin`, not a literal `loopbackUrl`; both request-derived origin uses are replaced. Request pathname validation and explicit-locale handling are unchanged.
- Preserve the preparation key, captured clock, memoization, exports, renderer authorization, read settings/culture, disposal and private-render hold. Existing publication/onPrivateResponse and original deadline/cache ownership machinery is untouched; no synthetic request context or second host is created.

## Dependency/API evidence

The nearest manifests already declare backend `cookie` and Nitro React 19.2.7, React DOM 19.2.7 and TanStack React Router 1.168.8. No dependency or React/router API change is made. The installed official `cookie` 2.0.1 package provides `secure?: boolean` in `node_modules/cookie/dist/index.d.ts:88–91`; its README's `secure` section describes HTTPS-only cookie transmission. Existing runtime serialization already spreads codec attributes into `stringifySetCookie`. No new Context7 call or API assumption is required for that attribute overlay.

## Checks and precise integration blocker

Repository-level instructions require lint and typecheck after source edits, so these limited checks were run despite the lease's request to leave checks to the coordinator:

| Check                                                                                                                                                                             | Result                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `./node_modules/.bin/oxlint apps/backend/src/server/runtime-composition/public-culture.ts apps/backend/src/server/runtime-composition/contracts.ts apps/nitro/src/ssr/render.tsx` | Exit 0                                                                                                                 |
| `./node_modules/.bin/tsc --noEmit -p apps/nitro/tsconfig.json`                                                                                                                    | Exit 0                                                                                                                 |
| `./node_modules/.bin/tsc --noEmit -p apps/backend/tsconfig.json`                                                                                                                  | Exit 1; one TS2741 at `apps/backend/tests/public-fetch.test.ts:56`, synthetic prepared result lacks required `baseUrl` |

The unallocated fixture was not edited. Coordinator must separately allocate its explicit trusted fixture baseUrl integration; do not make prepared baseUrl optional, infer it from the request or use a fallback to silence that error. No tests, builds, application/module imports, listeners, native probes, SQL, environment/data/secret access or nested agents were performed. Compiler/linter execution is limited to the commands above.

AW3 and CLI/Vite source freezes are untouched. The third immutable pre-B artifact is preserved and is not evidence of this patch; accepted static owner/header/asset evidence and accepted-but-not-rebuilt CLI correction remain attributed coordinator baseline. K/D, native identity/fresh-resource provenance, auth adoption, private SSR and restore/cutover holds remain unchanged. Further product checks belong to the coordinator after this freeze.

## Exact applied source patch

```diff
*** Begin Patch
*** Update File: apps/backend/src/server/runtime-composition/public-culture.ts
@@
 }) {
+  const trustedOrigin = new URL(options.configuration.baseUrl);
+  const secure = trustedOrigin.protocol === "https:";
   const preparationKey = Symbol("public-request-culture");
@@
-          value: options.cookies.serialize(effect.name, effect.value, effect.options),
+          value: options.cookies.serialize(effect.name, effect.value, { ...effect.options, secure }),
@@
         revision: "homarr.public-resource-preparation.v1" as const,
+        baseUrl: options.configuration.baseUrl,
         principal: Object.freeze({ kind: "anonymous" as const }),
@@
-      const trustedOrigin = new URL(options.configuration.baseUrl);
-      if (!["127.0.0.1", "localhost", "[::1]"].includes(trustedOrigin.hostname)) {
-        throw new Error("Guest locale mutations require the reviewed explicit loopback origin");
-      }
       if (
@@
-      context.effect({ kind: "cookie", value: options.cookies.serialize(effect.name, effect.value, effect.options) });
+      context.effect({
+        kind: "cookie",
+        value: options.cookies.serialize(effect.name, effect.value, { ...effect.options, secure }),
+      });
*** Update File: apps/backend/src/server/runtime-composition/contracts.ts
@@
-  serialize(name: string, value: string, options: { maxAge: number; sameSite: "lax"; path: string }): string;
+  serialize(
+    name: string,
+    value: string,
+    options: { maxAge: number; sameSite: "lax"; path: string; secure?: boolean },
+  ): string;
*** Update File: apps/nitro/src/ssr/render.tsx
@@
   const url = new URL(context.request.url);
+  const origin = new URL(prepared.baseUrl).origin;
@@
-    routing: { origin: url.origin, localePrefix },
+    routing: { origin, localePrefix },
@@
-      websiteUrl: url.origin,
+      websiteUrl: origin,
*** End Patch
```

## Oracle-approved required fixture closure — frozen source-only amendment

Oracle `ses_ece32b93effedhwzCMim6TCcW2` approved exactly one addition to the existing prepared fixture in `apps/backend/tests/public-fetch.test.ts`, immediately after its revision line:

```diff
     revision: "homarr.public-resource-preparation.v1",
+    baseUrl: "http://127.0.0.1:3200",
     principal: context.principal,
```

All other fixture bytes are unchanged. This is the existing synthetic fixture's explicit origin, matching its callers, not a production fallback or optional-contract downgrade. No new test, assertion, helper, body, expectation or security policy is introduced. The three independently source-accepted product files remain unchanged and outside this amendment's ownership.

The original handoff's lint/Nitro/backend exit results **0/0/1** above remain unchanged historical evidence. This amendment closes the missing required fixture field at source only; no fresh validation result is asserted. No commands, checks, CLI, tests, evaluation, native SQL, environment/data/secret access or nested agents were performed for this amendment. Coordinator runs fresh lint/typechecks after freeze.

The fixture's port 3200 literal does not authorize booting compiled output or a protected listener. No runtime, authentication, native or production PASS is claimed; all existing holds remain in force.

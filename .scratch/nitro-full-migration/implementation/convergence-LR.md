# LR frozen source handoff

## Scope and disposition

- Changed only `apps/nitro/src/routes/__root.tsx` and `apps/nitro/src/features/auth/navigation.ts`; this handoff is the sole new file.
- Root HTML explicitly supplies `lang={attributes.html.lang}` after the attributes spread, retaining direction, style, color scheme, and the existing hydration attribute.
- Both navigation control-character regexes now use one local code-point predicate rejecting backslash (`0x5c`), `0x00` through `0x20` inclusive, and `0x7f`. Sanitization, same-origin and double-slash guards, HTTP(S), credential rejection, and provider navigation-policy delegation are unchanged. Return-path composition and external OIDC policy remain unchanged.
- `apps/nitro/src/features/assistant/conversation.ts` was read but not edited. Its current lines 325–357 already have no return inside `finally`; line 331 throws on an unexpected readback thread identity. The reported earlier return-in-finally lint location does not describe the source read by LR. No repair of that earlier diagnostic is claimed.
- Assistant unsettled-operation retention, iterator/provider physical settlement, readback receipts, error states, and existing returns remain untouched. No conditional assistant rewrite was warranted by the specified stale diagnostic.
- Read current root/Nitro manifests and the existing document attributes, auth contracts, and shared redirect sanitizer. No dependencies, suppressions, casts, comments, redesigns, or tests were added.
- No commands, checks, tests, builds, installs, runtime actions, environment/secret/app-data reads, sealed-evidence reads, live calls, commits, or nested agents were used. LR writes are frozen; all validation belongs to the coordinator after input freeze and independent review. No lint/typecheck success is claimed.

## Exact source diff

```diff
--- a/apps/nitro/src/routes/__root.tsx
+++ b/apps/nitro/src/routes/__root.tsx
@@
-    <html {...attributes.html} data-mantine-color-scheme={bootstrap.colorScheme} suppressHydrationWarning>
+    <html
+      {...attributes.html}
+      lang={attributes.html.lang}
+      data-mantine-color-scheme={bootstrap.colorScheme}
+      suppressHydrationWarning
+    >
--- a/apps/nitro/src/features/auth/navigation.ts
+++ b/apps/nitro/src/features/auth/navigation.ts
@@
 import type { AuthFrontendNavigation } from "./contracts";

+function hasUnsafeNavigationCharacter(value: string): boolean {
+  for (const character of value) {
+    const codePoint = character.codePointAt(0);
+    if (codePoint !== undefined && (codePoint === 0x5c || codePoint <= 0x20 || codePoint === 0x7f)) return true;
+  }
+  return false;
+}
+
 export function authReturnPath(path?: string): string {
   const candidate = sanitizeRedirectionUrl(path);
-  if (/[\\\u0000-\u0020\u007f]/.test(candidate)) return "/";
+  if (hasUnsafeNavigationCharacter(candidate)) return "/";
@@
-  if (!value || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
+  if (!value || hasUnsafeNavigationCharacter(value)) return false;
```

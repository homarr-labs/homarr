# U public SSR implementation handoff

Source tranche frozen for H/coordinator review. This is the narrowed public SSR join, not authenticated UI enrollment or a readiness/procedure-coverage claim. No commands, compiler, checks, builds, installs, runtime/browser, native data, environment files, secrets, sealed captures, Git operations, or delegation were used.

## Exact write boundary

Only these product files were edited or added under `apps/nitro/src/`:

- `ssr/render.tsx`
- `contracts/render.ts`
- `contracts/providers.ts`
- `app/providers.tsx`
- `app/router.tsx`
- `entry-server.tsx`
- `entry-client.tsx`
- `routes/__root.tsx`
- `app/preview-document.ts`
- `app/public-providers.tsx` (new; absence checked before creation)

This new handoff is the only additional write. Backend, Vite/build configuration, manifests, generated route tree, private routes, identity clients, and writer holds were not edited.

## H handshake

The only backend import is the public `@homarr/backend/host` surface:

```ts
import { fetchApplication } from "@homarr/backend/host";
import type { PreparedApplicationRenderer } from "@homarr/backend/host";
```

H exports `PreparedApplicationRenderer = Parameters<typeof createPublicHostRuntime>[0]["render"]`. U infers both inputs using `Parameters<PreparedApplicationRenderer>[0]` and `[1]`; it neither imports private backend modules nor duplicates the prepared-input DTO.

The entry supplies `(context, prepared) => renderPublicPage(context, mergedAssets, prepared)` to the existing `fetchApplication(request, render)` name. H exclusively owns configured main-owner initialization, persistence, listener/origin policy, transport, and shutdown. The renderer rejects non-anonymous inputs and inconsistent prepared/document paths. Nonempty deployment base paths remain rejected by H's startup configuration; U does not invent support for them.

Required prepared members consumed: `principal`, `revision`, `settings.serverSettings`, `colorScheme`, `culture`, `resolved`, `culturePreferences`, `cultureSeed`, and `routingPathname`. Request services, authorization, effects, and disposal remain H-owned. U registers Router SSR cleanup and Query cancellation/clear through `context.onDispose`, including finally-protected cleanup; response effects are not copied or finalized a second time.

## Shared version-1 public bootstrap

Server and client parse the same `bootstrapSchema` with `snapshot.version: 1`. All added bootstrap fields are required except genuinely optional source formatting settings and cookie selection:

- `publicSettings`: SQL-prepared public board, search, user, and complete validated branding projection.
- `colorScheme`: the actual prepared `light`, `dark`, or `auto` preference.
- `culture.resolved`: supported catalog locale, Intl locale, direction, selection source, default locale, and optional cookie locale.
- `culture.capturedClock`, `culture.preferences`, and `culture.translation`: captured epoch, source culture preferences, supported translation locale, `nowEpoch`, effective time zone, and optional named formats.
- `routing`: actual request origin and the admitted explicit locale prefix, or empty prefix when none was supplied.
- `document`: source-translated description/dashboard title and actual request origin as website URL.

The legacy `snapshot.theme` is optional and is emitted only for an explicit light/dark preference. An auto request is not relabeled light; the main document and Mantine provider consume the required `colorScheme` instead. This keeps the existing unmounted presentation-provider force-color API type-compatible without a fake auto resolution.

If the prepared translation snapshot lacks a time zone, SSR records the actual server Intl-resolved zone, not a hardcoded UTC substitute. If a now epoch is absent, the real captured request clock is used. The server i18n binding uses these same effective values. Client reconstruction awaits `loadRequestCulture`, rebuilding `Date`, genuine catalog messages, Day.js locale, and table localization before Router/React hydration. Named formats are validated against the installed translation types rather than cast.

No functions, formatter, locale-resource handles, query client, private session, permissions, database, or admission lease enter this bootstrap. Existing bootstrap escaping remains untouched. Query dehydration still requires successful queries explicitly marked public; no private query was reclassified. TanStack's separate loader/before-load serialization remains relevant for future private enrollment and is not authorized by this tranche.

## Provider and document contract

The order is session, settings, locale, direction, theme, query, Jotai, modals, notifications; missing spotlight/assistant contributions remain absent. Session is genuinely anonymous with explicitly held authentication handlers, not a fake sign-in/sign-out or refresh implementation. Settings receives `user: null` and the actual public projection. The public culture context exposes the reconstructed culture/resources and source formatter with captured preferences/clock.

There is one `MantineProvider`, using existing `createBrandTheme`, installed Mantine 9.6.0 `v8CssVariablesResolver`, and a cookie-backed guest color-scheme manager. The prepaint script uses the prepared preference and real browser media selection for auto, without Mantine local-storage overrides. Manager listeners have actual unsubscribe cleanup. Direction uses the source explicit direction with automatic detection disabled. Existing Mantine/global CSS imports and body classes are retained.

The main root requires the bootstrap's actual document/settings and no longer calls the unbound default preview document helper. Original metadata/image/custom-CSS intent is retained for the public root. Crawling, Workshop, and manifest metadata are omitted rather than fabricated because the admitted projection does not supply them. Existing display-preview routes remain display previews, not product substitutes; no preview route or public layout was redesigned.

Router uses the real origin and native input/output rewriting for the admitted locale prefix; cross-origin URLs are left unchanged. Existing links, intent preloading, and query-publication filtering remain. Locale changes POST to `/api/preferences/locale` on the same origin with credentials and require status 204 before reloading or replacing the explicit locale prefix. U does not write optimistic locale cookies or broaden H's loopback-only Origin policy.

## Remaining verification and limits

Lint/typecheck and integrated SSR/browser checks were not run under this lease. H/coordinator must perform the separately allocated focused validation after input freeze, including auto prepaint/hydration, explicit locale-prefix navigation, locale POST effects, actual public settings/branding, HEAD/abort/error cleanup, assets, and document escaping. Ordinary static inspection is not runtime proof.

Private authentication, generated full native API/query clients, identity/settings private routes, server publication policy, writer admission, and real product-route enrollment remain separate joins. Existing public foundation/display screens, missing source font assets, and incomplete native/static functionality are not certified by mounting providers. No ready, production parity, or 91/334 increase is claimed.

Official references consulted: [TanStack SSR](https://tanstack.com/router/latest/docs/framework/react/guide/ssr), [Mantine color schemes](https://mantine.dev/theming/color-schemes/), and [translation configuration](https://next-intl.dev/docs/usage/configuration). Installed Mantine 9.6.0 declarations/implementation were inspected because the live Mantine site currently displays a newer version. Context7 was not used.

# EXPANSION35 settings frontend freeze

## Bounded three-P2 correction freeze

This correction lease changes only `apps/nitro/src/features/settings/` and moves this handoff to `.scratch/nitro-full-migration/implementation/expansion-settings-ui.md`. It does not resolve or relax the existing authentication, graph, or mount holds; independent rereview is required before central integration.

- The draft observes semantically changed incoming values. Same-flow authoritative hydration/refetch replaces both values and baseline only while pristine and not submitting. Incoming changes seen while dirty or submitting are recorded without replacing the draft or its original baseline. Discard reads the current intended baseline through a functional state update, not an older event-handler capture.
- Both forms require the real `cacheScope`; pages forward their existing scope. Committed mount/client/scope/target/access generations gate save completion, canonical callback delivery, and draft completion. Unmount or flow retirement marks the captured generation inactive; later completion cannot call the latest canonical handler, write the query cache through it, or finish the retired draft. Same-flow completions use the latest committed `onSaved`. Cleanup does not undo already dispatched saves, and no automatic retry is introduced. The host still owns actual session retirement, request-bound clients, and keyed remounts.
- Partial instance reconciliation starts from the fresh native canonical read and overlays only submitted groups whose requests rejected. Untouched externally changed groups and fulfilled submitted groups stay canonical. Rejected requests retain their errors even when a subsequent read suggests an ambiguous write may already have persisted; the read is not proof that the request succeeded. A failed refresh still preserves the conservative pre-save draft/baseline.

Source schemas, settings codecs, locale aliases, week-start choices, requested `auto` theme behavior, and UI intent are unchanged. No timezone or security-policy field is added. This freeze is based on static file inspection only; no commands, checks, runtime/network work, or tests are performed for this correction lease.

## Same-key read/publication ordering P2 freeze

This follow-up changes only settings `pages.tsx`, `draft.ts`, and this exact handoff. The previous three corrections remain in place, including pristine-only input reconciliation and canonical-first partial-save drafts. Authentication, graph, and mount holds are unchanged for the same independent reviewer.

For a completed native save, the page captures its committed mounted/client/session-cache-scope/target/access/query-client generation, calls and awaits `queryClient.cancelQueries({ queryKey, exact: true })`, then rechecks the captured generation before publishing canonical data and before delivering the latest committed host callback. Instance cancellation matches only `["settings", cacheScope, "instance"]`; preference cancellation matches only `["settings", cacheScope, "preferences", userId]`. There is no prefix/global cancellation. A retired page cannot publish or deliver its callback after the cancellation await. The draft now awaits page delivery and rechecks its own original authority generation before completing, preserving the pending/dirty reconciliation protection throughout cancellation.

The existing declared and installed dependency is `@tanstack/react-query` 5.101.2, which depends on `@tanstack/query-core` 5.101.2 and re-exports its client API. Static API evidence: `node_modules/@tanstack/query-core/build/modern/_tsup-dts-rollup.d.ts` declares `cancelQueries(...): Promise<void>` and exact query filters. Installed source evidence: `src/queryClient.ts` selects matching queries and calls their cancellations; `src/query.ts` cancels the retryer and forwards the query's abort signal; `src/retryer.ts` rejects a pending cancelled retryer and ignores later producer resolution. Cancellation begins before canonical cache publication and its settlement is awaited, so the older composite read cannot later overwrite canonical data merely because its search-engine producer resolves late or ignores transport cancellation. Signal forwarding alone is not treated as cancellation. Reads started after this cancellation are not retrospectively cancelled; unrelated keys and newer future reads retain their normal behavior.

This cancels read-cache publication, not dispatched native mutations. No server-abort guarantee, mutation undo, retry, schema/domain change, or new dependency is introduced. The partial-save implementation is untouched. Verification for this follow-up is limited to the installed declarations/source and static file inspection; no commands, checks, tests, runtime/browser/network work, or shared/peer edits were performed.

## Owned surface

New implementation: `apps/nitro/src/features/settings/`. No shared providers, routes, manifests, locks, native API implementations, legacy UI, branding application, or theme application are changed.

`SettingsCategoryShell` accepts only readonly category descriptors, localized labels, precomposed React slots, and controlled selection. It does not import identity, integration, authentication, certificate, media, or forms features. Central composition owns those categories, including security. There is no invented instance-security procedure or persisted timezone field in the source settings schema.

## Ported field/API bindings

Instance reads: `serverSettings.getAll(undefined)` and `searchEngine.getSelectable({ withIntegrations: false })`. `SettingsFeatureClient.serverSettings` is inferred directly from `createServerSettingsProcedures` in `packages/api/src/nitro/routers/server-settings.ts`, the native settings implementation in this checkout.

Only changed groups go to `serverSettings.saveSettings({ settingsKey, value })`:

| Group               | Exact edited fields                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| appearance          | `defaultColorScheme` (`auto`, `light`, `dark`)                                                                                                                                                                                                                                        |
| branding            | `appName`, `greeting`, `logoImageUrl`, `faviconImageUrl`, `primaryColor`, `secondaryColor`, `lockPrimaryColor`, `signInBackgroundImageUrl`, `signInBackgroundOverlay`, `authBranding.showAppName`, `authBranding.showLogo`, `authBranding.showGreeting`, `defaultRadius`, `customCss` |
| culture             | `defaultLocale`                                                                                                                                                                                                                                                                       |
| user                | `enableGravatar`                                                                                                                                                                                                                                                                      |
| search              | `defaultSearchEngineId`                                                                                                                                                                                                                                                               |
| analytics           | `enableGeneral` only                                                                                                                                                                                                                                                                  |
| crawlingAndIndexing | `noIndex`, `noFollow`, `noTranslate`, `noSiteLinksSearchBox`                                                                                                                                                                                                                          |

The analytics mutation does not send `instanceId` or `lastSuccessfulSnapshotAt`. Board defaults remain outside this form. Branding uses the actual `brandingServerSettingsSchema`, retaining URL/path validation, color constraints, overlay limits, nested visibility, radius options, and CSS limits. Other instance field validation mirrors the source settings form. The supported-language chooser comes from the source language list and locale configuration.

Preference reads: `user.getPreferences({ userId })` and `searchEngine.getSelectable({ withIntegrations: true })`. Saves: `user.updatePreferences({ userId, ...changedFields })`, using its native typed patch and canonical returned response.

Edited preference fields: `colorScheme`, `byteUnitSystem`, `firstDayOfWeek`, `pingIconsEnabled`, `enableRightClickOnWidgets`, `defaultSearchEngineId`, `openSearchInNewTab`, `ddgBangs`. Each validator is selected from the actual source `userPreferencesSchema`; the response's unrelated fields are explicitly projected before strict validation. The first-day selector retains source choices Monday, Saturday, Sunday while preserving all seven values accepted by the schema. No name/email/password/profile, home-board, or header-composer mutation is owned here.

`LocalePreferenceField` is separate: locale is not a user database preference. It requires the real current catalog locale and a host locale-change adapter. The adapter must perform the source locale-cookie/resource transition; there is no guessed endpoint or direct cookie write in this feature.

## Source algorithm reuse

There is no client-side serialized-settings decoder. Native `getAll` already calls `createSettingsStore.readAll`, whose source codec is `settingsCodec` (`superjson.parse`/`stringify`) and whose branding decode uses `parseBrandingSettings`. All instance mutations are followed by a native read to reconcile canonical values and partial successes. The feature never substitutes `JSON.parse` for that codec; JSON comparisons here compare already-decoded, primitive-valued form drafts only.

`createSettingsHydrationJoin` calls the actual source `createSettings` from `packages/settings/src/creator.ts`. It does not reconstruct guest/user fallback rules. The normalized settings, source translation snapshot, resolved locale metadata, DayJS locale name, table localization, requested scheme, resolved scheme, revision, and cache scope are returned as the central join input.

`createSettingsFormatting` calls the actual source `createCultureFormatter` with the real `RequestCulture`, culture preferences, and explicit host clock. Weekday labels use its localized DayJS instance. Source aliases are retained (`cn` → `zh-CN`, `zh` → `zh-TW`, `cr` → `en`, and source DayJS locale aliases). Timezone is passed through only when supplied by the source translation snapshot. No timezone persistence, invented UTC/default locale, global `dayjs.locale`, or independent formatter fallback is introduced.

## Central integration joins

- Supply an actual authenticated, request/session-bound `SettingsFeatureClient`; no admin principal is manufactured. Instance reads/saves remain backend-admin checked; user reads/saves retain the native self/admin authorization. A denied scope renders no data and performs no read. A read-only scope must still be authorized to read its backend leaves.
- Supply a stable session-specific `cacheScope` and keyed remount when the principal or target changes. Pass only real native SSR read results as `initialData`; no placeholders/default records stand in for persisted settings. Query cancellation is forwarded to oRPC.
- Mount under the central existing query and source standalone localization providers. Hydrate settings/locale/theme using `SettingsHydrationJoin` from the same request on server and client. `RequestCulture` itself includes runtime functions: do not serialize it; the join carries its data-only translation and locale resources.
- Preserve source requested-theme cookie/default precedence before supplying `requestedColorScheme`. Keep `auto` as a requested preference, separate from the explicit server-resolved light/dark snapshot. Central theme code owns system preference handling, cookie synchronization, and branding application; this feature does not force `auto` to light or change a provider.
- On canonical `onSaved` snapshots, central composition updates/invalidate its settings/session/request resources. Instance partial-save callbacks carry the fresh full settings read; user callbacks carry the full native response. Refresh and remount policy belongs to central composition, not category slots.
- Compose board defaults, identity, auth/security, integration, certificate, media, and forms business-feature slots centrally. Optional branding image/CSS renderers receive frozen controlled input records only. Without renderers, the form exposes plain URL/path inputs and a CSS textarea, not a fake icon picker, media browser, upload, Workshop import, or code editor. These richer source controls are not claimed as ported here.
- Provide the locale field as a language slot only for the current user's real locale flow. Do not let editing another user's preferences alter the actor's locale.
- Supply `analyticsDocumentationHref` using the source `createDocumentationLink("/docs/management/settings", "#analytics")` at central composition. This keeps configured documentation origins without adding environment or document reads to the settings feature.

## Feedback and persistence

Drafts expose source-localized validation through `zodErrorMap`, dirty/discard state, synchronous duplicate-submit protection, disabled pending fields, read-only explanation, inline errors, and canonical-save success. A failed group does not report overall success. Partial instance writes are reconciled by reading native settings; unsuccessful draft values remain editable and dirty. A failed refresh preserves the conservative pre-save baseline/draft. No before-unload listeners, browser effects, automatic mutation retries, or new notifications provider are installed.

Read pages expose pending, denied, error/retry, and read-only states. Read-only controls cannot invoke save flows, including renderer callbacks. Query keys contain the host cache scope and preference target.

## Dependencies and verification handoff

The app already declares React, Mantine core/hooks, Zod, oRPC, and TanStack Query. No new external library is used. Missing direct workspace declarations to return to the central owner: `@homarr/api`, `@homarr/common`, `@homarr/server-settings`, `@homarr/settings`, `@homarr/translation`, `@homarr/validation`. This feature uses relative source entrypoints rather than introducing undeclared `@homarr/*` imports; central packaging should add workspace declarations and normalize public-entrypoint imports together. No manifests or lockfiles are edited here.

Context7's current-doc lookup returned a monthly quota error. Mantine's current Select documentation and the installed v9 Select declaration were consulted instead. Source component patterns supplied the remaining form controls. No unit tests, build/install, browser, provider, database, environment, listener, or Git work is part of this feature lane.

Historical verification before this correction lease: lint passed for the settings directory; the app-wide typecheck encountered an in-progress syntax error in `apps/nitro/src/features/apps/search.tsx`; an isolated settings-root typecheck had no settings diagnostics but was blocked by five transitive Unifi declaration/implicit-type errors in `packages/integrations/src/unifi-controller/unifi-controller-integration.ts`. These results are not verification of the bounded corrections. No peer files were changed. The draft accepts a structural source validation interface rather than coupling source and app Zod class identities, since their installed Zod versions differ; source validators and source `zodErrorMap` are still reused.

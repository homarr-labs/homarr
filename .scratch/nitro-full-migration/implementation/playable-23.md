# PLAYABLE-WAVE32 lane23

## Exact write inventory, recorded before implementation

- `apps/nitro/src/source-ui/auth-onboarding/contracts.ts`
- `apps/nitro/src/source-ui/auth-onboarding/login.tsx`
- `apps/nitro/src/source-ui/auth-onboarding/invite.tsx`
- `apps/nitro/src/source-ui/auth-onboarding/registration-form.tsx`
- `apps/nitro/src/source-ui/auth-onboarding/index.ts`
- `apps/nitro/src/features/onboarding/types.ts`
- `apps/nitro/src/features/onboarding/studio.tsx`
- `apps/nitro/src/features/onboarding/account.tsx`
- `apps/nitro/src/features/onboarding/setup-studio.tsx`
- `apps/nitro/src/features/onboarding/connections.tsx`
- `apps/nitro/src/features/onboarding/index.ts`, named display-only setup preview export
- `packages/onboarding/src/onboarding-auth-shell.tsx`, original wrapper delegates to the shared presentation body; props exported
- `packages/onboarding/src/presentation.ts`, new presentation-only leaf
- `packages/onboarding/src/presentation-steps.tsx`, original welcome/finish presentation without legacy transport
- `packages/onboarding/src/presentation-auth-shell.tsx`, shared original shell body with explicit wordmark/backdrop slots
- `packages/onboarding/src/presentation-backdrop.tsx`, shared original backdrop body with actual marquee injection
- `packages/onboarding/src/onboarding-backdrop.tsx`, delegate original presentation to the shared body
- This handoff.
- Owned validation snapshots under `.scratch/nitro-full-migration/playable23-{check,final,frozen,return}-*` and the initial `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable23-static-rwUMn1`; safe source copies/config only, no build/cache/listener/data/credential artifacts.

Original Next login/invite/init and original onboarding business controllers remain read-only. Only the exact leased package presentation wrappers above delegate to shared source bodies. Existing accepted auth attempts and onboarding claim/read/account/draft controllers are reused, not regenerated. No issuer, establishment, SQL, manifests, routes, tests or peer-owned source changes.

## Declaration requests to01

- Publish `@homarr/onboarding/presentation` -> `./src/presentation.ts` and declare `@homarr/onboarding` for the Nitro composition when admitted. This lane does not import an undeclared package from Nitro: source components/styles are mandatory explicit presentation props.
- The presentation leaf consumes existing declared Mantine, Tabler, canvas-confetti and existing wordmark/sound/backdrop components. Do not import the onboarding root, which also exports legacy tRPC-backed studio.
- Publish `@homarr/ui/integration-marquee` -> `./src/components/integration-marquee.tsx` and `@homarr/ui/password-input` -> the existing password input barrel. Supply the actual `IntegrationMarquee` and `CustomPasswordInput` to this lane's explicit factories/props; no broad UI root is imported by the Nitro pages or new onboarding presentation leaf.
- Reuse the already requested slim original source controls (`BoardColorInput`, `CornerStylePicker`, `ColorSchemeCombobox`, `IntegrationAvatar`, language combobox, integration selection grid, `UserCreatePasswordFields`) and original validation/definitions/translation leaves. No new external dependency is introduced.

## Status

Frozen implementation returned for01's immutable3210 integration. No3210 mount or backend acceptance claimed.27 issuer remains active/unaccepted; absent transports and all unsupported setup transitions stay visibly held.

## Immediately mountable exports and props

`apps/nitro/src/source-ui/auth-onboarding/index.ts`:

- `AuthLoginPage(AuthLoginPageProps)`: existing `AuthLoginFormProps` plus `presentation: { Shell, t, branding }`. Supply the existing accepted auth transport/navigation/messages. Omit transport methods that are unaccepted; their provider controls become disabled with the existing visible unavailable feedback. No demo credentials, issuer implementation, cookie code or fake success is added.
- `AuthInvitePage(AuthInvitePageProps)`: `{ presentation, registration, invite }`. `invite` is `verified` with a real creator name, `unavailable` with a held message, or `display-preview` with a creator display fixture and mandatory visible label. Only an actual server-side provider/session/invite/token/expiry check can supply `verified`; this view is not an invite validator. `registration` supplies the actual source password-requirements component, Zod error map and localized hold message.
- `AuthRegistrationForm(RegistrationPresentation)`: original username, source password requirements and confirmation, original `userRegistrationSchema`, empty initial values, localized errors and secret reset after a valid programmatic form submission. Registration is always visibly disabled and has no API/transport prop. Neither an invite token nor credentials leave component state.

`apps/nitro/src/features/onboarding/index.ts`:

- Existing `OnboardingFrontend` and `OnboardingStudio` remain source-context/claim/current-step gated. The original abort/currentness/account/draft algorithms and actual native client methods are reused. No27 issuer is consumed. New `accountActions?: "accepted"` is absent by default, preventing even an Enter/programmatic submit from dispatching an unaccepted initial-user/group write. Only a separately accepted current-authority/atomic establishment composition may opt in. Success still cannot imply sign-in; user creation clears secrets and exposes the original recovery destination.
- New `OnboardingSetupPreview(OnboardingSetupPreviewProps)` takes `{ source, environment, currentLocale, displayLabel }`. The environment is explicitly a labeled **display fixture**, never native context or authorization evidence. It supplies `client=null` to the existing setup controller, disables both read hooks, hides unavailable retry actions, disables integration testing, and cannot create accounts/groups/apps/integrations/keys/boards or advance setup. Six sections remain navigable with unsaved original defaults and rich original source controls. No fake client, principal, claim, successful discovery, mutation result, progress or session is constructed.
- `OnboardingSource` gains `presentation: { classes, AuthShell, Backdrop, Link, Welcome, Finish }`; actual original integration avatar/floating control and API-key/documentation URL helpers; and a caller-localized `holds` dictionary. `OnboardingProps.navigation.reloadSetup()` must be a genuine router reload/invalidation operation, not a no-op. Invoke the source presentation factory once outside render so component identities are stable.

`packages/onboarding/src/presentation.ts`, pending01 export admission:

- `createOnboardingPresentation(actualIntegrationMarquee)` returns `{ AuthShell, Backdrop }`, using the original shell/backdrop bodies and actual original wordmark. This leaf has no legacy tRPC/auth/Next/UI-root runtime import.
- `OnboardingAuthShellView`, `OnboardingBackdropView`, `OnboardingWordmark`, `OnboardingWelcomeView`, `OnboardingFinishView`, `onboardingClasses`, and their public props. Welcome takes translator, real wordmark/backdrop nodes, display version/driver, localized start/restore holds and restore visibility; it cannot start/restore. Finish takes translator, wordmark/backdrop, actual source destination/docs URL/colors and the frozen navigation bridge `Link`; mount a real finish only after persisted finish is independently confirmed. Original confetti respects reduced motion/modifier keys and does not hijack the router's navigation.

Bind `source.presentation` from these exports: `classes=onboardingClasses`, `AuthShell/Backdrop` from the factory, `Welcome=OnboardingWelcomeView`, `Finish=OnboardingFinishView`, and the accepted03 anchor-compatible function component for `Link`. Supply `source.OnboardingWordmark=OnboardingWordmark`. The eleven required localized hold strings are `authority`, `transition`, `account`, `restore`, `apiKey`, `assistant`, `preview`, `expired`, `changed`, `signIn`, `integrationTest`.

## Original source correspondence

| Original read-only specification                                               | Frozen destination / reuse                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nextjs/src/app/[locale]/auth/login/page.tsx`                             | `source-ui/auth-onboarding/login.tsx`, same greeting/branding/icon/shell branches; backend signed-in redirect remains01/27's real guard                                                                                                                                                                                                                       |
| `auth/login/_login-form.tsx`                                                   | Existing accepted `features/auth/login-form.tsx`, unchanged provider branches, validation, recovery collapse, pending and OIDC lifecycle                                                                                                                                                                                                                      |
| `auth/invite/[id]/page.tsx`                                                    | `source-ui/auth-onboarding/invite.tsx`, same custom-title/greeting/footer/shell branches; real provider/session/token/expiry guards remain held upstream                                                                                                                                                                                                      |
| `auth/invite/[id]/_registration-form.tsx`                                      | `source-ui/auth-onboarding/registration-form.tsx`, original fields/password-requirements/schema; registration mutation visibly held                                                                                                                                                                                                                           |
| `apps/nextjs/src/app/[locale]/init/page.tsx`                                   | Existing source-context/claim/current-step reconciliation in `features/onboarding/studio.tsx`; no SQL/env/session source replacement                                                                                                                                                                                                                          |
| `packages/onboarding/src/onboarding-auth-shell.tsx`, `onboarding-backdrop.tsx` | Shared original bodies moved into `presentation-auth-shell.tsx`/`presentation-backdrop.tsx`; original Next-facing wrappers delegate, not duplicated                                                                                                                                                                                                           |
| `packages/onboarding/src/welcome.tsx`, `finish.tsx`                            | `presentation-steps.tsx`: original hero, restore appearance, finish cards/links/icon hierarchy, branding and CSS; unsupported start/restore remain held                                                                                                                                                                                                       |
| `packages/onboarding/src/account.tsx`                                          | Existing `features/onboarding/account.tsx` now renders original AuthShell/icons/password fields/error/recovery appearance; native calls default held, no automatic sign-in                                                                                                                                                                                    |
| `packages/onboarding/src/setup-studio.tsx`                                     | Existing `features/onboarding/setup-studio.tsx`/`connections.tsx`: original six-section timeline/roving focus, discovery capability cards, avatar selections, separated accordions/status/credential alternatives/docs links, color reset/radius/columns/sidebar preview, extension tabs, review swatches/tiles and sticky Back/Continue/confirmation popover |
| Original `onboarding-studio.module.css`, wordmark, sounds                      | Original CSS/wordmark are consumed, not recreated. Wordmark sound/confetti remains its original implementation. No fabricated completion progress or success sound is played for held actions                                                                                                                                                                 |

Existing selection/completeness/URL precedence, board validation, schema helpers, test-state reset, claim expiry, abort/generation ownership and provider gating remain in their accepted controllers. Unsupported completeSetup/nextStep/restore/key/issuer joins are not introduced. Finish navigation uses actual source destinations; group completion uses the supplied router reload operation rather than hard navigation. The setup URL example and legacy action sound hooks are not newly recreated; functional completion progress cannot be shown until a real accepted completion handler exists.

## Focused immutable validation

Final frozen, read-only snapshot: `.scratch/nitro-full-migration/playable23-return-YW6Pwv` (files0444/directories0555). Includes copied owned frontend/public presentation sources and the frozen pure validation/definitions/translation/common dependencies needed by the explicit roots. Static checking resolves installed external library declarations only; no watcher/symlink/private backend/real data/env file is used. `setup-studio.tsx` SHA256: `341f10c6d3bdab27eeb1fbc084e85d267f99f89859092ac6d12d70d81297bac8`.

- `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit -p .scratch/nitro-full-migration/playable23-return-YW6Pwv/tsconfig.json`: **passed**, strict/noEmit, explicit source-ui/onboarding/public presentation roots; no emitted build or cache.
- Same clean environment, `oxlint --deny-warnings` over copied onboarding/source-ui directories and the six owned onboarding presentation/wrapper files: **passed, 20 files, 0 errors / 0 warnings**.
- Initial expanded lint also inspected unchanged accepted auth files and reported their existing control-regex/dependency warnings; those algorithms were deliberately not edited. The final lint scope is the actual changed lane source; the accepted auth closure is included in strict typecheck.
- Verified actual installed Mantine9.6.0 PasswordInput/Timeline/Popover declarations and PopoverDropdown implementation (default `role=dialog`, focus trap, return focus, portal). Installed React19.2.7, Tabler3.44.0, canvas-confetti1.9.4, tiks0.3.0, TypeScript7.0.2 and oxlint1.73.0. No Context7 call after the authoritative quota-exhausted amendment. Static tool host resolved Node24.16.0 through PATH; no runtime claim is based on it.

No tests added/run, Git changes, child agents, install, build, live session/provider request, SQL, credentials/cookies, Docker, deployment or competing listener.3210 integration/browser/mobile/SSR/race/session proof remains01-owned. The new slim public leaf was strictly checked; the original legacy Next wrappers were linted, not represented as a newly accepted full Next graph.

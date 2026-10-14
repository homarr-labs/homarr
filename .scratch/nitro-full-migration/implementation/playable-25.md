# PLAYABLE-WAVE32 lane25

## Exact writes declared before implementation

- `apps/nitro/src/features/global-tools/source-providers.tsx`
- `apps/nitro/src/features/global-tools/source-session.tsx` (new)
- `apps/nitro/src/features/global-tools/source-jotai.tsx` (new)
- `apps/nitro/src/features/global-tools/index.ts`
- `packages/modals/src/index.tsx`
- `packages/settings/src/context.tsx`
- This handoff file.

Original Next sources, chrome, root providers/order, routes, manifests, issuer, Spotlight and Assistant destinations remain untouched. Existing settings creator/context and notification actions are genuine reusable sources and will not be replaced with lookalikes.

## Immediate dependency/export requests01

Admit `@homarr/settings`, `@homarr/modals`, `@homarr/notifications` workspace dependencies and `jotai: catalog:` to `apps/nitro/package.json` before consuming the concrete composition. These are existing original app dependencies, not new libraries. No manifest writes by25. Existing package public entrypoints already export settings/modal/notification providers. Notification stylesheet remains required from `@homarr/notifications/styles.css`, owned document join04/01.

## Original composition finding

`apps/nextjs/src/app/[locale]/layout.tsx` actually nests session → settings → Jotai → query → DayJs → locale → Mantine → modals → Spotlight → Assistant; Notifications is the first child inside Assistant. Frozen `contracts/providers.ts` currently differs. Request01 preserve original order in root composition;25 will return both genuine slot contributions and an explicit original-order source wrapper, without editing root.

## Principal and peer boundaries

Snapshot session kind is not a principal/session. No inferred user, JWT, fake session or credential. Session presentation accepts a confirmed authenticated reader result with expiry and explicit login/logout handlers, or anonymous/held state. Missing protected transport stays visibly held. Spotlight17 and Assistant21 must provide frozen contributions before mounting; no active peer modules are consumed.

## Frozen implementation

### P2 reopen: deferred expiry redirect

Exact reopened writes: `apps/nitro/src/features/global-tools/source-session.tsx` and this handoff only. The other five source files remain frozen. The independent review identified a stale queued `signIn` call after effect cleanup/session replacement/unmount, plus a logout-ref race between scheduling and invocation. The deferred callback must check effect currentness and the logout ref before recording an attempted redirect and invoking the actual current effect's handler. No runtime/reproduction harness or new tests are permitted for this correction; validation is isolated lint/typecheck plus raw logs and hashes, not a behavioral-proof claim.

Correction frozen for rereview: the deferred callback now returns if its effect has been cleaned up (`!active`), logout has started, or that session already started a redirect. Only after these checks does it set `redirectStarted.current=session` immediately before calling that effect's actual `handlers.signIn()`. Stale queued work does not consume the redirect marker. Error handling still guards `setRedirectFailure` by currentness. Long-timer rescheduling, logout URL/ref, invalid/expired notices, missing-handler holds, public props and session-before-settings ordering are unchanged. Anonymous/held subset remains conditionally mountable; this correction does not establish principal/issuer authority or claim authenticated runtime acceptance.

New copied/dereferenced, symlink-free validation snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane25-p2-frozen-y0spbvvv`. It copies the prior frozen source/dependency/config closure and substitutes only the reopened session file; no active peer source, root provider, issuer or DayJs implementation is consumed. Actual clean-environment commands, both exit **0**:

```sh
env -i HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane25-p2-frozen-y0spbvvv PATH=/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin /Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json > p2-typecheck.raw.log 2>&1
env -i HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane25-p2-frozen-y0spbvvv PATH=/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin /Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node node_modules/oxlint/bin/oxlint --config .oxlintrc.json apps/nitro/src/features/global-tools/source-session.tsx > p2-lint.raw.log 2>&1
```

Raw artifacts below are relative to that snapshot (no filtered/rewritten logs):

| Artifact                                                  | SHA-256                                                            | Result                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `apps/nitro/src/features/global-tools/source-session.tsx` | `5bd576ff5d2d071265bdc93da9d88b88e0c94d763de9095a0935bb78abc6375b` | 4766bytes; checkout matches validated copy                                                                        |
| `tsconfig.json`                                           | `d38b25e604dcc348ee95ae2d8a3a6fdc06a89dfc72e3d0e655b6836ec908e7ce` | Same real strict/noEmit/nonincremental config and source closure as prior check                                   |
| `p2-typecheck.raw.log`                                    | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | Empty raw output, exit0                                                                                           |
| `p2-lint.raw.log`                                         | `d1bac17186bf1b96c53760f2909f759d8305b9e5ee1302cf2240b4d2bb616aad` | 0warnings/0errors, one reopened file                                                                              |
| `p2-source-hashes.json`                                   | `220f6143d68ac5282377ed82582201f240bfc6862464c7e5dace639d092004c1` | Before/after session hashes; all other five checkout sources match their prior frozen hashes; snapshot symlinks=0 |

Previous session hash: `3fd18bd2369d00eb670ffa09fd0e8287bbf10cafa9bd143d2adaf0cf73d8a7f0`. No comments, `any`, casts, new tests, children, Git operation, runtime/browser/server execution or production authority were added. Behavioral rereview remains independent of these lint/type receipts.

Completed; listed source files are frozen for01. No source destinations owned by peers were imported. No root, route, issuer, manifest, lock, Chrome, Spotlight or Assistant file was changed. No children, Git mutation, tests, comments, casts or `any` were added.

### Immediately reusable API

`createGlobalToolProviderContributions(sources: GlobalToolSourceProviders)` now binds genuine implementations rather than accepting arbitrary replacement/no-op providers. It returns a frozen contribution object with `session`, `settings`, `jotai`, `locale`, `modals`, and `notifications`. Optional `frozenPeers` admits only already accepted `spotlight`/`assistant` contribution signatures. Missing peers are absent, not fake contexts or claimed working features.

Inputs:

- `settings: Omit<SettingsProviderProps, "children">`: actual `user: UserSettings | null` and `serverSettings: PublicServerSettings`. The source settings creator preserves all original user/server fallbacks, header-preference parsing and branding parsing. Auth context is read on every render; anonymous/held/expired states receive `user=null` rather than synthetic preferences masquerading as an authenticated user. Authenticated settings must be loaded for that same confirmed principal by the host.
- `session: Omit<SourceSessionProviderProps, "children">`: `state`, `handlers`, optional `logoutUrl`, required `unavailableTitle` and `expiredDescription`. These labels come from the host's translation snapshot; no fabricated locale/messages.
- `locale: Omit<I18nProviderProps, "children">`: the existing accepted standalone translation snapshot and optional real `onChangeLocale` host adapter. Without the adapter the existing translation source throws on attempted locale switching; it is not a no-op.
- `frozenPeers?: Pick<ProviderContributions, "spotlight" | "assistant">`: omit while17/21 are active. The original Spotlight registration reference counts/deduplication and Assistant preferences → refresh → runtime → enabled provider/composer/widget layering remain their owners' responsibility.

Named exports from `features/global-tools`:

- `SourceJotaiProvider({ children })`: original `<jotai.Provider>` body, independent mounted root store lifetime, no shared singleton store.
- `SourceSessionProvider(props)` and `useSourceAuthContext()`: source logout URL/ref and expiry behavior without `next-auth/react` or `next/navigation`. Presentation only, never an authorization capability or issuer. Confirmed authenticated input is `{ kind: "authenticated", session: { expires, user: { id, name?, email?, image?, permissions, colorScheme } } }`; other states are `{ kind: "anonymous" }` and `{ kind: "held", reason }`. Handlers are either `{ kind: "available", signIn: () => Promise<void>, signOut: () => Promise<void> }` or `{ kind: "held", reason }`. Expired/invalid input is held; expiry schedules the real supplied login redirect at most once for that session and cleans up timers. The long-timeout cap reschedules rather than redirecting prematurely at24days. There is no fake `update`, fake principal, automatic endpoint invention or successful no-op refresh.
- `SourceSessionNotice()`: mount inside Mantine, not beside the outer session context. Included automatically in the notifications contribution; unavailable principal/handlers render a visible warning. Session context itself has no outer Mantine UI, preserving original nesting safely.
- `SettingsProviderProps` is now publicly exported by the existing settings context barrel. Runtime settings behavior is unchanged.

### Exact source mappings

| Destination                          | Original/source reused                                                                         | Changes                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source-providers.tsx` settings slot | `packages/settings/src/context.tsx`, `creator.ts`; Next locale layout lines145–167             | Bind real source props and suppress principal-specific settings when held; no reimplementation of the creator                                                     |
| session provider/context             | Next `_client-providers/session.tsx`; `packages/auth/nitro/context-types.ts` public user shape | Replace NextAuth glue with explicit confirmed-reader presentation input and real/held handlers; preserve logout URL/ref and login-on-expiry                       |
| `source-jotai.tsx`                   | Next `_client-providers/jotai.tsx`                                                             | Original Provider body, no framework dependency                                                                                                                   |
| locale slot                          | accepted `@homarr/translation/client` standalone `I18nProvider`                                | Supply its real snapshot/host-adapter API                                                                                                                         |
| modal slot                           | `packages/modals/src/index.tsx` and original reducer/reference/creator/confirm bodies          | Reuse unchanged stack/references/interceptors/keepMounted/translated titles/form pending state; remove unused ref and clean up the original entry-animation timer |
| notification slot                    | Next locale layout line208; original `@homarr/notifications` barrel/source                     | Actual Mantine surface with `pauseResetOnHover="notification"`; unchanged teal/red/yellow source feedback actions/icons                                           |

### Required3210 composition

01 must compose outer-to-inner **session → settings → Jotai → Query → DayJs locale loading → standalone locale → Direction → Mantine theme → original ModalProvider → frozen Spotlight17 → frozen Assistant21 → notifications contribution → page**. Direction encloses Mantine in the original source. `SourceSettingsProvider` intentionally reads `SourceAuthContext`; the prior settings-before-session order cannot be used. Notifications/session notice are inside Mantine and inside Assistant, as in the original source. Factory outputs must be constructed once for an immutable root/reader snapshot, not recreated on unrelated renders, to preserve Jotai/modal/Spotlight/Assistant state. Root session transitions and Query cancellation/cache lifetime remain01/02 responsibilities, not fabricated here.

The original `@homarr/translation/dayjs` still uses Next `useParams`; do not mount it unchanged. DayJs is not silently replaced by a no-op. Its explicit framework-free loading join is a remaining root/translation dependency, outside the owned reusable settings/session/modal/notification implementation. Likewise existing theme presentation is snapshot-driven, not a claim that the original authenticated color-scheme writer is available.

For the preview without a frozen issuer/read, use `session.state={kind:"anonymous"}`, `settings.user=null`, and `session.handlers={kind:"held",reason:<visible issuer/handler hold>}` with real public settings/translation snapshots (or explicitly labeled synthetic display values). Do not promote `RenderSnapshot.session.kind` into a `SourceSession`, do not use display fixtures as a principal, and do not mount protected operations.27 must return a confirmed public session reader payload and durable issuer before authenticated transport is joined.

## Dependency/API receipts

01 admitted the requested workspace packages and `jotai` into the real Nitro manifest before the concrete imports were written. The existing public settings/modals/notifications entrypoints suffice; no new export declaration is required. Notification/document styles still belong to04/01.

Installed source checked: Jotai2.20.1 `react/Provider.d.ts` (optional explicit store, independent default Provider); Mantine9.6.0 Modal/ModalBase declarations; Mantine Notifications9.6.0 `lib/Notifications.d.ts` (`pauseResetOnHover: "all" | "notification"`, actual store/actions/portal API). Notifications became available after01's dependency admission;25 did not install anything. The actual standalone translation provider throws when its locale-change adapter is absent. Context7 was not used because the authoritative wave explicitly records exhausted quota and permits installed source.

## Focused immutable validation

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/lane25-frozen-78gotdvy`. Sources and installed dependencies were copied/dereferenced, not symlinked or watched; commands ran with `env -i`, disposable HOME, explicit Node24.18.0, no emit/incremental cache. Only owned provider sources and their original accepted static dependency closure were checked; the actively edited Chrome barrel target was excluded from typecheck. No backend/native/issuer/peer implementation was consumed as accepted.

- TypeScript7.0.2: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` — **pass**. Roots: source session/Jotai/provider factory plus existing owned presentation/modal/notification leaves; genuine settings/modal sources are included through their package imports. Actual React/Node/Bun/Vite types, ESNext DOM libs, arbitrary CSS extensions and JSON modules; no declaration stubs, unsafe casts or fake dependency APIs.
- Oxlint1.73.0: exact six changed TS/TSX files — **0 warnings, 0 errors**. Original source modal reducer/confirmation behavior was not rewritten or separately claimed tested.
- Early validation failed only because copied optional native compiler/linter packages and Node/Bun/crypto-js type dependencies were initially omitted; actual installed copies corrected the closure. Final checks above passed.
- No tests/browser/runtime/server were launched by25.01 still owns integrated lint/typecheck,3210 mounting and browser proof. These provider exports are frozen source readiness, not production acceptance or protected-handler proof.

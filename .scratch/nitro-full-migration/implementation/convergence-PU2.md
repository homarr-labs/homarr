# PU2 — frozen private read/provider consumers

## Exact source lease

Added only:

- `apps/nitro/src/features/identity/read-boundary.tsx`
- `apps/nitro/src/app/private-providers.tsx`
- `apps/nitro/src/app/private-shell.tsx`
- This report.

No commands, checks, tests, builds, runtime/native/SQL execution, credentials, existing sealed evidence, routes, entries, public root, render/SSR contracts, query-owner source or other workers' files were touched. No compilation, runtime, backend admission or publication acceptance is claimed.

## Frozen interfaces

`IdentityReadBoundaryInput` requires the real `IdentityPrincipal`, rotating non-secret `authorityKey`, authenticated `SourceSessionState`, PU1's concrete `AuthenticatedReadQueryScope`, actual enabled/local provider policy, demo policy, write hold and translated transition description. `IdentityReadBoundary` supplies only this read context; `useIdentityRead` returns it, never a full `IdentityClient`, mutation authority or replacement QueryClient. The exported availability hook joins effective source authentication and the reactive root session transition with captured session-reference equality, current native scope, principal ID and grants.

`PrivateProviderInput` extends that complete read input. It additionally requires non-null signed-in user settings plus `settingsUserId`, actual server settings, prepared `RequestCulture`, actual culture preferences, shared captured clock, locale snapshot and real required locale callback, real available sign-in/sign-out handlers, actual refresh callback, source hold labels, color-scheme manager and required spotlight/assistant provider owners. Only the existing source logout URL remains optional.

`createPrivateProviderBinding` returns a frozen `PrivateProviderBinding` containing:

- `read`: the captured frozen complete input; use **this exact value** for the shell and read consumers, rather than the original producer input. Its session projection is captured separately from the caller's mutable object.
- `providers`: source-order contributions for the existing single `ApplicationProviders`.
- `sessionHandlers`: real sign-in/sign-out callbacks wrapped with private retirement.
- `refreshAuthority`: the supplied real replacement producer wrapped with retirement.
- `retire(): Promise<void>`: synchronous reactive blocking and native retirement initiation, with the native physical-read drain returned to the owner.
- The supplied `colorSchemeManager` and captured `formatting` from `createSettingsFormatting`.

The factory rejects mismatched principal/session/settings owner and grants, invalid/expired session projection, unequal prepared locale snapshot or clock, and culture preferences that do not match signed-in user settings. Actual browser-session expiry must be supplied by AH; an API key without stored expiry cannot be adapted by fabricating `SourceSession.expires`.

`PrivateShellProps` requires **all** of `IdentityReadBoundaryInput` as `input`, plus original `GlobalToolsChromeProps` except its redundant `sessionBlocked` flag. `PrivateShell` checks equality of the root hook QueryClient, chrome QueryClient, native scope QueryClient and Router context QueryClient, plus authenticated render state/current chrome user ID. It gates the entire chrome and private children before mounting `SourceNavigationProvider` and existing `GlobalToolsChrome`.

## Lifetime and owner behavior

- Root settings use effective source authentication and reactive transition state, clearing the user projection on closure.
- Root Jotai, modal, notification, spotlight and assistant contributions have actual reactive read boundaries, not a shell-only unmount or nonreactive currentness boolean. Source session and private owners are keyed by captured authority/native scope generation. The existing source modal owner and Jotai store are recreated rather than retained across generations.
- The read boundary also keys its own context generation, so descendant drafts cannot survive a replacement when used independently of the shell.
- Real sign-in, logout, refresh and locale callbacks enter existing `runSessionTransition`, which blocks synchronously. Native `scope.retire()` is invoked immediately inside that transition, before the supplied operation is scheduled or awaited. Operation and physical retirement drain are both awaited; simultaneous failures remain an `AggregateError`. Failed transitions stay closed, and even successful transitions cannot reopen the retired old scope.
- All external resource-policy/logout/disposal producers must use the binding's retirement entrypoint or the same synchronous root-transition/native-retirement protocol. Calling the raw native scope's `retire` without publishing root transition state is not an observable visibility event and is not the consumer handoff contract. No polling or global QueryClient clear was added.
- Recreate the whole binding only for an atomically replaced authority/render generation. Publish a fresh scope identity and fresh prepared settings/session/culture together. Do not mutate an old binding or reuse its provider component closures; source settings are copied/frozen on capture. Producer callbacks are real operations, not nested competing root-transition wrappers.

## Activation dependencies / holds

These modules remain dormant. AH retains backend admission/session/lease ownership separately; this UI binding does not create or discharge that lease, authenticate RPC, approve authorization, publish private SSR data, or supply a private wire bootstrap.

Required before enrollment: actual opaque browser-session projection and replacement producer; genuine callbacks and locale persistence/navigation/document refresh; route-owner registration/admission and source-search/base-path wiring; current native scope and host-owned cache identities; real chrome/menu/navigation resources, actual permissions and frozen tools; approved private publication and lifetime release. User menu logout must call the bound real handler, not bypass its retirement wrapper. Route readiness must remain separate from actual permissions.

Root notification visibility is gated, but the existing source notification service has a global store rather than an authority-local store. The source/tool owner must prevent old private notification payloads from being replayed into a replacement generation before activation; this source-only lease neither adds a notification API nor claims that global state has been cleared. Tool owners likewise retain responsibility for physical async work beyond the native read scope and for effects not owned by their mounted source provider.

Original `ApplicationProviders`, source composer, modal/Jotai conventions, source CSS modules and entry stylesheet order are retained. No Mantine theme/provider, hand-written query key, fake permission/resource, route/root/bootstrap/SSR wiring, full identity editor or writer was introduced. PU1's authenticated-read alias is now present and was read, not modified. Coordinator owns focused lint/type validation after writers freeze.

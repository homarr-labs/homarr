# PU convergence — private shell, native11 and routed source consumers

## Decision / lease

Land dormant, concrete private UI modules against the real `AuthenticatedReadAssemblyClient`; enroll them only after AH publishes typed private bootstrap/auth services and main-owner admission. Do not reinterpret the accepted anonymous bootstrap as authenticated application state. Native11 can supply real group/API-key reads and current-user preferences, but cannot satisfy `IdentityClient` or `SettingsFeatureClient`.

This lane wrote only this new report. Ordinary source, the prior `evening-U-private-ui.md`, R's handoff and installed oRPC declarations were read. No product edits, commands/checks, runtime/browser/application/native execution, SQL access, environment/credential/data reads, live calls, sealed evidence or nested agents. Signatures below are proposed unless explicitly described as existing; no compilation or functionality claim.

Reserved: `apps/nitro/src/contracts/render.ts`, `apps/nitro/src/ssr/render.tsx`, backend public fetch test, root/lint/assistant/navigation repairs, main-owner authentication/admission and generated route tree. Do not modify these to make PU appear enrolled. No public-root edits, extra Mantine provider, stylesheet reorder or UI redesign.

## Current facts replacing historical U blockers

- Existing `contracts/providers.ts` now orders `session → settings → locale → direction → theme → query → jotai → modals → notifications → spotlight → assistant`. Preserve this exact order.
- Existing `app/providers.tsx` already uses `createBrandTheme`, `v8CssVariablesResolver`, the requested color scheme and a supplied manager. Preserve the single root `ApplicationProviders`; do not mount `GlobalToolThemeProvider` around private chrome.
- Existing public root/bootstrap/providers now derive branding/culture/document metadata from public preparation, not the old preview defaults. Public reconstruction explicitly rejects authenticated bootstrap; this is a correct boundary, not a guard for PU to remove.
- The package export `@homarr/api/nitro/assembly/authenticated-read-client` now exists. Its type is exactly `RouterClient<ReturnType<typeof createAuthenticatedReadAssembly>["router"]>`; the contribution contains eleven reads and zero writers. Factory construction of additional unselected procedures does not mount them.
- `query/{types.ts,scope.ts}` is still expansion-only. `IdentityBoundary` still allocates a second `QueryClient`; identity/settings reads still have handwritten keys. Neither is an acceptable native11 bridge.
- Current `RequestContext.principal` has only authenticated `subject`; `BackendPrincipal` has the actual user projection. Never cast the former to the latter. Current public host preparation still rejects authenticated requests. AH must supply the actual private producer, not merely an authorization callback.

## Exact independently landable source allocation

These are proposed product leases, not edits performed here. Confirm exclusive allocation before implementing shared query files.

| Slice                                   | Exact paths                                                                                                                                                          | Dependency / result                                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Concrete browser client                 | NEW `apps/nitro/src/client/authenticated-read.ts`                                                                                                                    | Real native11 type and existing `./rpc-link`; no host or bootstrap edit                                                                        |
| Reuse existing query lifetime algorithm | NEW `apps/nitro/src/query/scope-owner.ts`; MODIFY `apps/nitro/src/query/types.ts`, `apps/nitro/src/query/scope.ts`; NEW `apps/nitro/src/query/authenticated-read.ts` | Mechanical extraction of the existing owner, preserving expansion exports/behavior; concrete native11 family, not a second handwritten adapter |
| Source group presentation               | NEW `apps/nitro/src/app/group-presentation.tsx`                                                                                                                      | Existing `SourceLink`, `GroupPresentation`, public `@homarr/ui` avatars; no route registration                                                 |
| Private read context                    | NEW `apps/nitro/src/features/identity/read-boundary.tsx`                                                                                                             | Mandatory principal, source session, native11 scope and holds; no `IdentityAuthority` full-client impersonation                                |
| Bounded source read pages               | NEW `apps/nitro/src/features/identity/read-pages.tsx`                                                                                                                | Existing source group/API-key views; generated queries; no full identity editor/workbench edits                                                |
| Producer-input composition              | NEW `apps/nitro/src/app/private-providers.tsx`, `apps/nitro/src/app/private-shell.tsx`                                                                               | Required source settings/session/culture, source chrome resources and actual callbacks; no auth implementation or preview defaults             |
| Route loader functions only             | NEW `apps/nitro/src/app/private-route-loaders.ts`                                                                                                                    | Native generated options and existing `createRouteQueryLoader`; no RouterContext/generated tree edit                                           |
| Enrollment, separately serialized       | AH/coordinator-owned `app/router.tsx`, entries, private route files and generated tree; reserved render/root contracts only by their owner                           | Import PU exports after producer interface freezes; cannot honestly be completed within PU's read-only lease                                   |

Do not put new file routes under `routes/` merely to stage them: file-route discovery can enroll them before admission. Stage exported page/loader modules in `app/` and `features/`; the route owner adds actual route files after the contract join.

### 1. Native browser client

`apps/nitro/src/client/authenticated-read.ts`:

```ts
createAuthenticatedReadBrowserClient(endpoint: string | URL): AuthenticatedReadAssemblyClient
```

Implement with existing `createORPCClient<AuthenticatedReadAssemblyClient>(createBrowserRpcLink(endpoint))`. Import the client type only from its published package leaf. `createBrowserRpcLink` already enforces browser-only same-origin, no embedded credentials/query/fragment, POST, same-origin cookies and redirect rejection. AH supplies the mounted endpoint; do not assume `/rpc`, use loopback SSR calls, add authorization headers or serialize credentials. Type inference alone is not evidence the endpoint is mounted.

### 2. Generated Query scope: reuse, not handkeys

Installed `@orpc/tanstack-query/dist/index.d.ts` imports `AnyNestedClient` from `@orpc/client` and constrains both `RouterUtils<T>` and `RouterUtilsPlugin<T>` with it. Use that installed constraint, not `any` or a full-client cast.

Proposed signatures in `query/types.ts`, retaining the current expansion aliases:

```ts
type QueryScope<TClient extends AnyNestedClient> = Readonly<{
  identity: ExpansionQueryCacheIdentity;
  runtime: ExpansionQueryRuntime;
  queryClient: QueryClient;
  orpc: RouterUtils<TClient>;
  state: ExpansionQueryScopeState;
  isCurrent: () => boolean;
  assertCurrent: () => void;
  invalidate: () => Promise<void>;
  retire: () => Promise<void>;
}>;

type QueryScopeOwner<TClient extends AnyNestedClient> = Readonly<{
  queryClient: QueryClient;
  runtime: ExpansionQueryRuntime;
  acquire: (
    client: TClient,
    identity: ExpansionQueryCacheIdentity,
  ) => QueryScope<TClient>;
}>;

type ExpansionQueryScope = QueryScope<ExpansionApiAssemblyClient>;
type ExpansionQueryScopeOwner = QueryScopeOwner<ExpansionApiAssemblyClient>;
```

`query/scope-owner.ts` extracts the existing algorithm once:

```ts
createQueryScopeFamily<TClient extends AnyNestedClient>(
  family: "expansion" | "authenticated-read",
): (queryClient: QueryClient, runtime: ExpansionQueryRuntime) => QueryScopeOwner<TClient>
```

Each once-created family closure owns its typed `WeakMap<QueryClient, QueryScopeOwner<TClient>>`, typed client/scope map and retired prefix set. Do not use an erased heterogeneous owner map requiring casts. `query/scope.ts` retains its existing `createExpansionQueryScopeOwner` export as the once-instantiated expansion family. `query/authenticated-read.ts` instantiates the authenticated-read family once and exports:

```ts
type AuthenticatedReadQueryScope = QueryScope<AuthenticatedReadAssemblyClient>;
type AuthenticatedReadQueryScopeOwner = QueryScopeOwner<AuthenticatedReadAssemblyClient>;
createAuthenticatedReadQueryScopeOwner(
  queryClient: QueryClient,
  runtime: ExpansionQueryRuntime,
): AuthenticatedReadQueryScopeOwner
```

Preserve expansion's current prefix verbatim; authenticated-read uses its own family prefix. Preserve nonempty six-field identity validation, exact owner/client equality, no custom operation keys, all generated option interceptors, finite server outputs, browser-only stream options, mutation retry=false, immediate retirement state, pending read drain, cancellation and prefix-only removal. Do not clear the shared root client when retiring one private scope. Both families, if acquired on one router, must use the same host-selected runtime.

Host supplies all six existing fields: `cacheLifetimeId`, `clientCacheId`, `principalCacheId`, `permissionRevision`, `boardCacheId`, `boardRevision`. These are non-secret cache identities, not credential/session identifiers. AH must define a real non-board namespace/revision for these routes; PU must not fill board fields with `"none"`, `"0"`, random browser IDs or user IDs presented as revisions. Fresh SSR/browser scopes must have the same hydration identity; replacement authority must acquire fresh identities.

Use only `scope.orpc.<leaf>.queryOptions({ input, ...options })` for reads and the same leaf's `.queryKey({ input })` for exact updates. Namespace `.key()` is permitted for generated invalidation. No `useIdentityKey`, `['settings', ...]`, operation suffix arrays, concatenated query keys, custom `queryFn`, raw-client cache reads or `meta.visibility = 'public'` on private data. Changing consumer typing must not weaken currentness/interceptors.

### 3. Required producer inputs; callbacks are runtime-only

`app/private-providers.tsx` proposes a consumer input, not a competing wire bootstrap:

```ts
interface PrivateProviderInput {
  readonly authorityKey: string;
  readonly principal: IdentityPrincipal;
  readonly session: Extract<SourceSessionState, { kind: "authenticated" }>;
  readonly settings: GlobalToolSourceProviders["settings"] & {
    readonly user: NonNullable<GlobalToolSourceProviders["settings"]["user"]>;
  };
  readonly culture: RequestCulture;
  readonly culturePreferences: CulturePreferences;
  readonly capturedClock: number;
  readonly locale: GlobalToolSourceProviders["locale"];
  readonly sessionHandlers: Extract<SourceSessionHandlers, { kind: "available" }>;
  readonly logoutUrl?: string;
  readonly unavailableTitle: string;
  readonly expiredDescription: string;
  readonly colorSchemeManager: MantineColorSchemeManager;
  readonly frozenPeers?: GlobalToolSourceProviders["frozenPeers"];
}

createPrivateProviderBinding(input: PrivateProviderInput): {
  providers: ProviderContributions;
  colorSchemeManager: MantineColorSchemeManager;
  formatting: SettingsFormatting;
}
```

Implementation reuses `createGlobalToolProviderContributions` and `createSettingsFormatting(culture, culturePreferences, { now: () => capturedClock })`. Recreate the binding only on an atomically replaced authority/render generation; keep it stable within that generation. Existing composer closes over inputs, so mutating an old settings object after refresh is invalid. Settings user must be the signed-in user's real `UserSettings`, never the target account currently being edited. Require a non-null user for this private binding, and matching session/principal user ID and grants. `locale.snapshot` must be the same prepared culture snapshot used for server first paint and browser reconstruction.

AH supplies actual opaque-cookie-session expiry in `SourceSession.expires`. API-key admission without stored expiry does not satisfy this browser-session contract; do not manufacture expiry. Grants/name/email/image/color scheme preserve source values/nullability. `authorityKey` must rotate on replacement, including same-user refresh and relevant permission/membership changes, without exposing durable session IDs or verifier material.

The following runtime services must be implemented by AH/feature producers before enrollment; names are a requested interface, not claims of existing endpoints:

| Consumer signature                                                     | Required producer behavior                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorize: RouterContext['authorize']`                                | Current server admission for each protected requirement; browser projection is not RPC authority. Protected action/resource mapping must be explicitly implemented by AH, not generic authenticated=allow. |
| `sessionHandlers.signIn(): Promise<void>`                              | Real admitted login/redirect path, accepted return path and provider policy. Not a resolved no-op.                                                                                                         |
| `sessionHandlers.signOut(): Promise<void>`                             | Real CSRF/origin-checked logout and cookie/revocation effects; retire private visibility before starting it; approved provider logout behavior.                                                            |
| `refreshAuthority(): Promise<void>`                                    | Fetch/read a fresh same-owner projection, acquire a fresh cache generation, atomically publish session/settings/culture/current grants, then invalidate route loads. Failed replacement stays closed.      |
| `locale.onChangeLocale` using existing `I18nProviderProps`             | Actual authenticated locale commit and host-approved base-path/locale URL handling; then refresh culture/root metadata. Existing anonymous loopback-only endpoint is not this producer.                    |
| `RefreshPorts.invalidateLoaders(): Promise<void>`                      | Await real `router.invalidate({ sync: true })`, after fresh context has been installed.                                                                                                                    |
| `RefreshPorts.refreshRenderSnapshot(revision): Promise<void>`          | Genuine source settings/culture/document refresh and manager update, not cache-only invalidation.                                                                                                          |
| `RefreshPorts.resolveSession()` / `invalidateResourcePolicy(resource)` | Actual fresh session/current-resource policy producers, with same-owner/currentness checks; not empty Promise handlers.                                                                                    |

Until the producer-defined private wire type exists, do not import an imaginary `PrivateBootstrap` from `contracts/render.ts`, intersect authenticated state into the anonymous schema, encode callbacks into bootstrap or invent auth endpoint DTOs. PU modules accept the typed runtime inputs above; AH/coordinator adapts its approved bootstrap/auth-services interface to them.

### 4. Private shell / source chrome

`app/private-shell.tsx` proposes:

```ts
PrivateShell(props: GlobalToolsChromeProps & {
  readonly authorityKey: string;
  readonly scope: AuthenticatedReadQueryScope;
}): ReactNode
```

No second `ApplicationProviders` or QueryClient. Require `props.queryClient === props.scope.queryClient === router.options.context.queryClient`. Mount existing `SourceNavigationProvider` inside the real Router/root Query provider, and a context-only read scope provider beneath it. Navigation owner must have installed exact `sourceSearchSerialization` and reconciled base path/locale rewrites before `SourceLink` is usable; PU must not repair reserved navigation files itself.

Use existing `GlobalToolsChrome`, `SourceChrome`, `MainNavigation`, `UserButton`, `createManagementNavigation` and their exact exported contracts. Host/source owners provide `GlobalToolsChromeProps.chrome`, real frozen tool slots/signals, translated labels, `HeaderResources`, `UserButtonProps` and actual `ManagementNavigationAccess`. Local collapse/open/close state is legitimate UI state; fake board-switcher preload, fake search/tour wrappers, assistant unread numbers, theme actions, avatars or permission booleans are not.

Access and route readiness are distinct. Never change an actual permission to false just to hide an unimplemented destination. The route owner must either register an honest held destination or supply a separate route-readiness filter preserving the authorization projection; navbar links alone are not completed features. Resource-specific apps/integrations access, enabled Docker/Kubernetes and backup engine support must come from their owners, not an admin-bit shortcut.

Before rendering any private subtree, require current read scope, effective `useSourceAuthContext().state.kind === 'authenticated'`, matching principal/session and unblocked `useSessionTransition(queryClient)`. If blocked/expired/retired, remove the private subtree, user menu and private tools; render existing source session/hold feedback. `SourceChrome.sessionBlocked` only makes header/navigation inert: its `AppShellMain` still renders children, so it is not the retirement boundary. Producer transitions must block and call scope retirement synchronously before awaited refresh/logout. Re-key private drafts and scope-owned modal/tool content on authority replacement; do not leave old overlays showing private payload.

Preserve `app/preview-styles.ts` imports/order on both entry graphs and every source CSS module (`groups.module.css`, source settings/table/chrome styles). Do not duplicate stylesheet loading into a nested private provider. Existing missing original font assets remain a parity deficit, not a reason to redesign typography.

### 5. Presentation and narrow read pages

`app/group-presentation.tsx`:

```ts
createPrivateGroupPresentation(documentationHref: string): GroupPresentation
```

Return `linkComponent: SourceLink`, actual documentation href, `renderAvatar(user, size)` using `<UserAvatar user={user} size={size} />` and `renderAvatarGroup(users, size, limit)` using `<UserAvatarGroup users={users} size={size} limit={limit} />`. The existing helper is exported by `@homarr/definitions` (`src/docs/index.ts`), not `@homarr/common`. Reuse that producer for the approved groups documentation path. Avatars are exported by `@homarr/ui`; preserve real name/image/email and SettingsProvider-controlled Gravatar behavior.

`features/identity/read-boundary.tsx` proposes `IdentityReadBoundary({ input, children })` and `useIdentityRead()`. Its mandatory input is `{ principal: IdentityPrincipal; authorityKey: string; scope: AuthenticatedReadQueryScope; enabledProviders: readonly SupportedAuthProvider[]; locallyManagedProviders: readonly SupportedAuthProvider[]; demo: { enabled: boolean; readOnly: boolean }; writeHoldReason: string }`. Use a context only; no QueryClient allocation, full-client property or credential-bearing state. It is a read boundary, not a mutation authority. The shell/producer owns lifetime retirement and fresh projection; an unavailable principal is not a ready empty-permissions principal.

`features/identity/read-pages.tsx` proposes:

- `ReadGroupListPage({ presentation }: { presentation: GroupPresentation })`: generated `group.getAll` options; preserve Everyone card, source position sort and `GroupsTable`, existing translations and local search. Display actual write/order holds. Do not mount `GroupCreate` or sortable-write controls. Reuse source list presentation; no new table design.
- `ReadGroupDetailPage({ groupId, section, presentation }: { groupId: string; section: GroupSection; presentation: GroupPresentation })`: generated `group.getById({ id: groupId })`; preserve `GroupDetailLayout`, `ReservedGroupAlert`, `GroupOwnerCard`, `MembershipNotice`, `MemberIdentity` and source section semantics. General/members sections show actual returned data with explicit mutation holds. Settings shows actual stored home IDs with selector hold, not invented board titles/choices. Permissions show actual returned grants and the existing hold; do not mount a writable editor until its full authority/producer contract exists. Source member links remain `/manage/users/$userId/general`, whose destination must be registered as held if user detail is unavailable.
- `ReadApiKeyAdministration()`: generated `apiKeys.getAll` options and existing `ApiKeysView`; `creating=false`, `createDisabled=true`, no `onCreate`, `createdKey=null`, no revoke callback, real hold feedback and avatar renderer. Do not supply a fake success handler. `getAll` explicitly omits stored key material; plaintext creation result UI is not part of native11 or SSR.

Existing `IdentityLoading`/`IdentityError` or source equivalents handle real pending/error states; permission denial precedes a read. Never map a failed/missing response to a successful empty list. The original full `GroupEditor` cannot be mounted with native11 even with `writeHoldReason`: general eagerly requests `user.selectable`, members can request it, and settings requests `board.getBoardsForGroup`. Keep those editors out of this narrow read slice.

## Native11 loader/consumer map

`app/private-route-loaders.ts` exports `loadPrivateGroupList(scope, signal): Promise<void>`, `loadPrivateGroupDetail(scope, id, signal): Promise<void>` and `loadPrivateApiKeys(scope, signal): Promise<void>`. Each uses `createRouteQueryLoader(scope.queryClient).loadFiniteQuery(scope.orpc.<leaf>.queryOptions({ input }), { freshness: 'fetch' }, signal)` and returns no payload/client/lease. Scope assertion precedes/ follows finite loads. AH binds admission/request cancellation and route abort ownership; existing navigation abort handling alone does not cancel the admitted server operation.

| Exact leaf                        | Input to generated options                                                | Legitimate consumer / guard                                                                                |
| --------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `info.getInfo`                    | `undefined`                                                               | Source management/about metadata; preserve factory public semantics, do not invent management-home content |
| `serverSettings.getAll`           | `undefined`                                                               | Instance-settings canonical read, **admin**; never use full settings as public provider payload            |
| `serverSettings.getBoardSettings` | `undefined`                                                               | Actual admin board-default read; not accessible-board choices                                              |
| `user.getPreferences`             | `{ userId: principal.user.id }` or admitted target ID                     | Current-user provider/settings projection; target read requires backend self/admin policy                  |
| `user.getTourStatus`              | `undefined`                                                               | Current-principal tour status; no reset/complete callbacks in native11                                     |
| `group.getAll`                    | `undefined`                                                               | ReadGroupListPage, **admin**                                                                               |
| `group.getPaginated`              | `Parameters<AuthenticatedReadAssemblyClient['group']['getPaginated']>[0]` | Optional actual paged source read; do not issue it as well as getAll for the same list                     |
| `group.getById`                   | `{ id }`                                                                  | ReadGroupDetailPage, **admin**, actual not-found semantics                                                 |
| `group.selectable`                | `undefined` or `{ withPermissions: true }`                                | Protected selector; permissions returned only with real admin grant; not proof user creation is available  |
| `group.search`                    | `{ query, limit }`                                                        | Actual admin group search; no replacement with a fabricated option list                                    |
| `apiKeys.getAll`                  | `undefined`                                                               | ReadApiKeyAdministration, **admin**, metadata only                                                         |

Use identical input/options builders in loader and hook, then `useQuery(options, scope.queryClient)` in the read page. Loader freshness is an explicit producer/route policy; Query key identity must match regardless. There is no requirement to fetch all eleven leaves on every request. In particular, a non-admin private shell must not preload admin instance/group/API-key reads merely because the client type contains them.

## Route-owner enrollment: exact destinations and holds

AH/coordinator proposes the pathless private parent `apps/nitro/src/routes/(private)/_private.route.tsx` with ID `/(private)/_private`, a `beforeLoad` current authenticated admission check and PrivateShell/Outlet component. `beforeLoad` must not return principal/services/client/lease in serializable match context; the private runtime context is host-owned. Child guards use actual producer decisions **before** finite loaders. A parent authentication guard alone does not grant admin.

Resolve existing `/manage` ownership first: public `routes/(public)/_public/manage.route.tsx` authorizes then unconditionally throws. Move/replace its registration only under the route owner's lease; never leave two `/manage` routes. Do not put every child under an admin-only manage parent: source user general/security permits self access too.

| Proposed file under `apps/nitro/src/routes/(private)/_private/`                 | URL / source component                                               | Readiness                                                                                          |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `manage.route.tsx`, `manage.index.tsx`                                          | `/manage`, real source management shell/home                         | Parent protected management policy and actual home producer; native11 is not a home implementation |
| `manage.users.groups.index.tsx`                                                 | `/manage/users/groups` → ReadGroupListPage                           | native11 admin read ready after admission/query/publication join                                   |
| `manage.users.groups.$id.index.tsx`                                             | `/manage/users/groups/$id`, section `general`                        | native11 detail; source general/owner read with write/selector holds                               |
| `manage.users.groups.$id.members.tsx`                                           | `/manage/users/groups/$id/members`, section `members`                | real members in getById; add/remove/candidate selectors held                                       |
| `manage.users.groups.$id.settings.tsx`                                          | `/manage/users/groups/$id/settings`, section `settings`              | stored IDs readable; actual board choices/save held                                                |
| `manage.users.groups.$id.permissions.tsx`                                       | `/manage/users/groups/$id/permissions`, section `permissions`        | stored grants readable; Group2 write held                                                          |
| `manage.tools.api.tsx`                                                          | `/manage/tools/api` → ReadApiKeyAdministration                       | native11 admin metadata; create/delete held                                                        |
| `manage.settings.tsx`                                                           | `/manage/settings` → InstanceSettingsPage after its full-client join | admin snapshot exists; source form/search/board/branding writer joins held                         |
| `manage.users.index.tsx`, `manage.users.create.tsx`, `manage.users.invites.tsx` | `/manage/users`, `/create`, `/invites`                               | user list/detail/create and invite leaves absent; honest held contribution, no empty user list     |
| `manage.users.$userId.general.tsx`, `manage.users.$userId.security.tsx`         | user detail plus one PreferenceSettingsPage                          | self/admin, actual user/profile/security/selector/writer joins held                                |

Group section derives from the matched route, not workbench state. Route IDs/tree generation and literal `to/params` typing are route-owner work; these proposed files are not registered today. Stage loader/page modules first, then generate the tree once enrollment is allocated. Deep-link refresh must reach the same admitted private handler, not fall back to public rendering.

## Full identity/settings follow-up: exact consumer changes, no premature writes

Do not spend the first read slice rewriting all full clients. Once the **actual mounted** wider router/client/scope freezes, allocate the following consumer-only join:

1. `features/identity/client.ts`: infer required read/write client shapes from that mounted router, not full unmounted factories. Keep real `IdentityPrincipal`, enabled/local provider policy and demo state. Carry feature-specific admitted write capability/hold discriminants; a read client cannot be made `state: 'ready'` for the existing full `IdentityAuthority` by assertion.
2. `features/identity/boundary.tsx`: require the router-owned matching scope/QueryClient, remove local QueryClient/QueryClientProvider allocation and `useIdentityKey`. Preserve synchronous private hiding and authority-generation remounting; retire only the acquired generated prefix.
3. `features/identity/{groups.tsx,users.tsx,user-detail.tsx,invites.tsx,api-keys.tsx,preferences.tsx,header-preferences.tsx}`: replace each current handkey/queryFn with that exact native `.queryOptions({ input, enabled })`. Use `group.getById({ id })`, `user.getById({ userId })`, `user.selectable({ providers })`, `board.getBoardsForGroup({ groupId })`, preferences target ID and true search selector input. Do not merge provider-filtered and unfiltered user selectors into one key. `features/identity/permissions.tsx` keeps its existing explicit no-save hold until Group2 actually releases authority/currentness-to-COMMIT/lifetime.
4. `features/identity/feedback.tsx`: replace bare `invalidateQueries()` with generated procedure/namespace invalidation for acknowledged mutations. Authority-changing operations retire visibility, await real `refreshAuthority`, then navigate/load using the replacement scope. An acknowledged commit followed by failed refresh is a refresh failure, not permission to repeat the mutation.
5. `features/settings/pages.tsx`: accept the matching native scope and use separate generated `serverSettings.getAll`, `user.getPreferences({ userId })`, `searchEngine.getSelectable({ withIntegrations: false/true })` queries. Assemble view props from their successful results without an aggregate handwritten key. `initialData` must enter the same generated leaf cache, never a second settings cache. Use generated exact keys for post-save publication; extend the current publication helper's `readonly string[]` parameter to real `QueryKey` because generated keys carry structured parts.
6. `features/settings/data.ts`: stop using raw aggregate reads as page cache loaders. Retain existing save/draft reconciliation only with real admitted writers. `features/settings/{instance-form.tsx,preference-form.tsx,draft.ts}` and page callback types must await real post-save render/settings refresh, not a fire-and-forget `onSaved?: (...) => void`. Preserve partial instance-save errors, canonical re-read and dirty draft baselines; do not acknowledge unsaved sections or blindly replay saves.
7. Instance page required producers: real `SettingsReadScope` denied/read-only/editable decision, accessible `boards`, search choices, analytics documentation href, `BrandingEditorSlots`, and awaited settings/culture/document refresh. Preferences page: real target ID/self-admin policy, search/board choices, `SettingsFormatting`, real locale field, source `headerComposer` branding/preview and awaited preferences refresh. Missing selectors are held, not `boards=[]`/`searchEngines=[]` successful resources. Native11 has neither searchEngine nor board selector procedures.
8. Router callbacks, after the wider source join: `UserList.onOpen(id)` awaits navigation to `/manage/users/$userId/general`; `onCreate` goes to `/manage/users/create`; `UserCreate.onComplete`/`UserEditor.onDeleted` await `/manage/users`; controlled `UserEditor.section/onSectionChange` navigate the matched general/security URL. Existing callbacks typed only `() => void` must be widened and awaited at acknowledgement sites; no workbench-only selection. Group create can keep its real local disclosure close callback, and all section links use GroupPresentation/SourceLink.

Full writers remain held independently: user establishment/password/profile/delete; invite creation/delete; API-key create/delete; group create/rename/home/membership/ownership/delete; Group2 ordering/permissions; instance/preferences/header/tour writes. Release each only when the mounted native leaf, current authorization, demo/provider rules, compatible writer and request lifetime/acknowledgement producer are accepted. Never clear `groupWriteHold`, `mutationUnavailableReason` or settings read-only state just because a read succeeded.

## Publication / lifecycle hold and merge order

Current `createAppRouter` dehydrates success-only **public** Query state with JSON. That is not private SSR publication. AH/coordinator must approve a finite route-specific private allowlist, safe serializer retaining actual result types, cache-identity binding, authenticated private/no-store response, original header/cookie effects and admitted render/serialization lifetime. Private errors, mutation state, passwords, API-key creation output, credentials/leases and callback objects are never bootstrap/loader payloads. Inspect automatic loader and match-context serialization too; a Query filter does not seal the rest of Router state.

PU loader functions return `void`; private data stays in the owned generated cache until explicitly approved publication. Without the private wire/publication amendment, these modules may land dormant, but data-rich private SSR/hydration and application completion remain held. Do not mark private results public or call a public skeleton the authenticated application.

AH uses one admitted server-native client for the whole finite operation and the same request/principal/resources/signal/effect/disposal owner as RPC. No detached client after admission release, process-global client or SSR loopback HTTP. Browser bootstrap reconstructs only safe UI projection/culture and a cookie-authenticated native client; revalidation/resumed interactions come from actual auth services. Producer disposal must drain Query scope, Router SSR cleanup and publication before lease release; UI cancellation is not proof a server write did not commit.

Merge sequence: (1) allocate PU's new client/query/presentation/read module lease; (2) land dormant modules without route/entry/public-root edits; (3) AH freezes typed private bootstrap, auth services, real shell resources and same-owner admission; (4) route owner installs exact search/base-path wiring and protected routes, then approved private publication; (5) wider feature owners release genuine selector/writer capabilities, followed by the explicit full-consumer join. Coordinator performs focused lint/typecheck after integration; none was run or claimed here.

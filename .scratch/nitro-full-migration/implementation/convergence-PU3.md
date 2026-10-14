# PU3 — frozen dormant native11 read consumers

## Exclusive changes

- NEW `apps/nitro/src/app/group-presentation.tsx`
- NEW `apps/nitro/src/app/private-route-loaders.ts`
- NEW `apps/nitro/src/features/identity/read-pages.tsx`
- NEW this report

No other source was written. No commands, checks, tests, builds, runtime/native/SQL execution, route enrollment, root/provider/entry/SSR changes, commits or nested agents. Source is frozen for coordinator review; no compiler, runtime or procedure acceptance is claimed.

## Actual exported signatures

`app/group-presentation.tsx`:

```ts
privateGroupDocumentationHref: string
createPrivateGroupPresentation(documentationHref: string): GroupPresentation
```

The exported documentation href uses `createDocumentationLink("/docs/management/users", "#special-groups")` from `@homarr/definitions`, matching the original reserved-group producer. Supply that href to the required factory argument. The presentation uses actual `SourceLink`, `UserAvatar` and `UserAvatarGroup` from public package exports, preserving source user fields and SettingsProvider-controlled Gravatar behavior.

`app/private-route-loaders.ts`:

```ts
privateGroupListQueryOptions(scope: AuthenticatedReadQueryScope)
privateGroupDetailQueryOptions(scope: AuthenticatedReadQueryScope, id: string)
privateApiKeysQueryOptions(scope: AuthenticatedReadQueryScope)
loadPrivateGroupList(scope: AuthenticatedReadQueryScope, signal: AbortSignal): Promise<void>
loadPrivateGroupDetail(scope: AuthenticatedReadQueryScope, id: string, signal: AbortSignal): Promise<void>
loadPrivateApiKeys(scope: AuthenticatedReadQueryScope, signal: AbortSignal): Promise<void>
```

Option return types are inferred directly from the respective native generated `queryOptions` leaf; no independently declared replacement options type. These exact builders are also imported by the page hooks. Inputs are respectively `undefined`, `{ id }`, `undefined`; both consumers use the scope-owned root QueryClient. Builders assert currentness; loaders assert before/after their awaited finite load and explicitly use `{ freshness: "fetch" }`. Loader returns carry no data, client, principal, lease or callbacks.

`features/identity/read-pages.tsx`:

```ts
ReadGroupListPage({ presentation }: { presentation: GroupPresentation })
ReadGroupDetailPage({ groupId, section, presentation }: {
  groupId: string;
  section: GroupSection;
  presentation: GroupPresentation;
})
ReadApiKeyAdministration()
```

JSX return types are inferred. Every page requires the real PU2 `IdentityReadBoundary` through `useIdentityRead()`. Admin denial occurs before the query child mounts. Children remount on actual `authorityKey` replacement. Query failures are shown before any cached result is rendered, pending queries use `IdentityLoading`, missing results use `IdentityError`, and no failure is mapped to a successful empty list.

## Preserved source read semantics and holds

- Group list retains Everyone card and its source CSS, position ordering, local translated search and `GroupsTable`. It does not mount `GroupsListView`, GroupCreate, sortable controls or no-op writer callbacks. Source `groupWriteHold`, actual producer hold, demo read-only hold and the Group2 ordering hold remain visible.
- Group detail retains `GroupDetailLayout`, matched-section input, `ReservedGroupAlert`, `GroupOwnerCard`, provider-derived `MembershipNotice`, `EmptyMembers`, `MemberIdentity` and source member links to `/manage/users/$userId/general`. General reads stored name/owner without an editor or user selector. Members reads actual memberships with local source search, no candidate query/add/remove. Settings shows actual stored home/mobile board IDs read-only, retaining source labels/descriptions/notice and a board-selector/save hold. No invented board names or options.
- Permissions renders returned stored grants using source translated permission labels and `EffectivePermissionPreview`. No presets, editable permission matrix, fake grants or save handler; current-authority-to-COMMIT/compatible-writer/lifetime hold remains explicit.
- API keys uses actual `ApiKeysView` with `creating=false`, `createDisabled=true`, `createdKey=null`, no create/revoke callbacks, actual hold feedback and a genuine `UserAvatar` renderer. Only metadata from `apiKeys.getAll` enters this view; no key material or plaintext creation UI.

No handwritten identity query keys, custom query functions, new QueryClient, full `IdentityAuthority`, mutations, raw-client reads or additional native11 leaf preloads were introduced.

## Required joins before activation

1. PU1 `query/authenticated-read.ts` and PU2 `features/identity/read-boundary.tsx` were read after landing; their source was not modified. Actual PU2 input additionally requires `session` and `transitionDescription`, alongside principal, authorityKey, scope, enabled/local providers, demo and writeHoldReason. AH must provide real immutable inputs, not placeholder authority/providers/resources.
2. The one root QueryClient, real settings/session/culture providers, current same-owner native11 scope, authenticated private bootstrap and session-transition retirement remain producer-owned. Matching currentness is not server authorization.
3. Route owner must authorize current admin admission before each loader, bind the route abort and admitted operation lifetime, derive the actual GroupSection from the matched route and install source search/base-path/locale handling. These functions deliberately do not manufacture an admission decision from a cache identity.
4. Register the real group/API-key destinations and an honest held user-detail destination for existing member links only under the separate route lease. This lane registers none.
5. Private SSR publication/hydration allowlist, cache identity binding, safe serialization, private/no-store headers, original effects, physical operation drain and disposal remain AH/coordinator work. These dormant modules do not clear publication or writer holds.

Manifests and source exports were verified by reads before library imports. Context7 documentation discovery returned quota exhaustion; the targeted official Query reference fetch also failed. Implementation reuses existing source primitives and the checkout's established `useQuery(options, scope.queryClient)` pattern. Coordinator owns focused lint/type checks after writer freeze.

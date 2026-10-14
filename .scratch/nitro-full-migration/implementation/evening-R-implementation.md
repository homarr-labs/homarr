# Evening R — frozen first11 source composition

Implemented only the three approved new source files, each checked absent before its Add File patch. Phase1 `evening-R-rpc.md` is unchanged. Source is frozen for independent review and coordinator-integrated checks; no runtime admission, mounted functionality or 91/334 increase is claimed.

## Exact exports / H handoff

`packages/api/src/nitro/assembly/authenticated-read.ts` exports:

- `AuthenticatedReadAssemblyResources`: required `version`, `serverSettings: ServerSettingsProcedureResources`, `preferences: PreferenceProcedureResources`, `groups: GroupAdministrationResources`, `apiKeys: ApiKeyProcedureResources`.
- `authenticatedReadLeaves`: frozen list of exactly the eleven source identities below, checked statically against `SourceLeafPath` with `satisfies`, without a type assertion.
- `createAuthenticatedReadAssembly(resources: AuthenticatedReadAssemblyResources)`: inferred return of the existing `defineBackendContribution`, **a contribution, not a bare router**. Its ID is `homarr.authenticated-read.source-port.v2`; revision comes from `backendContractRevision`.

| Namespace        | Exact contributed leaves                                    |
| ---------------- | ----------------------------------------------------------- |
| `info`           | `getInfo`                                                   |
| `serverSettings` | `getAll`, `getBoardSettings`                                |
| `user`           | `getPreferences`, `getTourStatus`                           |
| `group`          | `getAll`, `getPaginated`, `getById`, `selectable`, `search` |
| `apiKeys`        | `getAll`                                                    |

The implementation calls the actual Info, ServerSettings, UserPreference, GroupAdministration and ApiKey factories once each and selects these procedure references explicitly. It does not merge full factory returns, duplicate the lite Group/preference factories, call a handler, introduce a transport or rewrite middleware/metadata/errors. Existing factories also construct their unselected procedure objects; none of those other procedures enters this contribution. The existing two-public-leaf registry remains separate and untouched.

`packages/api/src/nitro/assembly/native-read-resources.ts` exports:

```ts
createNativeReadResources(input: NativeReadResourcesInput): AuthenticatedReadAssemblyResources
```

All `NativeReadResourcesInput` fields are required:

- `schema`: `Pick<SqliteSchema, "serverSettings" | "boards" | "users" | "boardUserPermissions" | "boardGroupPermissions" | "groupMembers" | "searchEngines" | "groups" | "apiKeys">`.
- `version: string`: actual build version supplied by H.
- `createId: GroupAdministrationResources["createId"]`: genuine existing ID producer.
- `providers: GroupAdministrationResources["providers"]`: genuine configuration producer returning enabled provider names and `oidcGroupsLocalManagement`.

It uses the exact supplied physical table objects, actual `drizzle-orm` operators `{and, eq, inArray, like, max, not, or}` and existing `settingsCodec`. `@homarr/db/schema` is a type-only import; the builder does not load an environment-selected schema, open SQL, manufacture an identity/profile, provide currentness, substitute provider defaults or construct select validators. No logger is required by the five selected factory resource interfaces used here.

**H sequence after approval:** obtain the physical schema from its same main owner, build resources with `createNativeReadResources`, then call `createAuthenticatedReadAssembly`. Use `contribution.router` and the literal `contribution.leaves` in H's separately owned authenticated finite adapter. H/A/P must still supply actual DB admission, original request/signal/effect/onDispose, same-owner Auth profile/permissions/session revision, asynchronous authority currentness/release and finite serialization settlement. No optional authority or fail-open transport is supplied by these files. Public RPC, shared `/rpc` dispatch and producer lifecycle remain H/A/P work.

## U handoff / type-only client

`packages/api/src/nitro/assembly/authenticated-read-client.ts` exports only:

```ts
type AuthenticatedReadAssemblyClient = RouterClient<
  ReturnType<typeof createAuthenticatedReadAssembly>["router"]
>;
```

Both imports are type-only. It introduces no client instance, browser transport or implementation barrel. U should consume the coordinator-published type-only leaf after review; proposed package export name is `@homarr/api/nitro/assembly/authenticated-read-client`. H's proposed server leaves are `@homarr/api/nitro/assembly/authenticated-read` and `@homarr/api/nitro/assembly/native-read-resources`. These names are a declaration handoff, not newly available package exports; no manifest was edited.

The inferred concrete source procedures preserve their existing schema input/default/output types and source error/metadata semantics. U must not cast this client into `ExpansionApiAssemblyClient`, change namespace/source paths, hand-write Query keys or treat cache identifiers as authority. Query/browser integration remains outside R's three-source lease.

## Scope / verification

Read back all three new files and compared the named selections/resource fields to their existing factory contracts as source text. API already declares `drizzle-orm`, `@homarr/db` and `@orpc/server`; no dependency was added. No `any`, cast/type assertion, comment, test, stub, fake policy, DTO, optional required resource or duplicate wrapper framework was added.

No other source, assembly index/resource exports, global registry/port map, manifest/lock, existing report, Auth/DB/host/UI/peer-owner path was written. This new implementation handoff was checked absent before creation. No commands, compiler/lint/tests/install/build/runtime/native/SQL/data/.env/secrets/Git/browser/delegation/Context7 activity occurred. Lint/typecheck and independent source review are deferred to the coordinator's integrated freeze checks, not reported passed.

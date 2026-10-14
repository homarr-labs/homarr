# EXPANSION35 API assembly candidate

## Frozen source composition

`packages/api/src/nitro/assembly/index.ts` exports `createExpansionApiAssembly` with four required, separate resource fields: `management: IntegrationManagementResources`, `operations: IntegrationOperationsResources`, `widgets: WidgetProcedureResources`, and `customWidget: CustomWidgetProcedureResources`. Its inferred return preserves the existing procedures without a broad router annotation or a business-callback abstraction.

| Factory                                 | Returned namespace                         | Actual source leaves |
| --------------------------------------- | ------------------------------------------ | -------------------: |
| `createIntegrationManagementProcedures` | `integration`                              |                   10 |
| `createIntegrationOperationsProcedures` | `integration`                              |                   10 |
| `createWidgetProcedures`                | singular `widget`, retaining 46 subrouters |                   95 |
| `createCustomWidgetProcedures`          | `customWidget`                             |                   46 |

The composition contains 161 source leaves. This is a composition inventory, not an admission, acceptance, completion, or mounted-route count.

The management keys are `getKinds`, `byIds`, `all`, `allThatSupportSearch`, `allOfGivenCategory`, `search`, `byId`, `testConnection`, `delete`, and `getIntegrationPermissions`. The operations keys are `create`, `update`, `saveUserIntegrationPermissions`, `saveGroupIntegrationPermissions`, `searchInIntegration`, `mediaRequestSearchTargets`, `searchMediaRequests`, `getMediaRequestOptions`, `requestMedia`, and `request`. These source return sets are disjoint; the spread merge replaces no management procedure. Widget nesting and Custom Widget procedures are returned directly by their existing factories.

## Type-only boundaries

`assembly/client.ts` exports only `ExpansionApiAssemblyClient = RouterClient<ReturnType<typeof createExpansionApiAssembly>>`, with type-only imports. No client instance, transport, runtime assembly import, or JSON-mapped DTO is introduced. The installed `@orpc/server` version is `2.0.0-beta.43`, already declared alongside `@orpc/client` in the API package dependencies. Its `RouterClient` recursively preserves router keys; `ProcedureClient` derives schema input and output types. Consequently the alias preserves existing input defaults/optionality, native `Date` outputs, and the async-generator output of `widget.beszel.subscribeSystemStats` rather than replacing it with an array or callback. Wire transport and cancellation behavior remain unverified and unmounted.

`assembly/resources.ts` contains only real type reexports from the four existing router resource modules. In particular, the widget exports are named `WidgetRequestPrimitives` and `WidgetRequestLease`, not fabricated `WidgetPrimitiveLease` types. The Custom Widget contracts are `CustomWidgetAuthorityLease` and `CustomWidgetConfigurationRequest`; the integration contracts include `IntegrationManagementSnapshot`, `NativeConnectionInput`, `NativeConnectionLease`, and `IntegrationOperationsRuntime`. No implementations, authority providers, stores, trust configuration, or currentness adapters are supplied here.

Context7 retrieval was attempted but returned a monthly-quota error. API syntax was verified against installed declarations in `node_modules/@orpc/server/dist/index.d.mts` and its `ProcedureClient` declaration, with current official references for [client inference](https://orpc.dev/docs/client/client-side), [native serialization](https://orpc.dev/docs/rpc/serializer), and [async iterators](https://orpc.dev/docs/event-iterator). These references establish library semantics, not runtime proof for this candidate.

## Confirmed existing-import exception

The original exception misnamed an existing `isRecord` import in `routers/integration.ts`. Source inspection instead found `import { objectEntries } from "@homarr/common";`, used by `getKinds` and `allThatSupportSearch`, and no `isRecord` import or use in that file. The Common root reexports `src/object.ts`, and `packages/common/package.json` already exposes the identical module at `@homarr/common/object`. The coordinator subsequently confirmed the Oracle-approved same-symbol repair: `objectEntries` at `packages/common/src/object.ts:14` is the same export implementation and root binding, with the public entrypoint and dependency already accepted.

The confirmed fix changes only line 4 of `routers/integration.ts` from `import { objectEntries } from "@homarr/common";` to `import { objectEntries } from "@homarr/common/object";`. No symbol, helper implementation, function, or procedure is changed. The patch targets no other integration/router/assembly bytes; no post-fix byte-equality comparison was rerun, so this is patch scope and available source-baseline evidence, not a newly verified byte-equality claim. The repair does not establish transitive import purity, admission, or Q18 clearance. Only this lane's handoff artifact is moved from `implementation/expansion-api-assembly.md` to `.scratch/nitro-full-migration/implementation/expansion-api-assembly.md`; no other implementation files or root directory are removed.

## Construction and admission limitations

The assembly delegates to the existing factories; it does not invoke handlers or acquire leases. `createCustomWidgetHelpers` constructs the real `CustomWidgetPreviewSessionService` and `CustomWidgetRequestLimiter` from caller-supplied stores. Source inspection of those constructors shows local map initialization and option/clock retention, not initial store access, listener startup, authority acquisition, or request execution. This is narrowly a constructor observation, not a transitive import-purity or live-runtime guarantee. No replacement preview service, limiter, widget resource adapter, authentication context, or currentness proof is fabricated.

Admission remains **HOLD**. Q18 remains unresolved: private authority, trust, physical runtime bindings, and COMMIT/currentness proof have not been established by composition or type inference. Existing handler guards and lease contracts are retained, not demonstrated sufficient by this lane. The assembly is not instantiated or mounted, and no shared manifest, contribution, port map, public index, route, host, UI, SQL, provider, environment, key, or data changes are made.

## Central declarations requested, not applied

The central owner should consider these API package export declarations only after admission review; the confirmed import repair grants no new public-export approval:

```json
{
  "./nitro/assembly": "./src/nitro/assembly/index.ts",
  "./nitro/assembly/client": "./src/nitro/assembly/client.ts",
  "./nitro/assembly/resources": "./src/nitro/assembly/resources.ts"
}
```

No package manifest or public barrel is edited here. No tests are added, and no assembly, service constructor, handler, provider, or listener is executed for runtime validation.

## Validation limitation

Repository-level instructions required lint and typecheck despite the lane's requested check-command exclusion. `bun run lint src/nitro/assembly` passed. `bun run typecheck` in `packages/api` failed with 116 diagnostics across 14 unchanged files, including widget access-descriptor widening, integration-operation typing, icon contract changes, and missing `bun:sqlite` declarations. Its file summary contains no assembly-file diagnostics. This is not a successful package typecheck or a baseline comparison; no diagnostic-producing files were edited and no tests, builds, installs, formatting, Git commands, or live runtime checks were run.

Those checks predate the confirmed one-import repair and handoff move and were not rerun for this narrow follow-up. Full final mandatory validation and independent review remain outstanding; the earlier results are not post-fix validation evidence.

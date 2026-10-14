# A03 bounded API projection cut

Source-only implementation freeze, 2026-10-11; independent review pending. Scope is exactly `packages/api/src/contracts/projection.ts`, metadata imports/type export in `packages/api/src/nitro/procedure.ts`, the `ResponseError` import in `packages/api/src/nitro/routers/widgets.ts`, and this handoff.

## Exact source origins and types

- Installed `node_modules/trpc-to-openapi/package.json:2–3,18,24–28` identifies version **3.3.0** and its public declaration entrypoint. `dist/cjs/index.d.ts:4` exports `types.d.ts`; that file's lines **7–27** are the copied metadata shape, not its tRPC procedure/router/controller types.
- `SourceOpenApiMeta<TMeta = Record<string, unknown>>` retains the original generic intersection and existing string-key/unknown-value base; no index signature is added or widened. `SourceOpenApiMethod` remains exactly `GET | POST | PATCH | PUT | DELETE`. `SourceOpenApiContentType` remains exactly `application/json | application/x-www-form-urlencoded | (string & {})`.
- The optional `openapi` object retains required `method` and slash-prefixed template-literal `path`; optional `enabled`, `operationId`, `summary`, `description`, `protect`, `tags`, `contentTypes`, `deprecated`, `requestHeaders`, `responseHeaders`, `successDescription`, and `errorResponses`. Header types remain `ZodObject`; errors remain `number[] | Record<number, string>`. Optionality and mutable array/object shapes are unchanged.
- `packages/api/src/mcp-tools.ts:6–12` supplies the exact `SourceMcpMeta` shape: optional `mcp`, required boolean `enabled`, optional string `name` and `description`. This source interface has no generic parameters, options, SDK annotation fields or additional unions; none are invented.
- `SourceProjectionMetadata` remains the intersection of those exact metadata shapes, structurally matching the former `OpenApiMeta & McpMeta`. `procedure.ts` retains its existing exported type name via a type-only re-export. Assignability is source-derived, not compiler-verified in this cut.
- The only projection import is `import type { ZodObject } from "zod/v4"`. `packages/api/package.json:106` already declares Zod; installed `node_modules/zod/package.json:3,78–82` identifies **4.4.3** and the public v4 export. `v4/index.d.ts:1–3` and `v4/classic/schemas.d.ts:452–454` retain the actual `ZodObject` declaration/defaults. No runtime imports, backend types, tRPC, Next, DB, crypto, configuration or environment edges are introduced into the projection leaf. No manifest changes are needed.

## Import identity delta

- `procedure.ts` drops only its metadata type edges to `trpc-to-openapi` and `../mcp-tools`, importing the pure projection type instead. Both `defineMeta` names and identity callbacks, descriptors, access checks, demo ordering, error middleware and authenticated refinement remain untouched.
- `widgets.ts` imports `ResponseError` from the existing public `@homarr/common/response-error` export. `packages/common/package.json:22` targets `src/errors/http/response-error.ts`, which contains the original class. The former export chain is `src/server.ts:4` → `src/errors/index.ts:2` → `src/errors/http/index.ts:3` → that same file. No duplicate class, wrapper, subclass or error conversion is added; existing `instanceof`/status checks retain the same source class identity. This is source export resolution evidence, not runtime import evaluation.

## Preserved boundaries and remaining holds

- No procedure annotations, identities, handlers, input/output/body/schema/token/guard logic, JSON Schema conversion, selection registry, canonical map, source barrel or API exposure changed. Legacy metadata declarations/helpers remain untouched.
- Frozen A03 and `sprint-conservation-inventory.md:5–40` remain authoritative: **330 body preparations / 334 canonical procedures, selected REST52/MCP133, nine preserved annotations outside eager MCP selection, central91 direct-unmounted, zero newly accepted/mounted**. These are inherited counts, not a fresh census; no prior port was repeated.
- Runtime `TRPCError` compatibility in `nitro/errors.ts` and the preference producers remains deliberately untouched. Removal requires separate proof of all genuine error producers and preservation of flattened validation/domain payloads and safe internal responses.
- This metadata leaf is not the canonical browser client contract. Backend inference/barrels, browser Query/navigation contracts, physical resource graphs and remaining legacy helper edges still require their own owners and independent graph proof. Active frontend/backdep and five new Integration directories were not read as contracts.
- REST/MCP private execution and live-listing holds, real auth/resource/wire/error producers, same-listener delivery, Q16/Q17/Q18 and production joins remain unchanged. No mounting or full tRPC/browser-graph clearance is claimed.

## Verification limits

Only source/declaration reads and these four file patches were performed. No commands, lint/typecheck/build/install/tests, import evaluation, live network/provider/SQL/browser calls, environment/credential/data reads, listeners, Git mutation or nested agents. No tests or code comments added. Independent source review and later authorized lint/typecheck/runtime graph validation remain outstanding.

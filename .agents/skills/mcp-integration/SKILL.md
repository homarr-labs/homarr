---
name: mcp-integration
description: Expose Homarr tRPC procedures safely through MCP. Use when adding or changing tRPC procedures under packages/api, adding MCP metadata, registering an eager MCP router, shaping tool inputs and descriptions, or reviewing MCP authorization, sensitive data, and destructive actions.
---

# MCP Integration

Expose a procedure only when an AI client should call it. Preserve the procedure's existing authorization and add MCP-specific safeguards for sensitive or destructive behavior.

## Assess exposure

Prefer:

- Data queries: list, search, get, health, stats, and summaries.
- User-requested actions with explicit permission checks and bounded inputs.
- Serializable results that do not reveal credentials or internal-only state.

Skip subscriptions, session/onboarding internals, file streams, blobs, credential values, and procedures whose authorization or audit behavior is unclear. Ask for a security review when a mutation is destructive, tenant boundaries are ambiguous, or returned data is sensitive.

## Add metadata

Place `.meta()` before `.input()` and `.query()` or `.mutation()`:

```typescript
getAll: protectedProcedure
  .meta({
    mcp: {
      enabled: true,
      description: "List resources the current user can access, including stable IDs used by resource_get",
    },
  })
  .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
  .query(async ({ ctx, input }) => {
    // Preserve normal procedure authorization.
  });
```

No-input procedures can omit `.input()`; the MCP extractor accepts an empty object for them.

For mutations, state the effect and required permission in the description:

```typescript
remove: permissionRequiredProcedure
  .meta({
    mcp: {
      enabled: true,
      description: "Delete one resource by ID. Requires full access; get the ID from resource_all",
    },
  })
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Perform the permission-scoped action.
  });
```

## Write discoverable descriptions

Include every item that applies:

- What the tool returns or changes.
- Supported integrations or services.
- Required IDs and the tool that returns them.
- Permission requirements and the meaning of permission fields.
- Important bounds, confirmation semantics, or irreversible effects.

Use precise domain language. A description such as `Get calendar events` is insufficient because it omits supported services, required IDs, and result scope.

## Shape inputs for clients

- Use a top-level `z.object({...})` for parameterized tools.
- Bound strings, arrays, numeric ranges, pagination, and payload sizes.
- Use defaults where a safe, unsurprising value exists.
- Prefer explicit fields over a top-level union or discriminated union.
- Keep identifiers stable and describe how to obtain them.
- Keep secrets out of inputs unless the procedure is explicitly a credential-configuration flow with server-owned encryption and non-return guarantees.

## Register the eager router

The application router in `packages/api/src/root.ts` is lazy. MCP tool extraction is synchronous, so add an eager import and registration in `packages/api/src/mcp.ts`:

```typescript
import { resourceRouter } from "./router/resource";

export const mcpRouter = createTRPCRouter({
  resource: resourceRouter,
});
```

Register the smallest router that owns the enabled procedures. If a parent router uses `lazy()`, import the needed subrouter directly. Metadata on a procedure is not enough; a procedure absent from `mcpRouter` is not exposed.

## Validate the tool surface

1. Confirm the procedure still enforces its ordinary auth and permission boundary.
2. Confirm `packages/api/src/mcp.ts` eagerly includes the procedure.
3. Confirm the generated tool name, description, and JSON schema are unambiguous.
4. Run the focused API MCP spec when the tool list or extraction changes: `pnpm test packages/api/src/test/mcp.spec.ts`.
5. Run the focused route spec when protocol or transport behavior changes: `pnpm test apps/nextjs/src/app/api/mcp/[transport]/route.spec.ts`.
6. If manually probing `/api/mcp/<transport>`, use a scoped API key and avoid printing credentials or secret-bearing results.

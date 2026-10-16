# Optional dashboard compatibility boundary

The canonical API is native oRPC. `@homarr/api` exports the native router and native
input/output types. The encrypted worker imports that API directly and does not
import the compatibility transport.

The existing Next dashboard still uses tRPC React Query hooks. Its client/server
wrappers now import the explicitly named `@homarr/api/legacy` type. That entry
maps native input/output and operation types to tRPC for those consumers, without
changing the native API or copying business handlers.

`createLegacyApiRouter` builds an optional tRPC transport over the native
procedures. It preserves lazy namespaces, delegates input/output validation and
authorization to oRPC, and forwards native async subscriptions. No authentication
provider, database connection, or business router is imported by the adapter
module itself; its caller supplies the native router and authenticated context.

The earlier `apps/backend` can opt into `/api/trpc/*` by setting
`BACKEND_LEGACY_TRPC=true`. It is off by default. `apps/worker` does not import
`apps/backend`, this route, or the adapter. The former standalone WebSocket entry
also uses this explicitly named adapter for dashboard compatibility.

This does not connect the old dashboard to the encrypted worker. Such a client
would need pairing, grants, and the encrypted session transport. The new remote
app owns that flow; the optional adapter is a transition boundary for existing
dashboard consumers only.

## Focused validation

Manual adapter fixture, 2026-10-16:

- Native input coercion preserved (`"4"` becomes `4` before the handler).
- Native `Date` output survives the tRPC/SuperJSON HTTP boundary.
- Native invalid input returns HTTP 400 / `BAD_REQUEST`.
- Native forbidden access returns HTTP 403 / `FORBIDDEN`.
- Querying a mutation returns HTTP 405 and does not execute it.
- Authorized mutation executes once.
- Lazy namespace resolution and native async subscription delivery passed.

The fixture imported only the adapter plus native oRPC primitives and used an
in-memory procedure/router. It proves transport behavior, not an end-to-end
dashboard session or compatibility with the encrypted worker.

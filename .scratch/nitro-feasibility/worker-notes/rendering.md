# AJN-500 rendering handoff

**Editing-complete within owned boundaries; composed verification pending.** Ticket read through Linear, canonical scope consumed from `SPEC.md`, and coordination/foundation interface v1 retained. No shared contracts, manifests, entries, router/root, capability implementations, generated outputs, Linear, or roster were edited.

## Changed paths and exports

All application paths below are relative to `apps/nitro-experiment/`:

- `src/features/viewer/board-viewer.tsx`: `BoardViewer`, populated responsive Mantine dashboard; fixed session/widget/editor slot props preserved.
- `src/features/viewer/document-state.tsx`: existing `BootstrapScript` and `hydrateApplication`, plus `bootstrapElementId` and `serializeBootstrap`.
- `src/features/viewer/serialized-state.ts`: declared `SerializedRouterState`, strict `serializedRouterStateSchema`, and explicit JSON normalization.
- `src/server/render/handler.ts`: existing `renderPage` and asynchronous `closeRenderState`.
- `src/server/render/cache.ts`: bounded coherent artifact cache and scalar evidence.
- This note: `.scratch/nitro-feasibility/worker-notes/rendering.md`.

## Consumed boundaries and behavior

- Uses the existing `createAppRouter`, full-document `AppRoot`, `BoardDataAdapter`, strict `Bootstrap`/snapshot/assets/identity schemas, authorized `readAuthorizedBoard`, and request-bound `createServerClient`. Browser execution uses only `createBrowserClient` and its same-origin typed board/widget procedures.
- Every board delivery authorizes before cache lookup. Widget capture also uses the authorized procedure; after waiting for rendering/joining, the renderer rechecks current live authorization and visibility/capability variant before delivery. No alternate access policy or copied session implementation exists.
- A miss creates fresh Router/Query state, seeds only authorized sanitized board/widget query values, and loads the captured revision/generation through the server adapter. The installed Router request handler establishes memory history and its normal SSR dehydration. The document renders through installed `RouterServer`/`renderRouterToString`; its existing `<Scripts>` and Nitro-supplied CSS/modulepreload/entry assets remain intact.
- The JSON-normalized Router state mirrors installed router-core **1.168.7**'s declared `DehydratedRouter` compact match fields and slash-to-NUL IDs. This fixture serves only two successful matches; errors never become success artifacts. Query state is captured before React rendering, not fetched anew alongside cached HTML. Bootstrap identity is schema-cross-checked with the exact snapshot.
- Bootstrap JSON escapes `<`, `>`, `&`, U+2028, and U+2029. Browser startup validates snapshot/Router/Query agreement and current route, installs the declared Router state, hydrates Query and Router, then calls `hydrateRoot(document, ...)`. No client-only replacement shell or initial browser board fetch is used. Subsequent loaders execute the browser typed adapter. Recoverable hydration errors log explicitly and set `data-fixture-hydration="mismatch"` for observation.
- Cache key includes board/revision/widget generation/build/schema/variant/fixed en-light identity, full sanitized snapshot (including error/stale envelope and canEdit), and assets. Each immutable key stores only HTML, normalized bootstrap, and creation time. Late old revision/generation work can populate only its old key, never overwrite a current key; there is no mutable board-to-artifact pointer. Routers and QueryClients are cleaned in `finally`, never cached with requests/principals.
- Bounds: at most **32 entries / 8 MiB total / 1 MiB artifact / 30 s age / 4 active renders**. Retained byte accounting includes the encoded key and complete artifact. LRU eviction and expiry prune entries; oversized artifacts bypass storage; identical keys join active work; a fifth distinct active render yields `SERVICE_UNAVAILABLE`, not an unbounded queue. Shutdown stops new work, clears artifacts, awaits active work, and releases it.
- Responses explicitly emit `Cache-Control: no-store`. `X-Fixture-Render-Cache` is `hit`, `miss`, `joined`, or `bypass`; headers also expose bounded render count, retained entries/bytes, in-flight count, revision, and widget generation. These are attribution evidence, not latency claims. `/` redirects to the public board; board paths with trailing slash/search canonicalize after authorization; unknown routes are 404 and unsupported methods are 405.
- Slots retain actual seeded value/observation/status/generation output. No widget polling/source controls/editor implementation was added. Later widget/editor workers consume the same props and must preserve their SSR/initial-hydration snapshot and mount gates.

## Access transition integration and shared request

- Exact read-only import: `useSessionTransition(queryClient): boolean` from `src/features/session/session-transition.ts`. True synchronously removes prior board label, visibility/revision/layout, widget, editor, and owner affordances. SessionControls is outside the mask, with public/private navigation and a generic access-retry message still reachable. The access owner alone drives begin/complete notifications; this viewer introduces no duplicate session state.
- Coordinator accepted the narrow shared `src/app/router.tsx` request: callbacks must reject failed/denied loader reconciliation, and the board-route error view must retain session controls with public/retry navigation. Foundation worker owns that shared fix, with handoff at `.scratch/nitro-feasibility/worker-notes/router-reconciliation.md`. Rendering did not wait for or modify it. **Integrated failed-reconciliation and identity/expiry/browser masking verification remains pending.**
- No other schema, factory, manifest, registration, or entrypoint changes are requested. Existing exports are already centrally wired. Cleanup's Promise is supported by the existing shutdown plugin.

## Actual bounded evidence

No persistent server, listener, port, SQLite fixture, container, install, `.output`, generated asset, lint/typecheck, or new automated test was used. All probes were inline `bun -e` with process-local fixtures or `Bun.build(...write:false)`; accepted by coordinator as bounded library evidence.

1. Installed package declarations/source inspected for Router **1.168.8** / core **1.168.7**, Query **5.101.2**, Mantine **9.6.0**, plus foundation's pinned dependency handoff and confirmed research notes. No Context7 retry or new dependency.
2. Source-module `renderPage` with a synthetic repository and seeded widget: public response **200**, first `miss`, second `hit`, render count **1**, byte-identical complete HTML/bootstrap, doctype present, **42 items** in initial HTML, **2** serialized loader matches, **2** seeded Query entries, loader snapshot exactly matching bootstrap, escaped injected `</script>` label, **16,217** HTML bytes for that bounded fixture composition. This is not the production asset graph, DB authorization lifecycle, or browser hydration evidence. Initial attempt lacked a Host header and correctly hit the live `fixture-origin` denial; rerun supplied the correct loopback Host. Cleanup awaited after each attempt.
3. `Bun.build({entrypoints:[document-state.tsx],target:"browser",write:false})`: successful single in-memory output; bounded symbol inspection found none of `readAuthorizedBoardRecord`, `getFixtureRepository`, `createServerClient`, or `useRuntimeConfig`. Not a full final production dependency-graph audit.
4. Cache-only synthetic artifacts: **4** overlapping distinct renders accepted, fifth rejected; duplicate joined without another render; **40** inserts retained **32** entries; a >1 MiB encoded artifact returned `bypass`; 1 ms age override expired and returned a new miss; shutdown reported **0 entries / 0 bytes / 0 in-flight**. Synthetic storage probe does not validate application schemas or user-visible race behavior.
5. Final source-only render rerun after exact request-handler callback reconciliation: **200**, `miss` then `hit`, render count **1**, identical HTML, populated **42 items**, session controls present. An earlier rerun accidentally generated a new synthetic `staleUntil` on each repository read and produced two misses, correctly confirming distinct snapshot envelopes do not share a key; fixed-snapshot rerun is the reuse evidence. No retained fixture or output files.

## Final integration observations still required

- Scoped lint/typecheck only after the full slice is complete, then one coordinator-owned production build/container/HTTP/browser window.
- Production assets, direct reload/navigation, populated no-JavaScript HTML, miss/hit bootstrap coherence, and hydration without recoverable mismatch. The browser probe has not run.
- Owner/public versus reader/public artifacts; private warm hit followed by denied/logout/expired session, no owner UI or private payload leaks; failed reconciliation retains mask and reachable login/retry controls after the shared router fix.
- Post-hydration widget polling, generation/stale/error changes, loss-of-access stop, owner editing and Query/Router reconciliation, newer durable revisions after save, deliberately delayed old render finishing after a save without replacing the new key.
- Runtime saturation/age/byte observations through the real listener, shutdown/restart cold caches, persistent DB edits, packaging and footprint measurements. No numerical performance improvement is claimed.

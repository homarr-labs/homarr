# Prepared public host — bounded ordinary source caller check

**Receipt: no consumer call of `createPublicHostRuntime` was found in the searched ordinary source. `assemblePublicResourceHost` has exactly one found call, inside that constructor. The runtime-composition barrel only reexports the definitions; no searched named/renamed/namespace/barrel consumer imports it. Nitro's current entry uses a different foundation host API.** This supports the approved async concrete-owner constructor/narrow assembly change within the inspected source joins, not global/external compatibility or implementation authorization.

## Authority and search coverage

Read approved `.scratch/nitro-full-migration/MAIN-DIRECT-NATIVE-HOST-JOIN-PLAN.md` 1–29 EOF. Its direct native design supersedes the earlier take/transfer method and whole-owner proxy-close alias proposal; neither rejected mechanism is carried forward.

Bounded filename globs and dedicated content greps were scoped only to:

- `apps/backend/src`
- `apps/backend/server`
- `apps/backend/tests`
- `apps/nitro/src`
- `apps/nitro/tests`

Grep checked both function identifiers, `runtime-composition` module paths, backend package/source host paths, and relative `runtime`/`assembly`/`host`/`compose` paths. Checking module specifiers, not merely function names, catches ordinary renamed/namespace imports and star/barrel reexports using those paths. It found no matching namespace/renamed consumer of the target modules. Results were 9/1/0/18/0 matching lines respectively, all below limit 200, without truncated results. The Nitro matches other than its entry host import are unrelated widget/board host/runtime imports, not public backend host joins.

Content coverage deliberately excluded generated output, `.output`, generated route-tree output and fixture content. Backend test greps covered the ordinary top-level `public-shutdown.ts` and `public-fetch.test.ts`; Nitro tests covered `public-browser.ts`. Filename discovery listed shutdown fixture source paths but none of their contents or compiled outputs was read. Thus “none” is scoped to searched ordinary non-fixture source, not an attestation of all fixture/generated content. No arbitrary computed import or unknown alias mapping was evaluated.

The Nitro source include covered its ordinary `entry-*`, `app`, `client`, `contracts`, `navigation`, `query`, `routes`, `source-ui`, `ssr`, `styles` and `features` TypeScript/TSX paths, omitting `route-tree.gen.ts`. No protected Auth/DB/Core/native implementation or other package body was followed.

## Exact targeted reads to EOF

Each source read was sequential from line 1 with limit 2000; no partial, missing, ambiguous, clipped or ceiling-limited file:

| Exact source                                              | Returned interval / EOF | Join relevance                                     |
| --------------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| `apps/backend/src/server/host.ts`                         | 1–19 / 19               | Actual foundation host composition caller          |
| `apps/backend/src/server/compose.ts`                      | 1–44 / 44               | Foundation-only producer, not prepared public host |
| `apps/backend/src/server/runtime-composition/index.ts`    | 1–36 / 36               | Target public barrel reexports                     |
| `apps/backend/src/server/runtime-composition/runtime.ts`  | 1–143 / 143             | Target constructor and sole found assembly call    |
| `apps/backend/src/server/runtime-composition/assembly.ts` | 1–215 / 215             | Target assembly definition/used runtime interface  |
| `apps/backend/server/plugins/lifecycle.ts`                | 1–4 / 4                 | Current foundation host disposal caller            |
| `apps/backend/server/lifecycle.ts`                        | 1–22 / 22               | Generic supplied-disposer plugin factory           |
| `apps/nitro/src/entry-server.tsx`                         | 1–14 / 14               | Current entry's distinct host API call             |

Eight source reads / 497 lines; including the plan, nine reads / 526 lines. Grep previews are search results, not whole-file EOF claims for unmatched/unrelated source. All boundaries remain ordinary source text, not canonical FILE/DATA, physical identity or executed module evidence.

## Exact caller/reexport facts and constraints

1. **Prepared constructor:** runtime 43 declares `createPublicHostRuntime`; no other grep result calls, aliases or imports that identifier. Its synchronous generic input currently takes caller schema and persistence factories (57–60), concrete settings/backend/culture resource callbacks (61–83), rendering and reporting (84–95). These are declarations, not an identified consuming caller that needs a synchronous return or generic factory mode.
2. **Prepared assembly:** runtime 4 imports `assemblePublicResourceHost` directly and 134–142 calls it with its locally produced persistence/settings/culture/RPC graph. Assembly 21 declares it. This is the sole found consuming call and is within the approved `runtime.ts` adaptation scope.
3. **Barrel:** index 1/35 directly reexports the two functions; 2/36 reexports the corresponding phase/preparation types. No renamed export, namespace export, star export or wrapper changes the two target identities there. No searched source imports this barrel/path, including by a matching namespace or renamed import. Keeping the barrel untouched automatically reexports the updated function definition; it does not create a synchronous-wrapper guarantee.
4. **Current server composition is different:** host 2 imports `composeApplication`; host 7–13 lazily calls it with rendering and delegates fetch; host 16–19 disposes that same stored application. Compose 16–40 supplies only the foundation contribution and 42–44 calls `createApplication`. Neither file imports the prepared runtime-composition barrel or either target function. Therefore do not modify/await this current host API merely because the separate prepared constructor becomes async.
5. **Current lifecycle uses that different host:** plugin 1 imports `closeApplication` from `../../src/server/host`; 4 supplies it to `createLifecyclePlugin`. Lifecycle 3 takes a promise-returning disposer and hooks shutdown/close. It neither references nor enrolls the prepared constructor. Its code-level environment condition at 11 is source text only; no environment values were read or evaluated. No shutdown/native proof is claimed.
6. **Nitro entry uses that different host:** entry-server 3 imports `fetchApplication` from `@homarr/backend/host`, then 9–14 exports a fetch object which merges source-declared asset inputs and supplies `renderPublicPage` to that host function. It is not a public-runtime constructor call or public-barrel import. Asset/render imports were not followed.

**Outside-boundary stop:** physical package export/alias mapping for `@homarr/backend/host` is not established by reading a manifest or resolver here; those are outside the allowed directories. The exact visible edge is `apps/nitro/src/entry-server.tsx:3` → `@homarr/backend/host`. Source acquisition stopped without following that mapping or any asset/SDK/import body. The independently read in-scope `apps/backend/src/server/host.ts` supplies the named foundation API and direct compose caller; this is not a claim that package resolution was independently authenticated. No out-of-scope target runtime/barrel caller was disclosed by the literal source joins.

## Reconciliation result

Within the searched ordinary source, there is **no found caller compatibility blocker** to making the prepared `createPublicHostRuntime` asynchronous and internally selecting exactly one concrete native owner, removing its independent generic helper/schema input and adapting its sole assembly call to the narrow guarded runtime/readiness facet. There is also no found direct configured-generic assembly consumer to preserve via a new construction mode. Do not invent a compatibility union or alternate owner/transfer mode solely from a generic declaration. The existing barrel and unrelated foundation host/lifecycle entry must remain untouched.

This is scoped source-consumer compatibility only. Fixture/generated content, unknown alias mappings, package consumers outside these directories and external callers are not cleared. No typecheck or library/native behavior guarantee is claimed. Coordinator reconciliation must acknowledge these boundaries before releasing implementation; a newly identified incompatible caller must stop the writer rather than widen the five-file allocation.

Approved candidate allocation remains exactly native-main-persistence/runtime/assembly plus type-only used-read `Pick` changes in public-settings/public-culture. No takeForPublicHost/transfer registry, whole-owner proxy-close alias, dummy close, raw runtime exposure, second DB/pool/framework, permission widening or anonymous RPC mutation is included. No contract alias is justified by this caller check; prefer existing inline `Pick`.

Production mounting still waits for real settings/culture/source procedure/metadata/setup/render/listener producers. The locale loopback-only origin policy remains held; portable ordinary-server self-hosting requires no mandatory Cloudflare/tunnel. Auth/principal, actual durable epoch/adoption, through-COMMIT authority, physical drain/close, private host, restore/restart and formal179/FILE-DATA remain unproved; acceptance remains 91/334 and historical failures stay preserved. Local Darwin work remains PAUSED.

## Actions receipt

Exact report destination collision check returned absent immediately before this sole patch. No product writes, commands/stat/hash/Node/import evaluation, compiler/lint/tests/build/install, runtime/SQL/data/environment/secret/native/capture/Git/browser/delegation or Context7 calls occurred. Reading the approved plan and producing this ordinary caller receipt is not implementation, mounting or independent oracle acceptance.

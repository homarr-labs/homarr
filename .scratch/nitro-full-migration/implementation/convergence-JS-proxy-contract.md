# JS proxy required-input contract — frozen, dormant

Implemented the exact required-input contract approved by Oracle session `ses_ecea1baeaffeA3HNEoY3tmd1ef`.

## Source allocation

Only `packages/integrations/src/nitro-bindings/transport.ts` changed:

- `IntegrationTransportBindingResources` requires readonly `nodeEnvironmentMode: "development" | "production" | "test"`.
- Binding construction reads the supplied primitive once. Missing or invalid values synchronously throw `TypeError` before returning transport resources or acquiring a lease. There is no fallback.
- The existing Node-agent `proxyEnv` receives `NODE_ENV` from that captured primitive. All six explicit isolation entries remain unchanged: `HTTP_PROXY`/`HTTPS_PROXY`/`http_proxy`/`https_proxy` are empty strings; `NO_PROXY`/`no_proxy` are `"*"`.

No environment reads/spreads, fabricated mode, assertions, suppressions, dependency/declaration patches or startup configuration changes were added. The separately supplied Undici proxy, TLS trust/identity, DNS lookup, authority/currentness checks, abort handling, physical work tracking, Node-agent retirement and dispatcher drain remain unchanged.

## Required dependencies remain held

`packages/integrations/src/nitro-bindings/native.ts` was not changed. Its existing `Omit`-derived transport input inherits the required field and its existing resource forwarding passes it through; this is a source contract, not host adoption.

There is no backend integration-binding constructor or genuine captured host mode producer supplied by this tranche. Both the real host configuration producer and its composition join remain required and held. No mode is claimed available, and no runtime activation is authorized.

Read `WRITER-RULES.md`; no commands, checks, tests, builds, runtime/native/SQL/provider operations, environment/data/secret access or nested agents were performed. Coordinator validation remains outstanding. This handoff establishes frozen dormant source only, not compiler, runtime or procedure acceptance.

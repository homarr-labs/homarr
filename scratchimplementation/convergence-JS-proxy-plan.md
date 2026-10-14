# JS proxy plan — explicit producer blocked, not an assignment repair

**No approved transport-only fix under the stated constraints.** Keep `packages/integrations/src/nitro-bindings/transport.ts:101–110` unchanged until an actual captured host environment-mode producer is admitted, or a verified dependency contract removes the erroneous ambient requirement. LC's DB item projection alone does not establish a Next-free native graph. Other frozen JS work and active AW work are excluded.

Read-only source/declaration investigation; only this report was created. No commands, tests, product changes, runtime/native operations, environment-value reads, data/secrets, dependency patches or nested agents. Line references describe the inspected source, not a compiler run.

## 1. The exact incompatible contract

- `node_modules/@types/node/package.json:3`: installed `24.13.3`.
- `node_modules/@types/node/http.d.ts:1485–1492`: `ProxyEnv extends NodeJS.ProcessEnv`, with six optional proxy keys.
- `http.d.ts:1539`: `AgentOptions.proxyEnv?: ProxyEnv | undefined`.
- `node_modules/@types/node/https.d.ts:23–24`: HTTPS options extend HTTP agent options.
- `node_modules/next/types/global.d.ts:21–24`: `ProcessEnv` gains required readonly `NODE_ENV: "development" | "production" | "test"`.
- `node_modules/next/index.d.ts:1` explicitly references that global declaration.

Consequently, while that augmentation is loaded, the real six-key object at `transport.ts:101–108` lacks a required constructor-input property. A local `Pick`, `Omit`, `Record`, `satisfies`, readonly/frozen object or narrower producer annotation cannot make that object structurally assignable to the installed `ProxyEnv`. The constructor still asks for the same augmented type. No assertion, suppression, ambient declaration change, getter, protocol wrapper or fabricated environment value is justified.

Those six values are deliberate isolation: both proxy URLs are empty and both bypass lists are `"*"`. They are not the application's selected proxy configuration. The selected proxy is separately captured at `transport.ts:48` and supplied to `EnvHttpProxyAgent` at `:100`; Axios additionally uses owned Node agents and `proxy: false` at `:177–185`. Preserve all six keys, TLS identity/CA handling, optional DNS lookup, authority checks, abort behavior and retirement/drain ownership.

## 2. LC is not proof of ambient removal

The already-owned Definitions → DB item projection is documented in `scratchimplementation/convergence-LC-residual.md`; do not duplicate or reallocate it here.

An independent, currently reached native Next entrypoint remains:

```text
apps/nitro/src/features/docker/binding.ts:1
  → @homarr/api/nitro/context
  → packages/api/src/nitro/context.ts:3
      import type { DeviceType } from "@homarr/common/request"
  → packages/common/src/request.ts:1
      import { userAgent } from "next/server"
  → node_modules/next/server.d.ts
```

This path never goes through DB queries or the original Widget registry. `apps/nitro/src/features/integrations/client.ts:3` also reaches that context through the published native API index. Type-only consumption of `DeviceType` does not exclude the defining source file's imports from TypeScript's graph.

Further genuine Next type entrypoints exist independently: native navigation/application/integration UI imports `@homarr/common/url`, whose `packages/common/src/url.ts:1` imports Next's `ReadonlyHeaders`. Do not replace these observations with a claim that Translation's client barrel is still Next-bound: `packages/translation/src/client/index.ts` now reexports the standalone client.

**Important limit:** a `next/server` or deep Next declaration ingress is not, by itself, a demonstrated path to `next/index.d.ts`'s global reference. This bounded inspection establishes that LC does not remove all Next entrypoints, not the exact post-LC set of loaded global declarations. No post-LC compiler graph was run. Therefore neither “LC clears the proxy errors” nor “this DeviceType edge alone necessarily reloads `NODE_ENV`” is certified here. Full ambient closure remains a coordinator check after admitted writers freeze.

A genuine dependency-light projection could move the existing `DeviceType` alias into a new published Common leaf, reexport it from `common/request.ts`, and adopt that leaf in native `context.ts`. That is real source decoupling, not a proxy assignment fix; it is insufficient evidence to approve this diagnostic, and is not allocated here. Do not narrow roots or remove working consumers to manufacture closure.

## 3. Actual Node API: no `envProxy: false`

The installed HTTP declarations expose `proxyEnv`, not `envProxy`; HTTPS inherits that same option. Official documentation and source for the repository-pinned Node `24.18.0` corroborate this:

- [HTTP agent options and built-in proxy support](https://github.com/nodejs/node/blob/v24.18.0/doc/api/http.md): `proxyEnv` is `{Object|undefined}`, default `undefined`, with the six documented keys. Global opt-in supplies `process.env` to the global agent; custom agents opt in through their own `proxyEnv` object.
- [Actual HTTP agent constructor](https://github.com/nodejs/node/blob/v24.18.0/lib/_http_agent.js): only a non-null object in `this.options.proxyEnv` invokes `parseProxyConfigFromEnv`. No `envProxy` switch is consulted.

`proxyEnv: undefined` is a genuine documented custom-agent non-proxy route on this Node version, not an invented API. **It is not an approved candidate here:** replacing/removing the six-key object violates the explicit retained-isolation requirement. `proxyEnv: false` is not the declared/documented protocol either. Runtime permissiveness does not authorize a made-up option or adapter.

Context7 retrieval was attempted and returned its monthly quota error; the version-pinned official docs/source above were retrieved directly. No runtime behavior was tested, and no Bun-equivalence claim is made.

## 4. Smallest honest required-input candidate, conditional on a real producer

If the coordinator chooses to retain the current installed dependency contract and the six-key object, the smallest local source extension is in **`packages/integrations/src/nitro-bindings/transport.ts` only**:

1. Add required `readonly nodeEnvironmentMode: "development" | "production" | "test"` to `IntegrationTransportBindingResources`.
2. Capture that supplied primitive once when constructing bindings, alongside the captured proxy configuration; reject an invalid supplied value instead of defaulting it. It must describe the real host execution mode, not an arbitrary proxy-disable marker.
3. Add `NODE_ENV: capturedNodeEnvironmentMode` to the existing six-key `proxyEnv` object. Leave its six existing values and both constructor calls otherwise unchanged.

This is a proposed required producer contract, **not authorization to pick a mode**. `packages/integrations/src/nitro-bindings/native.ts:61` already derives the transport input with `Omit<IntegrationTransportBindingResources, "trust" | "assertCurrentAsync">`, and `:186–193` forwards the supplied transport resources. Thus it would inherit and forward this requirement without rewriting that frozen file. Direct transport callers would also have to supply the real captured value.

The inspected host cannot supply it today:

- `apps/backend/src/server/startup-configuration.ts:13–19,275–324`: version-1 strict startup contract/schema contains listener, host, culture and authentication; no integration configuration or environment mode.
- `apps/backend/src/server/runtime-composition/contracts.ts:189–194`: `PublicHostConfiguration` has base URL/path, persistence and locale body limit only.
- `apps/backend/src/server/runtime-composition/configuration.ts:5–51`: `captureHostConfiguration` captures that existing input; it does not produce an execution mode.
- Source search found no `createOwnedIntegrationBindings`/`createIntegrationTransportBindings` construction in `apps/backend`. A future transport field is not an existing producer/adoption join.

Completing this route therefore needs separately admitted work at those three exact host contract/schema/capture files **and a real integration-binding composition call site that does not currently exist in that host**. The required mode must originate from genuine host configuration and be validated/captured before constructing bindings. Updating version-1 startup input compatibility is an explicit protocol decision, not a hidden default. Do not infer it from loopback listening, build version, SQLite `fresh`/`existing`, demo flags, or authentication mode; do not read/spread ambient environment into transport. Do not fabricate a composition module or widen into a framework rewrite to call this complete.

## Decision

**Minimal blocker:** retain the two assignments as blocked. There is no verified declared boolean opt-out preserving the six-key object, no small local type projection that satisfies the augmented constructor type, and no currently captured host environment mode to supply honestly. The required-input route above is grounded and bounded locally but remains unapproved/unjoined until a genuine supplying owner is admitted. A dependency update would be another avenue only after its actual installed declarations are verified to remove `ProxyEnv`'s ambient inheritance; no such replacement version was verified, so none is recommended as a ready fix.

Do not reopen LC mapping, the other accepted JS changes, or active AW scopes. Coordinator may recheck full ambient closure after the already-owned LC work; this report does not promise it clears these diagnostics.

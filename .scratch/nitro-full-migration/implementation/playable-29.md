# PLAYABLE-WAVE32 lane 29 — Q17 native ownership

## P2 bounded reopen inventory

Reopened only `packages/core/src/infrastructure/http/https-agent.ts`, `packages/core/src/infrastructure/http/proxy-connector.ts`, and this handoff. `ownership.ts` and `runtime.ts` stay byte-frozen. Independent P2 identified the exact failed admission and deferred-quarantine paths; this repair uses those supplied findings. Behavioral repro/fault/test phases are explicitly skipped under the user's prohibition, not passed or replaced by lint/types. No new repository files or public interfaces are planned.

## Exact write inventory, recorded before source edits

- `packages/core/src/infrastructure/http/https-agent.ts`: existing `ResourceHttpsAgent`; additive request admission/retirement bookkeeping and an explicitly selected, unmounted owned CONNECT entrypoint. Native queues/pool scheduling stay native.
- `packages/core/src/infrastructure/http/ownership.ts`: existing `ownNodeAgent`; start and join independent physical cleanup even after synchronous native destroy failure, retaining quarantine and completion identity.
- `packages/core/src/infrastructure/http/runtime.ts`: existing `createCertificateHttpRuntime` native HTTPS construction; supply separate target/proxy TLS roles without changing Fetch or the existing Bun proxy guard.
- `packages/core/src/infrastructure/http/proxy-connector.ts`: absent before this lease; new native TLS-role construction and owned Undici CONNECT transaction. No proxy-selection resolver is invented.
- `.scratch/nitro-full-migration/implementation/playable-29.md`: this inventory and final frozen handoff.

## Consumed interfaces and stop lines

Authoritative inputs: PLAYABLE-WAVE32 Oracle amendments, Q16-Q18-PRODUCTION-JOINS §J3, DESIGN Q17, PROXY-PRODUCTION-JOIN-PLAN, frozen HTTP ownership/capacity/transport boundaries, and accepted r3 native agent/runtime contracts. `CertificateTrustMaterial` is `{ca,trustedHostnames,version}`; `createTlsContextCache` owns matching contexts; `createCustomCheckServerIdentity` owns exact target hostname/fingerprint exceptions. These frozen bodies are not edited.

Core directly declares Axios and Undici. Installed source/declarations identify Axios 1.20.0 and Undici 7.29.1. Public `Client.connect` detaches the CONNECT socket; public `buildConnector` declares `void` although pinned implementation returns its initial native socket. Native `proxyEnv` exposes no accepted public routing/proxy-TLS selector. The connector candidate must capture returned `unknown` before replaying synchronous callbacks; production routing remains held, not replaced by Undici noProxy matching.

No manifests, exports, native ownership boundary ledger, tests, or other lanes are written. No providers, real CA stores, environment files, data, Git, or child agents are accessed/run. Manifest and installed declaration reads verify existing dependencies only.

## Frozen implemented return

**Independent source pieces complete; actual automatic proxy-routing/production join HELD.** All four owned source files are frozen at the hashes below. This is not physical proof or guard-removal acceptance.

### Named source interfaces

- `proxy-connector.ts`: `createNativeHttpsTlsRoles(material: CertificateTrustMaterial, getTlsContext: (ca: NonNullable<AgentOptions["ca"]>) => SecureContext, override?: Pick<AgentOptions, "ca" | "checkServerIdentity">, lookup?: LookupFunction): NativeHttpsTlsRoles`. Each role requires its matching CA/context, identity callback and `rejectUnauthorized: true`.
- `proxy-connector.ts`: `createOwnedHttpsProxyConnection(resources: OwnedHttpsProxyConnectionResources): { start(): void; cancel(): void; closedAsync: Promise<void> }`. Resources contain the actual `ClientRequest`, native `RequestOptions`, an already-selected proxy URL, the two TLS roles, Agent-owned currentness assertion, synchronous `onQuarantine` admission stop and native `(error, stream?)` callback. Factory construction performs no I/O; Agent registration precedes `start()`.
- `https-agent.ts`: additive `ResourceHttpsAgentOptions extends AgentOptions { nativeTlsRoles?: NativeHttpsTlsRoles }`; constructor strips this owned field before native construction. Existing default/no-proxy native transport remains native.
- `https-agent.ts`: `addRequest(request: ClientRequest, options: RequestOptions): void` delegates directly to the installed native admission method without replacing queues/scheduling. Its request-local admission tracks queued close/socket handoff; retirement cancels outstanding admissions before native destroy.
- `https-agent.ts`: `createProxyConnection(request: ClientRequest, options: RequestOptions, proxy: URL, callback: (error: Error | null, stream?: Duplex) => void): void`. This **unmounted** entrypoint accepts only the currently admitted native `createSocket` request, once. It cannot acquire a tunnel for an unrelated/queued request or supply a routing decision. No current runtime resolver invokes it.
- Existing `waitForConnectionsClosedAsync`, `ownNodeAgent`, `createCertificateHttpRuntime`, native client factories and disposal signatures remain. `CertificateHttpResources.createHttpsAgent` now receives the additive `ResourceHttpsAgentOptions`; custom factories must preserve the base ownership bridge and owned role field, not treat their shape as acceptance.

### Actual source mappings and behavior

1. Existing managed native TLS construction in `runtime.ts` now calls the owned role constructor and passes both roles into `ResourceHttpsAgent`. Target uses `override.ca ?? material.ca` plus its matching context and approved target identity callback. Proxy uses **only** `material.ca`, matching context, and ordinary `checkServerIdentity`. No override gives the same approved anchors to both roles; no pruning/pinning/new store/global CA/verification bypass. Proxy credentials are scoped to CONNECT headers and never inserted into target options, target HTTP headers, TLS cache identities or logs.
2. New owned branch reuses installed public Undici `Client.connect` only for CONNECT parsing/handoff, then native `tls.connect` for target TLS; it is not a Fetch/Axios replacement. A one-Client transaction is registered before I/O. Initial `buildConnector` return is captured as `unknown` and required to be a real `Socket`; synchronous callbacks are deferred until registration, and initial-registration uncertainty remains a failed ownership record. Detached socket ownership is reattached synchronously at the CONNECT callback because installed Undici removes its listeners during handoff. 2xx is required before target TLS. Independent cancellation survives signal-listener removal; request destruction wrappers restore only their own handler. IP targets omit SNI while retaining normal host/IP verification. There is no direct retry.
3. Transaction closure joins CONNECT completion acknowledgement, Client destruction and actual raw/detached/target `close` events, including stream registrations observed during joining. Failure callbacks wait for available physical joins before native slot release; callback exceptions join the critical-failure ledger. Failed transaction records stay strongly retained and stop Agent admission. Missing close stays pending, not timer-success. **This is implementation, not accepted slot/race/late-callback evidence.**
4. Existing r3 direct connection tracking now retains throwing native callback failures, destroys pending streams on synchronous construction failure, and destroys distinct late callback streams rather than donating them to a completed request. Native admission and independent proxy transaction joins are included in `waitForConnectionsClosedAsync` before retirement failures are reported.
5. `ownNodeAgent` now independently starts the close join after a throwing `destroyTransport`, waits all available pooled/independent close work, aggregates failures, and calls `onReleased` only on success. Existing cached retirement/disposal Promise identity, managed material-generation fences, runtime all-settled aggregation, strict-eight Fetch cache and quarantined ownership remain. Managed Fetch's historical both-peer override/identity mapping is untouched.

### Exact remaining holds

- No accepted public native proxy/noProxy selection seam exists here. Native routing precedence/fallback, suffix/port/IPv6/bypass equivalence and per-redirect request association are **not invented**. `ResourceHttpsAgent.createConnection` still follows the existing native `super.createConnection`; the owned CONNECT entrypoint is not selected automatically. Existing automatic Node `proxyEnv` proxy TLS therefore is **not repaired or approved merely by carrying role options**.
- Pinned Undici 7.29.1 initial-socket return is implemented with checked `unknown`, not cast into its public void return contract. Its provenance/handshake needs independent acceptance and genuine construction-throw/reentrant/late-socket proof. Public routing and physical pending-capacity hooks in the frozen `nitro-transport` boundary ledger remain held; that ledger/capacity adapter is not edited or relabeled supported.
- Actual default Axios adapter selection is unproved. Installed defaults are `['xhr', 'http', 'fetch']`; runtime still uses existing `createAxios({ httpsAgent, httpAgent, proxy: false })`, without forcing a substitute adapter. Custom factories/adapters/transports are not default-managed proof.
- HTTP through an HTTPS proxy remains outside this HTTPS-only lease. Existing `node:http.Agent` proxy trust/pre-pool ownership, queue/isolation/reuse, redirects, handoff races, callback/destroy faults and default-managed Bun/Node physical retirement remain release gates.
- Entire existing Bun configured-proxy guard retains its exact predicate/message, including existing `noProxy === "*"` behavior. No public export, mount, provider action or production release occurred. Coordinator must separately accept direct/public resource graphs and exact native routing hook before consuming this unmounted branch.

## Focused immutable validation

Prior implementation snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-29-check-bcv41k3_`. Ordinary copies only, no links/watchers to mutable peers. Four owned source files plus their eight frozen HTTP/certificate source dependencies, copied installed dependency/tool packages and copied lint/format configuration; no DB/auth graph, production imports or CA reads. Source bytes were rechecked against that snapshot after checks, including unchanged frozen read dependencies and exact guard predicate/message. Current P2 validation is recorded below.

Checks ran under explicit Node 24.18.0 with an empty environment except disposable HOME/TMPDIR and `/usr/bin:/bin` PATH:

- Installed TypeScript 7.0.2 `tsc --project tsconfig.json --noEmit --incremental false`: **exit 0**.
- Installed oxlint 1.73.0 on exactly four owned files with copied repository config: **exit 0, zero warnings/errors**.
- Installed oxfmt 0.58.0 `--check` on exactly four owned files with copied repository config: **exit 0**.

Initial bounded checks exposed a missing copied TypeScript native executable and a native RequestOptions/TLS identity-signature mismatch; copied the already-installed executable and repaired types without assertions. No installation, new/existing test execution, build, native probe, listener, external network, real certificates or provider call occurred. No new declaration dependency is requested: Axios 1.20.0 and Undici 7.29.1 are already directly declared; public resource export/graph acceptance remains coordinator-owned.

### Owned source SHA-256

| File under `packages/core/src/infrastructure/http/` | Frozen SHA-256                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `https-agent.ts`                                    | `fc80073aa9d66aac9809ed43ecde71a71a477177f2fc2a8aab9e7c9e4832fea8` |
| `ownership.ts`                                      | `c3c0a5a46721f7e64befd5a70943a90a4e233fe8420b8c3e7949c648e2dead49` |
| `runtime.ts`                                        | `c3d5956ee3bc2761802da5bac65c09086fb5e5c8eab4a9f3931d8fc7493a7d13` |
| `proxy-connector.ts`                                | `8ffdba18d92fd64a1c26aca28818639bcadbc8d77be3e0f7f1fd6a50e462ee5b` |

Installed source provenance: Undici `lib/core/connect.js` `67956a204fe3982edbf032dd44ff9c1c391daaa85c05e9750d245bdfb2b87fe0`; `lib/api/api-connect.js` `d8ca4a5cbff898afb26573cca18b9aab2928d8113d5d8897b5fc193ef343fcf0`; `lib/dispatcher/client-h1.js` `131e14c7b6a2125eeec1501f59c032d39b3d0e33d818af8b0c1702c034881bef`. These are source-read provenance, not package-graph or physical acceptance.

**Frozen for coordinator/independent review.** This lane supplies concrete owned source repairs and honestly stops the unavailable automatic-routing/physical join; it does not clear production holds.

## P2 repaired return — frozen for re-review

- `https-agent.ts:addRequest` now invokes its admission-local `release()` after cancelling a synchronous native admission/socket-creation failure and before rethrowing the original error. That release resolves only the admission Promise and removes its own `socket`/`close` listeners. It does not remove or resolve `connections`, proxy transaction records, stream `close` joins, or physical ownership. It no longer waits for an event a socketless failed request may never emit.
- `proxy-connector.ts:destroyStream` records a throwing `stream.destroy()` and calls the actual Agent-owned `onQuarantine` immediately in the catch. `destroyClient` does the same for synchronous `Client.destroy()` throws and observes/rethrows asynchronous rejection in its memoized destruction Promise. Admission stops at failure observation, even when CONNECT acknowledgement or an open physical stream keeps `joinAsync` pending indefinitely. Available close joins, strongly retained transaction/stream owners and failed eventual settlement remain; no timeout or early success is introduced.
- Actual consumed interfaces were re-read: installed Node HTTPS `Agent.createConnection` returns `Duplex | null | undefined`; `ClientRequest.destroy(error?)` returns the request, not a close acknowledgement. Installed Undici dispatcher declarations supply `destroy(): Promise<void>` and callback overloads; `dispatcher-base.js:103–149` implements Promise rejection from the destroy callback and asynchronously completes destruction. Existing `onQuarantine` is the synchronous `ResourceHttpsAgent.retired = true` binding, not a substitute success callback. Frozen `ownNodeAgent` still joins pooled and independent closes before release.
- Public signatures, Q17 target-only overrides/strict proxy roles, default SAMECA, unmounted automatic routing, and all production/physical holds are unchanged. `ownership.ts` and `runtime.ts` match their previous exact SHA-256 values above; consequently runtime guard and construction bytes are unchanged.

### P2 isolated raw verification

Snapshot/log directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-29-p2-kx8sstfz`. No symlinks or source watchers. Checks consume copied installed tools/dependencies and the two repaired source roots with their copied frozen import closure. Explicit Node 24.18.0 runs with only disposable HOME/TMPDIR and `/usr/bin:/bin` PATH. Raw stdout/stderr is preserved verbatim in this disposable directory; no new repository files, test/fault/native transport calls, network, installation, Git or child agents.

Commands below are relative to that directory, prefixed with `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`:

```text
node_modules/typescript/bin/tsc --project tsconfig.json --noEmit --incremental false
```

Exit 0. `types.raw.log` is empty stdout/stderr; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

```text
node_modules/oxlint/bin/oxlint --config .oxlintrc.json packages/core/src/infrastructure/http/https-agent.ts packages/core/src/infrastructure/http/proxy-connector.ts
Found 0 warnings and 0 errors.
Finished in 8ms on 2 files with 197 rules using 16 threads.
```

Exit 0. `lint.raw.log` SHA-256 `65d4af47f7eb0a39ae28aad1267b76cc829bfa784f8ca77b09f6d3079da7e5ec`.

```text
node_modules/oxfmt/bin/oxfmt --check packages/core/src/infrastructure/http/https-agent.ts packages/core/src/infrastructure/http/proxy-connector.ts
Checking formatting...

All matched files use the correct format.
Finished in 24ms on 2 files using 16 threads.
```

Exit 0. `format.raw.log` SHA-256 `17aa8d920fb6074e925c5db1553b388a3ae10d7887c081ffaccb952a314b9b68`.

Post-check equality verifies both repaired source files match the checked copies, both unopened source hashes remain frozen, and consumed TLS/certificate source dependencies are unchanged. The source hash table above now records this P2 return. **Frozen for independent re-review; no physical proof or production acceptance is claimed.**

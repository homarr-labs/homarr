# HTTPS-proxy trust: next allocation for Oracle

**Planning only. Production guard remains HELD.** No production edit, probe, command, network request, dependency change or agent delegation is authorized by this plan. Core G/runtime and other owners' active scopes are excluded until the coordinator grants an explicit new lease. Same-DN legacy-chain ambiguity remains a separate HOLD; Q16 is not a proxy-TLS relaxation decision.

## Accepted baseline

`implementation/trust.md` and `packages/core/src/infrastructure/http/checks/proxy-managed-repeat-results.json` record three actual Bun 1.4.2 default-managed runs: **40 PASS / 2 HOLD each**. Both public native HTTPS and native Axios reject custom-CA HTTPS-to-proxy TLS with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, before CONNECT or target access. HTTP-proxy positives do not authorize removal or a protocol/host whitelist.

- Guarded runtime SHA-256: `201e99497b4b54d3aa08c16e840198f92efcd64a26b731b1fa9278942fd12f5c`.
- Rejected guard-deletion candidate SHA-256: `24cc88f1f11aeb3ec9219dec6efc24b30f686a854819477966d5e5f1b1a807a6`.
- Accepted r3 agent/ownership hashes and physical-settlement evidence remain in that JSON. No new results are asserted here.

## Native API feasibility: no safe option in the pinned implementation

Retained [Bun 1.4.2 `https.ts`](https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.2/src/js/node/https.ts) snippet, around line 278: the initial proxy connection uses a copy of `this[kProxyConfig].proxyConnectionOptions`, not endpoint TLS options. Retained [Bun `internal/http.ts`](https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.2/src/js/internal/http.ts) snippet, around line 406: that object contains **host and port only**. The retained Node 24.18.0 native HTTPS/proxy source has the same options split.

Installed `@types/node/https.d.ts:23–42` exposes native Agent TLS options and `createConnection`; `http.d.ts:1485–1539` exposes proxy URL/noProxy environment configuration. Neither establishes a separate public proxy-TLS trust option. Passing endpoint `ca`, SecureContext or target `checkServerIdentity` already failed the actual managed proof. An arbitrary extra `proxyEnv`/constructor field would be an ignored-field guess, not an implementation route. Wrapping the native returned socket cannot amend verification options after its proxy TLS handshake has started.

**Conclusion:** the existing pinned native constructor/options seam cannot safely implement this fix. Do not mutate native private symbols, patch global TLS functions, use `NODE_EXTRA_CA_CERTS`, disable verification, prune anchors, add proxy hostname exceptions or retry directly. Policy approval cannot manufacture a missing native API.

## Narrow next allocation

**Preferred: HOLD pending an upstream pinned Bun fix exposing explicit, per-agent proxy TLS options.** Oracle must approve any runtime-version/pin work separately. Before Homarr implementation, require exact upstream source showing those options reach the _initial proxy_ `tls.connect`, with ordinary proxy hostname verification and unchanged inner-target verification. Do not name an unverified option or assume Node accepts it. If no bounded public hook exists, retain the guard and report upstream dependency; no installation is authorized now.

**Only alternative proposed for Oracle approval:** an owned CONNECT-connector adapter at `ResourceHttpsAgent.createConnection`, delegating CONNECT to the already-declared Undici `Client.connect`, then handing a verified target TLS stream to the existing native Agent callback. This is not a Fetch/Axios adapter replacement: Axios must retain its HTTP adapter, native request/response/redirect/stream behavior and default managed factory.

Installed Undici provides concrete primitives: `types/client.d.ts` exposes constructor `connect` options and `Client.connect`; `lib/dispatcher/client.js:229–237` feeds those connector options to `buildConnector`, and `lib/core/connect.js:86–96` spreads them into native `tls.connect`. An explicitly scoped proxy `ca` therefore has a source-backed route to outer TLS, unlike native `proxyEnv`; target options must remain separate. `lib/api/api-connect.js:19–45,51–83` handles cancellation and returns a socket on upgrade, **removing its signal listener on handoff**. Both a pending dispatcher lease and a detached socket lease are mandatory. This adapter is **not already proven safe on Bun**, is a transport-boundary change, and needs Oracle approval before any code/probe. Do not implement a new CONNECT parser or import Axios's transitive `https-proxy-agent`: its inspected v5 callback hides its initial socket until the response, and Axios's internal caches are not our retirement leases.

If Oracle selects this alternative, grant only a bounded connector-feasibility allocation in the native owned-agent seam, minimal ownership joining, coordinated runtime construction, existing proxy checks and the trust handoff. No certificate/DB/provider/app changes. COMPOSITION must confirm existing direct dependency declarations; any new dependency or public resource-contract change needs a separate approval. Do not modify the runtime while its current owner is active.

## Trust boundary that approval must resolve

- Proxy TLS validates the configured proxy URL's hostname/IP and its own approved CA input, before sending credentials or CONNECT. It never receives target fingerprint exceptions or target identity overrides.
- Target TLS validates the requested target against its own approved CA input; only its existing exact hostname/leaf-fingerprint exception may bypass a hostname mismatch, never chain verification.
- Current managed trust material supplies one `ca` bundle, and explicit proxy resources supply URLs/noProxy strings, not an independent proxy-CA policy. Reusing that bundle indiscriminately cannot prove “proxy CA does not grant target chain.” Oracle must define the narrow server-controlled trust-role projection before implementation; no new field is presumed to exist. Distinguish roles without creating another certificate store/auth engine or a bypass flag.
- Proxy credentials go only to the proxy, never target headers, redirects, logs or diagnostic causes. Authentication/TLS/CONNECT failure has no direct fallback. Routing follows configured `HTTPS_PROXY`/`HTTP_PROXY` URL and preserved noProxy semantics, not special host/path whitelists.

## Genuine ownership paths

Register the pending connector transaction **before I/O**, not only its eventual callback stream. Request abort must cancel that transaction before socket assignment. Retirement/invalidation/disposal must join pending dispatcher destruction, then all raw/detached/target TLS streams until real close; late callback streams are still owned and destroyed rather than delivered. Transfer ownership atomically when Undici removes its signal listener. Failed CONNECT, handshake/error/end, detached callback errors and release/destruction failures must retain errors and ownership, not produce successful disposal. Preserve r3 all-settled joining, repeated disposal Promise identity, strict-eight cache/coalescing/material abort and bounded dispatcher retirement; watchdogs never declare closure.

The default managed plain-HTTP agent also needs an explicit assessment for **HTTPS-proxy TLS**, connecting and pending response cancellation/disposal. Previous HTTP-forward positives cover only bounded HTTP-proxy paths. If a pending connection escapes `ownNodeAgent`, or that agent cannot receive proxy trust, stop and report the exact gap; do not silently introduce another agent architecture or declare the managed Axios path supported.

## Critical future validation and stop lines

Only after Oracle approval, use generated sparse distinct-DN PKI with separate proxy/target roots and owned ephemeral loopback HTTP/HTTPS proxies/targets. No existing ports, certs, credentials, appdata or providers. At least three fresh actual Bun default-managed repetitions; compare actual Node 24.18.0 when Homarr source changes, without selecting a fake version or injecting factories to pass.

1. Both public `createCertificateHttpRuntime` HTTPS/Axios routes through authenticated HTTPS proxy succeed; complete noProxy and native HTTP-path obligations remain explicit.
2. Unknown/invalid proxy chain and wrong proxy hostname fail before CONNECT. Replacement with an untrusted signer or wrong identity fails; a normally valid replacement under an approved CA must remain valid, since proxy leaf pinning is not proposed.
3. Proxy trust alone cannot validate the target. Preserve normal target identity and exact fingerprint-grant positive/negative/replacement cases.
4. Deliberate authentication rejection reaches neither target nor direct fallback; credentials are absent from target and captured logs.
5. Abort/invalidate/dispose during proxy TLS, CONNECT and target TLS; failed/late CONNECT and late target response. Await actual peer close without fixture intervention, zero sockets before teardown, same repeated disposal Promise and honest failed ownership/release joins. Source explanation alone does not prove these paths.
6. Run only affected scoped types/lint/format, focused proxy checks and relevant accepted lifecycle/revocation/TLS regressions if production source changes. Cleanup all owned transactions/streams/listeners before keys and fixture removal.

**Stop:** no real native proxy-TLS option, undefined trust-role projection, unowned pending/detached stream, unverifiable cleanup failure, unsupported Node/default HTTP path, new dependency/API scope, or any mandatory route failure. Retain the entire production guard. Guard disposition needs independent behavioral and standards review of exact default-managed bytes; primitive/HTTP-proxy positives and an adapter prototype are insufficient. No full #18/all89/platform/current-backup acceptance follows.

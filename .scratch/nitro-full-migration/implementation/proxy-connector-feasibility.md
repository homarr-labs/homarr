# Isolated proxy CONNECT feasibility — frozen for independent review

**Disposition: bounded isolated feasibility observed, not production authority.** Only `packages/core/src/infrastructure/http/checks/proxy-connector-feasibility.mts` and this report were added. Default managed runtime, production agents/ownership/TLS/certificate resources, DB and manifests were not changed or imported as an alternative runtime. Bun's production native proxy guard and upstream-native-API HOLD remain intact.

## Exact dependencies and bytes

Before implementation, the **current** `packages/core/package.json` was read: direct `axios: catalog:` and `undici: catalog:` declarations exist. Current root catalog and installed package metadata agree on **Axios 1.20.0 / Undici 7.29.1**; the probe checks both before network I/O. `git diff` showed those direct declarations are uncommitted COMPOSITION work. This is current-manifest evidence, **not HEAD dependency acceptance or permission to install**; COMPOSITION/reviewer must preserve and accept them. No hoisted-only dependency is used.

| SHA-256                                                                     | Value                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Frozen probe, all six final repetitions                                     | `9e8e0a37e3349085a397aea6f2f072d11410e9fc3772cb86574161d6303707fd` |
| Current Core manifest                                                       | `f454e3021ba3e2558bde3e07ed9a8439739376cd2456977d0b5d2becc625fd82` |
| Current root catalog manifest                                               | `a373b7251fb472e311157e4c2c297cc3a4012679a5b0c5a20df4aebe83cda745` |
| Production runtime/guard, before and after every run and final verification | `201e99497b4b54d3aa08c16e840198f92efcd64a26b731b1fa9278942fd12f5c` |

Installed API/docs/source were read first, with no Context7 retry (previous quota exhausted) or upstream/network research:

- `undici/docs/docs/api/Client.md:31,53–63`, `types/client.d.ts:23–29,74`, `types/connector.d.ts`: per-client TLS connector options and real `Client.connect`.
- `lib/core/connect.js:62–96,126–149`: connector options reach native outer `tls.connect`; the pinned implementation returns the initial socket immediately. The installed connector TypeScript signature returns `void`; the probe treats the result as `unknown` and requires `instanceof Socket`, rather than pretending that return is a portable documented guarantee.
- `lib/api/api-connect.js:51–83` and `lib/api/abort-signal.js`: CONNECT upgrade removes Undici's cancellation listener before supplying the detached socket.
- `lib/dispatcher/client-h1.js:530–564,625–629`: native parser detaches CONNECT sockets and hands status/socket to the handler. The probe must check **2xx** itself; a 407 also reaches the handoff API and must not start target TLS.
- `axios/lib/defaults/index.js:42` and installed native HTTPS/TLS types: the probe uses actual native Agent callback creation and explicitly checks Axios's **HTTP adapter** and streaming response.

Installed Undici source SHA-256:

| Source                        | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `lib/api/api-connect.js`      | `d8ca4a5cbff898afb26573cca18b9aab2928d8113d5d8897b5fc193ef343fcf0` |
| `lib/api/abort-signal.js`     | `46ac3527affb69036384c8baec5bf34ba567adb336921c7a62e8f471bb827f37` |
| `lib/core/connect.js`         | `67956a204fe3982edbf032dd44ff9c1c391daaa85c05e9750d245bdfb2b87fe0` |
| `lib/dispatcher/client-h1.js` | `131e14c7b6a2125eeec1501f59c032d39b3d0e33d818af8b0c1702c034881bef` |

## What the probe actually owns

`ConnectorProbeAgent` is a **probe-local** native HTTPS Agent subclass, not `ResourceHttpsAgent` or a default managed factory. It registers a transaction before any Client construction/I/O. The real installed `buildConnector` receives proxy-only CA and ordinary `checkServerIdentity`; its public connector wrapper tracks the native socket as soon as returned. Real `Client.connect` supplies the status and detached stream; there is no hand-written CONNECT parser or new HTTP stack.

That initially tracked socket covers the interval between Undici removing its listener and the Promise continuation observing handoff. The private transaction's abort listener remains active, destroys its tracked streams after handoff, and checks cancellation/retirement before creating target TLS. A 2xx response alone authorizes the next phase. Target TLS uses a **different fixture CA** and ordinary identity checking, with an optional exact target hostname/leaf-fingerprint exception; that exception is never supplied to outer proxy TLS. Proxy credentials are sent only as CONNECT headers. Negative outer TLS cases observe **zero CONNECT** and **zero target requests**, proving credentials are not sent through an unverified proxy connection. Proxy/target requests remain inside asserted owned loopback destinations.

The native Agent receives its callback once on successful secure target TLS or failure. Abort-before-I/O, pending CONNECT, after-handoff abort, retirement while a handoff continuation is suspended, target-TLS abort and late CONNECT response each terminate with one error callback and no delivery. A cancelled/retired continuation cannot deliver a fresh stream. Dispatcher destruction is cached per transaction; disposal is one cached Promise. Cleanup joins real Client destruction and actual raw/detached/target stream close events using all-settled ownership work. Callback/destruction failures are retained, not recast as closure. No sleep declares success; watchdogs fail.

The per-request external AbortSignal is explicitly shared with this probe-local Agent. This does **not** prove general per-request cancellation/queueing in a production multi-request Agent. The accepted r3 production creation bridge is not replaced or extended here.

## Actual observations: three fresh processes per runtime

Actual **Bun 1.4.2** and installed **Node 24.18.0** each ran the frozen 17-case probe three times. No version spoofing, Node fallback, configured provider or default-managed override was used. All six final children exited 0 because their specified positive/negative/failure observations were met—not because all requests or disposals succeeded.

Per final process, identical on both runtimes:

| Raw outcome / owner record                                                        |   Count |
| --------------------------------------------------------------------------------- | ------: |
| Ordinary delivered observations (native stream, Axios stream, exact target grant) |       3 |
| Actual expected request rejections                                                |      13 |
| Explicitly injected owner-release failure observation                             |       1 |
| Unexpected observation failures                                                   |       0 |
| Real Agent callback invocations / registered transactions                         | 17 / 17 |
| Rejected Agent callbacks                                                          |      13 |
| Initial outer native sockets                                                      |      16 |
| CONNECT socket handoffs, including rejected 407                                   |      10 |
| Target TLS creations                                                              |       7 |
| Delivered callback streams, including the release-failure fixture's request       |       4 |
| Explicit cancellation observations after handoff                                  |       2 |
| Actual rejected disposal promises                                                 |       1 |
| Retained failed owner records after physical closure                              |       1 |
| Remaining physical sockets before fixture intervention                            |       0 |

Each seam below was observed **3/3 on Bun and 3/3 on Node**. Counts are per one process, not invented aggregate success percentages:

| Seam                                                        | Actual result                                                                    | Outer / handoff / target TLS / delivered / callbacks |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Native streamed POST and response                           | Echoed `owned-stream`                                                            | `1 / 1 / 1 / 1 / 1`                                  |
| Axios HTTP adapter streamed POST and response               | Real Readable response, same echo                                                | `1 / 1 / 1 / 1 / 1`                                  |
| Unknown proxy CA                                            | `UNABLE_TO_VERIFY_LEAF_SIGNATURE`                                                | `1 / 0 / 0 / 0 / 1`                                  |
| Wrong proxy hostname                                        | `ERR_TLS_CERT_ALTNAME_INVALID`                                                   | `1 / 0 / 0 / 0 / 1`                                  |
| Replacement proxy signed by untrusted root                  | `UNABLE_TO_VERIFY_LEAF_SIGNATURE`                                                | `1 / 0 / 0 / 0 / 1`                                  |
| Proxy CA signs target but target CA does not                | `UNABLE_TO_VERIFY_LEAF_SIGNATURE`                                                | `1 / 1 / 1 / 0 / 1`                                  |
| Target hostname mismatch                                    | `ERR_TLS_CERT_ALTNAME_INVALID`                                                   | `1 / 1 / 1 / 0 / 1`                                  |
| Exact target hostname/fingerprint grant                     | Delivered echo                                                                   | `1 / 1 / 1 / 1 / 1`                                  |
| Target grant matches proxy leaf but proxy identity is wrong | `ERR_TLS_CERT_ALTNAME_INVALID`, before CONNECT                                   | `1 / 0 / 0 / 0 / 1`                                  |
| Actual 407 CONNECT rejection                                | `PROBE_CONNECT_REJECTED`, no target TLS/request                                  | `1 / 1 / 0 / 0 / 1`                                  |
| Abort before I/O                                            | Actual Error rejection, no string error code                                     | `0 / 0 / 0 / 0 / 1`                                  |
| Abort pending CONNECT                                       | Actual Error rejection                                                           | `1 / 0 / 0 / 0 / 1`                                  |
| Abort immediately on detached handoff                       | Actual Error rejection; private listener closes detached stream                  | `1 / 1 / 0 / 0 / 1`                                  |
| Dispose during suspended handoff continuation               | Actual Error rejection; late continuation not delivered                          | `1 / 1 / 0 / 0 / 1`                                  |
| Abort pending target TLS against blackhole                  | Actual Error rejection                                                           | `1 / 1 / 1 / 0 / 1`                                  |
| Dispose pending CONNECT then peer races late 200            | Actual Error rejection; no target TLS                                            | `1 / 0 / 0 / 0 / 1`                                  |
| Injected release failure after real request/physical close  | Disposal rejects AggregateError; same Promise stays rejected; one owner retained | `1 / 1 / 1 / 1 / 1`                                  |

The release fault is **probe-only injection after actual sockets close**, not a naturally observed Undici/native destruction failure. It intentionally prevents unregistering the transaction; no successful owner-release claim is made. Its physically closed failed record remains in the in-memory probe Agent until process exit. No closed socket or key is left live.

All successful and negative cases await real local stream close and observed proxy/target peer close **before fixture cleanup**, including relay upstream sockets. The ordinary proxy responds to client FIN by ending its side and propagates closure to its upstream; teardown never destroys a peer to manufacture a successful observation. Final output records `physicalSettledBeforeCleanup: true`, `remainingPhysicalSockets: 0`, `fixtureRemoved: true`, unchanged guard hashes and all per-case owner counters. A failure path can emergency-clean owned fixtures, but would emit failed pre-cleanup settlement and exit nonzero; it is not credited as proof.

Two exploratory Bun runs before these final bytes rejected at the first target TLS construction with `ERR_INVALID_ARG_VALUE`: the prototype tried sending an IP address as TLS SNI. The probe was corrected to omit SNI for IP targets while retaining host/IP identity verification; no verification fallback was added. Those runs are **not** in the final denominator, and the original premature physical-settlement snapshot is not cited as a pass. Final code waits peer close explicitly. No production change resulted from that harness correction.

## Reproduction and scoped checks

Run the probe with an empty ambient environment except the approved private HOME/TMPDIR. Bun must always include `--no-env-file`:

```sh
/usr/bin/env -i HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode /Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run packages/core/src/infrastructure/http/checks/proxy-connector-feasibility.mts
/usr/bin/env -i HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode /Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types packages/core/src/infrastructure/http/checks/proxy-connector-feasibility.mts
```

The final six-run execution used a read-only Node `spawnSync` runner, three repetitions per absolute executable, 20-second child watchdog and the same two environment values. It parsed each child JSON and printed actual outcome/owner counters without creating another helper or evidence file. Full structured output is reproducible from this single probe; this report preserves the final raw counts and per-case records. Node's transform flag handles the probe's TypeScript parameter property; it is not a production loading/platform change.

Only the new probe was typechecked, with `--noEmit --target ES2024 --lib dom,dom.iterable,ES2024 --strict --esModuleInterop --module esnext --moduleResolution Bundler --skipLibCheck --noUncheckedIndexedAccess --types node`. Scoped oxlint reports **0 warnings / 0 errors**, and scoped oxfmt passes. Existing production checks/configs were not edited or broadly rerun.

Each process generated sparse distinct-subject proxy/target/other roots and disposable leaves in its own mode-0700 directory under the approved private temporary root. OpenSSL received `env: {}`. Generated Basic credentials are checked absent from target requests and serialized output; keys/credentials/paths are never dumped. Loopback listeners are ephemeral, and allocation rejects ports 3000/3100/3200/3210. Six final processes exited after closing their owned streams/listeners and deleting keys/fixtures; final fixture search found none. No provider/upstream request, install, environment-file/appdata access, browser/container, nested agent, Git staging/commit or production source edit occurred.

## Precise unmet obligations / stop lines

- **No production connector allocation or guard lift.** This does not exercise default `createCertificateHttpRuntime`/`ResourceHttpsAgent`; those remain guarded. The native constructor still lacks proxy-only CA propagation, so the upstream pinned-runtime HOLD remains.
- The fixture splits proxy and target roots explicitly. Production's approved trust-role projection/persistence/resource inputs remain unresolved; these local arguments are not a new public resource contract.
- General multi-request Agent cancellation, queues, dispatcher reuse/capacity, target redirects, full Axios features, noProxy/native routing selection and managed invalidate joins are unproved. Probe cancellation directly shares one signal per Agent; production request ownership cannot assume that shortcut.
- The native plain-HTTP forward path through an HTTPS proxy is **not tested or fixed**, including any pre-pool connecting socket gap. Stop rather than silently broadening into a new HTTP agent.
- Detached callback exceptions, early remote end and naturally failing native destruction/release paths need independent assessment. The probe retains such errors in its code but only release-failure injection is observed; no fault matrix or production failure guarantee is inferred.
- The initial socket observation depends on the pinned `buildConnector` implementation's return value despite a void signature. Review that source/ownership seam before promotion; do not assume a future connector version exposes the same pending stream.
- Same-DN legacy ambiguity, all89 integration parity, #18 production, current-backup/platform and Core G trust acceptance remain separate and unclaimed.

**Frozen for independent review.** Oracle approval authorized this isolated probe only. Any promotion requires a new explicit production scope, trust-role decision and default-managed physical-settlement evidence; these positive primitives cannot clear the guard.

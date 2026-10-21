# Go relay benchmark candidate

Standalone `homarr-relay-v1` candidate. It does not replace the Bun relay or change deployment defaults. Requires Go 1.24 (built locally with Go 1.24.5); WebSockets use pinned `github.com/coder/websocket` v1.8.14.

```sh
cd apps/relay-go
GOTOOLCHAIN=local go build -o /tmp/homarr-relay-go .
HOST=127.0.0.1 PORT=8788 \
  RELAY_ALLOWED_ORIGINS=https://remote.homarr.test \
  /tmp/homarr-relay-go
```

Run the existing external smoke from the repository root:

```sh
bun apps/relay/scripts/smoke.ts http://127.0.0.1:8788
```

`HOST`, `PORT`, `RELAY_ALLOWED_ORIGINS`, `RELAY_REGISTRATION_TOKEN`, `RELAY_MAX_WORKERS`, `RELAY_MAX_CHANNELS_PER_WORKER`, `RELAY_MAX_CONNECTIONS`, `RELAY_MAX_CONNECTIONS_PER_IP`, and `RELAY_MAX_UPGRADES_PER_MINUTE` have the Bun entrypoint's names and defaults. Origins are exact matches; browser capability stays in its first WebSocket frame. Worker IDs are SHA-256 of the P-256 uncompressed public key; registration verifies the nonce-bound WebCrypto P1363 signature. The relay does not decrypt payloads, trust forwarded IP headers, or expose worker lists or metrics over HTTP.

Optional candidate tuning maps to Bun's internal relay options:

| Environment | Default |
| --- | ---: |
| `RELAY_MAX_PAYLOAD_LENGTH` | 1048576 |
| `RELAY_MAX_BUFFERED_BYTES` | 2097152 |
| `RELAY_MAX_MESSAGES_PER_SECOND` | 256 |
| `RELAY_MAX_BYTES_PER_SECOND` | 16777216 |
| `RELAY_HANDSHAKE_TIMEOUT_MS` | 5000 |

Compare matching limits and resource budgets. `GOMAXPROCS` can bound Go scheduler parallelism. Registration token configuration requires a worker transport that sends the authorization header; the existing external smoke assumes no registration token.

Focused candidate validation:

```sh
go test -race -count=1 -run 'TestIdentityIsolationAndReplacement|TestHandshakeSecurity|TestAdmissionPolicies|TestLimitsAndSlowReceiver|TestAdmissionAndFrameBounds' .
```

These checks cover nonce proof rejection, origin/query/token policy, channel isolation, generation replacement, capability rejection, binary frames, handshake timeout, channel/rate/global/IP/upgrade/worker/frame limits and bounded output. The external Bun smoke verifies WebCrypto interoperability. They do not establish whole-application capacity or production readiness.

Candidate differences to account for: output accounting includes the in-flight write and caps queued messages at 4096, making backpressure more conservative than Bun's socket-buffer accounting. A message or write has a 120-second deadline; control-frame-only traffic does not reset the Go message deadline. HTTP headers have a 5-second read deadline and 16 KiB limit. One mutex serializes routing and JSON envelope encoding; proof verification runs outside it. Shutdown explicitly closes all upgraded sockets. No cross-process registry, deployment wiring or production load validation is included.

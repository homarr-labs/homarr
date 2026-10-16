# Opaque relay implementation and evidence

The relay is an independent Hono/Bun service in `apps/relay`. It has no database,
Redis, Next.js runtime, OAuth dependency, dashboard assets, or application API
handlers. It multiplexes text frames between a user's outbound worker socket and
browser sockets. The application payload is encrypted by `@homarr/remote-protocol`
at the browser and worker; the relay has no content decryption key.

This follows the accepted trust model: the user trusts the published frontend
code. A malicious operator replacing that code could steal browser-side secrets.
Relay encryption does not remove that hosted-code trust. The relay can observe
worker identifiers, public signing keys, connection addresses, channel identifiers,
timing, and ciphertext lengths. It also sees the routing admission capability,
which is deliberately separate from worker authorization and E2EE credentials.
It can disrupt service or inject frames; endpoint cryptographic verification must
reject altered, replayed, and incorrectly authenticated application traffic.

No frame content, capability, credential, or key is logged or persisted. The only
startup log is the listening port. There is no public worker enumeration route.

## Wire contract

All identifiers, nonces, and routing capabilities are 32 random bytes encoded as
43-character base64url strings. Worker ID is the base64url SHA-256 digest of the
uncompressed raw P-256 public signing point, computed by the protocol package's
`getWorkerId` helper. Every worker registration requires a fresh P-256 proof.

1. Worker opens `GET /workers/:workerId` as a WebSocket, with no `Origin` header.
   A private relay can additionally require `Authorization: Bearer <registration
token>`.
2. Relay sends `{type:"challenge", nonce}`.
3. Worker responds with `{type:"register", publicKey, signature, capabilityHash}`.
   The ECDSA SHA-256 signature covers the UTF-8 encoding of
   `JSON.stringify(["homarr-relay-register-v1", workerId, nonce])`, using the exact
   protocol identity helpers. `capabilityHash` is base64url SHA-256 of the worker's
   routing capability. Worker ID and signing key must match.
4. Relay responds with `{type:"registered", workerId, generation}`. A replacement
   connection must prove the same private identity. It closes old browser channels
   and replaces the old worker generation. Old socket cleanup cannot evict the
   new connection.
5. Browser opens `GET /connect/:workerId` with an allowlisted `Origin`, then sends
   `{type:"connect", capability}` as its first WebSocket frame. Capabilities are
   never query parameters. URL queries are rejected before upgrade.
6. Relay validates the capability hash, responds with
   `{type:"connected", channelId, generation, maxPayloadLength}`, and notifies the
   worker with `{type:"channel.open", channelId}`. Worker authorization and E2EE
   handshaking occur inside this channel afterward.
7. Browser opaque text is forwarded to the worker as
   `{type:"channel.message", channelId, payload}`. Worker sends the same wrapper
   in reverse; the browser receives only the raw opaque text payload.
8. Worker can send `{type:"channel.close", channelId}`. Browser disconnection
   sends that message to the worker. Worker disconnection closes every browser
   channel. Keepalive `{type:"ping"}` receives `{type:"pong"}` on the worker socket.

Binary frames and malformed control frames are rejected. A worker cannot send to
another worker's channels. Relay generation changes require a fresh end-to-end
connection; application mutations must never be retried automatically.

## Admission and memory bounds

Default limits are 1 MiB per incoming text frame, 2 MiB of queued output per
socket, 256 frames and 16 MiB per second per socket, 5 seconds for the initial
handshake, 120 seconds of socket inactivity, 64 channels per worker, 1,000 workers,
4,096 total connections, 128 connections per source address, and 120 upgrade
attempts per source address per minute. Slow receivers are disconnected through
Bun's native backpressure limit and an explicit queued-byte check. The source
rate table is bounded and prunes idle entries. Compression is disabled.

The relay trusts the actual socket peer address, not forwarded headers. A TLS
reverse proxy therefore counts as one source. Configure
`RELAY_MAX_CONNECTIONS_PER_IP` and `RELAY_MAX_UPGRADES_PER_MINUTE` for that deployment,
and apply per-client connection limits at the trusted edge. These bounds limit
per-connection behavior; they are not a substitute for aggregate deployment memory
limits or volumetric denial-of-service protection.

Runtime settings: `HOST`, `PORT`, comma-separated `RELAY_ALLOWED_ORIGINS`, optional
`RELAY_REGISTRATION_TOKEN`, `RELAY_MAX_WORKERS`, `RELAY_MAX_CONNECTIONS`,
`RELAY_MAX_CHANNELS_PER_WORKER`, `RELAY_MAX_CONNECTIONS_PER_IP`, and
`RELAY_MAX_UPGRADES_PER_MINUTE`. Origins default to `https://remote.homarr.dev`.
Configure the actual independently hosted frontend origins when self-hosting.
Use WSS/TLS in production, including in front of a self-hosted relay. Direct or
Tailscale worker access can bypass this service entirely.

## Focused validation: 2026-10-16

- `mise exec -- bun test apps/relay/src/relay.test.ts`: **11 passed, 54 assertions**,
  using real Bun 1.4.2 WebSocket clients and a real Bun relay server. Covers
  bidirectional opaque multiplexing, disconnect cleanup, authenticated worker
  replacement, forged signatures and nonce replay, wrong routing capabilities,
  origin/registration policy, malformed/binary/expired handshakes, channel/rate/
  payload limits, cross-worker isolation, global/per-source admission limits, and
  a paused receiver overflowing its bounded output buffer.
- Relay TypeScript check, targeted oxlint, and oxfmt completed cleanly.
- `docker build -f apps/relay/Dockerfile -t homarr:relay-v2 .`: built the Bun 1.4.2
  distroless image. ID:
  `sha256:ac19da61081b9cc1a7d68e3de2c4f4d4be0bd9e3a501ce82bb8046a577bbc2d3`.
- Image size reported by `docker image inspect`: **94,785,844 bytes / 90.39 MiB**
  uncompressed. Application bundle: **28,222 bytes**. Bun binary: **79,500,640
  bytes**. There is no `/usr/local/bin/node` in the runtime image.
- Ran as UID/GID `65532`, read-only filesystem, all capabilities dropped, no-new-
  privileges, and a 64 MiB cgroup memory limit.
- `mise exec -- bun apps/relay/scripts/smoke.ts http://127.0.0.1:<mapped-port>`
  passed against the actual built container: readiness, signing-key worker proof,
  browser routing capability, and opaque WebSocket traffic in both directions.
- One post-smoke `docker stats` sample: **5.547 MiB** memory, **0.21%** CPU. This is
  a local small-session sample, not a production concurrency benchmark or worker
  memory measurement.

Relay routing tests deliberately use opaque synthetic text. They establish
transport isolation and limits, not the cryptographic security of the payload.
The protocol tests and full browser/worker integration must establish that separate
boundary. No external relay deployment or live GitHub OAuth interaction is claimed
by this relay validation.

Implementation references: [Bun WebSocket server lifecycle, limits, and
backpressure](https://bun.com/docs/runtime/http/websockets) and [Hono WebSocket
guidance](https://hono.dev/docs/helpers/websocket). HTTP health routes use Hono;
the upgrade/data lifecycle uses Bun's native server hooks to retain explicit
backpressure and connection bookkeeping.

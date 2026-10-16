# Blind relay encryption

The selected trust model is a blind relay with trusted published frontend code. The relay transports opaque frames. The browser and the user's worker decrypt them. A hosted frontend operator who replaces the JavaScript can access the browser's plaintext; this design does not claim protection against that operator.

## Identity and pairing

Each worker has a durable ECDSA P-256 signing key. Its stable worker ID is the base64url SHA-256 hash of its uncompressed public point. The worker persists its private JWK locally with private filesystem permissions; the hosted platform receives public identity information only. Device signing keys are nonextractable by default and can be stored as CryptoKey objects in IndexedDB.

The browser pins the worker signing public key from the locally acquired pairing fragment. An independently random 256-bit first-pairing secret is sent only inside the encrypted channel. The secret, worker key pin, relay routing capability, and grant have different purposes; knowing a worker ID or relay capability alone does not authorize backend requests. Secret lifecycle and grant revocation belong to `@homarr/worker-access`.

## Channel establishment

1. The browser generates fresh ephemeral P-256 ECDH keys and a random challenge. Its client hello includes the expected worker ID, challenge, and ephemeral public point.
2. The worker generates fresh ephemeral keys, a random challenge, and a random 256-bit session ID. Its durable signing key signs a fixed positional transcript containing the protocol version, worker ID, both challenges, both ephemeral public keys, session ID, and signing identity.
3. The browser compares the worker identity to its pin and verifies the transcript signature before transmitting any credential.
4. Both peers derive distinct browser-to-worker and worker-to-browser AES-256-GCM keys through HKDF-SHA-256. The transcript hash is the HKDF salt; direction-specific labels are the HKDF info.
5. The browser sends an encrypted key confirmation containing the credential, device public identity, and a device signature bound to this transcript. The worker verifies possession of that device key, checks the credential through its access controller, and sends an encrypted worker confirmation. HTTP messages are accepted only after this succeeds.

All primitives come from browser/Bun WebCrypto. Public P-256 points are validated by WebCrypto key import. No application-controlled elliptic curve arithmetic, passphrase-based encryption, or custom cipher is used. This is a new application protocol built from standard primitives; it has not received an independent cryptographic audit.

## Frames and streaming

An encrypted frame carries a protocol version, session ID, strict per-direction sequence, and ciphertext. AES-GCM authenticates the session, direction, sequence, and ciphertext with a 128-bit tag. Each direction uses a separate key and a 96-bit IV containing its monotonically increasing sequence. Sessions stop before 2^32 frames. Replay, reordering, reflection, altered metadata, and authentication failures close the channel. Reconnecting always performs a fresh handshake; mutation retries are never automatic.

The encrypted HTTP layer multiplexes request metadata, request chunks, response headers, response chunks, response completion, and cancellation. Both requests and responses use explicit pull credits so an idle consumer does not cause an unbounded stream to accumulate in the browser or worker. Cancellation aborts the worker Request and cancels its response reader. Current bounds are 1 MiB transport frames, 16 KiB handshakes, 48 KiB HTTP chunks, 16 concurrent requests per channel, and at most 4 MiB or 64 frames awaiting decryption per connection. The browser WebSocket output buffer is capped at 4 MiB; the shared worker relay socket must enforce its own aggregate buffer bound. HTTP bodies stream without a transport total-size cap; individual backend handlers retain responsibility for their own content and size limits. Worker authorization can have a separate public projection: private principals stay in the per-connection request context, while only the projected grant crosses back to the browser.

Browser request encoding does not depend on `Request.body`, which is unavailable in Firefox. GET and HEAD always use no body. For a URL plus an original BodyInit, one Response encoder supplies both the stream and its matching default content type, including multipart boundaries; explicit caller content types remain unchanged. A prebuilt Request whose body stream is unavailable is read through its native `blob()` method. That opaque-input fallback can materialize data in the browser; pass the URL and original BodyInit to preserve streaming for large uploads. No new backend buffering or upload-size cap is introduced. The 16-request limit is checked again after asynchronous preparation, so concurrent requests cannot race past it.

The relay still sees IP addresses, worker IDs, connection times, frame sizes, and traffic volume. TLS remains required for public deployment, and this protocol does not hide traffic metadata or guarantee availability against a malicious relay.

## Evidence

`bun test packages/remote-protocol/src/protocol.test.ts` passes 24 focused tests covering durable identity import/signing, wrong worker pins, transcript tampering, invalid public points, malformed/oversized handshakes, device confirmation replay, directional reflection, ciphertext/session/sequence tampering, reconnect replay, concurrent sequence ordering, multiplexed binary HTTP, encrypted credential/header/query content, stream cancellation, AbortSignal cancellation without mutation retry, authorization failure, HTTP before key confirmation, stream backpressure in both directions, a 256 MiB streamed upload with bounded transport chunks, early upload rejection with source cancellation and channel reuse, input queue overflow, browser WebSocket output buffer limits, missing Request.body support for GET/JSON/multipart/binary/opaque inputs, a 32 MiB streamed upload under that browser API limitation, and concurrent preparation preserving the request limit. Package TypeScript checking passes independently. These are protocol tests; root integration evidence must separately verify the actual relay, worker, browser, and platform paths.

## Primary sources

- [MDN Request.body](https://developer.mozilla.org/en-US/docs/Web/API/Request/body) and [Mozilla request-stream support tracking](https://bugzilla.mozilla.org/show_bug.cgi?id=1387483) record the browser API compatibility limitation addressed by the request encoder.
- [W3C Web Cryptography](https://www.w3.org/TR/webcrypto/) specifies the ECDSA, ECDH, AES-GCM, HKDF, key-import, and CryptoKey serialization primitives used here.
- [Native JavaScript base64 proposal](https://tc39.es/proposal-arraybuffer-base64/) documents the standardized native byte-array base64 conversion used when available, with a browser fallback.
- [Paseo low-order key advisory](https://github.com/getpaseo/paseo/security/advisories/GHSA-2xhx-c69r-qj4j) demonstrates why invalid peer keys cannot be accepted as authentication. This implementation uses validated P-256 points rather than accepting arbitrary Curve25519 inputs.

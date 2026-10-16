# Remote Homarr: architecture research

Research date: 2026-10-16. This note records source-backed design decisions, not implementation or production verification. Context7 was unavailable according to the user; official documentation and upstream source were checked with web search and Exa.

## Accepted trust model

The user selected **a blind relay with trust in the published frontend code**. The browser and the private worker are the data endpoints. The relay and hosted account service may know account identity, routing identifiers, connection times, IP addresses, and traffic sizes; they must not receive application plaintext or decryption keys. A malicious operator replacing the frontend JavaScript is outside this accepted model. The Web Cryptography specification explicitly treats script injection as a threat to web cryptography; cryptography does not make the executing application code untrusted. [Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/)

The resulting product can be:

```text
Published frontend, e.g. remote.homarr.dev
  ├─ account API: GitHub login, device metadata, routing settings
  └─ browser-held credentials and encryption
         │
         ├─ HTTPS/WSS direct: LAN / Tailscale / user reverse proxy
         │
         └─ WSS relay: opaque encrypted frames only
                       │ outbound connection
                 Hono + Bun worker
                   ├─ worker authorization and enrollment
                   ├─ oRPC / HTTP / MCP dispatch
                   ├─ integrations, widget data and subscriptions
                   └─ local database, secrets and runtime state
```

The account service is a control plane. It is not a reverse proxy that decrypts worker traffic. The worker stays authoritative for grants, resources and authorization. This separation is a proposed Homarr design, not a property obtained merely by choosing Hono or oRPC.

## Upstream patterns worth reusing

| Project     | Verified upstream behavior                                                                                                                                                          | Homarr implication                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| OpenChamber | Outbound relay connections; separate routing, encryption and multiplexing layers; pairing distributes the host encryption key; requests retain ordinary application authentication. | Keep transport and authorization independent. Use one shared client transport for direct and relayed requests.      |
| Paseo       | Optional relay with encrypted client/daemon traffic and direct connectivity as another option. Its documentation explicitly lists visible connection metadata.                      | Relay must be optional, with an actual direct-only mode and accurate privacy wording.                               |
| Tailscale   | Direct peer routing when possible; encrypted DERP forwarding when direct routing fails.                                                                                             | Tailscale bypasses Homarr infrastructure, but does not guarantee that no relay exists anywhere in the network path. |

Sources: [OpenChamber relay design](https://github.com/openchamber/openchamber/blob/main/packages/web/server/lib/relay/DOCUMENTATION.md), [Paseo security](https://github.com/getpaseo/paseo/blob/main/public-docs/security.md), [Tailscale routing](https://tailscale.com/docs/concepts/traffic-routing-through-tailscale).

OpenChamber's relay repository advertises an FSL license with a competing commercial relay restriction; use its published architecture as a reference and evaluate licensing before reusing implementation. The official Paseo relay is `getpaseo/paseo-relay`; similarly named third-party implementations should not be mistaken for the official one. [OpenChamber relay repository](https://github.com/openchamber/openchamber-relay), [official Paseo security documentation](https://github.com/getpaseo/paseo/blob/main/public-docs/security.md)

## Pairing, identity and encryption

### First launch and enrollment

Recommended worker behavior:

1. Generate a persistent worker identity signing key on first launch; protect its file with the worker's data-directory permissions.
2. Generate a separate cryptographically random 256-bit bootstrap secret. Print a one-time pairing URL or allow an explicit CLI command to display it. Normal HTTP requests must not be able to retrieve it.
3. Put the pairing secret and pinned worker public-key fingerprint in the URL fragment. Keep these values out of query strings, access logs, crash reporting, analytics and hosted session data. Fragments are processed by the user agent rather than sent as the resource identifier in the HTTP request. [RFC 3986, section 3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)
4. Establish the encrypted worker channel and verify its pinned identity before submitting the bootstrap secret. A relay-provided replacement public key is not a trust anchor.
5. Atomically consume the bootstrap secret and register the browser's device signing key with a worker-side owner grant. A second attempt fails, including a concurrent attempt.
6. For additional devices, create another expiring, single-use enrollment invitation inside the authenticated worker channel. Do not reopen the initial bootstrap automatically after restart.

GitHub login provides an account identity and convenient device discovery. It does **not** by itself authorize access to worker plaintext. If the platform can invent a new account/device grant and the worker accepts it without owner approval or a worker-issued invitation, the platform can access data as that device and the blind-relay promise is weakened. This is a design constraint derived from the chosen trust model.

### Primitive and protocol choice

For the requested small Bun/browser implementation, native WebCrypto avoids shipping another general crypto runtime. P-256 ECDH, ECDSA, HKDF-SHA-256 and AES-GCM are specified by WebCrypto. A practical implementation uses a persistent ECDSA worker identity, fresh per-connection ECDH keypairs, a signed handshake transcript, and separate derived AES-256-GCM keys for each direction. [Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/), [HKDF specification](https://www.rfc-editor.org/rfc/rfc5869)

The handshake transcript should bind the protocol version, worker identity, routing/session identifiers, both ephemeral keys, roles and fresh challenge nonces. Derivation labels must separate direction and protocol purpose. Frames need a unique nonce per key, authenticated session/version/counter metadata, strict replay rejection, bounded lengths, handshake timeouts and key rotation before counter exhaustion. Reconnecting creates a fresh handshake and keys. Noise formalizes transcript hashes, directional cipher states, nonce counters and channel binding; those concepts are useful review references. A custom WebCrypto protocol must not be advertised as a Noise implementation unless it actually implements a named Noise protocol. [Noise framework](https://noiseprotocol.org/noise.html)

An alternative is an established audited primitive library such as `@noble/curves` if browser/runtime compatibility requires it. Its documentation covers X25519 shared-secret derivation and warns that a KDF is needed. An audit of primitives does not establish the security of Homarr's new handshake or authorization composition. [noble-curves README](https://github.com/paulmillr/noble-curves)

A directly relevant caution exists in Paseo's published security advisory: low-order Curve25519 input produced a predictable shared key and allowed an attacker-controlled relay connection to gain daemon authority. The advisory identifies the fix in v0.5.0. If X25519 is used, reject invalid/low-order inputs and all-zero shared secrets before any application message; do not use ECDH completion alone as authorization. For P-256, require strict valid-key import and reject malformed/off-curve inputs. [Paseo GHSA-2xhx-c69r-qj4j](https://github.com/getpaseo/paseo/security/advisories/GHSA-2xhx-c69r-qj4j)

### Authentication inside the encrypted channel

The transport authenticates the worker and protects frames. The worker separately identifies a device or a share capability and evaluates its permissions for every operation. Do not inject the owner's session merely because traffic arrived through the tunnel. Restrict dispatch to the worker's known request paths and protocols; it must not become a generic HTTP forward proxy or localhost credential bypass. OpenChamber explicitly preserves ordinary request authentication through its relay tunnel, which is the pattern to follow. [OpenChamber relay design](https://github.com/openchamber/openchamber/blob/main/packages/web/server/lib/relay/DOCUMENTATION.md)

Use idempotency keys for retryable mutations. Losing a connection after a mutation was committed is not proof that the mutation failed. A reconnecting transport should not silently replay destructive operations.

## Accounts, sharing and public dashboards

Use GitHub OAuth authorization-code flow for hosted accounts, with random `state`, PKCE S256, a configured callback, a server-only client secret and identity revalidation after code exchange. GitHub supports and recommends PKCE; its documentation still requires the client secret for the OAuth app code exchange. Keep GitHub credentials in the control plane, never in a browser bundle or relay request. [GitHub OAuth documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [GitHub PKCE announcement](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/)

The following authorization model is a Homarr recommendation:

| User feature          | Worker-side representation                                                 | Essential enforcement                                                                      |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Owner access          | Registered device key and owner membership                                 | Device proves key ownership; worker checks current grant.                                  |
| Shared account access | Independent user/member and device grants                                  | Individual revocation and auditing, rather than sharing owner credentials.                 |
| Invite code           | Random one-time enrollment secret, short expiration, attempt limits        | Atomic redemption binds a specific device key and selected role.                           |
| Temporary URL         | Random capability; dashboard/resource scope; expiry; optional maximum uses | Scope and expiry checked on every operation and subscription emission.                     |
| Permanent URL         | Same capability without automatic expiration                               | Revocable and rotatable; never equivalent to an owner's session.                           |
| Anonymous dashboard   | Explicit public or bearer-link policy restricted to a dashboard            | Expose only a sanitized read projection; no integration credentials or general procedures. |

Store a hash of random bearer secrets in the worker database. Put the raw capability in a link fragment and transmit it only after verifying the worker inside the encrypted channel. Avoid embedding the capability in platform metadata. A short human-entered code needs a separate rate-limited exchange mechanism; it should not be treated like a 256-bit URL token.

Revocation must invalidate existing sessions and subscriptions, not only prevent new connections. Parent/member revocation should invalidate derived grants. The worker must enforce dashboard/resource scope both on the direct transport and relay transport. A share principal must not be able to call broader RPC methods by knowing their names.

Anonymous sharing is compatible with encrypted transport, but intentionally public content is readable by anyone holding its public URL, including an operator acting as an ordinary viewer. The confidentiality claim applies to private worker data and the relay's network view; it cannot hide intentionally published data from its intended audience.

Do not turn the first implementation into an LDAP directory. Platform account login, worker enrollment and resource grants are distinct responsibilities. OIDC federation could be added if there is a concrete need for third-party identity integration; the relay itself is not an identity provider.

## Direct connections and Tailscale

Keep a transport setting per worker: direct-only, relay-only, or explicitly permitted automatic selection. In direct-only mode, never silently fall back to Homarr infrastructure. Do not send credentials to a learned LAN address until the worker's pinned identity has been verified there; a DHCP address may now identify another machine.

For a hosted HTTPS frontend, prefer a valid HTTPS/WSS direct worker endpoint. Tailscale Serve can expose a loopback worker as an HTTPS service restricted to the tailnet; Funnel has different public-exposure behavior. Keep the worker enrollment requirement even if Tailscale already restricts network access. [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve), [Serve CLI](https://tailscale.com/docs/reference/tailscale-cli/serve), [mixed-content specification](https://www.w3.org/TR/mixed-content/)

Browser local-network policy is another independent constraint. Chrome replaced its earlier Private Network Access experiment with Local Network Access permissions; the official article records rollout in Chrome 142 and notes feature-specific limitations. Test direct connections in actual browsers, including denial, instead of assuming that successful command-line access proves browser connectivity. [Chrome local-network access](https://developer.chrome.com/blog/local-network-access)

## Platform framework choice

Both versions mentioned by the user are real current options: TanStack announced Start 1.0 stable on 2026-10-13, and Astro released 7.4 on 2026-10-15. These are release facts, not evidence that a particular Homarr implementation has been validated. [TanStack release](https://tanstack.com/blog/tanstack-start-1-0), [Astro 7.4 release](https://astro.build/blog/astro-740/)

Recommend **TanStack Start** for the account/device/connection application because the product is a stateful interactive workspace and Homarr already has React UI. This is an architectural judgment, not an upstream performance claim. Use client rendering for worker content: decrypt and dispatch from browser-only code, never hosted server loaders, SSR data, server functions, logs or analytics. Start documents SPA mode and explicit environment-specific functions, which provide the required boundary. Astro would also work with a client-side application island but offers less benefit for this primarily interactive workspace. [Start SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode), [Start environment functions](https://tanstack.com/start/latest/docs/framework/react/guide/environment-functions)

Keep frontend deployment independent from worker releases. Publish the transport protocol version and worker capabilities so another frontend can connect without importing worker implementation code. oRPC is the application contract; the encrypted channel is its transport. Do not equate oRPC with gRPC wire compatibility.

## Small worker and acceptance evidence

The target worker container should contain one Bun runtime or compiled Bun executable, required backend code, database migrations, CA certificates, and runtime assets actually used by backend features. No Next.js frontend assets, Node executable, build toolchains, package manager cache, general source checkout or compatibility service should be needed at runtime. Exact savings require measuring the produced image; an image-size estimate does not establish RAM consumption.

Do not reduce memory by dropping authorization, abandoning required integrations, or retaining hidden frontend services outside the measured container. Measure at least idle-before-requests, authenticated idle, representative active integrations/widgets, concurrent remote clients and reconnect/revocation. Report process RSS and container memory separately from image bytes; compare configurations with identical integration load and database/Redis conditions.

Completion evidence should include:

- Image/runtime inspection proving Bun-only execution and no accidental Node dependency, plus first-install migration, upgrade, CLI operations and backup recovery under Bun.
- Native oRPC endpoint inventory and confirmation that no legacy bridge/server remains in the worker path.
- Browser-to-worker pairing and authenticated requests through an instrumented relay that observes only ciphertext and necessary routing metadata.
- Relay corruption, replay, wrong worker key, expired/reused bootstrap, unauthenticated RPC, invalid public key, privilege escalation and share-scope rejection.
- Anonymous, temporary, permanent and invited access with expiry, single-use redemption, revocation of an active stream, restart persistence and multi-device use.
- Reconnect with fresh session keys, abrupt transport loss, bounded buffers/backpressure, cancellation, streaming and mutation retry behavior.
- Direct browser transport through valid HTTPS/WSS, explicit relay disablement, private-network denial handling and matching authorization semantics.
- Real GitHub OAuth callback verification with configured credentials; mocked OAuth alone does not prove an externally registered application works.
- Frontend, relay and worker deployed/running independently, with measured image bytes and memory figures for a stated workload.

These checks are proposed acceptance gates. This research note does not claim that they have passed.

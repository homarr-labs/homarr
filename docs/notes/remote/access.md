# Worker-owned access

The relay and GitHub account directory cannot authorize a worker. The worker trusts its own durable P-256 signing identity, device signatures verified inside the encrypted handshake, and grants issued by an existing worker owner.

## First launch

`WorkerAccess.open({ directory, identity })` initializes `access.sqlite` and a random 256-bit `pairing-secret` file. The directory is mode 0700; database and secret are mode 0600. The application must persist its supplied worker private identity with the same protection. The secret is local CLI/file output only and must never appear in health responses, server logs, relay messages, platform API calls, query strings, or HTTP paths.

The browser imports its own persistent non-extractable P-256 device identity. After verifying the pinned worker identity, the protocol encrypts and verifies a device-signed client confirmation. Only then may the worker call `authenticateEnvelope(verifiedDevice, { kind: "claim", secret })`. The worker atomically checks and consumes the initial secret, records the device, issues an owner grant and removes the plaintext pairing-secret file. Concurrent claim attempts across processes produce exactly one owner. Failed secrets cause persistent exponential backoff, capped at 30 seconds.

## Credentials

| Encrypted handshake credential | Meaning                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `{ kind: "claim", secret }`    | One-time initial worker ownership                           |
| `{ kind: "grant", token }`     | Signed grant bound to the confirmed device public key       |
| `{ kind: "invite", token }`    | One-time, owner-issued device invitation                    |
| `{ kind: "share", token }`     | Explicit bearer access to selected boards, always read-only |

Connection links carry `worker`, pinned `key`, `relay` or `direct`, and `claim`, `invite` or `share` in the URL fragment. Fragment handling must remove secrets from visible history after consumption. A public/anonymous board is an explicit bearer share link; unauthenticated requests do not become worker owners. Permanent links have null expiry and remain revocable. Temporary links expire at their exact stored timestamp. Invitation redemption and replay detection are transactional; invitations expire within seven days and can be revoked even after redemption.

An invitation enrolls one device. If its encrypted confirmation is lost, that same verified device can retry the exact invitation to recover its existing active grant. Recovery never creates another grant or enrolls another device. Revoked or expired invitations, child grants and issuing authorities still reject recovery.

Shares with `anonymous: false` are for worker members only. The encrypted device proof must match an already approved, currently valid device-bound grant; GitHub login or a platform account label is insufficient. Effective boards are the intersection of the share and the member's board permissions, and effective expiry is the earlier expiry. Revoking or expiring that membership immediately invalidates the private-share session.

Every issued grant, share and invitation records its issuing owner grant in `parentGrantId`, separately from the redeemed invitation ID in `parentId`. Children cannot outlive their issuer: a temporary owner requesting permanent children receives children capped at its expiry. Authentication and every active-session check walk the durable authority chain, rejecting revoked or expired ancestors, revoked redeemed invitations, cycles and chains exceeding 32 grants. Owners cannot revoke their own grant, an authority ancestor, or an invitation within their own authority chain.

## Authorization boundary

`authenticateEnvelope` returns a branded, immutable principal that only this running `WorkerAccess` instance can recognize. Never reconstruct a principal from request headers or JSON. Each procedure and control operation must call `authorizeProcedure` or `requireOwner` immediately before execution, including ongoing subscription emissions where revocation must take effect. These checks re-read expiry and revocation from durable storage.

`assertActive(principal)` performs the same durable validity check independently of a procedure and returns the current grant for session expiry timers or revocation scans. `listGrants`, `listInvitations` and `listShares` require an active owner and omit capability tokens. Share anonymity is retained in the signed and stored grant. `getPairingInfo()` is a local operator CLI helper, never an HTTP route; claimed workers return no bootstrap secret.

Owners can execute mutations and management operations, explicitly approve another owner device, grant bounded viewer access, link account labels, and sign a platform enrollment challenge. GitHub account IDs are labels only. A platform membership or session does not grant a worker capability, even if the platform calls the account an administrator or owner.

Viewers can only call the application's explicitly reviewed, sanitized board DTO read procedures for their exact board IDs. The defaults are `board.read`, `board.widgetData`, `remote.board` and `remote.widgetData`; the app can supply a smaller or revised trusted list. Do not allow entire query namespaces: read APIs can expose integration credentials or perform side effects. The worker resolves the board from its database and passes that trusted board ID to authorization; a caller-provided `boardId` header is insufficient. Raw integration settings, filesystem, Docker, task, custom widget configuration, MCP mutations and administration remain owner-only. Shared board/widget responses must exclude credentials and non-shared resource data.

Platform enrollment signs the canonical `@homarr/remote-platform/enrollment` message, binding worker ID/key to a single platform user, origin, challenge nonce and expiry. An owner must approve this through the encrypted session. Enrollment does not mint a worker grant. The platform cannot reuse the proof for another account or replace the worker key.

## Storage and recovery

The access database contains bearer capabilities and must be backed up as a secret alongside the worker private identity. It is protected by host filesystem permissions, not encrypted at rest; encrypting it with a key next to the same file would not protect a compromised host. SQLite uses durable transactions and a busy timeout. A worker identity mismatch fails closed. Losing all approved devices requires an explicit local recovery workflow; there is no platform override. Ownership transfer and local recovery are separate operator actions and must not bypass the authority checks of normal remote requests.

## Focused verification

Run `bun test packages/worker-access/src/access.test.ts`. Coverage uses real WebCrypto signatures and SQLite persistence: claim races, replay, wrong-secret backoff, device binding, signed-token tampering, restart, invitation replay/revocation, exact expiry, permanent-share revocation, member-only share enforcement, read-only and board boundaries, temporary-owner persistence attacks, revoked-issuer cascades, bounded delegation, ancestor revocation, forged principals, malicious header fields, platform account escalation and owner enrollment signatures.

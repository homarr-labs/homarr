# Separated worker and encrypted remote platform

## Goal

Deliver a small Bun/Hono worker with no Node runtime or legacy transports, a separate GitHub-authenticated remote frontend/platform, an optional blind encrypted relay or direct/Tailscale connection, safe first-launch enrollment, worker-owned account access, temporary and permanent sharing, anonymous dashboard shares, and invitation codes. Verify the actual system before completing the goal.

## Accepted trust model

The user trusts the published frontend code and requires the relay/platform to remain blind to private traffic. Browser and worker hold encryption/access keys. GitHub login identifies platform accounts but cannot independently authorize worker access. Intentionally public dashboard shares reveal their explicitly shared subset to any holder.

## Work streams

- Worker image/runtime: remove Node, Nginx, embedded Redis and unused package files; preserve migrations/backup/CLI.
- Native oRPC: replace tRPC-authored server runtime and bridge with canonical native procedures, metadata, MCP and REST.
- Protocol: pinned P256 signing identity, authenticated ephemeral ECDH, directional AEAD, replay protection, HTTP/stream multiplexing and cancellation.
- Relay: outbound worker WebSocket and opaque multiplexed browser channels, bounded resources, identity proof and reconnect cleanup.
- Worker access: atomic first-launch claim, device grants, scoped/revocable sharing and invitations enforced per operation.
- Platform: reuse Workshop PocketBase users and its configured GitHub provider; secure platform sessions, public worker metadata and account memberships without plaintext worker access. The user explicitly excluded live OAuth/deployment verification and selected `homarr.dev/remote/`.
- Frontend: separate TanStack Start SPA, browser-held credentials, connection/account/share controls and safe dashboard rendering.
- Integration: locked worker HTTP surface, encrypted control/API execution, local-first cache/runtime, actual transport/browser/container acceptance.

## Completion evidence

Final source and container verification passed. The new worker image is 128,682,138 bytes / 122.72 MiB, versus the 336.7 MiB baseline. The independent hosted frontend/platform is 91.20 MiB and the optional relay is 90.39 MiB. These are image storage figures, not RAM.

Actual final worker acceptance includes encrypted RPC, REST, MCP, separate relay access, raw-HTTP denials, backup export/mutate/restore with restart and retained identity/grants, SQLite and PostgreSQL migrations, and Bun CLI. Idle RAM samples were 7–12 MiB; the completed run reached about 85 MiB after board/widgets and 101 MiB after OpenAPI. Browser, protocol, access, local-state and platform evidence is linked from the final report. Live OAuth/deployment remains excluded by the user's instruction; no external cryptographic audit or all-provider/architecture coverage is claimed.

## Integration findings and decisions

- Canonical API migration preserved all 346 original procedure paths, operation kinds and schema counts; two safe widget display procedures bring the current inventory to 348. Compatibility remains an explicitly optional old-dashboard adapter, excluded from the worker bundle.
- The worker uses Bun SQLite and a bounded in-process state adapter. SQLite/PostgreSQL remain supported; Redis, Node and Nginx are absent from its runtime image.
- Pairing information is a local mode-0600 file. Raw HTTP serves health only; dashboard data, native RPC, REST, MCP, uploads and subscriptions require an authenticated encrypted channel.
- Independently reviewed private-share membership checks, ancestor revocation/expiry, strict streaming expiry, device proof and relay registration. Fixed issues before final acceptance. No external cryptographic audit is claimed.
- Built-SPA browser checks passed owner claim, retained browser device identity, signed platform enrollment, direct and relay reads, invitations, temporary/permanent/anonymous/private shares, reload, revocation and explicit direct switching during a relay outage.
- Encrypted media browser checks used real worker/media code. Images arrived through encrypted requests as bounded Blob URLs; URLs were revoked on board changes and access revocation.
- Native REST now shares smart query coercion and void-input normalization with the established backend behavior.
- Optional analytics and icon-catalog startup jobs now require `WORKER_RUN_OPTIONAL_JOBS=true`; ordinary scheduling and integration refresh remain available.
- The full dashboard image explicitly enables its legacy adapter. The worker image cannot enable or import it.
- Final source/image results and remaining scope boundaries are recorded in `report.md` and the per-stream evidence files.

## Guided demo follow-up

The user asked for a simpler explanation and an actual trial. Added an isolated one-command Docker demo, a short `/remote/try` guide, readable sample widgets and a private Tailscale HTTPS entrypoint. The report now starts with a short introduction and optional evidence links; its diagrams are embedded SVG rather than unrendered Mermaid source. Live demo and launcher acceptance are recorded in `demo.md`. Production Homarr and Workshop configuration/data remain separate from this trial.

Live feedback exposed two additional connection defects. Pending invitations now survive closing/reopening and refresh, and loaded invitations have a clear confirmation view. Enrollment recovery now persists device keys before authentication and grants before dashboard reads, with same-device idempotent invitation recovery and saved-access reconnects. An independent idle probe reproduced the original proxy closure at 94.98 seconds; the demo and hosted-relay proxy timeout was raised from 95 to 300 seconds. The private demo setup entry received a fresh direct-route invitation without revoking the user's existing access. Focused security and browser-fault results are in `demo.md`.

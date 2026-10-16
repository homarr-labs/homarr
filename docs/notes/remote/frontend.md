# Remote frontend

`apps/remote` is an independent TanStack Start SPA. Production serves only `dist/client`; the prerender/server build is a build-time artifact and is not needed in the runtime image. No Next.js app or Homarr backend implementation is imported by this frontend.

## Shape

The app is a worker console: a local worker roster, a live dashboard view, access management, and account settings. Mantine 9 provides the controls. Its white/lavender palette uses `#f5f7fd` paper, `#202b49` text, `#74809a` metadata, `#e2e7f1` borders, `#765bd8` Homarr accent, and `#287b69` verified connections. The connection line represents the browser/worker path and changes only after an authenticated connection succeeds. System Avenir/Segoe UI faces avoid third-party font requests. The mobile layout has a full-width navigation row and one-column forms, with visible focus and reduced-motion support.

Default hosting is `https://homarr.dev/remote/`. `VITE_REMOTE_BASE_PATH` changes the build-time path; use an empty value for standalone root hosting. Vite development proxies the matching `/remote/api` and `/remote/auth` prefixes to `REMOTE_PLATFORM_URL` (default `http://127.0.0.1:3104`). The platform's `REMOTE_PUBLIC_URL` must match the public browser URL including `/remote`.

## Identity and private access

The account card reuses the existing Workshop PocketBase `users` collection and configured GitHub provider. `/api/auth/config` supplies the Workshop API URL and bootstrap CSRF token. An existing default PocketBase auth store can refresh its account; otherwise the SDK opens the existing configured OAuth provider from the click handler. The PocketBase user token is exchanged with the platform for an HTTP-only session. No separate GitHub client configuration is introduced.

A platform account provides directory membership. Worker permission is independent: an initial owner claim, a device-bound worker grant, an invitation, or a read-only bearer share. The UI can enroll public worker details into the account directory only after the worker signs the platform's enrollment challenge through the encrypted channel.

Connection fragments contain a worker ID, a pinned ECDSA public key, a connection capability, and exactly one claim/invitation/share secret. Claim and invitation fragments are removed before account requests begin. Share fragments remain in the address bar so refresh and bookmarks keep working; browser HTTP requests use explicit API paths, a no-referrer policy, and no analytics. Pairing and worker credentials never enter a platform API body. Relay and direct WebSockets send the routing capability in an initial control frame, then use the authenticated encrypted protocol for all worker authorization and requests. Direct mode has no relay fallback. Non-loopback connections require HTTPS/WSS, including private Tailscale endpoints.

The browser stores non-extractable WebCrypto device keys and device grants with IndexedDB structured cloning. Anonymous shared dashboards keep their bearer capability in the URL fragment and tab state, without adding it to IndexedDB or localStorage. Shared links carry their access capability in the fragment, including a route and the pinned key, and require no platform session. Temporary links close their rendered connection at expiry. Private links can instead require an already-approved worker device; a platform login alone does not authorize them. Connection settings remain available while offline, allowing an explicit switch between relay and direct routes. Worker snapshots render plain React text and safe HTTP(S) application links; no worker-provided HTML is evaluated. Signed media paths are fetched only through the encrypted connection, displayed using Blob URLs, and revoked on board change, disconnect, or unmount. The page loads at most twenty media references with four concurrent requests and accepts bounded raster image responses. External image URLs are not fetched automatically.

## Worker UI contract

- `GET /remote/info`: `{workerId,name,claimed,role,grantId}`.
- `GET /remote/boards`: `{boards:[{id,name}]}`.
- `GET /remote/boards/:id`: `{id,name,apps:[{id,name,url}],widgets:[{id,title,kind,data}]}`.
- `GET /remote/access/grants`, `/shares`, `/invitations`: matching named arrays; lists contain no tokens.
- `POST /remote/access/shares` or `/invitations`: `{role,boardIds,expiresAt,anonymous,label}`; matching named issued object contains its token only inside this encrypted response.
- `DELETE /remote/access/{grants,shares,invitations}/:id`: revoke worker access.
- `POST /remote/platform-enrollment`: `{challenge}`, returning public worker keys/ID/signature for platform enrollment.

The dashboard is a small independent renderer. Applications open as safe links and widget data is displayed as text/JSON. It does not attempt visual parity with the original dashboard/widget library; importing those components would pull Next-specific UI dependencies back across the boundary.

## Focused verification

Commands completed successfully with the pinned Bun 1.4.2 runtime:

```sh
mise exec bun -- bun run --cwd apps/remote build
mise exec bun -- bun run --cwd apps/remote typecheck
mise exec bun -- bun x oxlint apps/remote/src apps/remote/vite.config.ts
```

The production static SPA was served by the real platform Hono application at `/remote/` for final acceptance. Browser sessions used isolated owner, second-account, and fresh anonymous contexts. A real migrated SQLite database supplied boards, application links, notebooks, clock data, and media widgets; the real source worker handled encryption, access checks, signed media, and requests. The relay used the production relay implementation. Identity was supplied by an isolated PocketBase auth-refresh contract fixture; no live GitHub OAuth or production identity configuration was changed.

| Flow                                | Observed result                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial owner pairing               | Worker pin verified; owner grant issued; initial secret file removed and pairing JSON no longer contains a claim secret.                                                                                                                        |
| Browser key persistence             | IndexedDB stores a non-extractable private CryptoKey; page reload and owner reconnect succeed.                                                                                                                                                  |
| Worker/account enrollment           | Worker signs the platform challenge through encryption; public directory entry appears.                                                                                                                                                         |
| Existing Workshop identity          | PocketBase SDK reuses the existing auth store, refreshes it, and exchanges the user token for the platform session.                                                                                                                             |
| Second account/directory invitation | One-use code adds the second fixture account as member; API reports `requiresWorkerGrant`, without granting worker access.                                                                                                                      |
| Viewer device invitation            | Invitation redeems to a device-bound viewer grant and displays only the selected board.                                                                                                                                                         |
| Viewer revocation                   | Owner revocation closes the active guest connection and clears the rendered dashboard.                                                                                                                                                          |
| Temporary anonymous share           | Fresh account-free browser reads only the selected board. A fifteen-second expiry fixture clears the view at expiry.                                                                                                                            |
| Permanent anonymous share           | `expiresAt:null`; fresh anonymous browser renders data over the relay, and full page reload/bookmark preserves access through its URL fragment.                                                                                                 |
| Private share                       | A fresh browser is rejected; an already-approved device opens the same link using its existing IndexedDB identity, with only the shared board.                                                                                                  |
| Relay/direct settings               | Settings persist both public directory metadata and local credentials. Real relay traffic renders real SQLite data.                                                                                                                             |
| Relay outage                        | Relay-mode reconnect fails while the direct worker health endpoint still returns 200; no fallback occurs. Offline Settings explicitly switches to direct mode and restores the dashboard.                                                       |
| Encrypted image delivery            | Real `ImageProxy` registers a local existing PNG, real board projection signs the media URL, and owner/anonymous views display a 100×100 Blob image through encryption. No browser HTTP request reaches `/media/` or the upstream image server. |
| Image cleanup and bound             | Blob URL is revoked on board change and share revocation; twenty-five actual media widgets yield twenty fetched/displayed Blob images.                                                                                                          |
| Share metadata cleanup              | Revoking worker access also marks its hosted directory pointer revoked.                                                                                                                                                                         |
| Narrow/mobile layout                | 390px viewport has 390px document width, useful errors, working modal controls/focus/escape, and no horizontal overflow.                                                                                                                        |

Private bootstrap links also work when opened into an already-running app tab. Claim/invitation fragments clear; share fragments remain for reload. Browser resource URL inspection found no capability or fragment in HTTP resource requests. No browser JavaScript runtime errors appeared in the accepted flows.

Screenshots and disposable fixtures are under `/tmp/homarr-remote-browser-qa/`; representative images are `real-relay-desktop.png`, `offline-direct-recovery-mobile.png`, `members-only-share-approved.png`, `members-only-share-rejected.png`, `temporary-share-expired.png`, and `encrypted-media-anonymous.png`. The fixture backend state is under `/tmp/homarr-remote-browser-real/`. These are local acceptance artifacts, not production deployment evidence.

The renderer intentionally provides plain widget display data and encrypted images rather than original dashboard visual parity or interactive widget actions. The browser coverage above does not establish compatibility with every third-party integration, real GitHub OAuth, external relay/Tailscale deployment, or ARM images; those are separate validation layers.

## Source references

Context7 was unavailable per the user. Framework setup was checked against [TanStack Start's official build guide](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch), [SPA mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode), and upstream Start examples. Mantine provider/shell conventions were checked against the official Mantine 9 documentation; no Mantine MCP connection was available. PocketBase sign-in follows [the official authentication guide](https://pocketbase.io/docs/authentication/) and the existing Workshop SDK usage.

## Invitation recovery follow-up — 2026-10-16

The reported initial transport drop could not be attributed conclusively. A separate retry failure was reproduced: opening a used invitation in an already-paired browser attempted to redeem it again instead of using the browser's saved device grant. New authorization was also previously saved only after dashboard reads, leaving a loss window.

The browser now defaults to reconnecting with a matching saved worker identity and device grant, while respecting the incoming link's explicit direct or relay route. An explicit invitation option supports access upgrades. IndexedDB version 2 preserves the existing workers store and adds a pending-device store containing only the worker pin and non-extractable device identity. Bootstrap device storage commits before authentication; issued grants commit before dashboard reads or stale-attempt dismissal. Failed grant writes retain the pending key and tab-local bootstrap for a safe, same-device invitation retry. Worker access idempotency is implemented separately and never grants a different device access to a consumed invitation.

Focused manual checks used the actual Docker demo behind Tailscale HTTPS with a separate one-hour QA invitation:

- Existing version-1 owner storage upgraded without losing access; an already-consumed invitation defaulted to saved-access reconnect and rendered four demo widgets over the direct route.
- Aborting pending-key storage produced the storage error before creating any WebSocket.
- Aborting the grant-save transaction after successful authentication retained one non-extractable pending device and the bootstrap, with no saved worker. Reloading and retrying the same invitation successfully recovered the original owner grant, rendered four widgets, and cleared pending state.
- An injected dashboard-list read failure after authentication still left the new owner grant durably saved. Reload and Open recovered the dashboard.
- The existing anonymous share still rendered four widgets in a separate browser.

The dedicated QA child grant was revoked through the original owner's UI; its active view cleared. The user's existing grant and fresh unused seven-day invitation were preserved. Focused frontend typecheck, lint, production build, and diff checks passed; no new test files were added.

## Firefox transport compatibility follow-up — 2026-10-16

The later report of raw `Remote transport closed` on pressing Open was reproduced in actual Firefox 146.0.1. Its native `Request.body` is `undefined` for both GET and JSON POST, while `Request.blob()` and `Blob.stream()` are available. The protocol client used `source.body !== null`, so a bodyless GET was marked as carrying a body. The worker correctly rejected that malformed GET after authentication, explaining why the grant and non-extractable key were already saved while the dashboard could not load. No worker authorization change was needed.

The protocol agent corrected client request encoding and added focused regression coverage. Only the platform/frontend image was redeployed; the worker, gateway, and relay stayed running. The exact failing Firefox profile and its existing saved grant were reopened, without pairing again: all four demo widgets rendered, no alert appeared, and the socket stayed open. The same Firefox session created and revoked a scoped anonymous share and an owner invitation using the real encrypted JSON POST/DELETE paths. Synthetic native Firefox FormData also preserved its bytes and content type through the Blob fallback. The user only needs to refresh their existing page and press Open.

The separate Firefox QA child was revoked after validation. The user's existing grant and invitation were untouched. The screenshot is `/tmp/homarr-remote-browser-qa/firefox-saved-open-after.png`; private QA browser state remains under `/tmp/homarr-firefox-transport-qa-profile` with mode 0700.

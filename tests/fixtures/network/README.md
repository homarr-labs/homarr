# Network integration contracts

These fixtures exercise Homarr's production integration factory and HTTP transport against a local HTTP service. They are protocol examples, not recordings or proof of compatibility with a named upstream release.

## Provenance

Baseline: Homarr commit `f9e67a41b6bffd4d82ce5491280c975059e23e63`.

- `wud-containers.json`: synthetic `sampleContainersResponse` from `packages/integrations/src/wud/test/wud-integration.spec.ts`. It distinguishes display names, update flags, and both remote-version representations.
- `gluetun-wireguard.json`: synthetic VPN/DNS status, public-IP, and `VPN_SETTINGS_PAYLOAD` examples from `packages/integrations/src/gluetun/test/gluetun-integration.spec.ts`. DNS status is deliberately changed to `stopped` so swapping VPN and DNS fields cannot pass.
- `gluetun-openvpn.json`: the same status/public-IP examples plus that file's `ALT_VPN_SETTINGS_PAYLOAD`. The old test called this a live `gluetun-latest` payload; no capture, digest, or upstream version accompanies it. Treat it as an inherited example, not verified live evidence. It includes nullable selections/addresses and list-valued listening ports.

Only dummy credentials and documentation-range IP addresses are used by the test journeys. Fixtures never contact their embedded addresses.

## Failures these journeys must detect

- Wrong factory registration, lost reverse-proxy subpaths, or missing/wrong Basic/API-key authentication before an actual HTTP server.
- WUD dropping updates, using the wrong version/name fallback, or exposing non-update containers as updates.
- Gluetun losing VPN/DNS/public-location/provider fields, or rejecting the nullable custom/OpenVPN payload.
- HTTP failures classified as parser failures or success, and malformed data classified as usable widget output. Gluetun failure journeys keep every sibling response valid so unrelated parse errors cannot satisfy the rejection assertion.
- Missing, extra, wrong-path or incorrectly authenticated requests must fail the service's completion assertion even when the client is expected to reject.

## Deliberate refresh

Do not regenerate expected widget outputs from production mapping functions. When a supported upstream protocol changes, capture a sanitized response from that specific release (record version and image digest when available), preserve significant null/absent/alternate fields, and review the fixture diff against that source. Then hand-review the small expected public output and the affected request contract. Until such a capture replaces these examples, retain the synthetic/unverified provenance above.

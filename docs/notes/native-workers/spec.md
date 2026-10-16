# Native Homarr workers

This specification records the user's implementation request, 16 October 2026.

## Required behavior

- Preserve a backend-only checkpoint before adding hosted account or frontend features. The independent backend runs Bun, Hono, and native oRPC v2; it must not require Next.js, a dashboard, or the replacement viewer.
- Host the normal Homarr frontend. Reuse its boards, layout editor, widgets, custom widgets, settings, management forms, and appearance. The earlier standalone viewer is not the requested frontend.
- Make workers a first-class part of setup and keep a small worker bar available inside Homarr. Users can connect multiple workers, choose a primary worker that owns boards, and use additional workers for integrations.
- Keep all private application requests between the browser and the selected worker encrypted. The published frontend code is trusted. The routing relay does not receive plaintext application data. Browser direct connections remain optional; global MCP uses the encrypted relay transport exclusively.
- Reuse Workshop's PocketBase identity and existing GitHub OAuth configuration. Organizations support isolated membership, invites, roles, and worker attachment. Directory membership alone does not bypass worker-owned authorization.
- Make integrations from other workers available to normal Homarr widgets and custom widget sources, with stable origin identifiers, scoped worker approvals, and correct native permissions. Keep credentials on their owning worker.
- Offer a global OAuth MCP endpoint that discovers the signed-in user's authorized workers and routes native tool calls to them over encrypted relay connections. The hosted MCP gateway is an explicitly approved service client and handles tool results; the relay remains blind.
- Preserve expiry, revocation, cancellation, organization isolation, per-worker cache isolation, and clear offline errors. Do not substitute another worker when one is unavailable.
- Provide independent frontend and worker containers and a simple local demo/deployment script. Preserve the user's working existing demo while building its native replacement. Do not deploy to homarr.dev or verify live GitHub sign-in.

## Agreed validation

The user approved focused public-boundary tests for worker connections, organization isolation/invites, cross-worker integration routing, and MCP authorization, followed by one full-suite run. Validate normal Homarr rendering and editing, custom widgets, worker switching, media, and management against the demo. Review standards and this specification in parallel after implementation. Commit work on the current feature branch.

## Completion

Do not mark the goal complete until native Homarr and independently launched headless workers work together across the required features. Keep implementation notes and concrete validation evidence in the scratchpad.

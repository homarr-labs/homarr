# Normal Homarr with independent workers

The frontend is the normal Homarr app: its board editor, widgets, Custom Widgets, settings, management pages, and appearance. A small bar at the bottom opens worker setup and switches the worker supplying the current boards. The earlier separate viewer is retained only for its existing demo.

## What runs where

| Service                | What it does                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal Homarr frontend | Serves the interface; your browser connects to workers. It can start without a database, Redis, or any worker.                              |
| Primary worker         | Stores your boards, settings, and local integrations; runs the Bun/Hono/oRPC backend independently.                                         |
| Additional workers     | Keep their integration credentials and execute requests for their services. The primary can use approved integration references from them.  |
| Account service        | Uses the existing Workshop PocketBase/GitHub identity for organizations, membership, and worker metadata.                                   |
| Routing relay          | Forwards encrypted messages between clients and workers. It does not decrypt application requests.                                          |
| Hosted MCP gateway     | An explicitly approved client of selected worker services. It handles authorized tool requests/results and always uses the encrypted relay. |

Browser keys stay in that browser. Each worker owns access decisions. Signing in or joining an organization does not independently grant private worker access. Device invitations can use an existing Homarr user's normal permissions; separate board-sharing links have read-only, selected-board scope.

## Try it

From this checkout, with Docker running:

```sh
bash scripts/native-demo.sh up
bash scripts/native-demo.sh pair primary
bash scripts/native-demo.sh pair integrations
```

Open the private setup link printed for the primary. It opens normal Homarr. Add the second link in **Worker setup**; your primary stays selected. To use the second worker's services, open **Integrations** and approve/import the selected services. They then appear in the normal widget integration picker.

The demo starts with sample data. Each worker keeps separate persistent storage. `bash scripts/native-demo.sh down` stops the demo while keeping its data and keys. See `deployments/native/README.md` for HTTPS and separate-host deployment.

## Checkpoint and compatibility

The backend-only checkpoint is `ffd6565d4`, tagged `checkpoint/headless-backend-20261016`. It excludes the hosted account platform and experimental viewer.

The canonical backend has 360 native procedures, including all 346 original procedure paths, plus the later safe display and worker/federation presentation endpoints. The existing native MCP catalog contains 133 tools. Backend dependencies are Bun 1.4.2, Hono 4.13.13, and oRPC 2.0.0-beta.44. Existing frontend hooks use a browser compatibility link; the worker wire protocol and server implementation use native oRPC.

The regular self-hosted frontend remains available. The worker container excludes Next.js, React, Node, embedded Redis, Nginx, and the legacy tRPC server. The normal hosted frontend still uses Next.js to serve the interface.

## Validation and limits

Chromium checks cover the actual native board editor, saving/reloading, board creation, integration creation/editing/deletion, immediate integration selection, Custom Widget creation/preview/placement/reload, and a 360px layout. Firefox checks cover persistent device access and native uploads with encrypted image previews. Final container, suite, and review results are recorded in the scratchpad as they finish.

The frontend and workers have separate image sizes and memory costs. The intermediate frontend image was 345.72 MiB; the intermediate worker was 122.83 MiB. These are storage figures, not RAM. Final image measurements belong to the final acceptance record.

The transport and caches have finite bounds. Browser requests share a bounded queue, with room reserved for ordinary requests while live subscriptions run. Media previews and hosted MCP requests/results have size limits. Dedicated service approvals expire and can be revoked. Credential-bearing legacy embed/timetable URLs fail closed in shared views; owner and native-user connections retain their normal behavior.

Live GitHub sign-in and production deployment to homarr.dev were explicitly excluded. The routing relay stays blind; the approved hosted MCP gateway sees the tool data it handles. No external cryptographic audit is claimed.

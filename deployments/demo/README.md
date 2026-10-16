# Try the headless Homarr demo

With Docker, Docker Compose v2, and a local Homarr source checkout, run this shell script from the repository root:

```sh
./deployments/demo/demo.sh
```

Docker starts a separate seeded Homarr worker, the remote frontend/platform, a blind relay, and a small gateway. Open the private link printed by the command and choose **Connect worker**. GitHub login is optional. The sample `Demo-dashboard` contains Homarr's existing mock apps and widgets; it does not connect to your real services.

The normal address is `http://localhost:43100/remote/`. Localhost supports the browser encryption APIs. For access from another device through Tailscale, expose this gateway on a separate HTTPS port:

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:43100
```

Use the HTTPS address Tailscale prints as the public origin:

```sh
./deployments/demo/demo.sh up --public-url https://your-tailnet-host:8443
```

This adds port 8443 without resetting other Tailscale Serve listeners; see the [Tailscale Serve reference](https://tailscale.com/docs/reference/tailscale-cli/serve). Existing HTTPS proxies can be used instead, forwarding WebSocket upgrades to the same local gateway. The gateway serves `/remote`, `/worker`, and `/relay`; no extra public ports are needed. The worker and browser establish an encrypted connection through the relay. The relay forwards encrypted frames and cannot read the dashboard data. A hosted frontend can be replaced without moving the private worker data.

```sh
./deployments/demo/demo.sh status
./deployments/demo/demo.sh pair
./deployments/demo/demo.sh down
```

`down` keeps the demo database and keys. Start again to resume it. After claiming, the original browser remembers its owner access; `pair` explains how to use that browser or an owner invitation. Choose `--name another-demo --port 43101` for a separate fresh instance. `reset --yes` permanently deletes only the selected demo's volumes.

Only Docker with Compose v2 is required. Existing local `homarr:worker-demo-local`, `homarr:remote-demo-local`, and `homarr:relay-v2` images are reused; missing images build from this checkout. The Nginx gateway image is pulled when missing. Demo state stays in Docker volumes named for `homarr-remote-demo-<name>`; the saved public URL/port live under the ignored `.state/` directory. Production Homarr and Workshop volumes are never mounted.

The remote frontend demonstrates the new headless API and selected widgets. It is not the complete existing Next.js dashboard UI. Workshop authentication still uses the configured PocketBase service; the demo never creates fake GitHub credentials or another authentication provider.

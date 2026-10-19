# Homarr with one main worker

Run the sample installation from the repository root:

```sh
bash scripts/native-demo.sh up
bash scripts/native-demo.sh pair primary
```

Open the printed private setup link. It opens Homarr and connects the main worker, which owns your dashboards, integrations, users and sharing. The demo includes sample data.

The frontend is at `http://localhost:43105/`. Use localhost on the computer running Docker. From another device, proxy the gateway with HTTPS, then start with its address:

```sh
bash scripts/native-demo.sh up --public-url https://your-tailnet-host:8445
```

Point that HTTPS proxy at `http://127.0.0.1:43105`. The proxy must support WebSocket upgrades. Existing installations and the earlier remote demo use different containers, volumes and ports.

`bash scripts/native-demo.sh down` stops this installation and keeps its data. Use `up --build` after changing the source. GitHub login uses the existing Workshop PocketBase provider; set `WORKSHOP_API_URL` when your Workshop account service has another address.

## Deploy without sample data

Use `compose.yml` alone. The demo script additionally loads `demo.yml`, which enables sample data on the main worker.

```sh
HOMARR_PUBLIC_URL=https://homarr.example.com \
HOMARR_PUBLIC_RELAY_URL=wss://homarr.example.com/relay \
docker compose -p homarr-native -f deployments/native/compose.yml up -d --build
```

The gateway serves the frontend at `/`, the account and MCP service at `/platform`, the relay at `/relay`, and the main worker at `/workers/primary`.

Keep the named volumes: `worker-primary-data` holds dashboards and integrations, `platform-data` holds account-directory and approved MCP state, and `broker-secrets` holds the encryption key for that MCP state. Back up the broker database and key together. Losing the broker key requires authorizing the affected worker connections again.

For PostgreSQL workers (`DB_DRIVER=node-postgres`), provide `SECRET_ENCRYPTION_KEY` on first start; use a new 64-character hexadecimal key only for a fresh database. Back up the persisted worker key (`/appdata/worker/secret-encryption-key` by default) with the database. If that key file is lost, restore the original key or supply it through `SECRET_ENCRYPTION_KEY` before starting; a new key cannot decrypt existing secrets. Startup stops when neither a persisted nor configured key is available.

The frontend stores its own device keys in the browser. A platform account or organization membership still requires worker approval before it can access private worker data. Hosted MCP access uses separately approved worker credentials; browser keys are not uploaded.

Manage users and sharing on the worker management page. A local invitation lets a member create a username and password on that worker without GitHub. Keep the worker's sign-in link for another browser; the administrator manages membership and sessions on the same page.

The sample worker disables internet requests. Its weather widgets use the browser instead. Outside the demo, enable `WORKER_ALLOW_BROWSER_WEATHER=true` alongside `NO_EXTERNAL_CONNECTION=true` to allow this. Only public Open-Meteo weather and air-quality requests use this path; the provider receives the widget location and browser IP.

When upgrading an earlier two-worker installation, stop and remove only its `worker-integrations` container. Keep `worker-integrations-data` for recovery; its data is not merged into the main worker. Existing primary-worker setup links and data continue to work.

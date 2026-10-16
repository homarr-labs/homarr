# Normal Homarr frontend with independent workers

Run the sample installation from the repository root:

```sh
bash scripts/native-demo.sh up
bash scripts/native-demo.sh pair primary
```

Open the printed private setup link. It opens the normal Homarr frontend and connects the primary worker. To add the other worker, run `bash scripts/native-demo.sh pair integrations` and open its link in the same browser. Both workers have sample data; use the primary worker for your dashboard and the other worker for additional integrations.

The frontend is at `http://localhost:43105/`. Use localhost on the computer running Docker. From another device, proxy the gateway with HTTPS, then start with its address:

```sh
bash scripts/native-demo.sh up --public-url https://your-tailnet-host:8445
```

Point that HTTPS proxy at `http://127.0.0.1:43105`. The proxy must support WebSocket upgrades. Existing installations and the earlier remote demo use different containers, volumes and ports.

`bash scripts/native-demo.sh down` stops this installation and keeps its data. Use `up --build` after changing the source. GitHub login uses the existing Workshop PocketBase provider; set `WORKSHOP_API_URL` when your Workshop account service has another address.

## Deploy without sample data

Use `compose.yml` alone. The demo script additionally loads `demo.yml`, which enables sample data on both workers.

```sh
HOMARR_PUBLIC_URL=https://homarr.example.com \
HOMARR_PUBLIC_RELAY_URL=wss://homarr.example.com/relay \
docker compose -p homarr-native -f deployments/native/compose.yml up -d --build
```

The gateway serves the normal frontend at `/`, the account and MCP service at `/platform`, the relay at `/relay`, and direct worker connections under `/workers/primary` and `/workers/integrations`. Each worker can instead run on its own machine. Keep its public connection address and the frontend origin configured on that worker.

Keep all four named volumes: each worker owns its dashboard and integration database, `platform-data` holds account-directory and approved MCP state, and `broker-secrets` holds the encryption key for that MCP state. Back up the broker database and key together. Losing the broker key requires authorizing the affected worker connections again.

The frontend stores its own device keys in the browser. A platform account or organization membership still requires worker approval before it can access private worker data. Hosted MCP access uses separately approved worker credentials; browser keys are not uploaded.

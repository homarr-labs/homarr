Connect one worker to an **existing** frontend and relay:

```sh
bash scripts/worker.sh up --frontend https://your-host:8445 --image homarr:native-worker-local
```

This experimental launcher needs a locally available worker image. If missing, it prints the build command. It starts one container, publishes no ports and keeps worker data in a named Docker volume. The frontend must serve the native frontend at `/` and the relay at `/relay`; use `--relay wss://relay-host/path` for a separate relay. No public frontend, relay or worker image is provided by this command.

The relay must have a WSS address reachable from the container. Loopback relay addresses point inside the container and are rejected. A loopback frontend requires an explicit reachable `--relay` URL. Startup checks the worker locally; open the setup link to verify the relay connection.

For a protected relay, provide `WORKER_RELAY_REGISTRATION_TOKEN` in the environment when starting. The launcher saves it in a private file and mounts it as a container secret. Configuration stays under `deployments/worker/.state/`.

`up` and `pair` print the private initial setup link only while the worker is unclaimed. Keep it secret. A claimed worker requires your saved owner connection, an owner invitation or local sign-in.

```sh
bash scripts/worker.sh status
bash scripts/worker.sh pair
bash scripts/worker.sh down
```

`down` preserves data and configuration. Use the same `--name NAME` on each command to manage another independent worker.

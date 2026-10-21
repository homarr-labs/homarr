Build the standalone worker from the repository root:

```sh
docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .
```

`worker` is this Dockerfile's default and only runtime target; `--target worker` also works. It uses the same assembler and lifecycle scripts as the root Dockerfile's `worker` target. The root Dockerfile additionally provides the compatibility `backend` target and defaults to the full dashboard `runner`.

The worker runs Bun/Hono with SQLite and in-process caching. It contains no dashboard, Node, nginx or Redis server. Persistent data and private identity/secrets live under `/appdata`; the worker defaults to UID/GID 1000.

Connect it to an existing frontend and relay:

```sh
bash scripts/worker.sh up --frontend https://your-host:8445 --image homarr:worker-mini-local
```

The launcher publishes no ports and retains data in a named Docker volume. For a separate relay, add `--relay wss://relay-host/path`. See [worker deployment](../../deployments/worker/README.md) for registration tokens, pairing and lifecycle commands. This builds a local image; it does not publish one.

Current image size and separate fresh/active/warmed RAM readings: [standalone worker measurements](../../docs/notes/remote/worker-memory-20261021.md).

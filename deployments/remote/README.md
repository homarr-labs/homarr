# Hosted remote frontend and platform

`Dockerfile.remote` builds the TanStack SPA and its small Hono account/directory service. The final image contains Bun and the assembled files, runs as UID/GID 65532, and starts one process on port 3104. Node and the workspace install remain in builder stages. Source-stage instructions match the main Dockerfile so BuildKit can reuse that install cache.

This service reuses the existing Workshop PocketBase `users` collection and its configured GitHub provider. It requires no new GitHub credentials, callback registration, PocketBase container, or access to worker secrets. `WORKSHOP_API_URL` identifies that existing public PocketBase service. Existing same-origin Workshop login can be reused; otherwise the client opens the existing PocketBase GitHub popup flow.

From the repository root:

```sh
docker compose -f deployments/remote/compose.yml build platform
docker compose -f deployments/remote/compose.yml up -d platform
```

The default public address is `https://homarr.dev/remote`. Mount the supplied `nginx.locations.conf` inside the existing website's TLS server, preserving its existing documentation and PocketBase API routes. The SPA build base path and `REMOTE_PUBLIC_URL` path must agree. For another path, change the Compose build argument before building. TLS terminates at the existing website proxy; platform ports bind only on host loopback.

The `platform-directory` volume persists connection settings, memberships, invitation/share metadata, and opaque session hashes. It is authoritative for that directory; PocketBase remains authoritative for user identity. Back up both existing PocketBase data and this volume. Dashboard data, integration credentials, worker private keys, and worker capabilities never enter this service.

The optional blind relay is enabled with:

```sh
docker compose -f deployments/remote/compose.yml --profile relay up -d --build
```

With the proxy snippet, its public URL is `wss://homarr.dev/relay`. `RELAY_ALLOWED_ORIGINS` uses the site origin, `https://homarr.dev`, without `/remote`. Optional `RELAY_REGISTRATION_TOKEN` restricts worker registration; supply the same token to enrolled workers through their local configuration. Relay tokens admit a socket and cannot decrypt traffic. The relay stores no persistent data. A direct Tailscale HTTPS connection does not need this service or the relay profile.

The image health check calls only its local `/remote/api/health` route. Startup and unauthenticated health/session/config checks do not contact PocketBase. Real sign-in validates an existing Workshop user token against PocketBase; production credentials and live external verification are outside this local packaging check.

The validated local image is **91.20 MiB** uncompressed. Its actual SPA/API, Bun-only nonroot runtime, metadata persistence, and existing Workshop token-exchange contract passed container checks with networking disabled. See [container validation](../../docs/notes/remote/platform-deployment.md) for the artifact ID, exact checks, and memory samples.

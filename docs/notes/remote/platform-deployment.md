# Remote platform container validation

The separate hosted frontend/platform image builds with `Dockerfile.remote` and reuses the existing Workshop PocketBase identity service. It contains the TanStack SPA and the Hono metadata API in one Bun process. It contains no Homarr integration worker, Node executable, shell, Redis, Nginx, or PocketBase server.

## Built artifact

Built locally on 2026-10-16 with:

```sh
docker build -f Dockerfile.remote --target remote-platform -t homarr:remote-platform-local .
```

| Property              | Verified value                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Image ID              | `sha256:b259d2a3b1a32d5daed94a51d925d71036f44e830c8a6be950fd54dc9f95bab9`                          |
| Docker image size     | **95,626,874 bytes / 91.20 MiB**, uncompressed                                                     |
| Runtime               | Bun **1.4.2**, distroless                                                                          |
| Runtime user          | UID/GID **65532:65532**                                                                            |
| Backend bundle        | **63 modules / 54.94 KB** in the container build                                                   |
| Frontend              | Built from the current `apps/remote` TanStack SPA sources; approximately **824 KiB** client output |
| Persistence           | `/appdata/platform.sqlite`, a metadata/session directory separate from Workshop PocketBase         |
| Public mount          | `https://homarr.dev/remote`                                                                        |
| Existing auth service | `WORKSHOP_API_URL=https://homarr.dev` by default                                                   |

The builder uses Node for the frontend toolchain; the final stage copies only Bun runtime files, the backend bundle, frontend assets, and a nonroot-writable data directory. Its source-stage instructions exactly match the main Dockerfile. The existing install cache needed refreshing once because manifests had changed; the resulting install stage is shared with the final worker build. No root manifests or lockfile were edited by this packaging task.

## Container checks

Both validation containers ran with `--network none`, so they could not contact live PocketBase, GitHub, or a deployment.

The default production-configuration container passed:

- `/remote/` HTML and its actual `/remote/assets/...js` module.
- HTTP 200 health, unauthenticated session, and public authentication configuration. The public config selected the existing `https://homarr.dev` Workshop service.
- JSON HTTP 404 for an unknown platform API route, preserving the SPA/API boundary.
- Image health check reached `healthy` with no failures.
- Runtime UID 65532, Bun version 1.4.2, and absence of `/usr/local/bin/node`, `/usr/bin/node`, `/bin/node`, and `/bin/sh`.

A second container used `WORKSHOP_API_URL=http://127.0.0.1:8090`. A temporary Bun HTTP server inside that same isolated container implemented only the existing PocketBase `POST /api/collections/users/auth-refresh` contract. The service validated a fixture Workshop account token and issued its opaque HttpOnly platform session. Its existing PocketBase record ID mapped directly to the cached platform identity. After restarting the container, the profile and authenticated session remained valid from SQLite. The normal restart took **0.35 seconds**. The fixture bearer/cookie test file was removed, followed by both task-owned containers and their anonymous volumes.

Observed `docker stats --no-stream` memory samples were **13.63 MiB** after the public shell/API smoke and **6.711 MiB** after the restart/session probe. These are single container memory observations, not controlled load, peak-memory, or worker-memory benchmarks. The image's **91.20 MiB** size is stored image content, not RAM.

## Configuration checks

- `docker compose -f deployments/remote/compose.yml config --quiet` passed, with and without the optional `relay` profile.
- `docker buildx build --check -f Dockerfile.remote .` completed without warnings.
- The supplied main-domain Nginx location snippet passed `nginx -t` inside the existing local headless image. `/remote` preserves its prefix for the platform; `/relay` is stripped before forwarding to the relay's `/workers` and `/connect` routes. Existing website/PocketBase routes stay outside these locations.

No image was published and no production configuration was changed. Actual external OAuth and live deployment checks were intentionally omitted at the user's request. Browser/worker encryption, capability enforcement, and dashboard rendering have their separate integration evidence.

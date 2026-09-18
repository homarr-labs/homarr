# Real-service statistics validation

This isolated Compose stack exercises the 24 new statistics providers against real service APIs. Each group owns its dependencies and named volumes; published ports bind only to localhost. It is a development harness, not a production deployment.

The combined stack is `compose.yaml`; individual groups can also be started using their `*.compose.yaml` files with the same project name, `homarr-stats-live`. Do not use `--remove-orphans` when operating a group. Current image versions and setup/validation constraints are recorded in each `*-results.md` file.

With the private env files already provisioned, start or validate the complete stack from the repository root with:

```sh
set -a
. /tmp/homarr-stats-live/content.env
. /tmp/homarr-stats-live/media.env
set +a
docker compose -p homarr-stats-live -f development/integration-stats/compose.yaml up -d
docker compose -p homarr-stats-live -f development/integration-stats/compose.yaml config --quiet
```

The private files must define these names: `HEALTHCHECKS_SECRET_KEY`, `HOMEBOX_API_KEY_PEPPER`, `KARAKEEP_DB_PASSWORD`, `KARAKEEP_MEILI_KEY`, `KARAKEEP_NEXTAUTH_SECRET`, `LINKWARDEN_DB_PASSWORD`, `LINKWARDEN_NEXTAUTH_SECRET`, `MINIFLUX_ADMIN_PASSWORD`, `MINIFLUX_DB_PASSWORD`, `TANDOOR_DB_PASSWORD`, `TANDOOR_SECRET_KEY`, `MEDIA_PLANTIT_DB_PASSWORD`, `MEDIA_PLANTIT_JWT_SECRET`, `MEDIA_ROMM_AUTH_SECRET`, `MEDIA_ROMM_DB_PASSWORD`, and `MEDIA_ROMM_DB_ROOT_PASSWORD`. Keep both files outside Git with mode `0600`.

Homarr runs from the current checkout on port 3138 with Mock disabled. The services run in Docker. Credentials and browser state live outside the repository in a private directory. The browser is used for service setup and to inspect the resulting real Homarr dashboard.

`validate.mjs` uses the authenticated Homarr HTTP API, not a provider substitute. For each private manifest entry it creates (or updates) an integration, runs Homarr's connection check, obtains its metric catalog, and forces a statistics refresh. It requires an authenticated browser-state file for the exact Homarr hostname. Failed connection checks and failed snapshots remain failures in its output.

```sh
node development/integration-stats/validate.mjs \
  /private/group.json /private/browser-state.json /private/group-results.json \
  http://localhost:3138
```

Manifest shape: an array of `{ kind, name, url, decryptedSecrets: [{ kind, value }] }`. The input manifest and browser state contain secrets; keep them out of Git. Results record actual metric values, connection outcomes, and timestamps. Image startup alone does not count as an integration pass.

The validation report in `docs/research/integration-statistics-live-validation.md` distinguishes passes, compatibility fixes, and external prerequisites. Your Spotify requires an actual Spotify application/account connection for a complete end-to-end check; a running empty container cannot prove that integration.

Compose file inclusion follows [Docker's include rules](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/), so each group's relative configuration paths resolve from its own file.

`seed-gallery.py <sqlite-database> <private-results-directory> [--board dashboard]` adds 11 Statistics comparison widgets to an existing development board, using the real integration IDs and metric catalogs in `*-results.json`. It backs up SQLite first, preserves other widgets, and replaces only its own `stats-demo-*` items when rerun. The base layout includes 1×2, 2×1, 2×2, 3×2, 3×6, 4×2, and 6×2 variants; narrower layouts stack them. Reload the board after seeding. Rows and card backgrounds are saved per widget, so configurations survive reload; the hover toolbar still provides temporary local overrides.

## Expansion and private portable pack

The `next-*.compose.yaml` files add Autobrr, Jackett, Jellystat (with Jellyfin), Komga, Tube Archivist, Scrutiny, Frigate, NetAlertX, Sonarr, Radarr, and Lidarr. Set their `NEXT_*_DATA_ROOT` variables to private local directories; new service data uses bind mounts. `seed-expansion.py` appends real validated sources and a Jackett widget to the existing gallery.

`export-pack.py` exports the running isolated Compose project and source into a private directory. **Stop the task's Homarr dev server before invoking it**, so the cold service data, SQLite backup, and Redis replication snapshot share a quiet export window; restart Homarr afterwards. The script restarts the integration containers in a `finally` block. Copy the final README/start script/login details and generate checksums before distributing. `restore-pack.py` is copied to the pack as `restore.py`: it checks digests, refuses existing data directories, and restores numeric ownership through an isolated Docker helper into local bind directories. Images are pinned Linux/amd64 references; Docker Desktop on ARM needs emulation.

NetAlertX runs the real backend only in this host's fixture; PHP-FPM fails regular-file reads even in an untouched image, so web UI operation is not claimed. All scanning plugins are disabled. Scrutiny and Frigate have no host disks or cameras. These boundaries are included in the private pack and report.

Focused reproducible verification (from repository root; load the isolated Homarr environment for transport/cache checks):

```sh
node development/integration-stats/verify-review.mjs
node --import tsx development/integration-stats/verify-transport.mjs
node --import tsx development/integration-stats/verify-dedup.mjs /private/next-arr.json
```

The first script checks parser/signal edge cases with isolated inputs. The transport script uses a local HTTP server; the dedup script forwards requests to the actual Sonarr in the supplied manifest and uses the configured Redis. Service validation and screenshots use real services, not a mock integration.

`verify-restored.mjs <restored-directory>` verifies credentials decrypted from the copied Homarr database against a separately restored stack. It expects `ports.json` mapping original published ports to the isolated stack's test ports; an unmapped integration is a failure. The clean restore passed all 34 configured integrations across 53 containers. Configuration file modes are recorded in `config-modes.json`, and variant-specific images are resolved to a generic amd64 manifest for portability.

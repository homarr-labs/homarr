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

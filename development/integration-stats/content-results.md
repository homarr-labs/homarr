# Live content service validation

Validated on 2026-09-18 with project `homarr-stats-live` and [content.compose.yaml](./content.compose.yaml). All published ports are bound to loopback (`23101`–`23108`). Credentials and API keys remain in `/tmp/homarr-stats-live/content.env` and `/tmp/homarr-stats-live/content.json` with mode `0600`.

| Provider | Image | Result |
| --- | --- | --- |
| Miniflux | `miniflux/miniflux:latest` | Ready. Browser-created API key; `/v1/feeds/counters` accepted `X-Auth-Token`. Root returned 200. |
| Homebox | `ghcr.io/sysadminsmedia/homebox:latest` (v0.26.2) | Ready. Added required API-key pepper and enabled local registration; browser-created account login returned 200. Fixed `totalTags`/`totalLabels` version compatibility; all six metrics pass through Homarr. |
| Karakeep | `ghcr.io/karakeep-app/karakeep:latest` | Ready. Browser-created account and API key; `/api/v1/users/me/stats` returned 200. |
| Linkwarden | `ghcr.io/linkwarden/linkwarden:latest` | Ready. Browser-created account and seven-day access token; collections and tags endpoints returned 200. |
| ChangeDetection | `ghcr.io/dgtlmoon/changedetection.io:latest` | PASS through Homarr with a browser-retrieved API key; two real watches returned. |
| Tandoor | `vabene1111/recipes:latest` | Ready. Corrected published mapping to container port 80 and added `ALLOWED_HOSTS=*`; browser-created superuser/API token; space and keyword endpoints returned 200. |
| Mealie | `ghcr.io/mealie-recipes/mealie:v2.8.0` | Ready. Browser-created household account; official token endpoint and `/api/households/statistics` returned 200. Seed backup import exposed an upstream v2.8.0 data conflict, so the account was created without seed data. |
| Healthchecks | `healthchecks/healthchecks:latest` | PASS through Homarr after setting a writable `DB_NAME`, creating an administrator and project API key, and pinging a real check. |

The initial Chrome image was blocked by a GCR billing gate; the compose now uses `browserless/chrome:latest` internally for both browser dependencies. Existing services in the shared compose project were reported as orphans and left untouched.

Final root validation: all eight content services passed Homarr connection, catalog, and refresh checks.

# Live media stats validation

Stack: `homarr-stats-live`, `development/integration-stats/media.compose.yaml`, loopback ports `23111`–`23118`.

Images were pulled from the published upstream registries on 2026-09-18. The stack uses only named volumes and loopback bindings. The exact image versions are available with `docker compose -p homarr-stats-live images`.

| Provider | Live result | Notes |
| --- | --- | --- |
| Maintainerr | Pass | `GET /api/storage-metrics` returned HTTP 200 and the expected `cleanupTotals` plus `collectionSummary.activeSizeBytes` fields. |
| FileFlows | Pass | `GET /api/status` returned HTTP 200 with queue, processing, processed, and empty formatted time fields. |
| Plant-it | Pass | The live Plant-it OpenAPI exposes bearer JWT authentication. The integration accepts username/password, logs in per request, and sends the returned JWT as `Authorization: Bearer`; authenticated `GET /api/stats` returned HTTP 200 with all four counters. |
| Stash | Pass | The official config paths were mounted, including `/root/.stash/stash-go.sqlite`, `/metadata`, `/blobs`, `/plugins`, and `/scrapers`. Stash migrated its fresh database successfully. A generated API key is configured privately and the provider sends the documented `ApiKey` header; GraphQL stats returned HTTP 200 with all nine zero counters. |
| Unmanic | Pass after provider fix | `GET /unmanic/api/v2/workers/status` returned HTTP 200 with `workers_status: []`. Current Unmanic requires the DataTables fields in the pending task POST body; the provider now sends those fields and the endpoint returned HTTP 200 with `recordsTotal: 0`. |
| xTeVe | Pass after onboarding | The documented API setting was enabled in the isolated config (API auth remains disabled). The real `POST /api/` status command returned HTTP 200 with version `2.2.0`; zero stream fields are omitted by xTeVe's `omitempty` response encoding, so the provider now defaults omitted counters to zero. |
| RomM | Pass | `GET /api/stats` returned HTTP 200 with `PLATFORMS`, `ROMS`, `SAVES`, `STATES`, `SCREENSHOTS`, and `TOTAL_FILESIZE_BYTES`, matching the provider's compatibility fallback. |
| Your Spotify | Blocked by external credentials | The real server starts, but its stats endpoints return HTTP 401 `NOT_LOGGED`. Completing this integration requires a real Spotify Developer client ID/secret and an authenticated listening account; no external credentials were invented. |

The private runtime values are in `/tmp/homarr-stats-live/media-secrets.json` with mode 600. No secrets are stored in this file or the repository.

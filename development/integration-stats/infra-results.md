# Live stats integration harness

Validated 2026-09-18 with project `homarr-stats-live`. The compose file publishes only loopback ports `23121` through `23128`, uses named volumes, and leaves the shared project running for Homarr validation.

| Integration | Image | Endpoint | Result |
| --- | --- | --- | --- |
| Caddy | `caddy:latest` | `/reverse_proxy/upstreams` | Raw HTTP HTTP 200; one live Gatus upstream, 0 requests, 0 failures. Current Caddy rejects Undici's `Sec-Fetch-Mode` metadata even with `same-origin`; the Homarr adapter needs a metadata-free server HTTP transport. |
| Gatus | `twinproduction/gatus:latest` | `/api/v1/endpoints/statuses` | HTTP 200; self and Prometheus checks report successful latest results |
| MySpeed | `germannewsmaker/myspeed:latest` | `/api/speedtests?limit=1` | HTTP 200; empty result on a fresh instance; no bandwidth test was triggered |
| Netdata | `netdata/netdata:latest` | `/api/v1/info` | HTTP 200; 0 warnings and 0 critical alarms |
| Prometheus | `prom/prometheus:latest` | `/api/v1/targets` | HTTP 200; Prometheus and Gatus scrape targets are active |
| Spoolman | `ghcr.io/donkie/spoolman:latest` | `/api/v1/spool` | HTTP 200; seeded one real PLA spool with 1000 g remaining |
| Trilium | `triliumnext/notes:latest` | `/etapi/metrics?format=json` | HTTP 200 with a real ETAPI token; version `0.95.0`, 417 active notes, database size 2453504 bytes |
| Syncthing Relay | `syncthing/relaysrv:latest` | `/status` | HTTP 200; 0 active sessions, 0 connections, 0 bytes proxied |
| Healthchecks | `healthchecks/healthchecks:latest` | `/api/v3/checks/` | HTTP 200 with the real project API key; one local check was pinged successfully |

Gatus monitors its own health endpoint and Prometheus readiness. Prometheus scrapes itself and Gatus. Caddy proxies the Gatus service and exposes its admin API on the assigned loopback port. The Caddy harness explicitly allows only localhost admin origins; this is required by current Caddy admin origin protection and keeps the endpoint local.

Trilium was initialized through the real browser setup flow and logged in using the local administrator account. Its ETAPI token is stored only in `/tmp/homarr-stats-live/infra-secrets.json` and the private manifest `/tmp/homarr-stats-live/infra.json`; neither file is tracked or printed.

Healthchecks required `DB_NAME=/data/hc.sqlite`; without it, the image defaulted to its read-only application directory and returned database-open 500s. The content compose definition now points SQLite at the existing writable named volume. A local administrator was created through `manage.py createsuperuser`, the project API key was issued from the real Settings UI, and the seeded `My First Check` ping endpoint returned HTTP 200.

The Caddy provider currently includes `mode: "same-origin"`, but current Caddy rejects all requests carrying Undici's `Sec-Fetch-Mode` metadata. A raw server HTTP transport is required for full Homarr validation; plain curl/raw HTTP succeeds, while `cors` and `same-origin` modes return 403 and `no-cors` returns 400.

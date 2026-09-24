# Local assistant API fixtures

Start manually with the QA app's local date:

```sh
BENCHMARK_DATE=2026-09-24 node tools/assistant-benchmark/server.mjs
```

The server listens only on `127.0.0.1:18094`, makes no outbound requests, and
rejects writes. It is not connected to CI. `/health` returns the fixture date
and method/path counters; it never logs request headers.

| Base path       | Supported GET paths                                            | Synthetic authentication                       |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `/sonarr`       | `/api/v3/series`, `/api/v3/queue`                              | `X-Api-Key: benchmark-sonarr-key`              |
| `/mealie`       | `/api/households/mealplans/today`, `/api/households/mealplans` | `Authorization: Bearer benchmark-mealie-token` |
| `/openlibrary`  | `/search.json`                                                 | None                                           |
| `/openmeteo/v1` | `/forecast`, `/search`                                         | None                                           |

These credentials are public dummy values, not real service keys. Configure
them only in isolated QA integrations. Custom Widget HTTP sources need
`networkScope: "loopback"`; do not relax production network policy.

Supported response subsets and provenance are documented in `server.mjs`.
This is not a full service emulator. Unknown paths return 404; unsupported
weather variables return 400. Library queries support `q`/`title`, `limit`,
`page`/`offset`, and `fields`. Weather supports Berlin/Paris geocoding and
Celsius/Fahrenheit forecasts. Mealie includes two meals today and one tomorrow.

Use the real Homarr assistant and renderer with these fixtures. A successful
mock response alone does not prove widget generation, saving, or rendering.

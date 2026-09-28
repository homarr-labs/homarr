# v2 integration readiness probe

This preserves the historical DNS client-primer comparison. The client primer itself was removed; the current follow-up uses server prefetch on a restored real-service board. Results are summarized in PR #6927, with raw artifacts kept outside the repository.

Compare the retained streaming image with a client-primer image using synthetic services through the production AdGuard and npm release adapters. Build images from the respective source revisions first; this runner does not build images.

```sh
V2_BEFORE_IMAGE=homarr:v2-board-stable-assistant \
V2_AFTER_IMAGE=homarr:v2-board-client-primer \
V2_READINESS_ROUNDS=3 \
node scripts/v2-integration-readiness/probe.mjs
```

Run from the checkout root after installing dependencies. Requires Docker, Playwright Chromium, and images with the seeded demo board and embedded Redis. `V2_READINESS_OUTPUT` overrides the default `benchmark-results/v2-integration-readiness` directory, which is created automatically. Use a fresh output directory to preserve earlier results.

The runner creates its own loopback-only containers and volumes, with two CPUs and 1 GiB each, and removes only those resources in `finally`. It relinks seeded DNS widgets to a local HTTP fixture and replaces the release repository with a local npm fixture. Authentication stays in memory; results contain timings and query status, without credentials or query data.

Each condition delays all three concurrent AdGuard endpoints by either 0 or 1,500 ms. Every cold sample uses a fresh authenticated browser context, Redis flush, and 11 seconds of L1 expiry. Image order alternates by round. Independent observers record first DNS values, app/bookmark content, and React attachment on all 63 seeded widgets.

`initialQueriesSettledDomMs` requires all 63 widgets attached, active initial widget/app/integration/docker queries successful and idle, DNS fixture values and the release version rendered, no generic loaders, and no Beszel chart skeletons for two animation frames. `genericLoadersClearedMs` is a separate weaker marker. The probe uses React fiber inspection to find the query cache; this is diagnostic instrumentation and may need adjustment after React/provider changes. It is specific to this seeded board, not a universal readiness contract. Successful query states do not validate every widget's displayed content or background subscriptions.

`results.json` records image IDs, source revision and dirty status, conditions and per-round measurements. `partial-results.json` preserves completed samples on failure. `completion-marker-diagnostics.json` records safe query/DOM diagnostics on timeout. There are no RAM measurements and this is not a real-service latency benchmark.

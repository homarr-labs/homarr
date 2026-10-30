# Worker demo refresh and local operation — 30 October 2026

The existing native demo was updated to the 119.79 MiB worker and a rebuilt normal Homarr frontend from commit `88c979d7c`. All five services are healthy at `https://brainzilla.llama-stonecat.ts.net:8445/`. Worker identity, connection capability, authentication secret and encryption key match the stopped-data backup; saved domain counts remain two boards, 71 items, 12 integrations and five users. No user boards, integrations, accounts or grants were removed.

## Current RAM

Thirty-second samples of the existing live deployment, with 31 samples per service/phase:

| Phase                                       | Worker Docker working set | Worker RSS | Frontend Docker working set | Frontend RSS |
| ------------------------------------------- | ------------------------: | ---------: | --------------------------: | -----------: |
| After restart, before QA connection         |                 21.13 MiB |  42.34 MiB |                   62.59 MiB |   111.20 MiB |
| Dashboard connected / management navigation |                122.54 MiB | 146.30 MiB |                  130.73 MiB |   185.99 MiB |
| After closing the QA browser                |                124.85 MiB | 149.00 MiB |                  153.80 MiB |   208.14 MiB |

Values are medians. Sampled working-set maxima were 132.11 MiB for the connected worker and 155.29 MiB for the connected frontend. The later frontend window is a later point in the same process lifetime, not evidence of a leak. These are separate accounting views; do not add RSS to Docker working set. The collector subtracts inactive file cache and does not inject a process into the service.

This is a short live-demo observation, not a controlled capacity test. Other user browsers were not controlled. Normal Compose healthchecks run additional short-lived processes. Optional worker jobs are off and provider outbound requests are disabled; 12 saved integrations do not mean 12 active upstream workloads. The deployment has no cgroup CPU or memory cap. Browser, relay, platform and gateway are excluded from both columns. The older [21 October fixture](worker-memory-20261021.md) had a different dataset, image and resource limits; differences are not an optimization/regression result.

[Raw phase samples, image identities, source hashes and functional proof](../../../benchmarks/worker-memory/results/2026-10-30/summary.json) are retained beside losslessly compressed samples. Image size remains storage: worker `sha256:1dc48229e15292320e23178aa28e2b825e36cf61d2cef99ba6d79b59ea93caf7` is 125,604,788 bytes; frontend `sha256:c7ba8839680ed7f855213690f325cdd499a13b5ee0fe27c87089d00f261c6ffb` is a separate image.

## What runs locally

| Mode                              | Available now                                 | Frontend server                                              |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Classic all-in-one                | Yes; root Dockerfile defaults to `runner`     | Next.js/Node in the full container                           |
| Local frontend plus local worker  | Yes; native Compose runs all services locally | Separate Next.js/Node container                              |
| Static frontend plus local worker | Not implemented                               | Would serve generated files without the resident Next server |

For an independent local sample on the computer running Docker, use the experimental branch:

```sh
HOMARR_NATIVE_WORKER_IMAGE=homarr:worker-mini-local \
  bash scripts/native-demo.sh up --name local --port 43106
bash scripts/native-demo.sh pair primary --name local
```

Open the printed private setup link in that computer's browser. The frontend is `http://localhost:43106/`; the fixed worker address is `http://localhost:43106/workers/primary`, and the relay and account service also run locally. Pairing pins worker identity and stores browser credentials; later visits reconnect automatically. A worker URL alone does not authorize access. Normal dashboards and local username/password accounts do not require GitHub or a hosted Homarr service. Use `compose.yml` without `demo.yml` for a deployment without the sample data; see [native deployment](../../../deployments/native/README.md).

The current frontend is **not a static export**: `next.config.ts` selects `output: "standalone"` and `Dockerfile.frontend` starts `node apps/nextjs/server.js`. Separating data access from the frontend did not remove its resident server. A static worker frontend build is a further change; it should retain the normal UI and encrypted worker contract while keeping the classic mode available. Next.js distinguishes [standalone servers](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) from [static exports](https://nextjs.org/docs/app/guides/static-exports).

## Verification and access

A temporary isolated browser opened the actual normal dashboard over encryption, visited Apps, Integrations and Worker management, then restored the saved connection after navigation. It had no page or transport errors and cleared the setup fragment/field. QA invitation/device authority was revoked and task files removed afterwards. Existing invitations had expired; a new seven-day private user setup page was issued without consuming it. Its URL and credentials are kept outside Git.

A stopped worker-data/key backup is retained privately for rollback. Only worker and frontend were replaced; gateway was restarted to refresh upstream resolution. Relay, account state and the older 8443 demo were preserved. Only the necessary frontend target was rebuilt; no source changes, new tests or broad suites were needed.

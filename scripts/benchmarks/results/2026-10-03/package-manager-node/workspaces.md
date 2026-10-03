# Node typechecks by workspace

Node 24.18 for both managers. Three trials per workspace: one first run and two incremental runs. Peak process RSS uses GNU time child accounting; it is not additive library runtime RAM. All 228 commands passed.

| Workspace                  | pnpm median s | Bun median s | pnpm peak RSS MiB | Bun peak RSS MiB |
| -------------------------- | ------------: | -----------: | ----------------: | ---------------: |
| apps/docs                  |         1.951 |        1.380 |             525.5 |            484.6 |
| apps/nextjs                |         3.063 |        2.678 |            1451.1 |           1444.1 |
| apps/tasks                 |         1.954 |        1.439 |             864.8 |            854.7 |
| apps/websocket             |         1.931 |        1.470 |             885.1 |            854.5 |
| packages/analytics         |         1.912 |        1.385 |             885.1 |            907.1 |
| packages/api               |         2.025 |        1.547 |             901.7 |            921.7 |
| packages/auth              |         1.168 |        0.746 |             465.3 |            461.3 |
| packages/boards            |         1.994 |        1.471 |             924.1 |            857.0 |
| packages/cli               |         1.934 |        1.477 |             899.3 |            876.8 |
| packages/common            |         0.904 |        0.508 |             292.0 |            306.9 |
| packages/core              |         0.701 |        0.260 |             157.6 |            156.1 |
| packages/cron-job-status   |         0.726 |        0.289 |             168.2 |            174.4 |
| packages/cron-jobs         |         1.920 |        1.476 |             865.1 |            866.7 |
| packages/cron-jobs-core    |         0.860 |        0.407 |             249.8 |            256.1 |
| packages/custom-widgets    |         0.939 |        0.500 |             300.3 |            294.5 |
| packages/db                |         1.984 |        1.505 |             913.8 |            870.7 |
| packages/definitions       |         0.731 |        0.306 |             170.2 |            178.5 |
| packages/docker            |         0.740 |        0.313 |             184.1 |            197.1 |
| packages/form              |         0.795 |        0.397 |             212.6 |            219.3 |
| packages/forms-collection  |         1.975 |        1.476 |             923.5 |            870.9 |
| packages/icons             |         0.871 |        0.432 |             256.0 |            258.0 |
| packages/image-proxy       |         0.968 |        0.505 |             326.6 |            345.3 |
| packages/integrations      |         1.229 |        0.822 |             493.9 |            486.3 |
| packages/modals            |         0.973 |        0.504 |             320.8 |            333.2 |
| packages/modals-collection |         1.936 |        1.525 |             897.1 |            869.7 |
| packages/notifications     |         0.761 |        0.304 |             175.9 |            185.4 |
| packages/onboarding        |         1.958 |        1.499 |             883.4 |            903.5 |
| packages/ping              |         0.790 |        0.358 |             219.1 |            223.2 |
| packages/redis             |         0.753 |        0.309 |             180.4 |            186.6 |
| packages/request-handler   |         1.186 |        0.765 |             478.0 |            525.0 |
| packages/server-settings   |         0.838 |        0.414 |             218.6 |            229.3 |
| packages/settings          |         0.917 |        0.501 |             300.4 |            321.1 |
| packages/spotlight         |         1.968 |        1.501 |             881.3 |            895.4 |
| packages/translation       |         0.850 |        0.453 |             247.1 |            260.1 |
| packages/ui                |         0.972 |        0.562 |             329.1 |            333.7 |
| packages/validation        |         0.871 |        0.431 |             239.4 |            243.8 |
| packages/widgets           |         2.001 |        1.416 |             919.6 |            947.7 |
| packages/workshop          |         0.656 |        0.194 |             139.5 |            138.9 |

## Package manager benchmark

Revisions: pnpm `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`, Bun `57955d9f5e6c5c80bded9dcf502a14aa71114af0`.
Versions: Node v24.18.0, pnpm 11.15.1, Bun 1.4.2.

Sequential paired trials; alternate manager order. Cold means empty task-owned package cache and node_modules, not a dropped OS page cache. GNU time reports maximum process RSS including child resource accounting, not the sum of simultaneously running processes. Full repository graphs differ with the migration.

Times below are medians of successful trials; failures are counted explicitly.

| Scope / command                                  | Manager | Passed / total | Median seconds | Range seconds | Peak RSS MiB (median) |
| ------------------------------------------------ | ------- | -------------: | -------------: | ------------: | --------------------: |
| apps/docs: workspace-build-first                 | bun     |          1 / 1 |         80.142 | 80.142–80.142 |                3281.8 |
| apps/docs: workspace-build-first                 | pnpm    |          1 / 1 |         81.416 | 81.416–81.416 |                3497.3 |
| apps/docs: workspace-build-repeat                | bun     |          2 / 2 |         27.787 | 25.558–30.016 |                1918.5 |
| apps/docs: workspace-build-repeat                | pnpm    |          2 / 2 |         27.280 | 27.064–27.496 |                1172.4 |
| competing-version: conflict-frozen-validation    | bun     |          3 / 3 |          3.613 |   3.330–3.782 |                  41.7 |
| competing-version: conflict-frozen-validation    | pnpm    |          3 / 3 |          7.311 |   7.263–7.450 |                 773.0 |
| competing-version: conflict-parent-lock          | bun     |          6 / 6 |          0.049 |   0.047–0.072 |                  43.7 |
| competing-version: conflict-parent-lock          | pnpm    |          6 / 6 |         17.025 | 16.952–17.078 |                1456.7 |
| competing-version: conflict-regenerate           | bun     |          3 / 3 |          0.050 |   0.050–0.051 |                  43.9 |
| competing-version: conflict-regenerate           | pnpm    |          3 / 3 |         17.151 | 16.876–17.340 |                1563.4 |
| different-workspaces: conflict-frozen-validation | bun     |          3 / 3 |          3.721 |   3.422–3.780 |                  41.5 |
| different-workspaces: conflict-frozen-validation | pnpm    |          3 / 3 |          7.454 |   7.325–7.634 |                 746.1 |
| different-workspaces: conflict-parent-lock       | bun     |          6 / 6 |          0.054 |   0.049–0.221 |                  48.6 |
| different-workspaces: conflict-parent-lock       | pnpm    |          6 / 6 |         17.129 | 16.662–28.328 |                1606.7 |
| different-workspaces: conflict-regenerate        | bun     |          3 / 3 |          0.055 |   0.054–0.056 |                  50.2 |
| different-workspaces: conflict-regenerate        | pnpm    |          3 / 3 |         17.240 | 17.206–17.361 |                1590.7 |
| packages/cli: workspace-build-first              | bun     |          1 / 1 |          0.157 |   0.157–0.157 |                 156.7 |
| packages/cli: workspace-build-first              | pnpm    |          1 / 1 |          0.814 |   0.814–0.814 |                 304.6 |
| packages/cli: workspace-build-repeat             | bun     |          2 / 2 |          0.156 |   0.152–0.159 |                 156.8 |
| packages/cli: workspace-build-repeat             | pnpm    |          2 / 2 |          0.803 |   0.799–0.807 |                 303.6 |
| repository: cache-archive                        | bun     |          1 / 1 |          8.948 |   8.948–8.948 |                  48.6 |
| repository: cache-archive                        | pnpm    |          1 / 1 |         10.239 | 10.239–10.239 |                  47.8 |
| repository: cache-restore                        | bun     |          3 / 3 |         10.103 |  9.609–10.233 |                   7.1 |
| repository: cache-restore                        | pnpm    |          3 / 3 |          8.256 |   7.987–8.648 |                   7.1 |
| repository: install-cold                         | bun     |          3 / 3 |          8.096 |  7.539–10.239 |                 595.7 |
| repository: install-cold                         | pnpm    |          3 / 3 |         30.805 | 28.461–35.803 |                1540.4 |
| repository: install-no-op                        | bun     |          3 / 3 |          0.099 |   0.097–0.104 |                  41.8 |
| repository: install-no-op                        | pnpm    |          3 / 3 |          0.528 |   0.523–0.536 |                 147.4 |
| repository: install-restored-offline             | bun     |          3 / 3 |          3.650 |   3.597–4.399 |                  49.4 |
| repository: install-restored-offline             | pnpm    |          3 / 3 |          8.539 |   8.355–8.957 |                 723.0 |
| repository: install-warm                         | bun     |          3 / 3 |          4.021 |   3.895–4.045 |                  49.4 |
| repository: install-warm                         | pnpm    |          3 / 3 |          6.933 |   6.869–7.335 |                 721.0 |
| repository: install-warm-ignore-scripts          | bun     |          3 / 3 |          4.192 |   4.142–4.399 |                  40.7 |
| repository: install-warm-ignore-scripts          | pnpm    |          3 / 3 |          5.834 |   5.831–6.018 |                 736.4 |
| repository: repository-format                    | bun     |          3 / 3 |          0.193 |   0.193–4.529 |                 108.6 |
| repository: repository-format                    | pnpm    |          0 / 3 |              — |             — |                     — |
| repository: repository-lint-cached               | bun     |          2 / 2 |          0.212 |   0.199–0.225 |                 101.5 |
| repository: repository-lint-cached               | pnpm    |          2 / 2 |          0.697 |   0.688–0.705 |                 138.5 |
| repository: repository-lint-first                | bun     |          1 / 1 |          6.879 |   6.879–6.879 |                 302.2 |
| repository: repository-lint-first                | pnpm    |          1 / 1 |         16.062 | 16.062–16.062 |                 330.1 |
| repository: request-handler-retention            | bun     |          3 / 3 |          0.568 |   0.556–0.587 |                 147.8 |
| repository: request-handler-retention            | pnpm    |          3 / 3 |          2.386 |   2.359–2.582 |                 222.8 |
| same-workspace: conflict-frozen-validation       | bun     |          3 / 3 |          3.830 |   3.429–3.867 |                  41.6 |
| same-workspace: conflict-frozen-validation       | pnpm    |          3 / 3 |          7.364 |   7.193–7.494 |                 760.8 |
| same-workspace: conflict-parent-lock             | bun     |          6 / 6 |          0.049 |   0.047–0.052 |                  43.7 |
| same-workspace: conflict-parent-lock             | pnpm    |          6 / 6 |         17.090 | 16.771–17.495 |                1593.5 |
| same-workspace: conflict-regenerate              | bun     |          3 / 3 |          0.050 |   0.049–0.050 |                  43.8 |
| same-workspace: conflict-regenerate              | pnpm    |          3 / 3 |         17.003 | 16.879–17.137 |                1629.6 |
| tools/mysql-to-sqlite: tool-help                 | bun     |          3 / 3 |          0.058 |   0.056–0.074 |                  44.5 |
| tools/mysql-to-sqlite: tool-help                 | npm     |          3 / 3 |          0.087 |   0.086–0.089 |                  69.4 |
| tools/mysql-to-sqlite: tool-install-cold         | bun     |          3 / 3 |          0.073 |   0.059–0.084 |                  28.4 |
| tools/mysql-to-sqlite: tool-install-cold         | npm     |          3 / 3 |          0.592 |   0.574–0.601 |                 111.0 |
| tools/mysql-to-sqlite: tool-install-no-op        | bun     |          3 / 3 |          0.008 |   0.008–0.008 |                  17.9 |
| tools/mysql-to-sqlite: tool-install-no-op        | npm     |          3 / 3 |          0.282 |   0.282–0.283 |                  93.3 |
| tools/mysql-to-sqlite: tool-install-warm         | bun     |          3 / 3 |          0.013 |   0.012–0.015 |                  18.2 |
| tools/mysql-to-sqlite: tool-install-warm         | npm     |          3 / 3 |          0.427 |   0.426–0.431 |                 103.4 |
| tools/v2-showreel: tool-build                    | bun     |          3 / 3 |          0.090 |   0.089–0.090 |                  64.0 |
| tools/v2-showreel: tool-build                    | npm     |          3 / 3 |          0.186 |   0.182–0.192 |                  69.4 |
| tools/v2-showreel: tool-install-cold             | bun     |          3 / 3 |          0.663 |   0.658–0.674 |                  67.2 |
| tools/v2-showreel: tool-install-cold             | npm     |          3 / 3 |          5.606 |   5.571–5.678 |                 279.1 |
| tools/v2-showreel: tool-install-no-op            | bun     |          3 / 3 |          0.008 |   0.008–0.009 |                  18.1 |
| tools/v2-showreel: tool-install-no-op            | npm     |          3 / 3 |          0.302 |   0.295–0.304 |                  94.7 |
| tools/v2-showreel: tool-install-warm             | bun     |          3 / 3 |          0.231 |   0.230–0.231 |                  18.3 |
| tools/v2-showreel: tool-install-warm             | npm     |          3 / 3 |          5.278 |   5.248–5.323 |                 350.2 |

## Workspace typecheck memory and time

First run: one trial per manager script. Incremental: two trials per manager script. RSS is maximum process RSS; library workspaces do not have independent production processes.

| Workspace                  | First seconds pnpm / Bun | First peak MiB pnpm / Bun | Incremental median seconds pnpm / Bun | Incremental peak MiB pnpm / Bun | Passed / total |
| -------------------------- | -----------------------: | ------------------------: | ------------------------------------: | ------------------------------: | -------------: |
| apps/docs                  |            14.34 / 13.47 |         1418.65 / 1444.81 |                           1.96 / 1.21 |                 522.38 / 490.42 |          6 / 6 |
| apps/nextjs                |            41.36 / 41.36 |         5374.05 / 5357.43 |                           3.16 / 2.73 |               1427.51 / 1393.38 |          6 / 6 |
| apps/tasks                 |            35.15 / 34.22 |         3627.98 / 3665.95 |                           1.96 / 1.47 |                 847.86 / 856.71 |          6 / 6 |
| apps/websocket             |            35.26 / 34.97 |         3692.20 / 3761.28 |                           2.00 / 1.50 |                 860.74 / 854.63 |          6 / 6 |
| packages/analytics         |            35.11 / 34.69 |         3747.41 / 3812.54 |                           2.05 / 1.45 |                 887.06 / 869.99 |          6 / 6 |
| packages/api               |            35.79 / 34.35 |         3781.85 / 3935.14 |                           2.10 / 1.54 |                 932.91 / 908.53 |          6 / 6 |
| packages/auth              |            13.76 / 13.06 |         1485.18 / 1436.16 |                           1.19 / 0.69 |                 465.31 / 461.17 |          6 / 6 |
| packages/boards            |            35.13 / 33.98 |         3811.98 / 3691.11 |                           2.00 / 1.50 |                 894.41 / 872.17 |          6 / 6 |
| packages/cli               |            34.20 / 34.67 |         3789.33 / 3799.02 |                           1.98 / 1.48 |                 856.90 / 845.72 |          6 / 6 |
| packages/common            |              1.04 / 0.54 |           326.45 / 328.27 |                           0.91 / 0.45 |                 290.09 / 298.57 |          6 / 6 |
| packages/core              |              0.82 / 0.30 |           194.20 / 192.27 |                           0.71 / 0.22 |                 156.66 / 157.95 |          6 / 6 |
| packages/cron-job-status   |              0.80 / 0.33 |           206.31 / 196.25 |                           0.75 / 0.27 |                 166.13 / 176.39 |          6 / 6 |
| packages/cron-jobs         |            35.26 / 34.46 |         3798.77 / 3754.70 |                           1.94 / 1.48 |                 873.27 / 837.68 |          6 / 6 |
| packages/cron-jobs-core    |            12.40 / 11.95 |           864.02 / 883.80 |                           0.87 / 0.40 |                 244.59 / 249.89 |          6 / 6 |
| packages/custom-widgets    |            12.38 / 11.91 |           883.51 / 875.56 |                           0.94 / 0.46 |                 281.07 / 288.15 |          6 / 6 |
| packages/db                |            35.75 / 35.14 |         4073.02 / 4065.83 |                           2.00 / 1.52 |                 882.18 / 892.43 |          6 / 6 |
| packages/definitions       |            12.29 / 11.95 |           631.89 / 633.06 |                           0.75 / 0.28 |                 166.03 / 172.47 |          6 / 6 |
| packages/docker            |            11.71 / 11.19 |           504.20 / 521.92 |                           0.76 / 0.31 |                 183.03 / 189.64 |          6 / 6 |
| packages/form              |              1.58 / 1.07 |           408.04 / 409.86 |                           0.82 / 0.35 |                 210.73 / 221.88 |          6 / 6 |
| packages/forms-collection  |            34.27 / 34.86 |         3777.48 / 3807.03 |                           1.99 / 1.48 |                 875.46 / 890.20 |          6 / 6 |
| packages/icons             |            12.57 / 12.15 |           901.25 / 893.63 |                           0.86 / 0.40 |                 253.79 / 254.01 |          6 / 6 |
| packages/image-proxy       |              1.09 / 0.65 |           383.71 / 371.67 |                           0.95 / 0.53 |                 327.65 / 337.36 |          6 / 6 |
| packages/integrations      |            13.69 / 13.17 |         1547.58 / 1484.85 |                           1.25 / 0.81 |                 481.02 / 495.07 |          6 / 6 |
| packages/modals            |            14.01 / 13.49 |         1466.77 / 1424.99 |                           0.95 / 0.50 |                 317.70 / 321.89 |          6 / 6 |
| packages/modals-collection |            34.55 / 33.37 |         3639.54 / 3753.97 |                           1.96 / 1.48 |                 877.17 / 843.15 |          6 / 6 |
| packages/notifications     |              0.82 / 0.32 |           191.16 / 197.55 |                           0.77 / 0.30 |                 177.81 / 182.89 |          6 / 6 |
| packages/onboarding        |            34.83 / 34.21 |         3729.95 / 3631.50 |                           1.96 / 1.45 |                 884.40 / 902.59 |          6 / 6 |
| packages/ping              |              0.91 / 0.40 |           249.77 / 257.25 |                           0.80 / 0.33 |                 214.34 / 218.23 |          6 / 6 |
| packages/redis             |              0.81 / 0.33 |           202.75 / 216.20 |                           0.74 / 0.29 |                 181.47 / 183.30 |          6 / 6 |
| packages/request-handler   |            13.95 / 13.16 |         1450.98 / 1549.62 |                           1.25 / 0.72 |                 485.84 / 492.07 |          6 / 6 |
| packages/server-settings   |            12.30 / 11.85 |           572.35 / 574.91 |                           0.82 / 0.37 |                 217.61 / 222.89 |          6 / 6 |
| packages/settings          |            13.18 / 12.74 |          987.30 / 1068.62 |                           0.96 / 0.50 |                 306.38 / 310.83 |          6 / 6 |
| packages/spotlight         |            35.12 / 35.50 |         3652.80 / 3858.52 |                           1.98 / 1.51 |                 892.51 / 867.55 |          6 / 6 |
| packages/translation       |              1.53 / 0.99 |           383.09 / 431.59 |                           0.89 / 0.41 |                 252.53 / 257.73 |          6 / 6 |
| packages/ui                |            14.87 / 14.38 |         1540.13 / 1377.43 |                           0.97 / 0.53 |                 325.07 / 331.17 |          6 / 6 |
| packages/validation        |            12.28 / 11.88 |           646.82 / 664.04 |                           0.85 / 0.39 |                 231.11 / 237.41 |          6 / 6 |
| packages/widgets           |            35.40 / 34.93 |         3886.34 / 3871.78 |                           2.00 / 1.46 |                 900.76 / 894.43 |          6 / 6 |
| packages/workshop          |              1.19 / 0.66 |           328.32 / 344.93 |                           0.65 / 0.18 |                 139.20 / 138.09 |          6 / 6 |

## Disk and sharing

Sizes deduplicate hardlinks by device/inode and include directory blocks. Cache archives use local tar/zstd; restore timings exclude network transfer.

- pnpm: modules 2124.3 MiB; cache 2093.1 MiB; combined unique-inode allocation 2229.7 MiB.
- bun: modules 2397.3 MiB; cache 2378.1 MiB; combined unique-inode allocation 2485.0 MiB.
- pnpm lock: 940,027 bytes, 26,484 lines.
- bun lock: 665,262 bytes, 6,405 lines.
- pnpm react: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- pnpm @mantine/core: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- bun react: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- bun @mantine/core: 4 workspace probes, 1 distinct resolved paths, 0 errors.

## Conflict resolution

Measured policy: merge both manifest additions; choose the right-hand version for a competing dependency; regenerate from the left lock; run a frozen install. Human effort is not measured.

| Case                 | Manager | Conflict files (range) | Conflict hunks (range) | Version decisions | Unexpected new versions | Intent + frozen validation |
| -------------------- | ------- | ---------------------: | ---------------------: | ----------------: | ----------------------: | -------------------------- |
| competing-version    | bun     |                    2–2 |                    2–2 |                 1 |                       0 | 3 / 3                      |
| competing-version    | pnpm    |                    2–2 |                    2–2 |                 1 |                       0 | 3 / 3                      |
| different-workspaces | bun     |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |
| different-workspaces | pnpm    |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |
| same-workspace       | bun     |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |
| same-workspace       | pnpm    |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |

## Recorded failures

- pnpm repository-format trial 1: exit 1; `339-pnpm-repository-format-1.log`.
- pnpm repository-format trial 2: exit 1; `348-pnpm-repository-format-2.log`.
- pnpm repository-format trial 3: exit 1; `351-pnpm-repository-format-3.log`.

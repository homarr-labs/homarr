## Package manager benchmark

Revisions: pnpm `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`, Bun `4eac5762b5795d14e59d9956af369fccb857ac59`.
Versions: Node v24.18.0, pnpm 11.15.1, Bun 1.4.2.

Sequential paired trials; alternate manager order. Cold means empty task-owned package cache and node_modules, not a dropped OS page cache. GNU time reports maximum process RSS including child resource accounting, not the sum of simultaneously running processes. Full repository graphs differ with the migration.

Times below are medians of successful trials; failures are counted explicitly.

| Scope / command                                  | Manager | Passed / total | Median seconds | Range seconds | Peak RSS MiB (median) |
| ------------------------------------------------ | ------- | -------------: | -------------: | ------------: | --------------------: |
| apps/docs: workspace-build-first                 | bun     |          1 / 1 |         81.466 | 81.466–81.466 |                3468.8 |
| apps/docs: workspace-build-first                 | pnpm    |          1 / 1 |         81.534 | 81.534–81.534 |                3504.9 |
| apps/docs: workspace-build-repeat                | bun     |          2 / 2 |         29.603 | 29.249–29.957 |                1980.3 |
| apps/docs: workspace-build-repeat                | pnpm    |          2 / 2 |         31.038 | 30.633–31.444 |                1976.3 |
| competing-version: conflict-frozen-validation    | bun     |          3 / 3 |          3.700 |   3.408–3.728 |                  41.5 |
| competing-version: conflict-frozen-validation    | pnpm    |          3 / 3 |          6.816 |   6.669–6.832 |                 722.1 |
| competing-version: conflict-parent-lock          | bun     |          6 / 6 |          0.049 |   0.048–0.108 |                  43.7 |
| competing-version: conflict-parent-lock          | pnpm    |          6 / 6 |         16.913 | 16.747–17.471 |                1547.0 |
| competing-version: conflict-regenerate           | bun     |          3 / 3 |          0.048 |   0.048–0.049 |                  43.5 |
| competing-version: conflict-regenerate           | pnpm    |          3 / 3 |         16.794 | 16.767–16.893 |                1589.0 |
| different-workspaces: conflict-frozen-validation | bun     |          3 / 3 |          3.622 |   3.366–3.634 |                  41.6 |
| different-workspaces: conflict-frozen-validation | pnpm    |          3 / 3 |          6.839 |   6.838–6.868 |                 745.6 |
| different-workspaces: conflict-parent-lock       | bun     |          6 / 6 |          0.054 |   0.047–0.262 |                  48.0 |
| different-workspaces: conflict-parent-lock       | pnpm    |          6 / 6 |         17.118 | 16.754–28.250 |                1578.0 |
| different-workspaces: conflict-regenerate        | bun     |          3 / 3 |          0.055 |   0.053–0.056 |                  49.5 |
| different-workspaces: conflict-regenerate        | pnpm    |          3 / 3 |         17.161 | 17.075–17.210 |                1589.2 |
| packages/cli: workspace-build-first              | bun     |          1 / 1 |          0.351 |   0.351–0.351 |                 300.7 |
| packages/cli: workspace-build-first              | pnpm    |          1 / 1 |          0.804 |   0.804–0.804 |                 304.8 |
| packages/cli: workspace-build-repeat             | bun     |          2 / 2 |          0.337 |   0.337–0.338 |                 301.7 |
| packages/cli: workspace-build-repeat             | pnpm    |          2 / 2 |          0.802 |   0.798–0.806 |                 304.7 |
| repository: cache-archive                        | bun     |          1 / 1 |          8.555 |   8.555–8.555 |                  50.8 |
| repository: cache-archive                        | pnpm    |          1 / 1 |          9.939 |   9.939–9.939 |                  50.2 |
| repository: cache-restore                        | bun     |          3 / 3 |          9.276 |   9.234–9.521 |                   7.1 |
| repository: cache-restore                        | pnpm    |          3 / 3 |          7.834 |   7.377–7.962 |                   7.1 |
| repository: install-cold                         | bun     |          3 / 3 |         14.613 | 13.566–14.744 |                 615.3 |
| repository: install-cold                         | pnpm    |          3 / 3 |         30.699 | 29.581–32.186 |                1537.0 |
| repository: install-no-op                        | bun     |          3 / 3 |          0.101 |   0.101–0.167 |                  41.7 |
| repository: install-no-op                        | pnpm    |          3 / 3 |          0.503 |   0.497–0.506 |                 144.2 |
| repository: install-restored-offline             | bun     |          3 / 3 |          5.631 |   5.575–5.790 |                 205.0 |
| repository: install-restored-offline             | pnpm    |          3 / 3 |          8.617 |   8.437–8.797 |                 719.2 |
| repository: install-warm                         | bun     |          3 / 3 |          5.837 |   5.800–5.905 |                 205.0 |
| repository: install-warm                         | pnpm    |          3 / 3 |          6.834 |   6.832–6.856 |                 717.3 |
| repository: install-warm-ignore-scripts          | bun     |          3 / 3 |          3.847 |   3.812–3.925 |                  40.8 |
| repository: install-warm-ignore-scripts          | pnpm    |          3 / 3 |          5.896 |   5.701–5.898 |                 719.9 |
| repository: repository-format                    | bun     |          3 / 3 |          0.201 |   0.199–4.609 |                 102.5 |
| repository: repository-format                    | pnpm    |          0 / 3 |              — |             — |                     — |
| repository: repository-lint-cached               | bun     |          2 / 2 |          0.248 |   0.236–0.261 |                 106.6 |
| repository: repository-lint-cached               | pnpm    |          2 / 2 |          0.689 |   0.675–0.702 |                 138.7 |
| repository: repository-lint-first                | bun     |          1 / 1 |          7.341 |   7.341–7.341 |                 329.1 |
| repository: repository-lint-first                | pnpm    |          1 / 1 |         16.018 | 16.018–16.018 |                 323.1 |
| repository: request-handler-retention            | bun     |          3 / 3 |          2.316 |   2.303–2.498 |                 220.0 |
| repository: request-handler-retention            | pnpm    |          3 / 3 |          2.364 |   2.341–2.535 |                 220.6 |
| same-workspace: conflict-frozen-validation       | bun     |          3 / 3 |          3.697 |   3.454–3.735 |                  41.9 |
| same-workspace: conflict-frozen-validation       | pnpm    |          3 / 3 |          6.618 |   6.574–6.857 |                 739.7 |
| same-workspace: conflict-parent-lock             | bun     |          6 / 6 |          0.048 |   0.047–0.049 |                  43.6 |
| same-workspace: conflict-parent-lock             | pnpm    |          6 / 6 |         16.985 | 16.694–17.193 |                1512.5 |
| same-workspace: conflict-regenerate              | bun     |          3 / 3 |          0.049 |   0.048–0.049 |                  43.6 |
| same-workspace: conflict-regenerate              | pnpm    |          3 / 3 |         17.018 | 16.730–17.035 |                1521.1 |
| tools/mysql-to-sqlite: tool-help                 | bun     |          3 / 3 |          0.084 |   0.083–0.085 |                  69.2 |
| tools/mysql-to-sqlite: tool-help                 | npm     |          3 / 3 |          0.086 |   0.083–0.087 |                  68.9 |
| tools/mysql-to-sqlite: tool-install-cold         | bun     |          3 / 3 |          0.107 |   0.103–0.108 |                  28.3 |
| tools/mysql-to-sqlite: tool-install-cold         | npm     |          3 / 3 |          0.593 |   0.591–0.812 |                 110.9 |
| tools/mysql-to-sqlite: tool-install-no-op        | bun     |          3 / 3 |          0.007 |   0.007–0.008 |                  17.8 |
| tools/mysql-to-sqlite: tool-install-no-op        | npm     |          3 / 3 |          0.278 |   0.277–0.278 |                  92.7 |
| tools/mysql-to-sqlite: tool-install-warm         | bun     |          3 / 3 |          0.013 |   0.013–0.014 |                  18.2 |
| tools/mysql-to-sqlite: tool-install-warm         | npm     |          3 / 3 |          0.422 |   0.420–0.425 |                 104.6 |
| tools/v2-showreel: tool-build                    | bun     |          3 / 3 |          0.090 |   0.086–0.090 |                  64.0 |
| tools/v2-showreel: tool-build                    | npm     |          3 / 3 |          0.188 |   0.187–0.190 |                  69.4 |
| tools/v2-showreel: tool-install-cold             | bun     |          3 / 3 |          0.721 |   0.721–0.728 |                  67.2 |
| tools/v2-showreel: tool-install-cold             | npm     |          3 / 3 |          5.620 |   5.580–5.687 |                 278.2 |
| tools/v2-showreel: tool-install-no-op            | bun     |          3 / 3 |          0.007 |   0.007–0.008 |                  18.1 |
| tools/v2-showreel: tool-install-no-op            | npm     |          3 / 3 |          0.291 |   0.289–0.295 |                  95.4 |
| tools/v2-showreel: tool-install-warm             | bun     |          3 / 3 |          0.228 |   0.227–0.229 |                  18.3 |
| tools/v2-showreel: tool-install-warm             | npm     |          3 / 3 |          5.227 |   5.199–5.236 |                 348.5 |

## Workspace typecheck memory and time

First run: one trial per manager script. Incremental: two trials per manager script. RSS is maximum process RSS; library workspaces do not have independent production processes.

| Workspace                  | First seconds pnpm / Bun | First peak MiB pnpm / Bun | Incremental median seconds pnpm / Bun | Incremental peak MiB pnpm / Bun | Passed / total |
| -------------------------- | -----------------------: | ------------------------: | ------------------------------------: | ------------------------------: | -------------: |
| apps/docs                  |            14.29 / 13.53 |         1546.97 / 1499.13 |                           1.93 / 1.38 |                 523.53 / 484.55 |          6 / 6 |
| apps/nextjs                |            41.70 / 40.02 |         5271.90 / 5376.05 |                           3.04 / 2.67 |               1428.01 / 1399.04 |          6 / 6 |
| apps/tasks                 |            34.13 / 33.31 |         3612.78 / 3706.75 |                           1.95 / 1.43 |                 862.82 / 847.60 |          6 / 6 |
| apps/websocket             |            35.14 / 34.49 |         3849.43 / 3696.43 |                           1.89 / 1.46 |                 882.09 / 851.68 |          6 / 6 |
| packages/analytics         |            33.81 / 33.93 |         3697.46 / 3753.69 |                           1.89 / 1.37 |                 877.10 / 897.04 |          6 / 6 |
| packages/api               |            34.27 / 33.99 |         3942.01 / 3988.23 |                           2.01 / 1.54 |                 899.74 / 914.64 |          6 / 6 |
| packages/auth              |            13.46 / 13.04 |         1470.62 / 1468.53 |                           1.16 / 0.74 |                 465.23 / 458.21 |          6 / 6 |
| packages/boards            |            35.01 / 33.65 |         3769.82 / 3700.68 |                           1.97 / 1.46 |                 897.67 / 853.78 |          6 / 6 |
| packages/cli               |            34.18 / 34.00 |         3637.55 / 3666.65 |                           1.89 / 1.43 |                 888.17 / 868.81 |          6 / 6 |
| packages/common            |              1.00 / 0.51 |           330.43 / 330.28 |                           0.89 / 0.47 |                 291.09 / 299.41 |          6 / 6 |
| packages/core              |              0.78 / 0.35 |           198.17 / 188.13 |                           0.69 / 0.24 |                 156.79 / 154.89 |          6 / 6 |
| packages/cron-job-status   |              0.80 / 0.34 |           204.19 / 194.48 |                           0.72 / 0.28 |                 168.06 / 171.23 |          6 / 6 |
| packages/cron-jobs         |            34.73 / 33.77 |         3800.52 / 3606.79 |                           1.91 / 1.43 |                 862.93 / 860.86 |          6 / 6 |
| packages/cron-jobs-core    |            12.32 / 11.89 |           866.30 / 869.29 |                           0.85 / 0.39 |                 246.71 / 248.01 |          6 / 6 |
| packages/custom-widgets    |            12.40 / 11.88 |           875.71 / 881.50 |                           0.91 / 0.49 |                 292.15 / 287.33 |          6 / 6 |
| packages/db                |            35.09 / 35.06 |         3893.43 / 3990.52 |                           1.95 / 1.50 |                 906.70 / 869.91 |          6 / 6 |
| packages/definitions       |            12.36 / 11.89 |           640.09 / 623.32 |                           0.72 / 0.29 |                 170.08 / 174.36 |          6 / 6 |
| packages/docker            |            11.67 / 11.18 |           499.12 / 505.39 |                           0.73 / 0.31 |                 183.29 / 190.73 |          6 / 6 |
| packages/form              |              1.55 / 1.09 |           401.37 / 371.11 |                           0.79 / 0.37 |                 212.56 / 216.93 |          6 / 6 |
| packages/forms-collection  |            34.23 / 33.63 |         3593.07 / 3813.31 |                           1.92 / 1.45 |                 918.83 / 861.91 |          6 / 6 |
| packages/icons             |            12.56 / 12.07 |           911.82 / 890.80 |                           0.86 / 0.41 |                 253.08 / 247.85 |          6 / 6 |
| packages/image-proxy       |              1.11 / 0.65 |           375.64 / 383.82 |                           0.95 / 0.49 |                 325.66 / 335.19 |          6 / 6 |
| packages/integrations      |            13.64 / 13.15 |         1570.02 / 1545.20 |                           1.22 / 0.80 |                 489.05 / 482.09 |          6 / 6 |
| packages/modals            |            13.87 / 13.37 |         1427.44 / 1338.47 |                           0.95 / 0.48 |                 317.82 / 319.90 |          6 / 6 |
| packages/modals-collection |            33.57 / 33.87 |         3798.57 / 3601.38 |                           1.91 / 1.50 |                 884.18 / 869.46 |          6 / 6 |
| packages/notifications     |              0.79 / 0.33 |           187.70 / 185.38 |                           0.75 / 0.30 |                 174.93 / 182.15 |          6 / 6 |
| packages/onboarding        |            33.86 / 34.76 |         3801.89 / 3776.27 |                           1.95 / 1.48 |                 880.29 / 902.25 |          6 / 6 |
| packages/ping              |              0.90 / 0.43 |           256.11 / 261.68 |                           0.78 / 0.34 |                 216.09 / 216.01 |          6 / 6 |
| packages/redis             |              0.80 / 0.35 |           208.38 / 202.80 |                           0.75 / 0.30 |                 179.41 / 181.56 |          6 / 6 |
| packages/request-handler   |            13.62 / 13.12 |         1504.16 / 1528.07 |                           1.18 / 0.76 |                 474.71 / 501.54 |          6 / 6 |
| packages/server-settings   |            12.33 / 11.80 |           592.90 / 587.53 |                           0.82 / 0.38 |                 216.70 / 223.09 |          6 / 6 |
| packages/settings          |            13.02 / 12.54 |           992.03 / 981.10 |                           0.92 / 0.48 |                 299.42 / 308.53 |          6 / 6 |
| packages/spotlight         |            34.75 / 34.57 |         3615.39 / 3886.99 |                           1.96 / 1.50 |                 870.41 / 875.33 |          6 / 6 |
| packages/translation       |              1.49 / 1.00 |           368.71 / 433.51 |                           0.85 / 0.42 |                 246.21 / 253.78 |          6 / 6 |
| packages/ui                |            15.02 / 14.65 |         1535.63 / 1382.31 |                           0.96 / 0.54 |                 321.90 / 325.22 |          6 / 6 |
| packages/validation        |            12.19 / 11.75 |           646.44 / 649.36 |                           0.87 / 0.41 |                 235.30 / 236.18 |          6 / 6 |
| packages/widgets           |            35.20 / 34.59 |         3900.30 / 3905.43 |                           1.99 / 1.41 |                 894.54 / 930.46 |          6 / 6 |
| packages/workshop          |              1.13 / 0.68 |           346.91 / 344.64 |                           0.64 / 0.19 |                 139.48 / 136.92 |          6 / 6 |

## Disk and sharing

Sizes deduplicate hardlinks by device/inode and include directory blocks. Cache archives use local tar/zstd; restore timings exclude network transfer.

- pnpm: modules 2124.3 MiB; cache 2093.1 MiB; combined unique-inode allocation 2229.7 MiB.
- bun: modules 2405.8 MiB; cache 2385.2 MiB; combined unique-inode allocation 2493.9 MiB.
- pnpm lock: 940,027 bytes, 26,484 lines.
- bun lock: 668,847 bytes, 6,444 lines.
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

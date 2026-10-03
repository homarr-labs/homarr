## Package manager benchmark

Revisions: pnpm `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`, Bun `2a327fa818b42a66838220a83fab96851073810b`.
Versions: Node v24.18.0, pnpm 11.15.1, Bun 1.4.2.

Sequential paired trials; alternate manager order. Cold means empty task-owned package cache and node_modules, not a dropped OS page cache. GNU time reports maximum process RSS including child resource accounting, not the sum of simultaneously running processes. Full repository graphs differ with the migration.

Times below are medians of successful trials; failures are counted explicitly.

| Scope / command                                  | Manager | Passed / total | Median seconds | Range seconds | Peak RSS MiB (median) |
| ------------------------------------------------ | ------- | -------------: | -------------: | ------------: | --------------------: |
| competing-version: conflict-frozen-validation    | bun     |          3 / 3 |          1.406 |   1.205–1.539 |                  36.0 |
| competing-version: conflict-frozen-validation    | pnpm    |          1 / 3 |          3.435 |   3.435–3.435 |                1474.6 |
| competing-version: conflict-parent-lock          | bun     |          6 / 6 |          0.049 |   0.037–0.088 |                  38.3 |
| competing-version: conflict-parent-lock          | pnpm    |          6 / 6 |         13.744 | 13.052–14.289 |                1564.7 |
| competing-version: conflict-regenerate           | bun     |          3 / 3 |          0.046 |   0.036–0.054 |                  38.4 |
| competing-version: conflict-regenerate           | pnpm    |          3 / 3 |         13.780 | 13.769–13.847 |                1586.1 |
| different-workspaces: conflict-frozen-validation | bun     |          3 / 3 |          1.210 |   1.184–1.250 |                  36.1 |
| different-workspaces: conflict-frozen-validation | pnpm    |          2 / 3 |          3.237 |   3.187–3.288 |                1464.6 |
| different-workspaces: conflict-parent-lock       | bun     |          6 / 6 |          0.048 |   0.034–0.412 |                  43.0 |
| different-workspaces: conflict-parent-lock       | pnpm    |          6 / 6 |         14.086 | 13.458–22.808 |                1640.4 |
| different-workspaces: conflict-regenerate        | bun     |          3 / 3 |          0.056 |   0.039–0.062 |                  44.5 |
| different-workspaces: conflict-regenerate        | pnpm    |          3 / 3 |         14.391 | 14.207–14.581 |                1714.0 |
| repository: cache-archive                        | bun     |          1 / 1 |          7.750 |   7.750–7.750 |                  46.4 |
| repository: cache-archive                        | pnpm    |          1 / 1 |         11.056 | 11.056–11.056 |                  43.8 |
| repository: cache-restore                        | bun     |          3 / 3 |          5.125 |   4.950–6.080 |                   6.4 |
| repository: cache-restore                        | pnpm    |          3 / 3 |          4.089 |   3.821–4.824 |                   6.4 |
| repository: install-cold                         | bun     |          3 / 3 |          5.228 |   5.021–5.305 |                 319.2 |
| repository: install-cold                         | pnpm    |          3 / 3 |         14.172 | 12.267–17.175 |                2455.1 |
| repository: install-no-op                        | bun     |          3 / 3 |          0.067 |   0.064–0.093 |                  36.2 |
| repository: install-no-op                        | pnpm    |          3 / 3 |          0.461 |   0.402–0.522 |                 144.8 |
| repository: install-restored-offline             | bun     |          3 / 3 |          3.117 |   2.248–3.715 |                  48.6 |
| repository: install-restored-offline             | pnpm    |          3 / 3 |          6.794 |   6.367–7.476 |                1479.5 |
| repository: install-warm                         | bun     |          3 / 3 |          2.332 |   1.551–2.905 |                  48.8 |
| repository: install-warm                         | pnpm    |          3 / 3 |          5.663 |   3.757–6.621 |                1438.3 |
| repository: install-warm-ignore-scripts          | bun     |          3 / 3 |          1.928 |   1.443–2.282 |                  35.2 |
| repository: install-warm-ignore-scripts          | pnpm    |          1 / 3 |          4.403 |   4.403–4.403 |                1439.1 |
| repository: repository-format                    | bun     |          0 / 3 |              — |             — |                     — |
| repository: repository-format                    | pnpm    |          0 / 3 |              — |             — |                     — |
| repository: repository-lint-cached               | bun     |          2 / 2 |          0.162 |   0.160–0.164 |                  56.0 |
| repository: repository-lint-cached               | pnpm    |          2 / 2 |          0.511 |   0.475–0.547 |                 136.0 |
| repository: repository-lint-first                | bun     |          1 / 1 |          2.208 |   2.208–2.208 |                 318.4 |
| repository: repository-lint-first                | pnpm    |          1 / 1 |          5.061 |   5.061–5.061 |                 337.6 |
| repository: request-handler-retention            | bun     |          3 / 3 |          0.533 |   0.459–0.544 |                 149.9 |
| repository: request-handler-retention            | pnpm    |          3 / 3 |          2.055 |   1.902–2.457 |                 213.8 |
| same-workspace: conflict-frozen-validation       | bun     |          3 / 3 |          1.172 |   1.130–1.270 |                  36.1 |
| same-workspace: conflict-frozen-validation       | pnpm    |          2 / 3 |          3.138 |   2.922–3.353 |                1480.4 |
| same-workspace: conflict-parent-lock             | bun     |          6 / 6 |          0.055 |   0.041–0.062 |                  38.2 |
| same-workspace: conflict-parent-lock             | pnpm    |          6 / 6 |         13.922 | 13.396–14.460 |                1653.6 |
| same-workspace: conflict-regenerate              | bun     |          3 / 3 |          0.059 |   0.035–0.067 |                  38.4 |
| same-workspace: conflict-regenerate              | pnpm    |          3 / 3 |         14.327 | 13.653–14.341 |                1712.5 |
| tools/mysql-to-sqlite: tool-help                 | bun     |          3 / 3 |          0.065 |   0.048–0.084 |                  44.1 |
| tools/mysql-to-sqlite: tool-help                 | npm     |          3 / 3 |          0.068 |   0.066–0.088 |                  66.5 |
| tools/mysql-to-sqlite: tool-install-cold         | bun     |          3 / 3 |          0.099 |   0.086–0.103 |                  22.8 |
| tools/mysql-to-sqlite: tool-install-cold         | npm     |          3 / 3 |          0.458 |   0.418–0.625 |                 109.1 |
| tools/mysql-to-sqlite: tool-install-no-op        | bun     |          3 / 3 |          0.006 |   0.005–0.007 |                  12.5 |
| tools/mysql-to-sqlite: tool-install-no-op        | npm     |          3 / 3 |          0.234 |   0.197–0.242 |                  92.5 |
| tools/mysql-to-sqlite: tool-install-warm         | bun     |          3 / 3 |          0.009 |   0.009–0.011 |                  12.5 |
| tools/mysql-to-sqlite: tool-install-warm         | npm     |          3 / 3 |          0.303 |   0.275–0.388 |                 103.0 |
| tools/v2-showreel: tool-build                    | bun     |          3 / 3 |          0.091 |   0.079–0.111 |                  63.3 |
| tools/v2-showreel: tool-build                    | npm     |          3 / 3 |          0.159 |   0.156–0.196 |                  66.9 |
| tools/v2-showreel: tool-install-cold             | bun     |          3 / 3 |          0.470 |   0.424–0.534 |                  55.3 |
| tools/v2-showreel: tool-install-cold             | npm     |          3 / 3 |          2.925 |   2.649–2.998 |                 284.2 |
| tools/v2-showreel: tool-install-no-op            | bun     |          3 / 3 |          0.007 |   0.006–0.007 |                  12.7 |
| tools/v2-showreel: tool-install-no-op            | npm     |          3 / 3 |          0.218 |   0.209–0.225 |                  93.7 |
| tools/v2-showreel: tool-install-warm             | bun     |          3 / 3 |          0.100 |   0.098–0.122 |                  12.8 |
| tools/v2-showreel: tool-install-warm             | npm     |          3 / 3 |          2.451 |   2.434–2.596 |                 354.5 |

## Workspace typecheck memory and time

First run: one trial per manager script. Incremental: two trials per manager script. RSS is maximum process RSS; library workspaces do not have independent production processes.
Pre-fix declared-script measurements: direct workspace bun run did not discover the root bunfig.toml, so tsc ran Node v24.18.0 on both revisions. The Bun docs script used Bun for next typegen before Node tsc. Final explicitly forced Bun workspace measurements are recorded separately.

| Workspace                  | First seconds pnpm / Bun | First peak MiB pnpm / Bun | Incremental median seconds pnpm / Bun | Incremental peak MiB pnpm / Bun | Passed / total |
| -------------------------- | -----------------------: | ------------------------: | ------------------------------------: | ------------------------------: | -------------: |
| apps/docs                  |             10.61 / 9.17 |         1336.77 / 1300.00 |                           1.37 / 0.87 |                 491.86 / 458.82 |          6 / 6 |
| apps/nextjs                |            28.09 / 22.43 |         4651.01 / 4458.29 |                           1.97 / 1.69 |               1281.03 / 1287.76 |          6 / 6 |
| apps/tasks                 |            15.04 / 15.17 |         3548.70 / 3451.47 |                           1.21 / 0.88 |                 812.79 / 801.59 |          6 / 6 |
| apps/websocket             |            15.49 / 15.72 |         3402.14 / 3445.20 |                           1.30 / 0.88 |                 822.19 / 798.41 |          6 / 6 |
| packages/analytics         |            15.90 / 15.41 |         3495.98 / 3299.66 |                           1.33 / 0.91 |                 828.59 / 809.37 |          6 / 6 |
| packages/api               |            16.11 / 16.02 |         3577.96 / 3525.54 |                           1.26 / 0.93 |                 864.62 / 846.41 |          6 / 6 |
| packages/auth              |              8.75 / 8.65 |         1397.88 / 1392.88 |                           0.89 / 0.46 |                 440.39 / 428.36 |          6 / 6 |
| packages/boards            |            16.05 / 14.87 |         3398.50 / 3373.14 |                           1.24 / 0.94 |                 823.89 / 828.70 |          6 / 6 |
| packages/cli               |            15.40 / 14.92 |         3528.75 / 3248.27 |                           1.29 / 0.84 |                 812.90 / 814.46 |          6 / 6 |
| packages/common            |              0.70 / 0.33 |           313.59 / 320.00 |                           0.80 / 0.34 |                 284.61 / 289.06 |          6 / 6 |
| packages/core              |              0.65 / 0.25 |           189.38 / 186.56 |                           0.59 / 0.17 |                 155.55 / 150.78 |          6 / 6 |
| packages/cron-job-status   |              0.57 / 0.22 |           183.44 / 187.66 |                           0.54 / 0.20 |                 164.22 / 167.03 |          6 / 6 |
| packages/cron-jobs         |            14.95 / 14.61 |         3389.47 / 3522.57 |                           1.29 / 0.92 |                 816.45 / 793.22 |          6 / 6 |
| packages/cron-jobs-core    |              8.08 / 7.78 |           845.99 / 918.83 |                           0.69 / 0.27 |                 234.30 / 234.38 |          6 / 6 |
| packages/custom-widgets    |              8.29 / 7.89 |           836.96 / 836.09 |                           0.66 / 0.32 |                 265.08 / 277.81 |          6 / 6 |
| packages/db                |            16.20 / 15.60 |         3850.53 / 3677.34 |                           1.29 / 0.93 |                 819.20 / 836.51 |          6 / 6 |
| packages/definitions       |              9.14 / 8.35 |           602.96 / 606.87 |                           0.52 / 0.19 |                 164.77 / 169.14 |          6 / 6 |
| packages/docker            |              7.87 / 7.38 |           532.94 / 536.86 |                           0.63 / 0.21 |                 179.38 / 178.59 |          6 / 6 |
| packages/form              |              1.13 / 0.78 |           394.22 / 393.12 |                           0.61 / 0.28 |                 202.97 / 211.88 |          6 / 6 |
| packages/forms-collection  |            16.00 / 15.06 |         3395.84 / 3294.51 |                           1.20 / 0.87 |                 832.09 / 827.63 |          6 / 6 |
| packages/icons             |              8.27 / 7.95 |           892.98 / 868.79 |                           0.59 / 0.27 |                 238.98 / 245.16 |          6 / 6 |
| packages/image-proxy       |              0.82 / 0.39 |           354.69 / 372.34 |                           0.72 / 0.36 |                 310.55 / 314.84 |          6 / 6 |
| packages/integrations      |              9.06 / 8.99 |         1357.29 / 1351.43 |                           0.81 / 0.47 |                 455.93 / 459.06 |          6 / 6 |
| packages/modals            |              9.06 / 8.52 |         1323.50 / 1411.66 |                           0.70 / 0.35 |                 298.91 / 303.05 |          6 / 6 |
| packages/modals-collection |            15.26 / 15.12 |         3617.99 / 3215.23 |                           1.22 / 0.88 |                 815.98 / 829.74 |          6 / 6 |
| packages/notifications     |              0.61 / 0.24 |           181.56 / 183.59 |                           0.58 / 0.22 |                 169.84 / 176.64 |          6 / 6 |
| packages/onboarding        |            15.60 / 14.77 |         3324.84 / 3414.24 |                           1.20 / 0.90 |                 857.23 / 816.30 |          6 / 6 |
| packages/ping              |              0.68 / 0.28 |           245.00 / 236.25 |                           0.59 / 0.23 |                 207.03 / 207.50 |          6 / 6 |
| packages/redis             |              0.61 / 0.22 |           193.59 / 203.91 |                           0.52 / 0.20 |                 170.55 / 178.52 |          6 / 6 |
| packages/request-handler   |              8.89 / 8.42 |         1394.98 / 1387.94 |                           0.79 / 0.47 |                 449.84 / 457.11 |          6 / 6 |
| packages/server-settings   |              8.16 / 8.14 |           623.14 / 616.68 |                           0.63 / 0.27 |                 206.48 / 215.39 |          6 / 6 |
| packages/settings          |              8.67 / 8.43 |          991.83 / 1011.79 |                           0.69 / 0.36 |                 284.92 / 292.50 |          6 / 6 |
| packages/spotlight         |            15.61 / 15.67 |         3540.15 / 3290.40 |                           1.31 / 0.88 |                 824.24 / 831.86 |          6 / 6 |
| packages/translation       |              1.07 / 0.70 |           378.85 / 369.69 |                           0.67 / 0.29 |                 237.34 / 245.39 |          6 / 6 |
| packages/ui                |             10.00 / 9.36 |         1435.82 / 1448.01 |                           0.68 / 0.34 |                 302.34 / 303.36 |          6 / 6 |
| packages/validation        |              8.46 / 8.02 |           692.20 / 697.07 |                           0.63 / 0.28 |                 219.53 / 228.52 |          6 / 6 |
| packages/widgets           |            15.21 / 15.67 |         3540.87 / 3667.84 |                           1.23 / 0.90 |                 835.70 / 836.96 |          6 / 6 |
| packages/workshop          |              0.85 / 0.47 |           299.22 / 302.66 |                           0.50 / 0.14 |                 136.05 / 129.06 |          6 / 6 |

## Disk and sharing

Sizes deduplicate hardlinks by device/inode and include directory blocks. Cache archives use local tar/zstd; restore timings exclude network transfer.

- pnpm: modules 2124.4 MiB; cache 2093.3 MiB; combined unique-inode allocation 2228.8 MiB.
- bun: modules 2397.3 MiB; cache 2378.0 MiB; combined unique-inode allocation 2485.0 MiB.
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
| competing-version    | pnpm    |                    2–2 |                    2–2 |                 1 |                       0 | 1 / 3                      |
| different-workspaces | bun     |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |
| different-workspaces | pnpm    |                    0–0 |                    0–0 |                 0 |                       0 | 2 / 3                      |
| same-workspace       | bun     |                    0–0 |                    0–0 |                 0 |                       0 | 3 / 3                      |
| same-workspace       | pnpm    |                    0–0 |                    0–0 |                 0 |                       0 | 2 / 3                      |

## Recorded failures

- pnpm install-warm-ignore-scripts trial 1: exit 1; `003-pnpm-install-warm-ignore-scripts-1.log`.
- pnpm install-warm-ignore-scripts trial 2: exit 1; `015-pnpm-install-warm-ignore-scripts-2.log`.
- pnpm conflict-frozen-validation trial 2: exit 1; `281-pnpm-conflict-frozen-validation-2.log`.
- pnpm conflict-frozen-validation trial 3: exit 1; `309-pnpm-conflict-frozen-validation-3.log`.
- pnpm conflict-frozen-validation trial 2: exit 1; `329-pnpm-conflict-frozen-validation-2.log`.
- pnpm conflict-frozen-validation trial 3: exit 1; `333-pnpm-conflict-frozen-validation-3.log`.
- pnpm repository-format trial 1: exit 1; `339-pnpm-repository-format-1.log`.
- bun repository-format trial 1: exit 1; `342-bun-repository-format-1.log`.
- bun repository-format trial 2: exit 1; `345-bun-repository-format-2.log`.
- pnpm repository-format trial 2: exit 1; `348-pnpm-repository-format-2.log`.
- pnpm repository-format trial 3: exit 1; `351-pnpm-repository-format-3.log`.
- bun repository-format trial 3: exit 1; `354-bun-repository-format-3.log`.

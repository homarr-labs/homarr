## Package manager benchmark

Revisions: pnpm `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`, Bun `80f76727f1ecfa0888c44847ba90aa8c3a9ae178`.
Versions: Node v24.18.0, pnpm 11.15.1, Bun 1.4.2.

Sequential paired trials; alternate manager order. Cold means empty task-owned package cache and node_modules, not a dropped OS page cache. GNU time reports maximum process RSS including child resource accounting, not the sum of simultaneously running processes. Full repository graphs differ with the migration.

Times below are medians of successful trials; failures are counted explicitly.

| Scope / command                       | Manager | Passed / total | Median seconds | Range seconds | Peak RSS MiB (median) |
| ------------------------------------- | ------- | -------------: | -------------: | ------------: | --------------------: |
| apps/docs: workspace-build-first      | bun     |          1 / 1 |         49.172 | 49.172–49.172 |                3556.2 |
| apps/docs: workspace-build-first      | pnpm    |          1 / 1 |         56.840 | 56.840–56.840 |                3709.1 |
| apps/docs: workspace-build-repeat     | bun     |          2 / 2 |         17.947 | 16.151–19.743 |                1960.9 |
| apps/docs: workspace-build-repeat     | pnpm    |          2 / 2 |         20.364 | 19.043–21.685 |                1251.0 |
| packages/cli: workspace-build-first   | bun     |          1 / 1 |          0.123 |   0.123–0.123 |                 159.1 |
| packages/cli: workspace-build-first   | pnpm    |          1 / 1 |          0.803 |   0.803–0.803 |                 308.4 |
| packages/cli: workspace-build-repeat  | bun     |          2 / 2 |          0.109 |   0.097–0.122 |                 157.0 |
| packages/cli: workspace-build-repeat  | pnpm    |          2 / 2 |          0.703 |   0.699–0.707 |                 308.7 |
| repository: repository-format         | bun     |          3 / 3 |          0.135 |   0.127–3.191 |                  57.5 |
| repository: repository-format         | pnpm    |          0 / 3 |              — |             — |                     — |
| repository: repository-lint-cached    | bun     |          2 / 2 |          0.174 |   0.172–0.177 |                  54.8 |
| repository: repository-lint-cached    | pnpm    |          2 / 2 |          0.533 |   0.511–0.555 |                 136.5 |
| repository: repository-lint-first     | bun     |          1 / 1 |          2.596 |   2.596–2.596 |                 304.6 |
| repository: repository-lint-first     | pnpm    |          1 / 1 |          5.621 |   5.621–5.621 |                 346.8 |
| repository: request-handler-retention | bun     |          3 / 3 |          0.493 |   0.462–0.617 |                 149.0 |
| repository: request-handler-retention | pnpm    |          3 / 3 |          2.009 |   1.894–2.456 |                 219.3 |

## Workspace typecheck memory and time

First run: one trial per manager script. Incremental: two trials per manager script. RSS is maximum process RSS; library workspaces do not have independent production processes.
Final explicit-runtime scripts: pnpm uses Node v24.18.0; candidate tsc and dotenv explicitly use bun --bun with Bun 1.4.2, including direct workspace invocation.

| Workspace                  | First seconds pnpm / Bun | First peak MiB pnpm / Bun | Incremental median seconds pnpm / Bun | Incremental peak MiB pnpm / Bun | Passed / total |
| -------------------------- | -----------------------: | ------------------------: | ------------------------------------: | ------------------------------: | -------------: |
| apps/docs                  |              9.27 / 9.21 |         1345.85 / 1279.39 |                           1.46 / 0.89 |                 488.81 / 456.09 |          6 / 6 |
| apps/nextjs                |            18.59 / 18.41 |         4545.30 / 4870.62 |                           2.07 / 1.71 |               1320.20 / 1292.10 |          6 / 6 |
| apps/tasks                 |            15.60 / 14.90 |         3387.75 / 3556.39 |                           1.22 / 0.85 |                 800.18 / 801.44 |          6 / 6 |
| apps/websocket             |            16.50 / 15.80 |         3475.03 / 3278.25 |                           1.37 / 0.88 |                 798.92 / 819.29 |          6 / 6 |
| packages/analytics         |            15.59 / 15.11 |         3322.01 / 3496.70 |                           1.39 / 0.93 |                 812.15 / 835.72 |          6 / 6 |
| packages/api               |            15.35 / 15.24 |         3389.15 / 3317.31 |                           1.33 / 0.93 |                 871.60 / 840.46 |          6 / 6 |
| packages/auth              |              8.84 / 8.31 |         1370.87 / 1398.77 |                           0.83 / 0.48 |                 435.29 / 435.22 |          6 / 6 |
| packages/boards            |            15.78 / 16.20 |         3361.77 / 3626.84 |                           1.31 / 0.91 |                 814.21 / 808.24 |          6 / 6 |
| packages/cli               |            15.12 / 14.82 |         3601.42 / 3580.79 |                           1.30 / 0.98 |                 798.63 / 808.41 |          6 / 6 |
| packages/common            |              0.83 / 0.38 |           307.19 / 323.28 |                           0.73 / 0.30 |                 280.00 / 279.14 |          6 / 6 |
| packages/core              |              0.85 / 0.21 |           185.47 / 185.00 |                           0.63 / 0.16 |                 153.67 / 148.05 |          6 / 6 |
| packages/cron-job-status   |              0.57 / 0.21 |           185.94 / 190.62 |                           0.53 / 0.17 |                 164.69 / 161.41 |          6 / 6 |
| packages/cron-jobs         |            15.85 / 16.52 |         3561.62 / 3493.89 |                           1.28 / 0.93 |                 798.44 / 814.30 |          6 / 6 |
| packages/cron-jobs-core    |              8.37 / 7.88 |           898.23 / 892.20 |                           0.63 / 0.24 |                 236.02 / 232.27 |          6 / 6 |
| packages/custom-widgets    |              8.54 / 8.32 |           833.33 / 846.59 |                           0.62 / 0.30 |                 266.17 / 269.84 |          6 / 6 |
| packages/db                |            16.01 / 15.43 |         3676.54 / 3638.18 |                           1.26 / 0.87 |                 833.66 / 821.15 |          6 / 6 |
| packages/definitions       |              8.62 / 8.71 |           609.09 / 610.69 |                           0.58 / 0.16 |                 163.83 / 162.66 |          6 / 6 |
| packages/docker            |              8.20 / 7.47 |           531.90 / 533.88 |                           0.61 / 0.19 |                 175.86 / 180.55 |          6 / 6 |
| packages/form              |              1.19 / 0.81 |           395.47 / 391.56 |                           0.67 / 0.25 |                 202.19 / 205.62 |          6 / 6 |
| packages/forms-collection  |            15.33 / 15.18 |         3275.12 / 3344.90 |                           1.31 / 0.89 |                 813.21 / 831.42 |          6 / 6 |
| packages/icons             |              8.61 / 7.70 |           903.55 / 876.38 |                           0.64 / 0.25 |                 244.06 / 235.00 |          6 / 6 |
| packages/image-proxy       |              0.80 / 0.39 |           373.28 / 362.34 |                           0.68 / 0.31 |                 311.48 / 311.64 |          6 / 6 |
| packages/integrations      |              8.81 / 8.29 |         1362.20 / 1321.50 |                           0.80 / 0.44 |                 446.08 / 441.09 |          6 / 6 |
| packages/modals            |              8.99 / 8.76 |         1379.50 / 1376.09 |                           0.72 / 0.30 |                 303.98 / 298.67 |          6 / 6 |
| packages/modals-collection |            15.37 / 14.85 |         3641.52 / 3318.42 |                           1.23 / 0.86 |                 814.98 / 829.07 |          6 / 6 |
| packages/notifications     |              0.61 / 0.24 |           182.03 / 181.41 |                           0.57 / 0.20 |                 168.05 / 172.50 |          6 / 6 |
| packages/onboarding        |            16.12 / 15.17 |         3361.73 / 3587.18 |                           1.24 / 0.97 |                 841.48 / 848.47 |          6 / 6 |
| packages/ping              |              0.62 / 0.29 |           237.97 / 230.31 |                           0.58 / 0.20 |                 209.61 / 202.34 |          6 / 6 |
| packages/redis             |              0.65 / 0.21 |           201.72 / 198.12 |                           0.56 / 0.18 |                 173.12 / 171.33 |          6 / 6 |
| packages/request-handler   |              9.00 / 8.51 |         1363.88 / 1402.35 |                           0.77 / 0.43 |                 451.40 / 442.11 |          6 / 6 |
| packages/server-settings   |              8.18 / 7.94 |           624.69 / 628.98 |                           0.71 / 0.26 |                 204.84 / 208.91 |          6 / 6 |
| packages/settings          |              8.70 / 8.08 |           985.94 / 968.97 |                           0.68 / 0.32 |                 286.41 / 283.75 |          6 / 6 |
| packages/spotlight         |            15.44 / 15.37 |         3275.11 / 3434.60 |                           1.30 / 0.91 |                 846.72 / 847.40 |          6 / 6 |
| packages/translation       |              1.16 / 0.70 |           361.56 / 371.25 |                           0.64 / 0.28 |                 238.28 / 236.56 |          6 / 6 |
| packages/ui                |              9.69 / 9.17 |         1447.06 / 1443.69 |                           0.82 / 0.30 |                 303.36 / 299.61 |          6 / 6 |
| packages/validation        |              8.33 / 7.91 |           722.46 / 672.08 |                           0.64 / 0.25 |                 222.19 / 214.38 |          6 / 6 |
| packages/widgets           |            15.26 / 15.07 |         3704.25 / 3449.87 |                           1.39 / 0.94 |                 850.71 / 847.91 |          6 / 6 |
| packages/workshop          |              0.94 / 0.45 |           301.09 / 297.03 |                           0.50 / 0.13 |                 136.21 / 128.52 |          6 / 6 |

## Disk and sharing

Sizes deduplicate hardlinks by device/inode and include directory blocks. Cache archives use local tar/zstd; restore timings exclude network transfer.

Installed trees were reused for this workspace/build run. Complete cache and install disk comparisons are reported in the install benchmark.

- pnpm lock: 940,027 bytes, 26,484 lines.
- bun lock: 665,262 bytes, 6,405 lines.
- pnpm react: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- pnpm @mantine/core: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- bun react: 4 workspace probes, 1 distinct resolved paths, 0 errors.
- bun @mantine/core: 4 workspace probes, 1 distinct resolved paths, 0 errors.

## Conflict resolution

Measured policy: merge both manifest additions; choose the right-hand version for a competing dependency; regenerate from the left lock; run a frozen install. Human effort is not measured.

| Case | Manager | Conflict files (range) | Conflict hunks (range) | Version decisions | Unexpected new versions | Intent + frozen validation |
| ---- | ------- | ---------------------: | ---------------------: | ----------------: | ----------------------: | -------------------------- |

## Recorded failures

- pnpm repository-format trial 1: exit 1; `229-pnpm-repository-format-1.log`.
- pnpm repository-format trial 2: exit 1; `238-pnpm-repository-format-2.log`.
- pnpm repository-format trial 3: exit 1; `241-pnpm-repository-format-3.log`.

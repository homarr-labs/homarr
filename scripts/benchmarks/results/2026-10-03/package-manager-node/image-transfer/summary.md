# Local image transfer

Sequential immutable-image exports; three single-thread zstd -3 compressions and three local loads per image. Docker load uses an already populated layer store. These are warm local import timings, not cold pulls, registry compression, or network transfer measurements.

| Metric                               | pnpm/Node | Bun/Node |
| ------------------------------------ | --------: | -------: |
| Uncompressed image, MiB              |    459.41 |   454.51 |
| Allocated application files, MiB     |    294.27 |   312.29 |
| zstd export, decimal MB              |    114.75 |   118.68 |
| Single-thread zstd -3, seconds (n=3) |     2.548 |    2.630 |
| Warm local import, seconds (n=3)     |     0.753 |    0.753 |

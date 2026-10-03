## Image footprint and local archives

| Metric                               |               Node baseline |               Bun candidate |
| ------------------------------------ | --------------------------: | --------------------------: |
| Docker image bytes                   |                 481,721,565 |                 401,902,753 |
| /app allocated bytes                 |                 308,568,064 |                 318,824,448 |
| /app files                           |                       9,506 |                       9,455 |
| docker save tar bytes                |                 492,477,952 |                 410,387,456 |
| zstd -3 archive bytes                |                 114,943,357 |                 106,018,413 |
| Layers                               |                          23 |                          18 |
| Runtime binary allocated bytes       |                 128,552,960 |                  73,482,240 |
| docker-save: seconds                 |    3.524 (3.524–3.524; n=1) |    3.912 (3.912–3.912; n=1) |
| docker-save: peak RSS MiB            | 27.031 (27.031–27.031; n=1) | 27.344 (27.344–27.344; n=1) |
| docker-save: user CPU seconds        |    0.050 (0.050–0.050; n=1) |    0.050 (0.050–0.050; n=1) |
| docker-save: system CPU seconds      |    0.520 (0.520–0.520; n=1) |    0.410 (0.410–0.410; n=1) |
| zstd-compress: seconds               |    1.579 (1.530–1.721; n=3) |    1.447 (1.410–1.556; n=3) |
| zstd-compress: peak RSS MiB          | 43.594 (43.125–44.062; n=3) | 46.250 (46.094–46.719; n=3) |
| zstd-compress: user CPU seconds      |    1.650 (1.590–1.760; n=3) |    1.490 (1.460–1.610; n=3) |
| zstd-compress: system CPU seconds    |    0.210 (0.200–0.220; n=3) |    0.180 (0.170–0.200; n=3) |
| warm-docker-load: seconds            |    0.619 (0.615–0.643; n=3) |    0.572 (0.463–0.583; n=3) |
| warm-docker-load: peak RSS MiB       | 27.500 (27.031–27.500; n=3) | 27.188 (27.188–27.344; n=3) |
| warm-docker-load: user CPU seconds   |    0.550 (0.550–0.590; n=3) |    0.530 (0.430–0.530; n=3) |
| warm-docker-load: system CPU seconds |    0.460 (0.450–0.480; n=3) |    0.400 (0.390–0.440; n=3) |

The image is 16.6% smaller; the compressed local export is 7.8% smaller. /app allocation grew 3.3%; much of the image saving is the smaller runtime and changed base/dependency graph. Docker save/import client RSS excludes daemon memory. Single-thread compression has three observations. Warm imports reuse existing layers and do not measure registry or cold network pulls.

Sequential immutable-image exports; three single-thread zstd -3 compressions and three local loads per image. Docker load uses an already populated layer store. These are warm local import timings, not cold pulls, registry compression, or network transfer measurements.

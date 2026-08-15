# Performance findings

This file grew past 1,200 lines covering server memory, client rendering, methodology and a long
list of rejected ideas at once. It has been split by subject under [`docs/perf/`](./docs/perf/):

| document | subject |
| --- | --- |
| [docs/perf/README.md](./docs/perf/README.md) | Headline results and the change-by-change ratio table |
| [docs/perf/SERVER-MEMORY.md](./docs/perf/SERVER-MEMORY.md) | What the container's RAM is made of, layer by layer, and what reduced it |
| [docs/perf/CLIENT-PERFORMANCE.md](./docs/perf/CLIENT-PERFORMANCE.md) | Dashboard cost in Chrome: DOM, fibers, images, paint |
| [docs/perf/REJECTED.md](./docs/perf/REJECTED.md) | Ideas implemented, measured, and abandoned — with their numbers |
| [docs/perf/METHODOLOGY.md](./docs/perf/METHODOLOGY.md) | The tools, and the measurement traps that produced wrong answers |

## Result in one table

Server RAM, merge-base `06724cfeb` vs this branch, two alternated runs per side, cgroup **anonymous**
memory — the figure that counts against a container limit:

| stage | before | after | change |
| --- | --- | --- | --- |
| **peak** | 376.6 MiB | **279.3 MiB** | **−26%** |
| boot idle | 130.5 MiB | **62.4 MiB** | **−52%** |
| after sign-in | 247.4 MiB | **142.9 MiB** | **−42%** |
| dashboard loaded | 293.4 MiB | **170.4 MiB** | **−42%** |
| 4 tabs, 2 boards | 366.5 MiB | **258.2 MiB** | **−30%** |
| after 2 min idle soak | 323.7 MiB | **200.8 MiB** | **−38%** |

No before/after range overlaps at any stage. Cost: **+18% CPU**, solid and non-overlapping.

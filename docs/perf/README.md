# Homarr performance investigation

Measured work on Homarr's memory and rendering cost, split by subject. Every figure here comes from
a run of `scripts/benchmarks/stress-restore.mts` against a **restored real backup** — 4 boards, 51
widgets, 11 integrations, driven through an actual login — not from a synthetic or empty container.

| document | subject |
| --- | --- |
| [SERVER-MEMORY.md](./SERVER-MEMORY.md) | What the container's RAM is made of, and the changes that reduced it |
| [CLIENT-PERFORMANCE.md](./CLIENT-PERFORMANCE.md) | Dashboard rendering cost in Chrome: DOM, fibers, images, paint |
| [REJECTED.md](./REJECTED.md) | Ideas that were implemented and measured, then abandoned — with the numbers |
| [METHODOLOGY.md](./METHODOLOGY.md) | The tools, and the measurement traps that produced wrong answers |

## Headline result

Server RAM, merge-base `06724cfeb` vs this branch, two alternated runs per side, reported as cgroup
**anonymous** memory because that is what counts against a container limit and cannot be reclaimed:

| stage | before | after | change |
| --- | --- | --- | --- |
| **peak** | 376.6 MiB | **279.3 MiB** | **−26%** |
| boot idle | 130.5 MiB | **62.4 MiB** | **−52%** |
| after sign-in | 247.4 MiB | **142.9 MiB** | **−42%** |
| dashboard loaded | 293.4 MiB | **170.4 MiB** | **−42%** |
| 4 tabs, 2 boards | 366.5 MiB | **258.2 MiB** | **−30%** |
| after 2 min idle soak | 323.7 MiB | **200.8 MiB** | **−38%** |

No before/after range overlaps at any stage. The cost is **+18% CPU** (solid, non-overlapping).

## The changes that did it, by ratio

| change | size | effect |
| --- | --- | --- |
| `--max-semi-space-size=4` | **1 line** | −19% idle, −21% peak |
| `preloadEntriesOnStart: false` | **1 line** | −52% anon at idle, 310 fewer files even at full load |
| Umami: stop fetching 100k raw events per refresh | 1 file | −26% peak, −93% transient buffers |
| `serverExternalPackages` (mysql2/pg + 8 more) | 1 block | −21 MiB idle |
| ssh2's 16 MiB WASM heap (docker-modem patch) | 1 patch | −15 to −18 MiB external |
| `content-visibility` on media-release cards | 4 lines | −59% image requests, −41% layout objects |

## What is left, and why it is hard

One lever has real headroom and it pays twice. Roughly **41 MiB of retained bundle source** and
**~38 MiB of V8 compiler zone memory** both scale with how much JavaScript the server loads and
compiles, and the largest single contributor is a **16.10 MiB subtree reached by every API route** —
the tRPC router importing every integration eagerly. Reducing that reduces both.

Everything else has been measured and closed: see [REJECTED.md](./REJECTED.md).

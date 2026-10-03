## Production benchmark

Baseline `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`; candidate `57955d9f5e6c5c80bded9dcf502a14aa71114af0`.

Dedicated builders; cold warmups followed by balanced warm source changes. Cold build timings have one observation per image. Warm rebuilds have two observations per image.

| Build metric                              |   Node/pnpm seconds (range) |         Bun seconds (range) |
| ----------------------------------------- | --------------------------: | --------------------------: |
| Cold image build                          | 272.07 (272.07–272.07; n=1) | 209.11 (209.11–209.11; n=1) |
| Cold image build: full harness command    | 293.79 (293.79–293.79; n=1) | 225.01 (225.01–225.01; n=1) |
| Cold image build: Next compile            |                           — |                           — |
| Warm source rebuild                       |    54.42 (50.94–57.91; n=2) |    38.25 (36.81–39.69; n=2) |
| Warm source rebuild: full harness command |    70.10 (66.39–73.82; n=2) |    53.89 (52.14–55.65; n=2) |
| Warm source rebuild: Next compile         |       4.80 (4.30–5.30; n=2) |       4.25 (3.70–4.80; n=2) |

Three fresh containers per image, two CPUs and 1 GiB each, UID/GID 1000. Every run loads the same eight-widget seeded board in 20 fresh authenticated browser contexts, checks widget data, opens search seven times, exercises four management routes and WebSockets, then samples for ten minutes. Browser and excluded ingress proxy traffic are isolated from external providers.

Page figures are medians of each container’s page-sample median, with the range across containers. Memory, startup and cold-search values are descriptive observations from independent containers. The 20 settle samples within each container are correlated; they are not 20 independent memory trials.

| Runtime metric                             |            Node median (range) |             Bun median (range) |
| ------------------------------------------ | -----------------------------: | -----------------------------: |
| Start to ready, seconds                    |          3.02 (2.49–3.65; n=3) |          2.48 (2.48–2.59; n=3) |
| Board mounted, ms                          |    455.00 (361.50–489.50; n=3) |    579.50 (561.00–602.00; n=3) |
| TTFB, ms                                   |       91.00 (89.00–91.50; n=3) |       74.50 (70.50–76.50; n=3) |
| FCP, ms                                    |    218.00 (208.00–222.00; n=3) |    198.00 (192.00–210.00; n=3) |
| LCP, ms                                    | 1416.00 (1400.00–1432.00; n=3) | 1394.00 (1372.00–1454.00; n=3) |
| Widget implementations mounted, ms         | 1446.00 (1428.50–1475.50; n=3) | 1536.00 (1509.50–1577.00; n=3) |
| Widget data settled, ms                    | 2085.00 (2060.00–2102.50; n=3) | 2037.50 (2012.00–2114.50; n=3) |
| Cold search ready, ms                      | 1020.00 (1001.00–1381.00; n=3) |  1013.00 (738.00–1442.00; n=3) |
| Warm search open, ms                       |    129.00 (128.00–131.00; n=3) |    131.00 (114.00–136.00; n=3) |
| WebSocket readiness, ms                    |          6.00 (6.00–7.00; n=3) |          6.00 (6.00–7.00; n=3) |
| Startup cgroup memory, MiB                 |    146.59 (137.83–226.66; n=3) |    184.84 (180.54–190.35; n=3) |
| Workload cgroup memory, MiB                |    341.99 (340.85–460.97; n=3) |    567.78 (560.49–599.95; n=3) |
| Settle median cgroup memory, MiB           |    332.89 (326.37–448.08; n=3) |    506.44 (495.99–518.38; n=3) |
| Settle minimum cgroup memory, MiB          |    318.44 (310.91–432.78; n=3) |    486.44 (479.56–514.29; n=3) |
| Settle p95 cgroup memory, MiB              |    338.43 (331.32–452.46; n=3) |    555.78 (540.57–571.99; n=3) |
| Settle maximum cgroup memory, MiB          |    338.55 (331.55–454.53; n=3) |    555.88 (543.16–573.19; n=3) |
| Cgroup peak memory, MiB                    |    351.18 (347.33–472.90; n=3) |    587.39 (579.00–619.52; n=3) |
| Settle anonymous memory, MiB               |    304.05 (302.68–309.73; n=3) |    489.29 (488.84–511.29; n=3) |
| Settle file memory, MiB                    |       14.17 (2.04–129.69; n=3) |         1.33 (1.33–11.33; n=3) |
| Startup-to-workload CPU, seconds           |       30.05 (29.98–30.11; n=3) |       23.61 (23.04–24.86; n=3) |
| Ten-minute settle CPU, seconds             |          6.75 (6.68–7.46; n=3) |       11.40 (11.35–12.27; n=3) |
| Workload-to-settle CPU throttling, seconds |          0.72 (0.52–0.87; n=3) |          0.00 (0.00–0.00; n=3) |
| First-to-last settle memory change, MiB    |       15.80 (14.97–15.88; n=3) |    -74.50 (-81.20–-26.48; n=3) |
| Final Redis allocator used memory, MiB     |          3.41 (3.41–3.42; n=3) |          3.35 (3.34–3.36; n=3) |
| Settle application-server PSS, MiB         |    342.38 (341.65–348.30; n=3) |    538.29 (537.88–560.50; n=3) |
| Settle redis-server PSS, MiB               |          8.26 (8.18–8.41; n=3) |        10.00 (9.99–10.01; n=3) |
| Settle nginx PSS, MiB                      |          4.69 (4.63–4.70; n=3) |          4.80 (4.77–4.92; n=3) |
| /manage route navigation, ms               |    610.00 (584.00–641.00; n=3) |    553.00 (369.00–576.00; n=3) |
| /manage/apps route navigation, ms          |    433.00 (367.00–803.00; n=3) |    326.00 (325.00–834.00; n=3) |
| /manage/integrations route navigation, ms  |    270.00 (224.00–476.00; n=3) |    208.00 (205.00–575.00; n=3) |
| /manage/settings route navigation, ms      |    651.00 (616.00–986.00; n=3) |    564.00 (529.00–665.00; n=3) |

| Validation                  | Node | Bun |
| --------------------------- | ---: | --: |
| Claim-eligible runtime runs |    3 |   3 |
| Fresh dashboard loads       |   60 |  60 |
| Settle checkpoints          |   60 |  60 |
| Widget errors               |    0 |   0 |

These compare complete migrations, including different dependency graphs and base-image packages. They do not isolate the JavaScript engine. Cold builds and runtime diagnostics are not claims of statistical significance. Eligibility and raw per-run data remain authoritative.

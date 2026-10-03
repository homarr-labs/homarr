## Production benchmark

Baseline `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`; candidate `57955d9f5e6c5c80bded9dcf502a14aa71114af0`.

Dedicated builders; cold warmups followed by balanced warm source changes. Cold build timings have one observation per image. Warm rebuilds have two observations per image.

| Build metric                              |   Node/pnpm seconds (range) |         Bun seconds (range) |
| ----------------------------------------- | --------------------------: | --------------------------: |
| Cold image build                          | 241.42 (241.42–241.42; n=1) | 238.36 (238.36–238.36; n=1) |
| Cold image build: full harness command    | 261.05 (261.05–261.05; n=1) | 257.70 (257.70–257.70; n=1) |
| Cold image build: Next compile            |    68.00 (68.00–68.00; n=1) |    73.00 (73.00–73.00; n=1) |
| Warm source rebuild                       |    52.01 (49.96–54.06; n=2) |    42.30 (36.88–47.71; n=2) |
| Warm source rebuild: full harness command |    66.66 (64.45–68.87; n=2) |    56.88 (51.30–62.46; n=2) |
| Warm source rebuild: Next compile         |       2.70 (2.20–3.20; n=2) |       2.69 (1.99–3.40; n=2) |

Three fresh containers per image, two CPUs and 1 GiB each, UID/GID 1000. Every run loads the same eight-widget seeded board in 20 fresh authenticated browser contexts, checks widget data, opens search seven times, exercises four management routes and WebSockets, then samples for ten minutes. Browser and excluded ingress proxy traffic are isolated from external providers.

Page figures are medians of each container’s page-sample median, with the range across containers. Memory, startup and cold-search values are descriptive observations from independent containers. The 20 settle samples within each container are correlated; they are not 20 independent memory trials.

| Runtime metric                             |            Node median (range) |             Bun median (range) |
| ------------------------------------------ | -----------------------------: | -----------------------------: |
| Start to ready, seconds                    |         9.23 (9.03–10.44; n=3) |         9.36 (8.89–10.71; n=3) |
| Board mounted, ms                          |    246.00 (245.00–264.00; n=3) |    381.00 (215.00–528.00; n=3) |
| TTFB, ms                                   |       85.50 (84.50–98.00; n=3) |       65.50 (65.50–68.50; n=3) |
| FCP, ms                                    |    172.00 (170.00–180.00; n=3) |    154.00 (152.00–156.00; n=3) |
| LCP, ms                                    | 1116.00 (1116.00–1116.00; n=3) | 1112.00 (1094.00–1112.00; n=3) |
| Widget implementations mounted, ms         | 1179.50 (1147.50–1181.00; n=3) | 1214.50 (1176.50–1253.00; n=3) |
| Widget data settled, ms                    | 1751.50 (1746.50–1776.00; n=3) | 1739.50 (1717.50–1758.50; n=3) |
| Cold search ready, ms                      | 1286.00 (1101.00–1294.00; n=3) | 1267.00 (1100.00–1352.00; n=3) |
| Warm search open, ms                       |     118.00 (88.00–127.00; n=3) |     116.00 (88.00–127.00; n=3) |
| WebSocket readiness, ms                    |          7.00 (6.00–8.00; n=3) |         6.00 (6.00–14.00; n=3) |
| Startup cgroup memory, MiB                 |    135.14 (132.14–153.22; n=3) |    179.59 (179.05–180.05; n=3) |
| Workload cgroup memory, MiB                |    334.36 (327.50–347.02; n=3) |    568.18 (556.36–570.74; n=3) |
| Settle median cgroup memory, MiB           |    316.03 (314.74–335.45; n=3) |    502.89 (496.26–508.05; n=3) |
| Settle minimum cgroup memory, MiB          |    303.05 (299.71–321.41; n=3) |    499.26 (478.91–503.13; n=3) |
| Settle p95 cgroup memory, MiB              |    320.99 (319.79–341.17; n=3) |    546.01 (545.43–550.48; n=3) |
| Settle maximum cgroup memory, MiB          |    322.88 (322.16–342.66; n=3) |    546.96 (545.86–550.52; n=3) |
| Cgroup peak memory, MiB                    |    338.41 (338.09–360.38; n=3) |    592.57 (583.45–601.32; n=3) |
| Settle anonymous memory, MiB               |    300.90 (300.89–302.10; n=3) |    496.30 (488.61–501.36; n=3) |
| Settle file memory, MiB                    |         1.35 (1.34–21.66; n=3) |          1.34 (1.34–2.18; n=3) |
| Startup-to-workload CPU, seconds           |       28.83 (28.42–29.49; n=3) |       22.32 (22.25–22.77; n=3) |
| Ten-minute settle CPU, seconds             |          6.72 (6.51–6.98; n=3) |       11.86 (11.66–11.89; n=3) |
| Workload-to-settle CPU throttling, seconds |          0.99 (0.79–1.15; n=3) |          0.00 (0.00–0.00; n=3) |
| First-to-last settle memory change, MiB    |       14.30 (13.28–15.87; n=3) |    -43.28 (-68.49–-38.11; n=3) |
| Final Redis allocator used memory, MiB     |          3.43 (3.42–3.44; n=3) |          3.39 (3.38–3.40; n=3) |
| Settle application-server PSS, MiB         |    325.68 (325.44–326.79; n=3) |    543.04 (535.17–547.75; n=3) |
| Settle redis-server PSS, MiB               |          8.48 (8.48–8.53; n=3) |        10.04 (9.98–10.18; n=3) |
| Settle nginx PSS, MiB                      |          4.86 (4.79–4.87; n=3) |          4.85 (4.81–4.89; n=3) |
| /manage route navigation, ms               |    235.00 (209.00–324.00; n=3) |    271.00 (268.00–272.00; n=3) |
| /manage/apps route navigation, ms          |    409.00 (359.00–629.00; n=3) |    321.00 (279.00–322.00; n=3) |
| /manage/integrations route navigation, ms  |    248.00 (231.00–378.00; n=3) |    223.00 (186.00–273.00; n=3) |
| /manage/settings route navigation, ms      |    684.00 (456.00–723.00; n=3) |    571.00 (469.00–774.00; n=3) |

| Validation                  | Node | Bun |
| --------------------------- | ---: | --: |
| Claim-eligible runtime runs |    3 |   3 |
| Fresh dashboard loads       |   60 |  60 |
| Settle checkpoints          |   60 |  60 |
| Widget errors               |    0 |   0 |

These compare complete migrations, including different dependency graphs and base-image packages. They do not isolate the JavaScript engine. Cold builds and runtime diagnostics are not claims of statistical significance. Eligibility and raw per-run data remain authoritative.

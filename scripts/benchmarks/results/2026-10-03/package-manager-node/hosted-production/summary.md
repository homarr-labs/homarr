## Production benchmark

Baseline `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`; candidate `8a12ea1e4af800f9dbf0c1e753af1b953f6b7c42`.

Dedicated builders; cold warmups followed by balanced warm source changes. Cold build timings have one observation per image. Warm rebuilds have two observations per image.

| Build metric                              |    Baseline seconds (range) |   Candidate seconds (range) |
| ----------------------------------------- | --------------------------: | --------------------------: |
| Cold image build                          | 286.86 (286.86–286.86; n=1) | 218.13 (218.13–218.13; n=1) |
| Cold image build: full harness command    | 309.26 (309.26–309.26; n=1) | 234.16 (234.16–234.16; n=1) |
| Cold image build: Next compile            |                           — |                           — |
| Warm source rebuild                       |    56.92 (53.93–59.90; n=2) |    41.28 (40.51–42.04; n=2) |
| Warm source rebuild: full harness command |    72.37 (69.39–75.34; n=2) |    57.15 (56.09–58.20; n=2) |
| Warm source rebuild: Next compile         |       4.80 (4.70–4.90; n=2) |       6.50 (6.50–6.50; n=2) |

Three fresh containers per image, two CPUs and 1 GiB each, UID/GID 1000. Every run loads the same eight-widget seeded board in 20 fresh authenticated browser contexts, checks widget data, opens search seven times, exercises four management routes and WebSockets, then samples for ten minutes. Browser and excluded ingress proxy traffic are isolated from external providers.

Page figures are medians of each container’s page-sample median, with the range across containers. Memory, startup and cold-search values are descriptive observations from independent containers. The 20 settle samples within each container are correlated; they are not 20 independent memory trials.

| Runtime metric                             |        Baseline median (range) |       Candidate median (range) |
| ------------------------------------------ | -----------------------------: | -----------------------------: |
| Start to ready, seconds                    |          2.51 (2.46–3.42; n=3) |          3.02 (3.01–3.14; n=3) |
| Board mounted, ms                          |    413.50 (386.50–446.50; n=3) |    422.50 (365.50–434.50; n=3) |
| TTFB, ms                                   |      96.00 (91.50–101.00; n=3) |       93.00 (89.00–96.00; n=3) |
| FCP, ms                                    |    224.00 (224.00–228.00; n=3) |    216.00 (208.00–226.00; n=3) |
| LCP, ms                                    | 1460.00 (1448.00–1514.00; n=3) | 1414.00 (1412.00–1454.00; n=3) |
| Widget implementations mounted, ms         | 1493.50 (1482.00–1579.00; n=3) | 1459.50 (1443.50–1496.50; n=3) |
| Widget data settled, ms                    | 2123.50 (2114.50–2199.00; n=3) | 2078.50 (2056.50–2132.00; n=3) |
| Cold search ready, ms                      | 1049.00 (1031.00–1408.00; n=3) |  1020.00 (979.00–1041.00; n=3) |
| Warm search open, ms                       |    139.00 (138.00–148.00; n=3) |    142.00 (131.00–149.00; n=3) |
| WebSocket readiness, ms                    |         7.00 (6.00–10.00; n=3) |          6.00 (6.00–7.00; n=3) |
| Startup cgroup memory, MiB                 |    133.12 (132.75–189.66; n=3) |    133.68 (131.07–135.82; n=3) |
| Workload cgroup memory, MiB                |    335.30 (333.77–409.86; n=3) |    333.70 (328.30–342.27; n=3) |
| Settle median cgroup memory, MiB           |    325.81 (320.10–384.54; n=3) |    320.48 (316.14–323.90; n=3) |
| Settle minimum cgroup memory, MiB          |    307.87 (307.60–371.54; n=3) |    305.38 (303.07–310.09; n=3) |
| Settle p95 cgroup memory, MiB              |    327.23 (324.29–390.45; n=3) |    323.38 (321.15–329.67; n=3) |
| Settle maximum cgroup memory, MiB          |    331.67 (324.81–393.29; n=3) |    327.96 (321.43–331.12; n=3) |
| Cgroup peak memory, MiB                    |    347.89 (340.54–416.60; n=3) |    343.93 (338.95–348.24; n=3) |
| Settle anonymous memory, MiB               |    305.27 (304.66–309.06; n=3) |    304.64 (301.38–304.83; n=3) |
| Settle file memory, MiB                    |         1.34 (1.33–62.22; n=3) |          1.33 (1.33–1.33; n=3) |
| Startup-to-workload CPU, seconds           |       31.70 (30.63–31.94; n=3) |       30.80 (29.42–30.84; n=3) |
| Ten-minute settle CPU, seconds             |          7.23 (6.96–7.73; n=3) |          6.89 (6.34–6.90; n=3) |
| Workload-to-settle CPU throttling, seconds |          0.57 (0.28–0.61; n=3) |          0.67 (0.34–0.67; n=3) |
| First-to-last settle memory change, MiB    |       13.72 (12.80–19.36; n=3) |       14.23 (13.35–15.87; n=3) |
| Final Redis allocator used memory, MiB     |          3.42 (3.41–3.44; n=3) |          3.41 (3.40–3.42; n=3) |
| Settle application-server PSS, MiB         |    344.36 (344.02–348.32; n=3) |                              — |
| Settle redis-server PSS, MiB               |          8.42 (8.31–8.44; n=3) |                              — |
| Settle nginx PSS, MiB                      |          4.90 (4.88–4.93; n=3) |                              — |
| /manage route navigation, ms               |    632.00 (611.00–745.00; n=3) |    580.00 (359.00–594.00; n=3) |
| /manage/apps route navigation, ms          |    360.00 (341.00–658.00; n=3) |    594.00 (371.00–668.00; n=3) |
| /manage/integrations route navigation, ms  |    337.00 (226.00–654.00; n=3) |    318.00 (227.00–364.00; n=3) |
| /manage/settings route navigation, ms      |   987.00 (981.00–1003.00; n=3) |  1022.00 (794.00–1231.00; n=3) |

| Validation                  | Baseline | Candidate |
| --------------------------- | -------: | --------: |
| Claim-eligible runtime runs |        3 |         3 |
| Fresh dashboard loads       |       60 |        60 |
| Settle checkpoints          |       60 |        60 |
| Widget errors               |        0 |         0 |

These compare complete migrations, including different dependency graphs and base-image packages. They do not isolate the JavaScript engine. Unreadable process PSS is omitted, never interpreted as zero memory. Cold builds and runtime diagnostics are not claims of statistical significance. Eligibility and raw per-run data remain authoritative.

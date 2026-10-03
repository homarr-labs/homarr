# Local production runtime observations

Baseline `3adb63850d8fd8f9ea2b3d72db82f4591f950e41`; candidate `8a12ea1e4af800f9dbf0c1e753af1b953f6b7c42`.

The combined build comparison is ineligible: baseline builds were reused after the candidate native-binding repair, so build order is not balanced. Earlier baseline build timing also overlapped local act. Local build times are excluded; use the fully balanced hosted series. All six runtime trials are individually eligible, and paired validation rejects only build chronology. See `comparison-scope.json` and the preserved comparator rejections. The following are descriptive runtime levels.

Three fresh containers per image, two CPUs and 1 GiB each, UID/GID 1000. Every run loads the same eight-widget seeded board in 20 fresh authenticated browser contexts, checks widget data, opens search seven times, exercises four management routes and WebSockets, then samples for ten minutes. Browser and excluded ingress proxy traffic are isolated from external providers.

Page figures are medians of each container’s page-sample median, with the range across containers. Memory, startup and cold-search values are descriptive observations from independent containers. The 20 settle samples within each container are correlated; they are not 20 independent memory trials.

| Runtime metric                             |        Baseline median (range) |       Candidate median (range) |
| ------------------------------------------ | -----------------------------: | -----------------------------: |
| Start to ready, seconds                    |         9.65 (9.24–10.43; n=3) |       10.18 (10.03–10.32; n=3) |
| Board mounted, ms                          |    339.00 (312.50–358.50; n=3) |    316.50 (309.00–323.00; n=3) |
| TTFB, ms                                   |    111.00 (104.00–112.00; n=3) |    106.50 (106.50–109.00; n=3) |
| FCP, ms                                    |    206.00 (198.00–206.00; n=3) |    200.00 (188.00–204.00; n=3) |
| LCP, ms                                    | 1384.00 (1378.00–1406.00; n=3) | 1362.00 (1360.00–1400.00; n=3) |
| Widget implementations mounted, ms         | 1424.50 (1421.50–1445.00; n=3) | 1402.00 (1399.00–1441.00; n=3) |
| Widget data settled, ms                    | 2077.50 (2062.00–2083.00; n=3) | 2037.50 (2034.00–2092.00; n=3) |
| Cold search ready, ms                      | 1048.00 (1040.00–1471.00; n=3) | 1026.00 (1002.00–1053.00; n=3) |
| Warm search open, ms                       |    134.00 (131.00–150.00; n=3) |    130.00 (124.00–153.00; n=3) |
| WebSocket readiness, ms                    |          7.00 (7.00–9.00; n=3) |          7.00 (7.00–7.00; n=3) |
| Startup cgroup memory, MiB                 |    132.82 (131.28–188.90; n=3) |    133.42 (131.73–244.07; n=3) |
| Workload cgroup memory, MiB                |    347.50 (330.27–436.86; n=3) |    342.64 (325.93–471.69; n=3) |
| Settle median cgroup memory, MiB           |    319.04 (317.89–407.88; n=3) |    315.23 (312.79–454.26; n=3) |
| Settle minimum cgroup memory, MiB          |    305.73 (302.13–394.44; n=3) |    300.82 (299.66–441.53; n=3) |
| Settle p95 cgroup memory, MiB              |    324.34 (321.76–412.94; n=3) |    319.63 (319.00–460.14; n=3) |
| Settle maximum cgroup memory, MiB          |    326.12 (323.87–414.70; n=3) |    321.57 (320.77–461.88; n=3) |
| Cgroup peak memory, MiB                    |    351.63 (342.08–441.25; n=3) |    346.48 (339.13–483.59; n=3) |
| Settle anonymous memory, MiB               |    303.61 (303.35–304.89; n=3) |    299.10 (298.80–300.93; n=3) |
| Settle file memory, MiB                    |         1.68 (1.35–89.88; n=3) |        1.58 (1.33–142.50; n=3) |
| Startup-to-workload CPU, seconds           |       30.48 (30.34–31.33; n=3) |       30.49 (29.92–31.15; n=3) |
| Ten-minute settle CPU, seconds             |          7.69 (7.41–7.84; n=3) |          7.22 (7.09–7.54; n=3) |
| Workload-to-settle CPU throttling, seconds |          1.07 (0.98–1.58; n=3) |          1.23 (0.98–1.39; n=3) |
| First-to-last settle memory change, MiB    |       13.99 (13.71–16.11; n=3) |       13.23 (12.30–16.68; n=3) |
| Final Redis allocator used memory, MiB     |          3.42 (3.42–3.43; n=3) |          3.41 (3.41–3.41; n=3) |
| Settle application-server PSS, MiB         |    326.54 (326.23–327.99; n=3) |                              — |
| Settle redis-server PSS, MiB               |          8.35 (8.25–8.42; n=3) |                              — |
| Settle nginx PSS, MiB                      |          4.65 (4.64–4.70; n=3) |                              — |
| /manage route navigation, ms               |    343.00 (336.00–348.00; n=3) |    402.00 (380.00–434.00; n=3) |
| /manage/apps route navigation, ms          |    402.00 (363.00–504.00; n=3) |    470.00 (290.00–491.00; n=3) |
| /manage/integrations route navigation, ms  |    340.00 (330.00–590.00; n=3) |    348.00 (316.00–359.00; n=3) |
| /manage/settings route navigation, ms      | 1081.00 (1002.00–1116.00; n=3) |    579.00 (533.00–580.00; n=3) |

| Validation                  | Baseline | Candidate |
| --------------------------- | -------: | --------: |
| Claim-eligible runtime runs |        3 |         3 |
| Fresh dashboard loads       |       60 |        60 |
| Settle checkpoints          |       60 |        60 |
| Widget errors               |        0 |         0 |

These compare complete migrations, including different dependency graphs and base-image packages. They do not isolate the JavaScript engine. Unreadable process PSS is omitted, never interpreted as zero memory. Cold builds and runtime diagnostics are not claims of statistical significance. Eligibility and raw per-run data remain authoritative.

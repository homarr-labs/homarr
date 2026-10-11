# Parallel implementation dispatch

All 62 findings were assigned to 13 non-overlapping implementation lanes using GPT-6.1 Sol with extra-high reasoning. Two additional agents built the benchmark harness and prepared the environment/current documentation; completed agents were reused for independent review and report generation. Production edits ran in parallel. Timings ran serially to reduce contention.

| Lane | Finding count | Finding IDs | Primary scope |
| --- | ---: | --- | --- |
| api_core | 5 | `API-001`, `API-003`, `API-004`, `A-1`, `NRA-001` | Board reconciliation, Docker matching, app visibility, RSS and permissions |
| api_io | 3 | `API-002`, `API-005`, `API-006` | Custom widget sources, integration payloads and Kubernetes pods |
| services | 9 | `F1`, `F2`, `F3`, `DCR-001`, `DCR-002`, `CLI001`, `CLI002`, `CLI003`, `FW-002` | CLI queries, translation merging, icon/cron startup and integrations |
| custom_widgets | 2 | `CW-1`, `FW-001` | Custom JSX validation and workbench diagnostics |
| management | 7 | `NMG-001`, `NMG-002`, `NMG-004`, `NMG-005`, `NSC-1`, `MTAIL-001`, `MTAIL-002` | Management pages, request caches, diagnostics polling and lookups |
| assistant | 2 | `NA-001`, `MEGA-mega_contexts-01` | Assistant metadata parsing and conversation summaries |
| board_forms | 7 | `NBL-001`, `MEGA-mega_forms-01`, `SUI-001`, `SUI-002`, `SUI-005`, `SUI-006`, `WB-004` | Board selection, modal providers, forms and shared UI |
| widget_aggregates | 4 | `WB-001`, `WB-002`, `WTA-1`, `WMB2-1` | Kuma, Speedtest, Tracearr and Traefik aggregates |
| widget_lookups | 5 | `A4`, `WIDGETS_B_002`, `WIDGETS_B_003`, `WIDGETS_B_004`, `WIDGETS_B_007` | Bookmark/app prefetch, Docker releases and widget sorting |
| widget_render | 6 | `A2`, `A5`, `WIDGETS_B_005`, `WIDGETS_B_006`, `WIDGETS_B_008`, `WIDGETS_B_009` | Media/Wazuh visibility work, Coolify, cluster and dates |
| notebook_timers | 4 | `RS-001`, `WMA1-01`, `A3`, `WMB1-1` | Notebook effects/statistics and evaluated row-clock prototypes |
| routes_assets | 3 | `MEGA-assets-01`, `MEGA-mega_routes-01`, `MEGA-mega_routes-02` | Assistant body limit, image streaming and Docker errors |
| accessibility | 5 | `MEGA-mega_design_board-01`, `MEGA-mega_design_manage-01`, `MEGA-mega_design_manage-02`, `MEGA-mega_design_workbench-01`, `MEGA-mega_design_workbench-02` | Board touch targets, focus and control names |

| benchmark_harness | shared | All lanes | Source extraction, paired measurement and benchmark runner in this directory |
| environment_review | shared | All 62 findings | Pinned dependencies, current documentation and independent production review |

The final findings table records implementations and rejected experiments. A dispatch assignment does not imply that a candidate was retained. Detailed fixtures, measured source hashes and dependency seams live in the paired result artifacts.

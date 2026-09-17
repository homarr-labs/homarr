# Widget UI audit

## Scope

Current registry: **60 widget types**. Each type appears at **1×1, 1×2, 2×1, 2×2, 2×3, 3×2, 3×3, 5×3, 3×5, 5×5** (width × height in board units). This is the requested ten-size matrix, not every integer size supported by the editor or every option configuration.

Use 12-column boards, each containing 2–5 related widget types with their ten instances. Retain normal board canvas scaling. Capture the normal dashboard surface and each rendered widget, without substituting report-app renderings for Homarr screenshots.

| Viewport      | CSS pixels  |
| ------------- | ----------- |
| desktop-1080p | 1920 × 1080 |
| desktop-1440p | 2560 × 1440 |
| macbook-pro   | 1512 × 982  |

The MacBook profile represents a common logical browser size, not physical Retina panel resolution. Browser device pixel ratio is recorded with capture evidence.

Expected widget matrix: **600 seeded instances, 1,800 screenshots** plus three full-page screenshots per family board. Full-page images retain viewport width but extend vertically to include all instances.

## Execution plan and roles

All delegated roles use **Luna, high reasoning**. Available slots require waves.

1. `family_seed`: inventory families, create the shared opt-in seed engine and family modules, reuse existing demo fixtures, and enforce complete registry coverage and non-overlapping placements.
2. `server_capture`: prepare an isolated database/environment, run seeding, start the dev server after seed readiness, and create reusable per-family capture tooling.
3. `report`: starts alongside both roles; creates a React report with filters, coverage accounting, full-board evidence, individual size comparisons, and screenshot inspection.
4. Family agents in subsequent waves: own the corresponding family definitions, verify fixtures and board configuration, execute their board captures, inspect representative results, and record limitations.
5. Coordinator: verify inventory/size coverage, geometry, evidence paths, and report behavior; consolidate the UI state report.

## Evidence rules

- Audit seed is explicitly opt-in and reconciles its own boards. Audit boards are public and use `widget-ui-audit-<family>` names on an isolated local database.
- Demo integration content must be identified as demo data. External-media failures and unconfigured services remain visible in capture metadata.
- A saved PNG establishes capture coverage, not visual correctness. Keep error/loading/overflow observations separate from file completeness.
- Do not change production widgets to hide issues discovered during capture.
- No broad unit/e2e/Docker runs are part of this screenshot audit.

## Full widget inventory

| Registry key                  | Display name                 |
| ----------------------------- | ---------------------------- |
| `clock`                       | Date and time                |
| `weather`                     | Weather                      |
| `airQuality`                  | Air Quality & UV             |
| `countdown`                   | Countdowns                   |
| `timer`                       | Timer / Pomodoro             |
| `app`                         | App                          |
| `iframe`                      | iFrame                       |
| `video`                       | Video Stream                 |
| `notebook`                    | Notebook                     |
| `anchorNote`                  | Anchor Note                  |
| `dnsHoleSummary`              | DNS Hole Summary             |
| `dnsHoleControls`             | DNS Hole Controls            |
| `smartHome-entityState`       | Entity State                 |
| `smartHome-executeAutomation` | Execute Automation           |
| `stockPrice`                  | Stock Price                  |
| `mediaServer`                 | Current media server streams |
| `calendar`                    | Calendar                     |
| `downloads`                   | Download Client              |
| `mediaRequests-requestList`   | Media Requests List          |
| `mediaRequests-requestStats`  | Media Requests Stats         |
| `mediaTranscoding`            | Media transcoding            |
| `mediaMissing`                | Missing & Queued Media       |
| `minecraftServerStatus`       | Minecraft Server Status      |
| `networkControllerSummary`    | Network Controller Summary   |
| `networkControllerStatus`     | Network Status               |
| `rssFeed`                     | RSS feeds                    |
| `bookmarks`                   | Bookmarks                    |
| `indexerManager`              | Indexer manager status       |
| `healthMonitoring`            | System Health Monitoring     |
| `releases`                    | Releases                     |
| `mediaReleases`               | Media releases               |
| `dockerContainers`            | Docker stats                 |
| `firewall`                    | Firewall Monitoring          |
| `notifications`               | Notifications                |
| `systemResources`             | System resources             |
| `coolify`                     | Coolify                      |
| `systemDisks`                 | System disks                 |
| `timetable`                   | Timetable                    |
| `immich-serverStats`          | Immich Server Stats          |
| `immich-albumCarousel`        | Immich Album                 |
| `paperlessNgx`                | Paperless-ngx                |
| `patchmon`                    | PatchMon                     |
| `bazarr`                      | Bazarr                       |
| `tracearr`                    | Tracearr                     |
| `speedtestTracker`            | Speedtest Tracker            |
| `uptimeKuma`                  | Uptime Kuma                  |
| `audioStats`                  | Audio stats                  |
| `umami`                       | Umami Analytics              |
| `vpn`                         | VPN                          |
| `archiveTeamWarrior`          | ArchiveTeam Warrior          |
| `ups`                         | UPS                          |
| `beszelSystemTable`           | Beszel Systems (Table)       |
| `beszelSystemGrid`            | Beszel Systems (Grid)        |
| `beszelAlerts`                | Beszel Alerts                |
| `beszelSystemStats`           | Beszel System Stats          |
| `traefik`                     | Traefik                      |
| `customApi`                   | Custom widget                |
| `assistant`                   | Assistant                    |
| `wud`                         | What's Up Docker             |
| `llamacpp`                    | llama.cpp                    |

## Family board assignments

Each family role owns its family definition, board verification, and screenshots. These Luna/high roles run in waves once the shared engine and capture command are ready.

| Agent role                 | Board                         | Widget types                                                                                      |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `family_beszel`            | Beszel monitoring             | `beszelSystemTable`, `beszelSystemGrid`, `beszelAlerts`, `beszelSystemStats`                      |
| `family_content`           | Content and embeds            | `rssFeed`, `bookmarks`, `iframe`, `video`, `notebook`                                             |
| `family_home`              | Home automation and assistant | `smartHome-entityState`, `smartHome-executeAutomation`, `anchorNote`, `assistant`                 |
| `family_library`           | Library and maintenance       | `immich-serverStats`, `immich-albumCarousel`, `paperlessNgx`, `patchmon`, `bazarr`                |
| `family_media_pipeline`    | Media pipeline                | `mediaTranscoding`, `mediaMissing`, `mediaReleases`, `releases`, `indexerManager`                 |
| `family_media_playback`    | Media and travel              | `audioStats`, `minecraftServerStatus`, `timetable`, `stockPrice`                                  |
| `family_media_requests`    | Media requests                | `calendar`, `downloads`, `mediaRequests-requestList`, `mediaRequests-requestStats`, `mediaServer` |
| `family_network`           | Network controls              | `dnsHoleSummary`, `dnsHoleControls`, `networkControllerSummary`, `networkControllerStatus`        |
| `family_observability`     | Observability and activity    | `notifications`, `tracearr`, `speedtestTracker`, `uptimeKuma`, `umami`                            |
| `family_security`          | Security and power            | `firewall`, `vpn`, `archiveTeamWarrior`, `ups`                                                    |
| `family_server_monitoring` | Server monitoring             | `dockerContainers`, `coolify`, `systemResources`, `systemDisks`, `healthMonitoring`               |
| `family_tools`             | Dashboard tools               | `app`, `customApi`, `llamacpp`, `wud`, `traefik`                                                  |
| `family_utility`           | Utility and time              | `clock`, `weather`, `airQuality`, `countdown`, `timer`                                            |

## Verified execution state

- The isolated database `/tmp/homarr-widget-ui-audit.sqlite` passed the persisted geometry/matrix check: 13 boards, 60 types, 600 base placements, no issues.
- Canonical Homarr origin: `http://localhost:3001`; board route: `/boards/widget-ui-audit-<family>`. Use this origin consistently for development assets.
- Normal `demo` / `demo` browser login verified at the canonical origin. No database session tokens were extracted or injected.
- React report: `http://127.0.0.1:4174`. Production bundle build and inventory search smoke passed.
- Worker waves: utility worker owns utility/content/home/tools; report worker next owns network/media-requests/media-pipeline/library; runtime worker next owns server-monitoring/beszel/observability/security/media-playback. All remain Luna/high.

- Final matrix verification passed: 1,800 widget PNGs and 39 board PNGs, with no missing files, duplicate paths, dimension mismatches, or uniform-color crops.
- All 13 family reviews are included in the React report. Small-size clipping/truncation, loading indicators, and permission states are observations, not capture failures.
- The iframe audit fixture uses `/images/demo-dashboard-background.svg` for deterministic local content. Other demo/public-source limitations remain documented per family.
- Report browser checks passed for search, family/viewport/size filtering, and the widget viewer. The MacBook profile uses 2× density in Chromium on Linux, not native Safari.

- Final report is served from its production `dist/` bundle at `http://127.0.0.1:4174`; Homarr remains on its development server at `http://localhost:3001`. The built report has no horizontal overflow at the three target viewport sizes; full-resolution widget and board image loading passed browser checks.
- Beszel desktop captures were refreshed after a 20-second data settle window: all 40 widgets per viewport are populated with no loading indicators.

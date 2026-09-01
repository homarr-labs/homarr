# Release-v2 QA master report

Generated: 2026-09-01T12:42:59.307Z

## Decision: NO-GO

GO requires zero P0/P1 findings and zero critical gaps across assigned cases, widget checks, and report metadata. Current critical gaps: **822**.

## Coverage

| Measure | Passed | Failed | Blocked | Not reached | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Packets | 4 | 1 | 0 | 40 | 45 |
| Cases | 13 | 1 | 0 | 175 | 189 |
| Widget checks | 0 | 0 | 0 | 531 | 531 |

| Wave | Passed | Total |
| --- | ---: | ---: |
| preflight | 3 | 3 |
| board | 1 | 9 |
| widgets | 0 | 12 |
| core-v2 | 0 | 8 |
| whole-product | 0 | 9 |
| performance | 0 | 4 |

## Coverage by required axis

### Pull request

| PR | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| #6356 | Custom Widgets | 0 | 0 | 0 | 7 | 7 |
| #6450 | responsive layouts | 0 | 0 | 0 | 5 | 5 |
| #6482 | Assistant | 0 | 0 | 0 | 7 | 7 |
| #6502 | widget modernization | 0 | 0 | 0 | 23 | 23 |
| #6503 | dnd-kit grid | 1 | 1 | 0 | 10 | 12 |
| #6545 | release-v2 rollup | 3 | 0 | 0 | 12 | 15 |
| #6555 | widget performance | 0 | 0 | 0 | 18 | 18 |
| #6569 | onboarding | 0 | 0 | 0 | 4 | 4 |

### Feature

| Feature / agent | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 1 | 0 | 0 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 0 | 1 | 1 |
| board-03 | Dense collision handling | 0 | 1 | 0 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 0 | 1 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 0 | 1 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 0 | 1 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 0 | 1 | 1 |
| board-08 | Board import and export | 0 | 0 | 0 | 1 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 0 | 1 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 0 | 1 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 0 | 1 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 0 | 1 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 0 | 1 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 0 | 1 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 0 | 1 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 0 | 1 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 0 | 1 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 0 | 1 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 0 | 1 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 0 | 1 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 0 | 1 | 1 |
| preflight-01 | Candidate identity and services | 1 | 0 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 1 | 0 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 1 | 0 | 0 | 0 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 0 | 1 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 0 | 1 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 0 | 1 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 0 | 1 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 0 | 1 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 0 | 1 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 0 | 1 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 0 | 1 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 0 | 1 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 0 | 1 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 0 | 1 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 0 | 1 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 0 | 1 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 0 | 1 | 1 |

### Widget

| Widget kind | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| airQuality | widgets-01 | 0 | 0 | 0 | 9 | 9 |
| anchorNote | widgets-03 | 0 | 0 | 0 | 9 | 9 |
| app | widgets-02 | 0 | 0 | 0 | 9 | 9 |
| archiveTeamWarrior | widgets-12 | 0 | 0 | 0 | 9 | 9 |
| assistant | widgets-12 | 0 | 0 | 0 | 9 | 9 |
| audioStats | widgets-10 | 0 | 0 | 0 | 9 | 9 |
| bazarr | widgets-11 | 0 | 0 | 0 | 9 | 9 |
| beszelAlerts | widgets-07 | 0 | 0 | 0 | 9 | 9 |
| beszelSystemGrid | widgets-07 | 0 | 0 | 0 | 9 | 9 |
| beszelSystemStats | widgets-07 | 0 | 0 | 0 | 9 | 9 |
| beszelSystemTable | widgets-07 | 0 | 0 | 0 | 9 | 9 |
| bookmarks | widgets-03 | 0 | 0 | 0 | 9 | 9 |
| calendar | widgets-09 | 0 | 0 | 0 | 9 | 9 |
| clock | widgets-01 | 0 | 0 | 0 | 9 | 9 |
| coolify | widgets-12 | 0 | 0 | 0 | 9 | 9 |
| countdown | widgets-01 | 0 | 0 | 0 | 9 | 9 |
| customApi | widgets-12 | 0 | 0 | 0 | 9 | 9 |
| dnsHoleControls | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| dnsHoleSummary | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| dockerContainers | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| downloads | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| firewall | widgets-06 | 0 | 0 | 0 | 9 | 9 |
| healthMonitoring | widgets-05 | 0 | 0 | 0 | 9 | 9 |
| iframe | widgets-02 | 0 | 0 | 0 | 9 | 9 |
| immich-albumCarousel | widgets-10 | 0 | 0 | 0 | 9 | 9 |
| immich-serverStats | widgets-10 | 0 | 0 | 0 | 9 | 9 |
| indexerManager | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| mediaMissing | widgets-09 | 0 | 0 | 0 | 9 | 9 |
| mediaReleases | widgets-10 | 0 | 0 | 0 | 9 | 9 |
| mediaRequests-requestList | widgets-09 | 0 | 0 | 0 | 9 | 9 |
| mediaRequests-requestStats | widgets-09 | 0 | 0 | 0 | 9 | 9 |
| mediaServer | widgets-09 | 0 | 0 | 0 | 9 | 9 |
| mediaTranscoding | widgets-10 | 0 | 0 | 0 | 9 | 9 |
| minecraftServerStatus | widgets-02 | 0 | 0 | 0 | 9 | 9 |
| networkControllerStatus | widgets-06 | 0 | 0 | 0 | 9 | 9 |
| networkControllerSummary | widgets-06 | 0 | 0 | 0 | 9 | 9 |
| notebook | widgets-03 | 0 | 0 | 0 | 9 | 9 |
| notifications | widgets-06 | 0 | 0 | 0 | 9 | 9 |
| paperlessNgx | widgets-11 | 0 | 0 | 0 | 9 | 9 |
| patchmon | widgets-11 | 0 | 0 | 0 | 9 | 9 |
| releases | widgets-11 | 0 | 0 | 0 | 9 | 9 |
| rssFeed | widgets-03 | 0 | 0 | 0 | 9 | 9 |
| smartHome-entityState | widgets-05 | 0 | 0 | 0 | 9 | 9 |
| smartHome-executeAutomation | widgets-05 | 0 | 0 | 0 | 9 | 9 |
| speedtestTracker | widgets-08 | 0 | 0 | 0 | 9 | 9 |
| stockPrice | widgets-02 | 0 | 0 | 0 | 9 | 9 |
| systemDisks | widgets-05 | 0 | 0 | 0 | 9 | 9 |
| systemResources | widgets-05 | 0 | 0 | 0 | 9 | 9 |
| timer | widgets-01 | 0 | 0 | 0 | 9 | 9 |
| timetable | widgets-03 | 0 | 0 | 0 | 9 | 9 |
| tracearr | widgets-11 | 0 | 0 | 0 | 9 | 9 |
| traefik | widgets-08 | 0 | 0 | 0 | 9 | 9 |
| umami | widgets-08 | 0 | 0 | 0 | 9 | 9 |
| ups | widgets-08 | 0 | 0 | 0 | 9 | 9 |
| uptimeKuma | widgets-06 | 0 | 0 | 0 | 9 | 9 |
| video | widgets-02 | 0 | 0 | 0 | 9 | 9 |
| vpn | widgets-08 | 0 | 0 | 0 | 9 | 9 |
| weather | widgets-01 | 0 | 0 | 0 | 9 | 9 |
| wud | widgets-07 | 0 | 0 | 0 | 9 | 9 |

### Size threshold

High-risk widgets require every width 1–24 × every height 1–6 at all assigned mobile, breakpoint-edge, and desktop viewports. Other widgets require minimum, canonical, wide, tall, maximum, overflow, and behavior-changing threshold checks.

| Widget size threshold | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| airQuality | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| anchorNote | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| app | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| archiveTeamWarrior | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| assistant | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| audioStats | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| bazarr | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| beszelAlerts | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| beszelSystemGrid | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| beszelSystemStats | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| beszelSystemTable | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| bookmarks | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| calendar | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| clock | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| coolify | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| countdown | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| customApi | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| dnsHoleControls | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| dnsHoleSummary | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| dockerContainers | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| downloads | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| firewall | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| healthMonitoring | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| iframe | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| immich-albumCarousel | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| immich-serverStats | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| indexerManager | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| mediaMissing | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| mediaReleases | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| mediaRequests-requestList | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| mediaRequests-requestStats | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| mediaServer | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| mediaTranscoding | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| minecraftServerStatus | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| networkControllerStatus | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| networkControllerSummary | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| notebook | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| notifications | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| paperlessNgx | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| patchmon | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| releases | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| rssFeed | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| smartHome-entityState | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| smartHome-executeAutomation | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| speedtestTracker | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| stockPrice | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| systemDisks | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| systemResources | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| timer | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| timetable | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| tracearr | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| traefik | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| umami | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| ups | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| uptimeKuma | every width 1-24 × every height 1-6 | 0 | 0 | 0 | 9 | 9 |
| video | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| vpn | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| weather | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |
| wud | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 0 | 9 | 9 |

### Viewport

| Viewport | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| boundary-1279 | board-05 | 0 | 0 | 0 | 13 | 13 |
| boundary-767 | board-05 | 0 | 0 | 0 | 14 | 14 |
| boundary-768 | board-05 | 0 | 0 | 0 | 14 | 14 |
| desktop-1280 | board-02 | 0 | 0 | 0 | 18 | 18 |
| desktop-1440 | preflight-01 | 3 | 1 | 0 | 29 | 33 |
| desktop-1920 | preflight-03 | 2 | 0 | 0 | 16 | 18 |
| mobile-320 | preflight-03 | 1 | 0 | 0 | 20 | 21 |
| mobile-375 | board-02 | 0 | 0 | 0 | 22 | 22 |
| tablet-1024 | board-03 | 0 | 1 | 0 | 14 | 15 |

### Persona

| Persona | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ash Assistant | widgets-12 | 0 | 0 | 0 | 3 | 3 |
| Avery Admin | preflight-01 | 2 | 0 | 0 | 4 | 6 |
| Brooke Minimalist | board-06 | 0 | 0 | 0 | 2 | 2 |
| Casey Chaos | preflight-03 | 1 | 1 | 0 | 3 | 5 |
| Cora Creator | widgets-02 | 0 | 0 | 0 | 5 | 5 |
| Eden Editor | board-02 | 0 | 0 | 0 | 3 | 3 |
| Ingrid Infra | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| Kira Keyboard | board-09 | 0 | 0 | 0 | 3 | 3 |
| Maya Media | widgets-09 | 0 | 0 | 0 | 4 | 4 |
| Morgan Mobile | board-05 | 0 | 0 | 0 | 2 | 2 |
| Nolan Outsider | preflight-02 | 1 | 0 | 0 | 3 | 4 |
| Nora Newcomer | core-v2-03 | 0 | 0 | 0 | 2 | 2 |
| Rowan Owner | preflight-02 | 2 | 0 | 0 | 4 | 6 |
| Vivian Viewer | preflight-02 | 1 | 0 | 0 | 3 | 4 |

### Permission

| Permission boundary | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ash Assistant | widgets-12 | 0 | 0 | 0 | 3 | 3 |
| Avery Admin | preflight-01 | 2 | 0 | 0 | 4 | 6 |
| Brooke Minimalist | board-06 | 0 | 0 | 0 | 2 | 2 |
| Casey Chaos | preflight-03 | 1 | 0 | 0 | 4 | 5 |
| Cora Creator | widgets-02 | 0 | 0 | 0 | 5 | 5 |
| Eden Editor | board-02 | 0 | 0 | 0 | 3 | 3 |
| Ingrid Infra | widgets-04 | 0 | 0 | 0 | 9 | 9 |
| Kira Keyboard | board-09 | 0 | 0 | 0 | 3 | 3 |
| Maya Media | widgets-09 | 0 | 0 | 0 | 4 | 4 |
| Morgan Mobile | board-05 | 0 | 0 | 0 | 2 | 2 |
| Nolan Outsider | preflight-02 | 1 | 0 | 0 | 3 | 4 |
| Nora Newcomer | core-v2-03 | 0 | 0 | 0 | 2 | 2 |
| profile:degraded | preflight-01 | 1 | 0 | 0 | 22 | 23 |
| profile:main-readonly | preflight-01 | 2 | 0 | 0 | 5 | 7 |
| profile:main-writable | preflight-01 | 4 | 0 | 0 | 38 | 42 |
| profile:onboarding-fresh | preflight-01 | 1 | 0 | 0 | 3 | 4 |
| Rowan Owner | preflight-02 | 2 | 0 | 0 | 4 | 6 |
| Vivian Viewer | preflight-02 | 1 | 0 | 0 | 3 | 4 |

### Mutation

| Mutation area | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 1 | 0 | 0 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 0 | 1 | 1 |
| board-03 | Dense collision handling | 0 | 1 | 0 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 0 | 1 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 0 | 1 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 0 | 1 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 0 | 1 | 1 |
| board-08 | Board import and export | 0 | 0 | 0 | 1 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 0 | 1 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 0 | 1 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 0 | 1 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 0 | 1 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 0 | 1 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 0 | 1 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 0 | 1 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 0 | 1 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 0 | 1 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 0 | 1 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 0 | 1 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 0 | 1 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 0 | 1 | 1 |
| preflight-01 | Candidate identity and services | 1 | 0 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 1 | 0 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 1 | 0 | 0 | 0 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 0 | 1 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 0 | 1 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 0 | 1 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 0 | 1 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 0 | 1 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 0 | 1 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 0 | 1 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 0 | 1 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 0 | 1 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 0 | 1 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 0 | 1 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 0 | 1 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 0 | 1 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 0 | 1 | 1 |

### State and recovery

| State / recovery area | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 1 | 0 | 0 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 0 | 1 | 1 |
| board-03 | Dense collision handling | 1 | 0 | 0 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 0 | 1 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 0 | 1 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 0 | 1 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 0 | 1 | 1 |
| board-08 | Board import and export | 0 | 0 | 0 | 1 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 0 | 1 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 0 | 1 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 0 | 1 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 0 | 1 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 0 | 1 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 0 | 1 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 0 | 1 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 0 | 1 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 0 | 1 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 0 | 1 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 0 | 1 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 0 | 1 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 0 | 1 | 1 |
| preflight-01 | Candidate identity and services | 1 | 0 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 1 | 0 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 0 | 0 | 0 | 1 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 0 | 1 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 0 | 1 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 0 | 1 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 0 | 1 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 0 | 1 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 0 | 1 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 0 | 1 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 0 | 1 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 0 | 1 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 0 | 1 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 0 | 1 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 0 | 1 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 0 | 1 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 0 | 1 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 0 | 1 | 1 |

## Performance measurements

| Agent | Measurement | Value | Threshold | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| preflight-02 | writable fresh replay HTTP 200 responses observed | 296 responses | no observed 4xx or 5xx statuses; status-only replay aggregate | passed | /home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/pf02-358d-main-replay-network-status.txt |
| preflight-02 | readonly fresh replay HTTP 200 responses observed | 146 responses | no observed 4xx or 5xx statuses; status-only replay aggregate | passed | /home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/pf02-358d-ro-replay-network-status.txt |
| preflight-02 | writable fresh replay rendered assets | 14 images loaded | all discovered images complete with naturalWidth > 0; zero broken | passed | /home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/pf02-358d-main-replay-assets.json |
| preflight-02 | readonly fresh replay rendered assets | 14 images loaded | all discovered images complete with naturalWidth > 0; zero broken | passed | /home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/pf02-358d-ro-replay-assets.json |
| preflight-02 | fixture health responses | 2 HTTP 200 health responses | both supplied fixture /health endpoints respond HTTP 200 | passed | /home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/pf02-358d-environment-status.txt |
| board-01 |  | not-recorded |  | not-reached | None |
| board-01 |  | not-recorded |  | not-reached | None |
| board-01 |  | not-recorded |  | not-reached | None |
| board-01 |  | not-recorded |  | not-reached | None |
| board-01 |  | not-recorded |  | not-reached | None |
| board-01 |  | not-recorded |  | not-reached | None |

### Performance limitations

| Agent | Limitation |
| --- | --- |
| host-runtime | The host's fs.inotify.max_user_instances=128 is too low for concurrent development watchers. QA apps use production-standalone from a single candidate-pinned build produced by the webpack bundler. Source changes require a new committed candidate build before browser evidence is valid. |
| preflight-01 | No performance timing was requested or recorded. |
| preflight-01 | Visual checks were performed at 1440x900, zoom 100%, with mouse and keyboard input. |
| preflight-01 | Onboarding completion and user creation were intentionally not attempted. |
| preflight-01 | No product state was changed; the only network interception was a local fixture slow-path abort that was removed before final app recovery. |
| preflight-02 | Network evidence is status/path-class counts only; fresh writable replay had 8 no-status entries and fresh readonly replay had 4 no-status entries; no 4xx or 5xx was observed. |
| preflight-02 | Each fixture health navigation also requested an incidental favicon returning HTTP 404; the supplied /health endpoint itself returned HTTP 200. |
| preflight-02 | No response bodies, headers, cookies, request bodies, credentials, or tokens were collected or retained. |
| preflight-03 | No timing measurement was requested or invented. |
| preflight-03 | Native zoom was extension-driven: devicePixelRatio measured approximately 0.8, 1, 1.25, and 2 at 80%, 100%, 125%, and 200%; visualViewport.scale remained 1 in every cell. |
| preflight-03 | Touch coverage used Chromium touch-equivalent actions. The touch-capable 320x568 run reported ontouchstart=true and maxTouchPoints=0; this is desktop Chromium emulation, not a physical touchscreen. |
| preflight-03 | At 320x568/200%, the baseline document remained horizontalOverflow=false. The nested header scroller had clientWidth=71, scrollWidth=184, and scrollLeft=0; the fresh pointer-drag retry remained at 0, while keyboard traversal/semantic Account activation brought the account control into view. |
| preflight-03 | Opening the Account menu in the 320x568/200% interaction state temporarily measured document scrollWidth=305 against clientWidth=152; a reload restored scrollWidth=152 and horizontalOverflow=false. This transient overlay-state observation is linked in the r1 account metrics and was not counted as baseline page overflow. |
| board-01 | Metrics distinguish browser outer viewport from CSS viewport for extension zoom; visualViewport.scale remained 1 on every surface. |
| board-01 | The seeded 1..24 width series and the visible 24-column width-coverage option were exercised as rendered UI evidence; the board was not left in a changed settings layout. |
| board-01 | Diagnostics retained status-only network/asset listings with query values redacted. Console and page-error commands returned no output; headers, bodies, cookies, tokens, and credentials were not retained. |
| board-01 | The browser CLI retained stale registry metadata for an exited recorder daemon after close; no corresponding Chrome process remained. |
| board-03 | No touch command is available for the installed Chromium agent-browser provider; one fresh capability retry was limited to the CLI touch surface, so native touch semantics are not claimed. |
| board-03 | Low-level mouse DnD/resize attempts in collision and gap destinations produced no committed geometry change; the UI Move / resize item modal did commit a collision move and reflow. |
| board-03 | The UI Remove item action remained ineffective after a fresh-session retry. The final saved board therefore retains two disposable items and the collision-reflowed layout; original fixture geometry could not be restored through the UI. |

## Independent reproduction results

| Agent | Finding fingerprint | Reproducing agent | Outcome | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | not-reached | — | Not recorded |

## Severity totals

| P0 | P1 | P2 | P3 |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 1 | 0 |

Deduplicated by explicit fingerprint, or by severity + area + title when no fingerprint is supplied.

| Severity | Area | Finding | Packets | Cases |
| --- | --- | --- | --- | --- |
| P2 | general | Remove item does not remove a disposable board item | board-03 | BD-003-MUTATION |

## Critical gaps

| Packet | Kind | Coverage item | Status / detail |
| --- | --- | --- | --- |
| preflight-01 | metadata | metadata-1 | blocked — preflight-01: candidateSha must equal the campaign candidate 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| preflight-01 | metadata | metadata-2 | blocked — preflight-01: human metadata does not show the campaign candidate |
| preflight-02 | metadata | metadata-1 | blocked — preflight-02: candidateSha must equal the campaign candidate 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| preflight-02 | metadata | metadata-2 | blocked — preflight-02: human metadata does not show the campaign candidate |
| preflight-02 | metadata | metadata-3 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-4 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-5 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-6 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-7 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-8 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-9 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-10 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-11 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-12 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-13 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-14 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-15 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-16 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-17 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-18 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-19 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-20 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-21 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-22 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-23 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-24 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-25 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-26 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-27 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-28 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-29 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-30 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-31 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-32 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-33 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-34 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-35 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-36 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-37 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-38 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-39 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-40 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-41 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-42 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-43 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-44 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-45 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-46 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-47 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-48 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-49 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-50 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-51 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-52 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-53 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-54 | blocked — preflight-02: artifact does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-55 | blocked — preflight-02: performance.measurements[0] evidence does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-56 | blocked — preflight-02: performance.measurements[1] evidence does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-57 | blocked — preflight-02: performance.measurements[2] evidence does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-58 | blocked — preflight-02: performance.measurements[3] evidence does not resolve (ENOENT) |
| preflight-02 | metadata | metadata-59 | blocked — preflight-02: performance.measurements[4] evidence does not resolve (ENOENT) |
| preflight-03 | case | PF-003-ENVIRONMENT | not-reached |
| preflight-03 | case | PF-003-ACCESS | not-reached |
| preflight-03 | case | PF-003-EVIDENCE | not-reached |
| preflight-03 | metadata | metadata-1 | blocked — preflight-03: caseStatuses is missing assigned case PF-003-ENVIRONMENT |
| preflight-03 | metadata | metadata-2 | blocked — preflight-03: caseStatuses is missing assigned case PF-003-ACCESS |
| preflight-03 | metadata | metadata-3 | blocked — preflight-03: caseStatuses is missing assigned case PF-003-EVIDENCE |
| preflight-03 | metadata | metadata-4 | blocked — preflight-03: caseStatuses contains unknown case PF-003-VIEWPORTS |
| preflight-03 | metadata | metadata-5 | blocked — preflight-03: caseStatuses contains unknown case PF-003-ZOOM |
| preflight-03 | metadata | metadata-6 | blocked — preflight-03: caseStatuses contains unknown case PF-003-INPUT-EVIDENCE |
| preflight-03 | metadata | metadata-7 | blocked — preflight-03: report status passed does not match case rollup not-reached |
| preflight-03 | metadata | metadata-8 | blocked — preflight-03: candidateSha must equal the campaign candidate 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| preflight-03 | metadata | metadata-9 | blocked — preflight-03: human metadata does not show the campaign candidate |
| preflight-03 | metadata | metadata-10 | blocked — preflight-03/PF-003-ENVIRONMENT: human evidence row/status is missing |
| preflight-03 | metadata | metadata-11 | blocked — preflight-03/PF-003-ACCESS: human evidence row/status is missing |
| preflight-03 | metadata | metadata-12 | blocked — preflight-03/PF-003-EVIDENCE: human evidence row/status is missing |
| board-01 | metadata | metadata-1 | blocked — board-01: performance.measurements[0].name must be a string |
| board-01 | metadata | metadata-2 | blocked — board-01: performance.measurements[0].unit must be a string |
| board-01 | metadata | metadata-3 | blocked — board-01: performance.measurements[0].threshold must be a string |
| board-01 | metadata | metadata-4 | blocked — board-01: performance.measurements[0].value must be a number or null |
| board-01 | metadata | metadata-5 | blocked — board-01: performance.measurements[0].status is invalid |
| board-01 | metadata | metadata-6 | blocked — board-01: performance.measurements[0].evidence must be an array |
| board-01 | metadata | metadata-7 | blocked — board-01: performance.measurements[1].name must be a string |
| board-01 | metadata | metadata-8 | blocked — board-01: performance.measurements[1].unit must be a string |
| board-01 | metadata | metadata-9 | blocked — board-01: performance.measurements[1].threshold must be a string |
| board-01 | metadata | metadata-10 | blocked — board-01: performance.measurements[1].value must be a number or null |
| board-01 | metadata | metadata-11 | blocked — board-01: performance.measurements[1].status is invalid |
| board-01 | metadata | metadata-12 | blocked — board-01: performance.measurements[1].evidence must be an array |
| board-01 | metadata | metadata-13 | blocked — board-01: performance.measurements[2].name must be a string |
| board-01 | metadata | metadata-14 | blocked — board-01: performance.measurements[2].unit must be a string |
| board-01 | metadata | metadata-15 | blocked — board-01: performance.measurements[2].threshold must be a string |
| board-01 | metadata | metadata-16 | blocked — board-01: performance.measurements[2].value must be a number or null |
| board-01 | metadata | metadata-17 | blocked — board-01: performance.measurements[2].status is invalid |
| board-01 | metadata | metadata-18 | blocked — board-01: performance.measurements[2].evidence must be an array |
| board-01 | metadata | metadata-19 | blocked — board-01: performance.measurements[3].name must be a string |
| board-01 | metadata | metadata-20 | blocked — board-01: performance.measurements[3].unit must be a string |
| board-01 | metadata | metadata-21 | blocked — board-01: performance.measurements[3].threshold must be a string |
| board-01 | metadata | metadata-22 | blocked — board-01: performance.measurements[3].value must be a number or null |
| board-01 | metadata | metadata-23 | blocked — board-01: performance.measurements[3].status is invalid |
| board-01 | metadata | metadata-24 | blocked — board-01: performance.measurements[3].evidence must be an array |
| board-01 | metadata | metadata-25 | blocked — board-01: performance.measurements[4].name must be a string |
| board-01 | metadata | metadata-26 | blocked — board-01: performance.measurements[4].unit must be a string |
| board-01 | metadata | metadata-27 | blocked — board-01: performance.measurements[4].threshold must be a string |
| board-01 | metadata | metadata-28 | blocked — board-01: performance.measurements[4].value must be a number or null |
| board-01 | metadata | metadata-29 | blocked — board-01: performance.measurements[4].status is invalid |
| board-01 | metadata | metadata-30 | blocked — board-01: performance.measurements[4].evidence must be an array |
| board-01 | metadata | metadata-31 | blocked — board-01: performance.measurements[5].name must be a string |
| board-01 | metadata | metadata-32 | blocked — board-01: performance.measurements[5].unit must be a string |
| board-01 | metadata | metadata-33 | blocked — board-01: performance.measurements[5].threshold must be a string |
| board-01 | metadata | metadata-34 | blocked — board-01: performance.measurements[5].value must be a number or null |
| board-01 | metadata | metadata-35 | blocked — board-01: performance.measurements[5].status is invalid |
| board-01 | metadata | metadata-36 | blocked — board-01: performance.measurements[5].evidence must be an array |
| board-01 | metadata | metadata-37 | blocked — board-01: candidateSha must equal the campaign candidate 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| board-01 | metadata | metadata-38 | blocked — board-01: human metadata does not show the campaign candidate |
| board-02 | case | BD-002-THRESHOLDS | not-reached |
| board-02 | case | BD-002-MUTATION | not-reached |
| board-02 | case | BD-002-PERSISTENCE | not-reached |
| board-02 | case | BD-002-ACCESS-RECOVERY | not-reached |
| board-03 | case | BD-003-MUTATION | failed |
| board-03 | metadata | metadata-1 | blocked — board-03: widgetChecks contains unknown row @ |
| board-03 | metadata | metadata-2 | blocked — board-03: candidateSha must equal the campaign candidate 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| board-03 | metadata | metadata-3 | blocked — board-03: human metadata status differs from structured metadata |
| board-03 | metadata | metadata-4 | blocked — board-03: human metadata does not show the campaign candidate |
| board-04 | case | BD-004-THRESHOLDS | not-reached |
| board-04 | case | BD-004-MUTATION | not-reached |
| board-04 | case | BD-004-PERSISTENCE | not-reached |
| board-04 | case | BD-004-ACCESS-RECOVERY | not-reached |
| board-05 | case | BD-005-THRESHOLDS | not-reached |
| board-05 | case | BD-005-MUTATION | not-reached |
| board-05 | case | BD-005-PERSISTENCE | not-reached |
| board-05 | case | BD-005-ACCESS-RECOVERY | not-reached |
| board-06 | case | BD-006-THRESHOLDS | not-reached |
| board-06 | case | BD-006-MUTATION | not-reached |
| board-06 | case | BD-006-PERSISTENCE | not-reached |
| board-06 | case | BD-006-ACCESS-RECOVERY | not-reached |
| board-07 | case | BD-007-THRESHOLDS | not-reached |
| board-07 | case | BD-007-MUTATION | not-reached |
| board-07 | case | BD-007-PERSISTENCE | not-reached |
| board-07 | case | BD-007-ACCESS-RECOVERY | not-reached |
| board-08 | case | BD-008-THRESHOLDS | not-reached |
| board-08 | case | BD-008-MUTATION | not-reached |
| board-08 | case | BD-008-PERSISTENCE | not-reached |
| board-08 | case | BD-008-ACCESS-RECOVERY | not-reached |
| board-09 | case | BD-009-THRESHOLDS | not-reached |
| board-09 | case | BD-009-MUTATION | not-reached |
| board-09 | case | BD-009-PERSISTENCE | not-reached |
| board-09 | case | BD-009-ACCESS-RECOVERY | not-reached |
| widgets-01 | case | WG-001-RENDER-SIZE | not-reached |
| widgets-01 | case | WG-001-STATES-RECOVERY | not-reached |
| widgets-01 | case | WG-001-OPTIONS-PERSISTENCE | not-reached |
| widgets-01 | case | WG-001-ACCESS-READONLY | not-reached |
| widgets-01 | case | WG-001-EVIDENCE | not-reached |
| widgets-01 | widget | clock@mobile-320 | not-reached |
| widgets-01 | widget | clock@mobile-375 | not-reached |
| widgets-01 | widget | clock@boundary-767 | not-reached |
| widgets-01 | widget | clock@boundary-768 | not-reached |
| widgets-01 | widget | clock@tablet-1024 | not-reached |
| widgets-01 | widget | clock@boundary-1279 | not-reached |
| widgets-01 | widget | clock@desktop-1280 | not-reached |
| widgets-01 | widget | clock@desktop-1440 | not-reached |
| widgets-01 | widget | clock@desktop-1920 | not-reached |
| widgets-01 | widget | weather@mobile-320 | not-reached |
| widgets-01 | widget | weather@mobile-375 | not-reached |
| widgets-01 | widget | weather@boundary-767 | not-reached |
| widgets-01 | widget | weather@boundary-768 | not-reached |
| widgets-01 | widget | weather@tablet-1024 | not-reached |
| widgets-01 | widget | weather@boundary-1279 | not-reached |
| widgets-01 | widget | weather@desktop-1280 | not-reached |
| widgets-01 | widget | weather@desktop-1440 | not-reached |
| widgets-01 | widget | weather@desktop-1920 | not-reached |
| widgets-01 | widget | airQuality@mobile-320 | not-reached |
| widgets-01 | widget | airQuality@mobile-375 | not-reached |
| widgets-01 | widget | airQuality@boundary-767 | not-reached |
| widgets-01 | widget | airQuality@boundary-768 | not-reached |
| widgets-01 | widget | airQuality@tablet-1024 | not-reached |
| widgets-01 | widget | airQuality@boundary-1279 | not-reached |
| widgets-01 | widget | airQuality@desktop-1280 | not-reached |
| widgets-01 | widget | airQuality@desktop-1440 | not-reached |
| widgets-01 | widget | airQuality@desktop-1920 | not-reached |
| widgets-01 | widget | countdown@mobile-320 | not-reached |
| widgets-01 | widget | countdown@mobile-375 | not-reached |
| widgets-01 | widget | countdown@boundary-767 | not-reached |
| widgets-01 | widget | countdown@boundary-768 | not-reached |
| widgets-01 | widget | countdown@tablet-1024 | not-reached |
| widgets-01 | widget | countdown@boundary-1279 | not-reached |
| widgets-01 | widget | countdown@desktop-1280 | not-reached |
| widgets-01 | widget | countdown@desktop-1440 | not-reached |
| widgets-01 | widget | countdown@desktop-1920 | not-reached |
| widgets-01 | widget | timer@mobile-320 | not-reached |
| widgets-01 | widget | timer@mobile-375 | not-reached |
| widgets-01 | widget | timer@boundary-767 | not-reached |
| widgets-01 | widget | timer@boundary-768 | not-reached |
| widgets-01 | widget | timer@tablet-1024 | not-reached |
| widgets-01 | widget | timer@boundary-1279 | not-reached |
| widgets-01 | widget | timer@desktop-1280 | not-reached |
| widgets-01 | widget | timer@desktop-1440 | not-reached |
| widgets-01 | widget | timer@desktop-1920 | not-reached |
| widgets-02 | case | WG-002-RENDER-SIZE | not-reached |
| widgets-02 | case | WG-002-STATES-RECOVERY | not-reached |
| widgets-02 | case | WG-002-OPTIONS-PERSISTENCE | not-reached |
| widgets-02 | case | WG-002-ACCESS-READONLY | not-reached |
| widgets-02 | case | WG-002-EVIDENCE | not-reached |
| widgets-02 | widget | app@mobile-320 | not-reached |
| widgets-02 | widget | app@mobile-375 | not-reached |
| widgets-02 | widget | app@boundary-767 | not-reached |
| widgets-02 | widget | app@boundary-768 | not-reached |
| widgets-02 | widget | app@tablet-1024 | not-reached |
| widgets-02 | widget | app@boundary-1279 | not-reached |
| widgets-02 | widget | app@desktop-1280 | not-reached |
| widgets-02 | widget | app@desktop-1440 | not-reached |
| widgets-02 | widget | app@desktop-1920 | not-reached |
| widgets-02 | widget | iframe@mobile-320 | not-reached |
| widgets-02 | widget | iframe@mobile-375 | not-reached |
| widgets-02 | widget | iframe@boundary-767 | not-reached |
| widgets-02 | widget | iframe@boundary-768 | not-reached |
| widgets-02 | widget | iframe@tablet-1024 | not-reached |
| widgets-02 | widget | iframe@boundary-1279 | not-reached |
| widgets-02 | widget | iframe@desktop-1280 | not-reached |
| widgets-02 | widget | iframe@desktop-1440 | not-reached |
| widgets-02 | widget | iframe@desktop-1920 | not-reached |
| widgets-02 | widget | video@mobile-320 | not-reached |
| widgets-02 | widget | video@mobile-375 | not-reached |
| widgets-02 | widget | video@boundary-767 | not-reached |
| widgets-02 | widget | video@boundary-768 | not-reached |
| widgets-02 | widget | video@tablet-1024 | not-reached |
| widgets-02 | widget | video@boundary-1279 | not-reached |
| widgets-02 | widget | video@desktop-1280 | not-reached |
| widgets-02 | widget | video@desktop-1440 | not-reached |
| widgets-02 | widget | video@desktop-1920 | not-reached |
| widgets-02 | widget | minecraftServerStatus@mobile-320 | not-reached |
| widgets-02 | widget | minecraftServerStatus@mobile-375 | not-reached |
| widgets-02 | widget | minecraftServerStatus@boundary-767 | not-reached |
| widgets-02 | widget | minecraftServerStatus@boundary-768 | not-reached |
| widgets-02 | widget | minecraftServerStatus@tablet-1024 | not-reached |
| widgets-02 | widget | minecraftServerStatus@boundary-1279 | not-reached |
| widgets-02 | widget | minecraftServerStatus@desktop-1280 | not-reached |
| widgets-02 | widget | minecraftServerStatus@desktop-1440 | not-reached |
| widgets-02 | widget | minecraftServerStatus@desktop-1920 | not-reached |
| widgets-02 | widget | stockPrice@mobile-320 | not-reached |
| widgets-02 | widget | stockPrice@mobile-375 | not-reached |
| widgets-02 | widget | stockPrice@boundary-767 | not-reached |
| widgets-02 | widget | stockPrice@boundary-768 | not-reached |
| widgets-02 | widget | stockPrice@tablet-1024 | not-reached |
| widgets-02 | widget | stockPrice@boundary-1279 | not-reached |
| widgets-02 | widget | stockPrice@desktop-1280 | not-reached |
| widgets-02 | widget | stockPrice@desktop-1440 | not-reached |
| widgets-02 | widget | stockPrice@desktop-1920 | not-reached |
| widgets-03 | case | WG-003-RENDER-SIZE | not-reached |
| widgets-03 | case | WG-003-STATES-RECOVERY | not-reached |
| widgets-03 | case | WG-003-OPTIONS-PERSISTENCE | not-reached |
| widgets-03 | case | WG-003-ACCESS-READONLY | not-reached |
| widgets-03 | case | WG-003-EVIDENCE | not-reached |
| widgets-03 | widget | notebook@mobile-320 | not-reached |
| widgets-03 | widget | notebook@mobile-375 | not-reached |
| widgets-03 | widget | notebook@boundary-767 | not-reached |
| widgets-03 | widget | notebook@boundary-768 | not-reached |
| widgets-03 | widget | notebook@tablet-1024 | not-reached |
| widgets-03 | widget | notebook@boundary-1279 | not-reached |
| widgets-03 | widget | notebook@desktop-1280 | not-reached |
| widgets-03 | widget | notebook@desktop-1440 | not-reached |
| widgets-03 | widget | notebook@desktop-1920 | not-reached |
| widgets-03 | widget | anchorNote@mobile-320 | not-reached |
| widgets-03 | widget | anchorNote@mobile-375 | not-reached |
| widgets-03 | widget | anchorNote@boundary-767 | not-reached |
| widgets-03 | widget | anchorNote@boundary-768 | not-reached |
| widgets-03 | widget | anchorNote@tablet-1024 | not-reached |
| widgets-03 | widget | anchorNote@boundary-1279 | not-reached |
| widgets-03 | widget | anchorNote@desktop-1280 | not-reached |
| widgets-03 | widget | anchorNote@desktop-1440 | not-reached |
| widgets-03 | widget | anchorNote@desktop-1920 | not-reached |
| widgets-03 | widget | bookmarks@mobile-320 | not-reached |
| widgets-03 | widget | bookmarks@mobile-375 | not-reached |
| widgets-03 | widget | bookmarks@boundary-767 | not-reached |
| widgets-03 | widget | bookmarks@boundary-768 | not-reached |
| widgets-03 | widget | bookmarks@tablet-1024 | not-reached |
| widgets-03 | widget | bookmarks@boundary-1279 | not-reached |
| widgets-03 | widget | bookmarks@desktop-1280 | not-reached |
| widgets-03 | widget | bookmarks@desktop-1440 | not-reached |
| widgets-03 | widget | bookmarks@desktop-1920 | not-reached |
| widgets-03 | widget | rssFeed@mobile-320 | not-reached |
| widgets-03 | widget | rssFeed@mobile-375 | not-reached |
| widgets-03 | widget | rssFeed@boundary-767 | not-reached |
| widgets-03 | widget | rssFeed@boundary-768 | not-reached |
| widgets-03 | widget | rssFeed@tablet-1024 | not-reached |
| widgets-03 | widget | rssFeed@boundary-1279 | not-reached |
| widgets-03 | widget | rssFeed@desktop-1280 | not-reached |
| widgets-03 | widget | rssFeed@desktop-1440 | not-reached |
| widgets-03 | widget | rssFeed@desktop-1920 | not-reached |
| widgets-03 | widget | timetable@mobile-320 | not-reached |
| widgets-03 | widget | timetable@mobile-375 | not-reached |
| widgets-03 | widget | timetable@boundary-767 | not-reached |
| widgets-03 | widget | timetable@boundary-768 | not-reached |
| widgets-03 | widget | timetable@tablet-1024 | not-reached |
| widgets-03 | widget | timetable@boundary-1279 | not-reached |
| widgets-03 | widget | timetable@desktop-1280 | not-reached |
| widgets-03 | widget | timetable@desktop-1440 | not-reached |
| widgets-03 | widget | timetable@desktop-1920 | not-reached |
| widgets-04 | case | WG-004-RENDER-SIZE | not-reached |
| widgets-04 | case | WG-004-STATES-RECOVERY | not-reached |
| widgets-04 | case | WG-004-OPTIONS-PERSISTENCE | not-reached |
| widgets-04 | case | WG-004-ACCESS-READONLY | not-reached |
| widgets-04 | case | WG-004-EVIDENCE | not-reached |
| widgets-04 | widget | downloads@mobile-320 | not-reached |
| widgets-04 | widget | downloads@mobile-375 | not-reached |
| widgets-04 | widget | downloads@boundary-767 | not-reached |
| widgets-04 | widget | downloads@boundary-768 | not-reached |
| widgets-04 | widget | downloads@tablet-1024 | not-reached |
| widgets-04 | widget | downloads@boundary-1279 | not-reached |
| widgets-04 | widget | downloads@desktop-1280 | not-reached |
| widgets-04 | widget | downloads@desktop-1440 | not-reached |
| widgets-04 | widget | downloads@desktop-1920 | not-reached |
| widgets-04 | widget | dockerContainers@mobile-320 | not-reached |
| widgets-04 | widget | dockerContainers@mobile-375 | not-reached |
| widgets-04 | widget | dockerContainers@boundary-767 | not-reached |
| widgets-04 | widget | dockerContainers@boundary-768 | not-reached |
| widgets-04 | widget | dockerContainers@tablet-1024 | not-reached |
| widgets-04 | widget | dockerContainers@boundary-1279 | not-reached |
| widgets-04 | widget | dockerContainers@desktop-1280 | not-reached |
| widgets-04 | widget | dockerContainers@desktop-1440 | not-reached |
| widgets-04 | widget | dockerContainers@desktop-1920 | not-reached |
| widgets-04 | widget | indexerManager@mobile-320 | not-reached |
| widgets-04 | widget | indexerManager@mobile-375 | not-reached |
| widgets-04 | widget | indexerManager@boundary-767 | not-reached |
| widgets-04 | widget | indexerManager@boundary-768 | not-reached |
| widgets-04 | widget | indexerManager@tablet-1024 | not-reached |
| widgets-04 | widget | indexerManager@boundary-1279 | not-reached |
| widgets-04 | widget | indexerManager@desktop-1280 | not-reached |
| widgets-04 | widget | indexerManager@desktop-1440 | not-reached |
| widgets-04 | widget | indexerManager@desktop-1920 | not-reached |
| widgets-04 | widget | dnsHoleSummary@mobile-320 | not-reached |
| widgets-04 | widget | dnsHoleSummary@mobile-375 | not-reached |
| widgets-04 | widget | dnsHoleSummary@boundary-767 | not-reached |
| widgets-04 | widget | dnsHoleSummary@boundary-768 | not-reached |
| widgets-04 | widget | dnsHoleSummary@tablet-1024 | not-reached |
| widgets-04 | widget | dnsHoleSummary@boundary-1279 | not-reached |
| widgets-04 | widget | dnsHoleSummary@desktop-1280 | not-reached |
| widgets-04 | widget | dnsHoleSummary@desktop-1440 | not-reached |
| widgets-04 | widget | dnsHoleSummary@desktop-1920 | not-reached |
| widgets-04 | widget | dnsHoleControls@mobile-320 | not-reached |
| widgets-04 | widget | dnsHoleControls@mobile-375 | not-reached |
| widgets-04 | widget | dnsHoleControls@boundary-767 | not-reached |
| widgets-04 | widget | dnsHoleControls@boundary-768 | not-reached |
| widgets-04 | widget | dnsHoleControls@tablet-1024 | not-reached |
| widgets-04 | widget | dnsHoleControls@boundary-1279 | not-reached |
| widgets-04 | widget | dnsHoleControls@desktop-1280 | not-reached |
| widgets-04 | widget | dnsHoleControls@desktop-1440 | not-reached |
| widgets-04 | widget | dnsHoleControls@desktop-1920 | not-reached |
| widgets-05 | case | WG-005-RENDER-SIZE | not-reached |
| widgets-05 | case | WG-005-STATES-RECOVERY | not-reached |
| widgets-05 | case | WG-005-OPTIONS-PERSISTENCE | not-reached |
| widgets-05 | case | WG-005-ACCESS-READONLY | not-reached |
| widgets-05 | case | WG-005-EVIDENCE | not-reached |
| widgets-05 | widget | smartHome-entityState@mobile-320 | not-reached |
| widgets-05 | widget | smartHome-entityState@mobile-375 | not-reached |
| widgets-05 | widget | smartHome-entityState@boundary-767 | not-reached |
| widgets-05 | widget | smartHome-entityState@boundary-768 | not-reached |
| widgets-05 | widget | smartHome-entityState@tablet-1024 | not-reached |
| widgets-05 | widget | smartHome-entityState@boundary-1279 | not-reached |
| widgets-05 | widget | smartHome-entityState@desktop-1280 | not-reached |
| widgets-05 | widget | smartHome-entityState@desktop-1440 | not-reached |
| widgets-05 | widget | smartHome-entityState@desktop-1920 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@mobile-320 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@mobile-375 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@boundary-767 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@boundary-768 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@tablet-1024 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@boundary-1279 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@desktop-1280 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@desktop-1440 | not-reached |
| widgets-05 | widget | smartHome-executeAutomation@desktop-1920 | not-reached |
| widgets-05 | widget | healthMonitoring@mobile-320 | not-reached |
| widgets-05 | widget | healthMonitoring@mobile-375 | not-reached |
| widgets-05 | widget | healthMonitoring@boundary-767 | not-reached |
| widgets-05 | widget | healthMonitoring@boundary-768 | not-reached |
| widgets-05 | widget | healthMonitoring@tablet-1024 | not-reached |
| widgets-05 | widget | healthMonitoring@boundary-1279 | not-reached |
| widgets-05 | widget | healthMonitoring@desktop-1280 | not-reached |
| widgets-05 | widget | healthMonitoring@desktop-1440 | not-reached |
| widgets-05 | widget | healthMonitoring@desktop-1920 | not-reached |
| widgets-05 | widget | systemResources@mobile-320 | not-reached |
| widgets-05 | widget | systemResources@mobile-375 | not-reached |
| widgets-05 | widget | systemResources@boundary-767 | not-reached |
| widgets-05 | widget | systemResources@boundary-768 | not-reached |
| widgets-05 | widget | systemResources@tablet-1024 | not-reached |
| widgets-05 | widget | systemResources@boundary-1279 | not-reached |
| widgets-05 | widget | systemResources@desktop-1280 | not-reached |
| widgets-05 | widget | systemResources@desktop-1440 | not-reached |
| widgets-05 | widget | systemResources@desktop-1920 | not-reached |
| widgets-05 | widget | systemDisks@mobile-320 | not-reached |
| widgets-05 | widget | systemDisks@mobile-375 | not-reached |
| widgets-05 | widget | systemDisks@boundary-767 | not-reached |
| widgets-05 | widget | systemDisks@boundary-768 | not-reached |
| widgets-05 | widget | systemDisks@tablet-1024 | not-reached |
| widgets-05 | widget | systemDisks@boundary-1279 | not-reached |
| widgets-05 | widget | systemDisks@desktop-1280 | not-reached |
| widgets-05 | widget | systemDisks@desktop-1440 | not-reached |
| widgets-05 | widget | systemDisks@desktop-1920 | not-reached |
| widgets-06 | case | WG-006-RENDER-SIZE | not-reached |
| widgets-06 | case | WG-006-STATES-RECOVERY | not-reached |
| widgets-06 | case | WG-006-OPTIONS-PERSISTENCE | not-reached |
| widgets-06 | case | WG-006-ACCESS-READONLY | not-reached |
| widgets-06 | case | WG-006-EVIDENCE | not-reached |
| widgets-06 | widget | firewall@mobile-320 | not-reached |
| widgets-06 | widget | firewall@mobile-375 | not-reached |
| widgets-06 | widget | firewall@boundary-767 | not-reached |
| widgets-06 | widget | firewall@boundary-768 | not-reached |
| widgets-06 | widget | firewall@tablet-1024 | not-reached |
| widgets-06 | widget | firewall@boundary-1279 | not-reached |
| widgets-06 | widget | firewall@desktop-1280 | not-reached |
| widgets-06 | widget | firewall@desktop-1440 | not-reached |
| widgets-06 | widget | firewall@desktop-1920 | not-reached |
| widgets-06 | widget | notifications@mobile-320 | not-reached |
| widgets-06 | widget | notifications@mobile-375 | not-reached |
| widgets-06 | widget | notifications@boundary-767 | not-reached |
| widgets-06 | widget | notifications@boundary-768 | not-reached |
| widgets-06 | widget | notifications@tablet-1024 | not-reached |
| widgets-06 | widget | notifications@boundary-1279 | not-reached |
| widgets-06 | widget | notifications@desktop-1280 | not-reached |
| widgets-06 | widget | notifications@desktop-1440 | not-reached |
| widgets-06 | widget | notifications@desktop-1920 | not-reached |
| widgets-06 | widget | networkControllerSummary@mobile-320 | not-reached |
| widgets-06 | widget | networkControllerSummary@mobile-375 | not-reached |
| widgets-06 | widget | networkControllerSummary@boundary-767 | not-reached |
| widgets-06 | widget | networkControllerSummary@boundary-768 | not-reached |
| widgets-06 | widget | networkControllerSummary@tablet-1024 | not-reached |
| widgets-06 | widget | networkControllerSummary@boundary-1279 | not-reached |
| widgets-06 | widget | networkControllerSummary@desktop-1280 | not-reached |
| widgets-06 | widget | networkControllerSummary@desktop-1440 | not-reached |
| widgets-06 | widget | networkControllerSummary@desktop-1920 | not-reached |
| widgets-06 | widget | networkControllerStatus@mobile-320 | not-reached |
| widgets-06 | widget | networkControllerStatus@mobile-375 | not-reached |
| widgets-06 | widget | networkControllerStatus@boundary-767 | not-reached |
| widgets-06 | widget | networkControllerStatus@boundary-768 | not-reached |
| widgets-06 | widget | networkControllerStatus@tablet-1024 | not-reached |
| widgets-06 | widget | networkControllerStatus@boundary-1279 | not-reached |
| widgets-06 | widget | networkControllerStatus@desktop-1280 | not-reached |
| widgets-06 | widget | networkControllerStatus@desktop-1440 | not-reached |
| widgets-06 | widget | networkControllerStatus@desktop-1920 | not-reached |
| widgets-06 | widget | uptimeKuma@mobile-320 | not-reached |
| widgets-06 | widget | uptimeKuma@mobile-375 | not-reached |
| widgets-06 | widget | uptimeKuma@boundary-767 | not-reached |
| widgets-06 | widget | uptimeKuma@boundary-768 | not-reached |
| widgets-06 | widget | uptimeKuma@tablet-1024 | not-reached |
| widgets-06 | widget | uptimeKuma@boundary-1279 | not-reached |
| widgets-06 | widget | uptimeKuma@desktop-1280 | not-reached |
| widgets-06 | widget | uptimeKuma@desktop-1440 | not-reached |
| widgets-06 | widget | uptimeKuma@desktop-1920 | not-reached |
| widgets-07 | case | WG-007-RENDER-SIZE | not-reached |
| widgets-07 | case | WG-007-STATES-RECOVERY | not-reached |
| widgets-07 | case | WG-007-OPTIONS-PERSISTENCE | not-reached |
| widgets-07 | case | WG-007-ACCESS-READONLY | not-reached |
| widgets-07 | case | WG-007-EVIDENCE | not-reached |
| widgets-07 | widget | beszelSystemTable@mobile-320 | not-reached |
| widgets-07 | widget | beszelSystemTable@mobile-375 | not-reached |
| widgets-07 | widget | beszelSystemTable@boundary-767 | not-reached |
| widgets-07 | widget | beszelSystemTable@boundary-768 | not-reached |
| widgets-07 | widget | beszelSystemTable@tablet-1024 | not-reached |
| widgets-07 | widget | beszelSystemTable@boundary-1279 | not-reached |
| widgets-07 | widget | beszelSystemTable@desktop-1280 | not-reached |
| widgets-07 | widget | beszelSystemTable@desktop-1440 | not-reached |
| widgets-07 | widget | beszelSystemTable@desktop-1920 | not-reached |
| widgets-07 | widget | beszelSystemGrid@mobile-320 | not-reached |
| widgets-07 | widget | beszelSystemGrid@mobile-375 | not-reached |
| widgets-07 | widget | beszelSystemGrid@boundary-767 | not-reached |
| widgets-07 | widget | beszelSystemGrid@boundary-768 | not-reached |
| widgets-07 | widget | beszelSystemGrid@tablet-1024 | not-reached |
| widgets-07 | widget | beszelSystemGrid@boundary-1279 | not-reached |
| widgets-07 | widget | beszelSystemGrid@desktop-1280 | not-reached |
| widgets-07 | widget | beszelSystemGrid@desktop-1440 | not-reached |
| widgets-07 | widget | beszelSystemGrid@desktop-1920 | not-reached |
| widgets-07 | widget | beszelAlerts@mobile-320 | not-reached |
| widgets-07 | widget | beszelAlerts@mobile-375 | not-reached |
| widgets-07 | widget | beszelAlerts@boundary-767 | not-reached |
| widgets-07 | widget | beszelAlerts@boundary-768 | not-reached |
| widgets-07 | widget | beszelAlerts@tablet-1024 | not-reached |
| widgets-07 | widget | beszelAlerts@boundary-1279 | not-reached |
| widgets-07 | widget | beszelAlerts@desktop-1280 | not-reached |
| widgets-07 | widget | beszelAlerts@desktop-1440 | not-reached |
| widgets-07 | widget | beszelAlerts@desktop-1920 | not-reached |
| widgets-07 | widget | beszelSystemStats@mobile-320 | not-reached |
| widgets-07 | widget | beszelSystemStats@mobile-375 | not-reached |
| widgets-07 | widget | beszelSystemStats@boundary-767 | not-reached |
| widgets-07 | widget | beszelSystemStats@boundary-768 | not-reached |
| widgets-07 | widget | beszelSystemStats@tablet-1024 | not-reached |
| widgets-07 | widget | beszelSystemStats@boundary-1279 | not-reached |
| widgets-07 | widget | beszelSystemStats@desktop-1280 | not-reached |
| widgets-07 | widget | beszelSystemStats@desktop-1440 | not-reached |
| widgets-07 | widget | beszelSystemStats@desktop-1920 | not-reached |
| widgets-07 | widget | wud@mobile-320 | not-reached |
| widgets-07 | widget | wud@mobile-375 | not-reached |
| widgets-07 | widget | wud@boundary-767 | not-reached |
| widgets-07 | widget | wud@boundary-768 | not-reached |
| widgets-07 | widget | wud@tablet-1024 | not-reached |
| widgets-07 | widget | wud@boundary-1279 | not-reached |
| widgets-07 | widget | wud@desktop-1280 | not-reached |
| widgets-07 | widget | wud@desktop-1440 | not-reached |
| widgets-07 | widget | wud@desktop-1920 | not-reached |
| widgets-08 | case | WG-008-RENDER-SIZE | not-reached |
| widgets-08 | case | WG-008-STATES-RECOVERY | not-reached |
| widgets-08 | case | WG-008-OPTIONS-PERSISTENCE | not-reached |
| widgets-08 | case | WG-008-ACCESS-READONLY | not-reached |
| widgets-08 | case | WG-008-EVIDENCE | not-reached |
| widgets-08 | widget | ups@mobile-320 | not-reached |
| widgets-08 | widget | ups@mobile-375 | not-reached |
| widgets-08 | widget | ups@boundary-767 | not-reached |
| widgets-08 | widget | ups@boundary-768 | not-reached |
| widgets-08 | widget | ups@tablet-1024 | not-reached |
| widgets-08 | widget | ups@boundary-1279 | not-reached |
| widgets-08 | widget | ups@desktop-1280 | not-reached |
| widgets-08 | widget | ups@desktop-1440 | not-reached |
| widgets-08 | widget | ups@desktop-1920 | not-reached |
| widgets-08 | widget | vpn@mobile-320 | not-reached |
| widgets-08 | widget | vpn@mobile-375 | not-reached |
| widgets-08 | widget | vpn@boundary-767 | not-reached |
| widgets-08 | widget | vpn@boundary-768 | not-reached |
| widgets-08 | widget | vpn@tablet-1024 | not-reached |
| widgets-08 | widget | vpn@boundary-1279 | not-reached |
| widgets-08 | widget | vpn@desktop-1280 | not-reached |
| widgets-08 | widget | vpn@desktop-1440 | not-reached |
| widgets-08 | widget | vpn@desktop-1920 | not-reached |
| widgets-08 | widget | speedtestTracker@mobile-320 | not-reached |
| widgets-08 | widget | speedtestTracker@mobile-375 | not-reached |
| widgets-08 | widget | speedtestTracker@boundary-767 | not-reached |
| widgets-08 | widget | speedtestTracker@boundary-768 | not-reached |
| widgets-08 | widget | speedtestTracker@tablet-1024 | not-reached |
| widgets-08 | widget | speedtestTracker@boundary-1279 | not-reached |
| widgets-08 | widget | speedtestTracker@desktop-1280 | not-reached |
| widgets-08 | widget | speedtestTracker@desktop-1440 | not-reached |
| widgets-08 | widget | speedtestTracker@desktop-1920 | not-reached |
| widgets-08 | widget | traefik@mobile-320 | not-reached |
| widgets-08 | widget | traefik@mobile-375 | not-reached |
| widgets-08 | widget | traefik@boundary-767 | not-reached |
| widgets-08 | widget | traefik@boundary-768 | not-reached |
| widgets-08 | widget | traefik@tablet-1024 | not-reached |
| widgets-08 | widget | traefik@boundary-1279 | not-reached |
| widgets-08 | widget | traefik@desktop-1280 | not-reached |
| widgets-08 | widget | traefik@desktop-1440 | not-reached |
| widgets-08 | widget | traefik@desktop-1920 | not-reached |
| widgets-08 | widget | umami@mobile-320 | not-reached |
| widgets-08 | widget | umami@mobile-375 | not-reached |
| widgets-08 | widget | umami@boundary-767 | not-reached |
| widgets-08 | widget | umami@boundary-768 | not-reached |
| widgets-08 | widget | umami@tablet-1024 | not-reached |
| widgets-08 | widget | umami@boundary-1279 | not-reached |
| widgets-08 | widget | umami@desktop-1280 | not-reached |
| widgets-08 | widget | umami@desktop-1440 | not-reached |
| widgets-08 | widget | umami@desktop-1920 | not-reached |
| widgets-09 | case | WG-009-RENDER-SIZE | not-reached |
| widgets-09 | case | WG-009-STATES-RECOVERY | not-reached |
| widgets-09 | case | WG-009-OPTIONS-PERSISTENCE | not-reached |
| widgets-09 | case | WG-009-ACCESS-READONLY | not-reached |
| widgets-09 | case | WG-009-EVIDENCE | not-reached |
| widgets-09 | widget | calendar@mobile-320 | not-reached |
| widgets-09 | widget | calendar@mobile-375 | not-reached |
| widgets-09 | widget | calendar@boundary-767 | not-reached |
| widgets-09 | widget | calendar@boundary-768 | not-reached |
| widgets-09 | widget | calendar@tablet-1024 | not-reached |
| widgets-09 | widget | calendar@boundary-1279 | not-reached |
| widgets-09 | widget | calendar@desktop-1280 | not-reached |
| widgets-09 | widget | calendar@desktop-1440 | not-reached |
| widgets-09 | widget | calendar@desktop-1920 | not-reached |
| widgets-09 | widget | mediaServer@mobile-320 | not-reached |
| widgets-09 | widget | mediaServer@mobile-375 | not-reached |
| widgets-09 | widget | mediaServer@boundary-767 | not-reached |
| widgets-09 | widget | mediaServer@boundary-768 | not-reached |
| widgets-09 | widget | mediaServer@tablet-1024 | not-reached |
| widgets-09 | widget | mediaServer@boundary-1279 | not-reached |
| widgets-09 | widget | mediaServer@desktop-1280 | not-reached |
| widgets-09 | widget | mediaServer@desktop-1440 | not-reached |
| widgets-09 | widget | mediaServer@desktop-1920 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@mobile-320 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@mobile-375 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@boundary-767 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@boundary-768 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@tablet-1024 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@boundary-1279 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@desktop-1280 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@desktop-1440 | not-reached |
| widgets-09 | widget | mediaRequests-requestList@desktop-1920 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@mobile-320 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@mobile-375 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@boundary-767 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@boundary-768 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@tablet-1024 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@boundary-1279 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@desktop-1280 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@desktop-1440 | not-reached |
| widgets-09 | widget | mediaRequests-requestStats@desktop-1920 | not-reached |
| widgets-09 | widget | mediaMissing@mobile-320 | not-reached |
| widgets-09 | widget | mediaMissing@mobile-375 | not-reached |
| widgets-09 | widget | mediaMissing@boundary-767 | not-reached |
| widgets-09 | widget | mediaMissing@boundary-768 | not-reached |
| widgets-09 | widget | mediaMissing@tablet-1024 | not-reached |
| widgets-09 | widget | mediaMissing@boundary-1279 | not-reached |
| widgets-09 | widget | mediaMissing@desktop-1280 | not-reached |
| widgets-09 | widget | mediaMissing@desktop-1440 | not-reached |
| widgets-09 | widget | mediaMissing@desktop-1920 | not-reached |
| widgets-10 | case | WG-010-RENDER-SIZE | not-reached |
| widgets-10 | case | WG-010-STATES-RECOVERY | not-reached |
| widgets-10 | case | WG-010-OPTIONS-PERSISTENCE | not-reached |
| widgets-10 | case | WG-010-ACCESS-READONLY | not-reached |
| widgets-10 | case | WG-010-EVIDENCE | not-reached |
| widgets-10 | widget | mediaReleases@mobile-320 | not-reached |
| widgets-10 | widget | mediaReleases@mobile-375 | not-reached |
| widgets-10 | widget | mediaReleases@boundary-767 | not-reached |
| widgets-10 | widget | mediaReleases@boundary-768 | not-reached |
| widgets-10 | widget | mediaReleases@tablet-1024 | not-reached |
| widgets-10 | widget | mediaReleases@boundary-1279 | not-reached |
| widgets-10 | widget | mediaReleases@desktop-1280 | not-reached |
| widgets-10 | widget | mediaReleases@desktop-1440 | not-reached |
| widgets-10 | widget | mediaReleases@desktop-1920 | not-reached |
| widgets-10 | widget | mediaTranscoding@mobile-320 | not-reached |
| widgets-10 | widget | mediaTranscoding@mobile-375 | not-reached |
| widgets-10 | widget | mediaTranscoding@boundary-767 | not-reached |
| widgets-10 | widget | mediaTranscoding@boundary-768 | not-reached |
| widgets-10 | widget | mediaTranscoding@tablet-1024 | not-reached |
| widgets-10 | widget | mediaTranscoding@boundary-1279 | not-reached |
| widgets-10 | widget | mediaTranscoding@desktop-1280 | not-reached |
| widgets-10 | widget | mediaTranscoding@desktop-1440 | not-reached |
| widgets-10 | widget | mediaTranscoding@desktop-1920 | not-reached |
| widgets-10 | widget | immich-serverStats@mobile-320 | not-reached |
| widgets-10 | widget | immich-serverStats@mobile-375 | not-reached |
| widgets-10 | widget | immich-serverStats@boundary-767 | not-reached |
| widgets-10 | widget | immich-serverStats@boundary-768 | not-reached |
| widgets-10 | widget | immich-serverStats@tablet-1024 | not-reached |
| widgets-10 | widget | immich-serverStats@boundary-1279 | not-reached |
| widgets-10 | widget | immich-serverStats@desktop-1280 | not-reached |
| widgets-10 | widget | immich-serverStats@desktop-1440 | not-reached |
| widgets-10 | widget | immich-serverStats@desktop-1920 | not-reached |
| widgets-10 | widget | immich-albumCarousel@mobile-320 | not-reached |
| widgets-10 | widget | immich-albumCarousel@mobile-375 | not-reached |
| widgets-10 | widget | immich-albumCarousel@boundary-767 | not-reached |
| widgets-10 | widget | immich-albumCarousel@boundary-768 | not-reached |
| widgets-10 | widget | immich-albumCarousel@tablet-1024 | not-reached |
| widgets-10 | widget | immich-albumCarousel@boundary-1279 | not-reached |
| widgets-10 | widget | immich-albumCarousel@desktop-1280 | not-reached |
| widgets-10 | widget | immich-albumCarousel@desktop-1440 | not-reached |
| widgets-10 | widget | immich-albumCarousel@desktop-1920 | not-reached |
| widgets-10 | widget | audioStats@mobile-320 | not-reached |
| widgets-10 | widget | audioStats@mobile-375 | not-reached |
| widgets-10 | widget | audioStats@boundary-767 | not-reached |
| widgets-10 | widget | audioStats@boundary-768 | not-reached |
| widgets-10 | widget | audioStats@tablet-1024 | not-reached |
| widgets-10 | widget | audioStats@boundary-1279 | not-reached |
| widgets-10 | widget | audioStats@desktop-1280 | not-reached |
| widgets-10 | widget | audioStats@desktop-1440 | not-reached |
| widgets-10 | widget | audioStats@desktop-1920 | not-reached |
| widgets-11 | case | WG-011-RENDER-SIZE | not-reached |
| widgets-11 | case | WG-011-STATES-RECOVERY | not-reached |
| widgets-11 | case | WG-011-OPTIONS-PERSISTENCE | not-reached |
| widgets-11 | case | WG-011-ACCESS-READONLY | not-reached |
| widgets-11 | case | WG-011-EVIDENCE | not-reached |
| widgets-11 | widget | paperlessNgx@mobile-320 | not-reached |
| widgets-11 | widget | paperlessNgx@mobile-375 | not-reached |
| widgets-11 | widget | paperlessNgx@boundary-767 | not-reached |
| widgets-11 | widget | paperlessNgx@boundary-768 | not-reached |
| widgets-11 | widget | paperlessNgx@tablet-1024 | not-reached |
| widgets-11 | widget | paperlessNgx@boundary-1279 | not-reached |
| widgets-11 | widget | paperlessNgx@desktop-1280 | not-reached |
| widgets-11 | widget | paperlessNgx@desktop-1440 | not-reached |
| widgets-11 | widget | paperlessNgx@desktop-1920 | not-reached |
| widgets-11 | widget | patchmon@mobile-320 | not-reached |
| widgets-11 | widget | patchmon@mobile-375 | not-reached |
| widgets-11 | widget | patchmon@boundary-767 | not-reached |
| widgets-11 | widget | patchmon@boundary-768 | not-reached |
| widgets-11 | widget | patchmon@tablet-1024 | not-reached |
| widgets-11 | widget | patchmon@boundary-1279 | not-reached |
| widgets-11 | widget | patchmon@desktop-1280 | not-reached |
| widgets-11 | widget | patchmon@desktop-1440 | not-reached |
| widgets-11 | widget | patchmon@desktop-1920 | not-reached |
| widgets-11 | widget | bazarr@mobile-320 | not-reached |
| widgets-11 | widget | bazarr@mobile-375 | not-reached |
| widgets-11 | widget | bazarr@boundary-767 | not-reached |
| widgets-11 | widget | bazarr@boundary-768 | not-reached |
| widgets-11 | widget | bazarr@tablet-1024 | not-reached |
| widgets-11 | widget | bazarr@boundary-1279 | not-reached |
| widgets-11 | widget | bazarr@desktop-1280 | not-reached |
| widgets-11 | widget | bazarr@desktop-1440 | not-reached |
| widgets-11 | widget | bazarr@desktop-1920 | not-reached |
| widgets-11 | widget | tracearr@mobile-320 | not-reached |
| widgets-11 | widget | tracearr@mobile-375 | not-reached |
| widgets-11 | widget | tracearr@boundary-767 | not-reached |
| widgets-11 | widget | tracearr@boundary-768 | not-reached |
| widgets-11 | widget | tracearr@tablet-1024 | not-reached |
| widgets-11 | widget | tracearr@boundary-1279 | not-reached |
| widgets-11 | widget | tracearr@desktop-1280 | not-reached |
| widgets-11 | widget | tracearr@desktop-1440 | not-reached |
| widgets-11 | widget | tracearr@desktop-1920 | not-reached |
| widgets-11 | widget | releases@mobile-320 | not-reached |
| widgets-11 | widget | releases@mobile-375 | not-reached |
| widgets-11 | widget | releases@boundary-767 | not-reached |
| widgets-11 | widget | releases@boundary-768 | not-reached |
| widgets-11 | widget | releases@tablet-1024 | not-reached |
| widgets-11 | widget | releases@boundary-1279 | not-reached |
| widgets-11 | widget | releases@desktop-1280 | not-reached |
| widgets-11 | widget | releases@desktop-1440 | not-reached |
| widgets-11 | widget | releases@desktop-1920 | not-reached |
| widgets-12 | case | WG-012-RENDER-SIZE | not-reached |
| widgets-12 | case | WG-012-STATES-RECOVERY | not-reached |
| widgets-12 | case | WG-012-OPTIONS-PERSISTENCE | not-reached |
| widgets-12 | case | WG-012-ACCESS-READONLY | not-reached |
| widgets-12 | case | WG-012-EVIDENCE | not-reached |
| widgets-12 | widget | coolify@mobile-320 | not-reached |
| widgets-12 | widget | coolify@mobile-375 | not-reached |
| widgets-12 | widget | coolify@boundary-767 | not-reached |
| widgets-12 | widget | coolify@boundary-768 | not-reached |
| widgets-12 | widget | coolify@tablet-1024 | not-reached |
| widgets-12 | widget | coolify@boundary-1279 | not-reached |
| widgets-12 | widget | coolify@desktop-1280 | not-reached |
| widgets-12 | widget | coolify@desktop-1440 | not-reached |
| widgets-12 | widget | coolify@desktop-1920 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@mobile-320 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@mobile-375 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@boundary-767 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@boundary-768 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@tablet-1024 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@boundary-1279 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@desktop-1280 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@desktop-1440 | not-reached |
| widgets-12 | widget | archiveTeamWarrior@desktop-1920 | not-reached |
| widgets-12 | widget | customApi@mobile-320 | not-reached |
| widgets-12 | widget | customApi@mobile-375 | not-reached |
| widgets-12 | widget | customApi@boundary-767 | not-reached |
| widgets-12 | widget | customApi@boundary-768 | not-reached |
| widgets-12 | widget | customApi@tablet-1024 | not-reached |
| widgets-12 | widget | customApi@boundary-1279 | not-reached |
| widgets-12 | widget | customApi@desktop-1280 | not-reached |
| widgets-12 | widget | customApi@desktop-1440 | not-reached |
| widgets-12 | widget | customApi@desktop-1920 | not-reached |
| widgets-12 | widget | assistant@mobile-320 | not-reached |
| widgets-12 | widget | assistant@mobile-375 | not-reached |
| widgets-12 | widget | assistant@boundary-767 | not-reached |
| widgets-12 | widget | assistant@boundary-768 | not-reached |
| widgets-12 | widget | assistant@tablet-1024 | not-reached |
| widgets-12 | widget | assistant@boundary-1279 | not-reached |
| widgets-12 | widget | assistant@desktop-1280 | not-reached |
| widgets-12 | widget | assistant@desktop-1440 | not-reached |
| widgets-12 | widget | assistant@desktop-1920 | not-reached |
| core-v2-01 | case | CV-001-HAPPY-PATH | not-reached |
| core-v2-01 | case | CV-001-MUTATION-PERSISTENCE | not-reached |
| core-v2-01 | case | CV-001-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-01 | case | CV-001-DEGRADED-RECOVERY | not-reached |
| core-v2-02 | case | CV-002-HAPPY-PATH | not-reached |
| core-v2-02 | case | CV-002-MUTATION-PERSISTENCE | not-reached |
| core-v2-02 | case | CV-002-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-02 | case | CV-002-DEGRADED-RECOVERY | not-reached |
| core-v2-03 | case | CV-003-HAPPY-PATH | not-reached |
| core-v2-03 | case | CV-003-MUTATION-PERSISTENCE | not-reached |
| core-v2-03 | case | CV-003-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-03 | case | CV-003-DEGRADED-RECOVERY | not-reached |
| core-v2-04 | case | CV-004-HAPPY-PATH | not-reached |
| core-v2-04 | case | CV-004-MUTATION-PERSISTENCE | not-reached |
| core-v2-04 | case | CV-004-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-04 | case | CV-004-DEGRADED-RECOVERY | not-reached |
| core-v2-05 | case | CV-005-HAPPY-PATH | not-reached |
| core-v2-05 | case | CV-005-MUTATION-PERSISTENCE | not-reached |
| core-v2-05 | case | CV-005-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-05 | case | CV-005-DEGRADED-RECOVERY | not-reached |
| core-v2-06 | case | CV-006-HAPPY-PATH | not-reached |
| core-v2-06 | case | CV-006-MUTATION-PERSISTENCE | not-reached |
| core-v2-06 | case | CV-006-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-06 | case | CV-006-DEGRADED-RECOVERY | not-reached |
| core-v2-07 | case | CV-007-HAPPY-PATH | not-reached |
| core-v2-07 | case | CV-007-MUTATION-PERSISTENCE | not-reached |
| core-v2-07 | case | CV-007-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-07 | case | CV-007-DEGRADED-RECOVERY | not-reached |
| core-v2-08 | case | CV-008-HAPPY-PATH | not-reached |
| core-v2-08 | case | CV-008-MUTATION-PERSISTENCE | not-reached |
| core-v2-08 | case | CV-008-ACCESSIBILITY-ACCESS | not-reached |
| core-v2-08 | case | CV-008-DEGRADED-RECOVERY | not-reached |
| whole-product-01 | case | WP-001-JOURNEY | not-reached |
| whole-product-01 | case | WP-001-THRESHOLDS | not-reached |
| whole-product-01 | case | WP-001-PERSISTENCE-ACCESS | not-reached |
| whole-product-01 | case | WP-001-FAILURE-EVIDENCE | not-reached |
| whole-product-02 | case | WP-002-JOURNEY | not-reached |
| whole-product-02 | case | WP-002-THRESHOLDS | not-reached |
| whole-product-02 | case | WP-002-PERSISTENCE-ACCESS | not-reached |
| whole-product-02 | case | WP-002-FAILURE-EVIDENCE | not-reached |
| whole-product-03 | case | WP-003-JOURNEY | not-reached |
| whole-product-03 | case | WP-003-THRESHOLDS | not-reached |
| whole-product-03 | case | WP-003-PERSISTENCE-ACCESS | not-reached |
| whole-product-03 | case | WP-003-FAILURE-EVIDENCE | not-reached |
| whole-product-04 | case | WP-004-JOURNEY | not-reached |
| whole-product-04 | case | WP-004-THRESHOLDS | not-reached |
| whole-product-04 | case | WP-004-PERSISTENCE-ACCESS | not-reached |
| whole-product-04 | case | WP-004-FAILURE-EVIDENCE | not-reached |
| whole-product-05 | case | WP-005-JOURNEY | not-reached |
| whole-product-05 | case | WP-005-THRESHOLDS | not-reached |
| whole-product-05 | case | WP-005-PERSISTENCE-ACCESS | not-reached |
| whole-product-05 | case | WP-005-FAILURE-EVIDENCE | not-reached |
| whole-product-06 | case | WP-006-JOURNEY | not-reached |
| whole-product-06 | case | WP-006-THRESHOLDS | not-reached |
| whole-product-06 | case | WP-006-PERSISTENCE-ACCESS | not-reached |
| whole-product-06 | case | WP-006-FAILURE-EVIDENCE | not-reached |
| whole-product-07 | case | WP-007-JOURNEY | not-reached |
| whole-product-07 | case | WP-007-THRESHOLDS | not-reached |
| whole-product-07 | case | WP-007-PERSISTENCE-ACCESS | not-reached |
| whole-product-07 | case | WP-007-FAILURE-EVIDENCE | not-reached |
| whole-product-08 | case | WP-008-JOURNEY | not-reached |
| whole-product-08 | case | WP-008-THRESHOLDS | not-reached |
| whole-product-08 | case | WP-008-PERSISTENCE-ACCESS | not-reached |
| whole-product-08 | case | WP-008-FAILURE-EVIDENCE | not-reached |
| whole-product-09 | case | WP-009-JOURNEY | not-reached |
| whole-product-09 | case | WP-009-THRESHOLDS | not-reached |
| whole-product-09 | case | WP-009-PERSISTENCE-ACCESS | not-reached |
| whole-product-09 | case | WP-009-FAILURE-EVIDENCE | not-reached |
| performance-01 | case | PE-001-BASELINE | not-reached |
| performance-01 | case | PE-001-THRESHOLD | not-reached |
| performance-01 | case | PE-001-STRESS | not-reached |
| performance-01 | case | PE-001-RECOVERY-EVIDENCE | not-reached |
| performance-02 | case | PE-002-BASELINE | not-reached |
| performance-02 | case | PE-002-THRESHOLD | not-reached |
| performance-02 | case | PE-002-STRESS | not-reached |
| performance-02 | case | PE-002-RECOVERY-EVIDENCE | not-reached |
| performance-03 | case | PE-003-BASELINE | not-reached |
| performance-03 | case | PE-003-THRESHOLD | not-reached |
| performance-03 | case | PE-003-STRESS | not-reached |
| performance-03 | case | PE-003-RECOVERY-EVIDENCE | not-reached |
| performance-04 | case | PE-004-BASELINE | not-reached |
| performance-04 | case | PE-004-THRESHOLD | not-reached |
| performance-04 | case | PE-004-STRESS | not-reached |
| performance-04 | case | PE-004-RECOVERY-EVIDENCE | not-reached |

## PR coverage

| PR | Area | Packets |
| --- | --- | ---: |
| #6356 | Custom Widgets | 7 |
| #6503 | dnd-kit grid | 12 |
| #6502 | widget modernization | 23 |
| #6450 | responsive layouts | 5 |
| #6482 | Assistant | 7 |
| #6555 | widget performance | 18 |
| #6569 | onboarding | 4 |
| #6545 | release-v2 rollup | 15 |

## Agent reports

- [preflight-01: Candidate identity and services](reports/preflight-01/report.md) — passed
- [preflight-02: Fixture and persona access](reports/preflight-02/report.md) — passed
- [preflight-03: Browser evidence hygiene](reports/preflight-03/report.md) — passed
- [board-01: 24-column placement and resize](reports/board-01/report.md) — passed
- [board-02: Scrollable canvas and collapse states](reports/board-02/report.md) — not-reached
- [board-03: Dense collision handling](reports/board-03/report.md) — failed
- [board-04: Nested containers](reports/board-04/report.md) — not-reached
- [board-05: Responsive layout boundaries](reports/board-05/report.md) — not-reached
- [board-06: Icons, bookmarks, and compact layout](reports/board-06/report.md) — not-reached
- [board-07: Permission-aware editing](reports/board-07/report.md) — not-reached
- [board-08: Board import and export](reports/board-08/report.md) — not-reached
- [board-09: Keyboard-only grid operation](reports/board-09/report.md) — not-reached
- [widgets-01: Time and environment](reports/widgets-01/report.md) — not-reached
- [widgets-02: Apps, embeds, video, game status, and stocks](reports/widgets-02/report.md) — not-reached
- [widgets-03: Notes, bookmarks, feeds, and timetable](reports/widgets-03/report.md) — not-reached
- [widgets-04: Downloads, containers, indexers, and DNS](reports/widgets-04/report.md) — not-reached
- [widgets-05: Smart home, health, and system telemetry](reports/widgets-05/report.md) — not-reached
- [widgets-06: Network availability and operations](reports/widgets-06/report.md) — not-reached
- [widgets-07: Beszel and update monitoring](reports/widgets-07/report.md) — not-reached
- [widgets-08: Power, VPN, speed, routing, and analytics](reports/widgets-08/report.md) — not-reached
- [widgets-09: Media overview and requests](reports/widgets-09/report.md) — not-reached
- [widgets-10: Media activity, Immich, and audio](reports/widgets-10/report.md) — not-reached
- [widgets-11: Documents, patching, media services, and releases](reports/widgets-11/report.md) — not-reached
- [widgets-12: Coolify, ArchiveTeam, Custom API, and Assistant](reports/widgets-12/report.md) — not-reached
- [core-v2-01: Custom widget authoring](reports/core-v2-01/report.md) — not-reached
- [core-v2-02: Assistant tool flow](reports/core-v2-02/report.md) — not-reached
- [core-v2-03: Onboarding happy path](reports/core-v2-03/report.md) — not-reached
- [core-v2-04: Authentication and session transitions](reports/core-v2-04/report.md) — not-reached
- [core-v2-05: Integration management](reports/core-v2-05/report.md) — not-reached
- [core-v2-06: Search, menus, and dialogs](reports/core-v2-06/report.md) — not-reached
- [core-v2-07: Read-only enforcement](reports/core-v2-07/report.md) — not-reached
- [core-v2-08: Failure and recovery states](reports/core-v2-08/report.md) — not-reached
- [whole-product-01: Admin day-one journey](reports/whole-product-01/report.md) — not-reached
- [whole-product-02: Owner customization journey](reports/whole-product-02/report.md) — not-reached
- [whole-product-03: Editor daily journey](reports/whole-product-03/report.md) — not-reached
- [whole-product-04: Viewer and outsider boundaries](reports/whole-product-04/report.md) — not-reached
- [whole-product-05: Mobile journey](reports/whole-product-05/report.md) — not-reached
- [whole-product-06: Media operator journey](reports/whole-product-06/report.md) — not-reached
- [whole-product-07: Infrastructure operator journey](reports/whole-product-07/report.md) — not-reached
- [whole-product-08: Creator and Assistant journey](reports/whole-product-08/report.md) — not-reached
- [whole-product-09: Accessibility and destructive-action pass](reports/whole-product-09/report.md) — not-reached
- [performance-01: Cold and warm board load](reports/performance-01/report.md) — not-reached
- [performance-02: Grid interaction responsiveness](reports/performance-02/report.md) — not-reached
- [performance-03: Widget network and render budget](reports/performance-03/report.md) — not-reached
- [performance-04: Long-session stability](reports/performance-04/report.md) — not-reached

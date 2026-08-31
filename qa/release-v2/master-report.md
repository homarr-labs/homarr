# Release-v2 QA master report

Generated: 2026-08-31T18:42:05.251Z

## Decision: NO-GO

GO requires zero P0/P1 findings and zero critical gaps. Current critical gaps: **186**.

## Coverage

| Measure | Passed | Failed | Blocked | Not reached | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Packets | 0 | 3 | 42 | 0 | 45 |
| Cases | 3 | 3 | 183 | 0 | 189 |

| Wave | Passed | Total |
| --- | ---: | ---: |
| preflight | 0 | 3 |
| board | 0 | 9 |
| widgets | 0 | 12 |
| core-v2 | 0 | 8 |
| whole-product | 0 | 9 |
| performance | 0 | 4 |

## Coverage by required axis

### Pull request

| PR | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| #6356 | Custom Widgets | 0 | 0 | 7 | 0 | 7 |
| #6450 | responsive layouts | 0 | 0 | 5 | 0 | 5 |
| #6482 | Assistant | 0 | 0 | 7 | 0 | 7 |
| #6502 | widget modernization | 0 | 0 | 23 | 0 | 23 |
| #6503 | dnd-kit grid | 0 | 0 | 12 | 0 | 12 |
| #6545 | release-v2 rollup | 0 | 3 | 12 | 0 | 15 |
| #6555 | widget performance | 0 | 0 | 18 | 0 | 18 |
| #6569 | onboarding | 0 | 0 | 4 | 0 | 4 |

### Feature

| Feature / agent | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 0 | 0 | 1 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 1 | 0 | 1 |
| board-03 | Dense collision handling | 0 | 0 | 1 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 1 | 0 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 1 | 0 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 1 | 0 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 1 | 0 | 1 |
| board-08 | Board import and export | 0 | 0 | 1 | 0 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 1 | 0 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 1 | 0 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 1 | 0 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 1 | 0 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 1 | 0 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 1 | 0 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 1 | 0 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 1 | 0 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 1 | 0 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 1 | 0 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 1 | 0 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 1 | 0 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 1 | 0 | 1 |
| preflight-01 | Candidate identity and services | 0 | 1 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 0 | 1 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 0 | 1 | 0 | 0 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 1 | 0 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 1 | 0 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 1 | 0 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 1 | 0 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 1 | 0 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 1 | 0 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 1 | 0 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 1 | 0 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 1 | 0 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 1 | 0 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 1 | 0 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 1 | 0 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 1 | 0 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 1 | 0 | 1 |

### Widget

| Widget kind | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| airQuality | widgets-01 | 0 | 0 | 9 | 0 | 9 |
| anchorNote | widgets-03 | 0 | 0 | 9 | 0 | 9 |
| app | widgets-02 | 0 | 0 | 9 | 0 | 9 |
| archiveTeamWarrior | widgets-12 | 0 | 0 | 9 | 0 | 9 |
| assistant | widgets-12 | 0 | 0 | 9 | 0 | 9 |
| audioStats | widgets-10 | 0 | 0 | 9 | 0 | 9 |
| bazarr | widgets-11 | 0 | 0 | 9 | 0 | 9 |
| beszelAlerts | widgets-07 | 0 | 0 | 9 | 0 | 9 |
| beszelSystemGrid | widgets-07 | 0 | 0 | 9 | 0 | 9 |
| beszelSystemStats | widgets-07 | 0 | 0 | 9 | 0 | 9 |
| beszelSystemTable | widgets-07 | 0 | 0 | 9 | 0 | 9 |
| bookmarks | widgets-03 | 0 | 0 | 9 | 0 | 9 |
| calendar | widgets-09 | 0 | 0 | 9 | 0 | 9 |
| clock | widgets-01 | 0 | 0 | 9 | 0 | 9 |
| coolify | widgets-12 | 0 | 0 | 9 | 0 | 9 |
| countdown | widgets-01 | 0 | 0 | 9 | 0 | 9 |
| customApi | widgets-12 | 0 | 0 | 9 | 0 | 9 |
| dnsHoleControls | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| dnsHoleSummary | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| dockerContainers | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| downloads | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| firewall | widgets-06 | 0 | 0 | 9 | 0 | 9 |
| healthMonitoring | widgets-05 | 0 | 0 | 9 | 0 | 9 |
| iframe | widgets-02 | 0 | 0 | 9 | 0 | 9 |
| immich-albumCarousel | widgets-10 | 0 | 0 | 9 | 0 | 9 |
| immich-serverStats | widgets-10 | 0 | 0 | 9 | 0 | 9 |
| indexerManager | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| mediaMissing | widgets-09 | 0 | 0 | 9 | 0 | 9 |
| mediaReleases | widgets-10 | 0 | 0 | 9 | 0 | 9 |
| mediaRequests-requestList | widgets-09 | 0 | 0 | 9 | 0 | 9 |
| mediaRequests-requestStats | widgets-09 | 0 | 0 | 9 | 0 | 9 |
| mediaServer | widgets-09 | 0 | 0 | 9 | 0 | 9 |
| mediaTranscoding | widgets-10 | 0 | 0 | 9 | 0 | 9 |
| minecraftServerStatus | widgets-02 | 0 | 0 | 9 | 0 | 9 |
| networkControllerStatus | widgets-06 | 0 | 0 | 9 | 0 | 9 |
| networkControllerSummary | widgets-06 | 0 | 0 | 9 | 0 | 9 |
| notebook | widgets-03 | 0 | 0 | 9 | 0 | 9 |
| notifications | widgets-06 | 0 | 0 | 9 | 0 | 9 |
| paperlessNgx | widgets-11 | 0 | 0 | 9 | 0 | 9 |
| patchmon | widgets-11 | 0 | 0 | 9 | 0 | 9 |
| releases | widgets-11 | 0 | 0 | 9 | 0 | 9 |
| rssFeed | widgets-03 | 0 | 0 | 9 | 0 | 9 |
| smartHome-entityState | widgets-05 | 0 | 0 | 9 | 0 | 9 |
| smartHome-executeAutomation | widgets-05 | 0 | 0 | 9 | 0 | 9 |
| speedtestTracker | widgets-08 | 0 | 0 | 9 | 0 | 9 |
| stockPrice | widgets-02 | 0 | 0 | 9 | 0 | 9 |
| systemDisks | widgets-05 | 0 | 0 | 9 | 0 | 9 |
| systemResources | widgets-05 | 0 | 0 | 9 | 0 | 9 |
| timer | widgets-01 | 0 | 0 | 9 | 0 | 9 |
| timetable | widgets-03 | 0 | 0 | 9 | 0 | 9 |
| tracearr | widgets-11 | 0 | 0 | 9 | 0 | 9 |
| traefik | widgets-08 | 0 | 0 | 9 | 0 | 9 |
| umami | widgets-08 | 0 | 0 | 9 | 0 | 9 |
| ups | widgets-08 | 0 | 0 | 9 | 0 | 9 |
| uptimeKuma | widgets-06 | 0 | 0 | 9 | 0 | 9 |
| video | widgets-02 | 0 | 0 | 9 | 0 | 9 |
| vpn | widgets-08 | 0 | 0 | 9 | 0 | 9 |
| weather | widgets-01 | 0 | 0 | 9 | 0 | 9 |
| wud | widgets-07 | 0 | 0 | 9 | 0 | 9 |

### Size threshold

High-risk widgets require every width 1–24 × every height 1–6 at all assigned mobile, breakpoint-edge, and desktop viewports. Other widgets require minimum, canonical, wide, tall, maximum, overflow, and behavior-changing threshold checks.

| Widget size threshold | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| airQuality | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| anchorNote | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| app | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| archiveTeamWarrior | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| assistant | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| audioStats | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| bazarr | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| beszelAlerts | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| beszelSystemGrid | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| beszelSystemStats | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| beszelSystemTable | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| bookmarks | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| calendar | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| clock | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| coolify | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| countdown | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| customApi | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| dnsHoleControls | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| dnsHoleSummary | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| dockerContainers | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| downloads | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| firewall | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| healthMonitoring | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| iframe | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| immich-albumCarousel | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| immich-serverStats | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| indexerManager | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| mediaMissing | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| mediaReleases | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| mediaRequests-requestList | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| mediaRequests-requestStats | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| mediaServer | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| mediaTranscoding | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| minecraftServerStatus | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| networkControllerStatus | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| networkControllerSummary | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| notebook | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| notifications | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| paperlessNgx | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| patchmon | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| releases | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| rssFeed | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| smartHome-entityState | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| smartHome-executeAutomation | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| speedtestTracker | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| stockPrice | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| systemDisks | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| systemResources | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| timer | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| timetable | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| tracearr | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| traefik | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| umami | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| ups | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| uptimeKuma | every width 1-24 × every height 1-6 | 0 | 0 | 9 | 0 | 9 |
| video | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| vpn | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| weather | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |
| wud | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | 0 | 0 | 9 | 0 | 9 |

### Viewport

| Viewport | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| boundary-1279 | board-05 | 0 | 0 | 13 | 0 | 13 |
| boundary-767 | board-05 | 0 | 0 | 14 | 0 | 14 |
| boundary-768 | board-05 | 0 | 0 | 14 | 0 | 14 |
| desktop-1280 | board-02 | 0 | 0 | 18 | 0 | 18 |
| desktop-1440 | preflight-01 | 0 | 2 | 31 | 0 | 33 |
| desktop-1920 | preflight-03 | 0 | 1 | 17 | 0 | 18 |
| mobile-320 | preflight-03 | 0 | 1 | 20 | 0 | 21 |
| mobile-375 | board-02 | 0 | 0 | 22 | 0 | 22 |
| tablet-1024 | board-03 | 0 | 0 | 15 | 0 | 15 |

### Persona

| Persona | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ash Assistant | widgets-12 | 0 | 0 | 3 | 0 | 3 |
| Avery Admin | preflight-01 | 0 | 2 | 4 | 0 | 6 |
| Brooke Minimalist | board-06 | 0 | 0 | 2 | 0 | 2 |
| Casey Chaos | preflight-03 | 0 | 1 | 4 | 0 | 5 |
| Cora Creator | widgets-02 | 0 | 0 | 5 | 0 | 5 |
| Eden Editor | board-02 | 0 | 0 | 3 | 0 | 3 |
| Ingrid Infra | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| Kira Keyboard | board-09 | 0 | 0 | 3 | 0 | 3 |
| Maya Media | widgets-09 | 0 | 0 | 4 | 0 | 4 |
| Morgan Mobile | board-05 | 0 | 0 | 2 | 0 | 2 |
| Nolan Outsider | preflight-02 | 0 | 1 | 3 | 0 | 4 |
| Nora Newcomer | core-v2-03 | 0 | 0 | 2 | 0 | 2 |
| Rowan Owner | preflight-02 | 0 | 1 | 5 | 0 | 6 |
| Vivian Viewer | preflight-02 | 0 | 1 | 3 | 0 | 4 |

### Permission

| Permission boundary | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ash Assistant | widgets-12 | 0 | 0 | 3 | 0 | 3 |
| Avery Admin | preflight-01 | 0 | 0 | 6 | 0 | 6 |
| Brooke Minimalist | board-06 | 0 | 0 | 2 | 0 | 2 |
| Casey Chaos | preflight-03 | 0 | 0 | 5 | 0 | 5 |
| Cora Creator | widgets-02 | 0 | 0 | 5 | 0 | 5 |
| Eden Editor | board-02 | 0 | 0 | 3 | 0 | 3 |
| Ingrid Infra | widgets-04 | 0 | 0 | 9 | 0 | 9 |
| Kira Keyboard | board-09 | 0 | 0 | 3 | 0 | 3 |
| Maya Media | widgets-09 | 0 | 0 | 4 | 0 | 4 |
| Morgan Mobile | board-05 | 0 | 0 | 2 | 0 | 2 |
| Nolan Outsider | preflight-02 | 0 | 0 | 4 | 0 | 4 |
| Nora Newcomer | core-v2-03 | 0 | 0 | 2 | 0 | 2 |
| profile:degraded | preflight-01 | 0 | 0 | 23 | 0 | 23 |
| profile:main-readonly | preflight-01 | 0 | 0 | 7 | 0 | 7 |
| profile:main-writable | preflight-01 | 0 | 0 | 42 | 0 | 42 |
| profile:onboarding-fresh | preflight-01 | 0 | 0 | 4 | 0 | 4 |
| Rowan Owner | preflight-02 | 0 | 0 | 6 | 0 | 6 |
| Vivian Viewer | preflight-02 | 0 | 0 | 4 | 0 | 4 |

### Mutation

| Mutation area | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 0 | 0 | 1 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 1 | 0 | 1 |
| board-03 | Dense collision handling | 0 | 0 | 1 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 1 | 0 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 1 | 0 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 1 | 0 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 1 | 0 | 1 |
| board-08 | Board import and export | 0 | 0 | 1 | 0 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 1 | 0 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 1 | 0 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 1 | 0 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 1 | 0 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 1 | 0 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 1 | 0 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 1 | 0 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 1 | 0 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 1 | 0 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 1 | 0 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 1 | 0 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 1 | 0 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 1 | 0 | 1 |
| preflight-01 | Candidate identity and services | 0 | 1 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 0 | 1 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 0 | 1 | 0 | 0 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 1 | 0 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 1 | 0 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 1 | 0 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 1 | 0 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 1 | 0 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 1 | 0 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 1 | 0 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 1 | 0 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 1 | 0 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 1 | 0 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 1 | 0 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 1 | 0 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 1 | 0 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 1 | 0 | 1 |

### State and recovery

| State / recovery area | Detail | Passed | Failed | Blocked | Not reached | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| board-01 | 24-column placement and resize | 0 | 0 | 1 | 0 | 1 |
| board-02 | Scrollable canvas and collapse states | 0 | 0 | 1 | 0 | 1 |
| board-03 | Dense collision handling | 0 | 0 | 1 | 0 | 1 |
| board-04 | Nested containers | 0 | 0 | 1 | 0 | 1 |
| board-05 | Responsive layout boundaries | 0 | 0 | 1 | 0 | 1 |
| board-06 | Icons, bookmarks, and compact layout | 0 | 0 | 1 | 0 | 1 |
| board-07 | Permission-aware editing | 0 | 0 | 1 | 0 | 1 |
| board-08 | Board import and export | 0 | 0 | 1 | 0 | 1 |
| board-09 | Keyboard-only grid operation | 0 | 0 | 1 | 0 | 1 |
| core-v2-01 | Custom widget authoring | 0 | 0 | 1 | 0 | 1 |
| core-v2-02 | Assistant tool flow | 0 | 0 | 1 | 0 | 1 |
| core-v2-03 | Onboarding happy path | 0 | 0 | 1 | 0 | 1 |
| core-v2-04 | Authentication and session transitions | 0 | 0 | 1 | 0 | 1 |
| core-v2-05 | Integration management | 0 | 0 | 1 | 0 | 1 |
| core-v2-06 | Search, menus, and dialogs | 0 | 0 | 1 | 0 | 1 |
| core-v2-07 | Read-only enforcement | 0 | 0 | 1 | 0 | 1 |
| core-v2-08 | Failure and recovery states | 0 | 0 | 1 | 0 | 1 |
| performance-01 | Cold and warm board load | 0 | 0 | 1 | 0 | 1 |
| performance-02 | Grid interaction responsiveness | 0 | 0 | 1 | 0 | 1 |
| performance-03 | Widget network and render budget | 0 | 0 | 1 | 0 | 1 |
| performance-04 | Long-session stability | 0 | 0 | 1 | 0 | 1 |
| preflight-01 | Candidate identity and services | 1 | 0 | 0 | 0 | 1 |
| preflight-02 | Fixture and persona access | 1 | 0 | 0 | 0 | 1 |
| preflight-03 | Browser evidence hygiene | 1 | 0 | 0 | 0 | 1 |
| whole-product-01 | Admin day-one journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-02 | Owner customization journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-03 | Editor daily journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-04 | Viewer and outsider boundaries | 0 | 0 | 1 | 0 | 1 |
| whole-product-05 | Mobile journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-06 | Media operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-07 | Infrastructure operator journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-08 | Creator and Assistant journey | 0 | 0 | 1 | 0 | 1 |
| whole-product-09 | Accessibility and destructive-action pass | 0 | 0 | 1 | 0 | 1 |
| widgets-01 | Time and environment | 0 | 0 | 1 | 0 | 1 |
| widgets-02 | Apps, embeds, video, game status, and stocks | 0 | 0 | 1 | 0 | 1 |
| widgets-03 | Notes, bookmarks, feeds, and timetable | 0 | 0 | 1 | 0 | 1 |
| widgets-04 | Downloads, containers, indexers, and DNS | 0 | 0 | 1 | 0 | 1 |
| widgets-05 | Smart home, health, and system telemetry | 0 | 0 | 1 | 0 | 1 |
| widgets-06 | Network availability and operations | 0 | 0 | 1 | 0 | 1 |
| widgets-07 | Beszel and update monitoring | 0 | 0 | 1 | 0 | 1 |
| widgets-08 | Power, VPN, speed, routing, and analytics | 0 | 0 | 1 | 0 | 1 |
| widgets-09 | Media overview and requests | 0 | 0 | 1 | 0 | 1 |
| widgets-10 | Media activity, Immich, and audio | 0 | 0 | 1 | 0 | 1 |
| widgets-11 | Documents, patching, media services, and releases | 0 | 0 | 1 | 0 | 1 |
| widgets-12 | Coolify, ArchiveTeam, Custom API, and Assistant | 0 | 0 | 1 | 0 | 1 |

## Performance measurements

| Agent | Measurement | Value | Threshold | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | No measurement recorded | — | — | not-reached | — |

### Performance limitations

| Agent | Limitation |
| --- | --- |
| host-runtime | The host's fs.inotify.max_user_instances=128 is too low for concurrent native Watchpack watchers. Spawned QA apps keep Turbopack and use 1000ms Watchpack polling; filesystem changes can take up to one polling interval to reach HMR. |
| preflight-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| preflight-01 | No credentials were submitted and no product state was mutated. |
| preflight-01 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| preflight-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| preflight-02 | No credentials were submitted and no product state was mutated. |
| preflight-02 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| preflight-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| preflight-03 | No credentials were submitted and no product state was mutated. |
| preflight-03 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-01 | No credentials were submitted and no product state was mutated. |
| board-01 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-02 | No credentials were submitted and no product state was mutated. |
| board-02 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-03 | No credentials were submitted and no product state was mutated. |
| board-03 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-04 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-04 | No credentials were submitted and no product state was mutated. |
| board-04 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-05 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-05 | No credentials were submitted and no product state was mutated. |
| board-05 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-06 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-06 | No credentials were submitted and no product state was mutated. |
| board-06 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-07 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-07 | No credentials were submitted and no product state was mutated. |
| board-07 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-08 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-08 | No credentials were submitted and no product state was mutated. |
| board-08 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| board-09 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| board-09 | No credentials were submitted and no product state was mutated. |
| board-09 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| widgets-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-01 | No credentials were submitted and no product state was mutated. |
| widgets-01 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| widgets-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-02 | No credentials were submitted and no product state was mutated. |
| widgets-02 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| widgets-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-03 | No credentials were submitted and no product state was mutated. |
| widgets-03 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-04 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-04 | No credentials were submitted and no product state was mutated. |
| widgets-04 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| widgets-05 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-05 | No credentials were submitted and no product state was mutated. |
| widgets-05 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-06 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-06 | No credentials were submitted and no product state was mutated. |
| widgets-06 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-07 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-07 | No credentials were submitted and no product state was mutated. |
| widgets-07 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-08 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-08 | No credentials were submitted and no product state was mutated. |
| widgets-08 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| widgets-09 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-09 | No credentials were submitted and no product state was mutated. |
| widgets-09 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-10 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-10 | No credentials were submitted and no product state was mutated. |
| widgets-10 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-11 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-11 | No credentials were submitted and no product state was mutated. |
| widgets-11 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| widgets-12 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| widgets-12 | No credentials were submitted and no product state was mutated. |
| widgets-12 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-01 | No credentials were submitted and no product state was mutated. |
| core-v2-01 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-02 | No credentials were submitted and no product state was mutated. |
| core-v2-02 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-03 | No credentials were submitted and no product state was mutated. |
| core-v2-03 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-04 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-04 | No credentials were submitted and no product state was mutated. |
| core-v2-04 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-05 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-05 | No credentials were submitted and no product state was mutated. |
| core-v2-05 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-06 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-06 | No credentials were submitted and no product state was mutated. |
| core-v2-06 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-07 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-07 | No credentials were submitted and no product state was mutated. |
| core-v2-07 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| core-v2-08 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| core-v2-08 | No credentials were submitted and no product state was mutated. |
| core-v2-08 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-01 | No credentials were submitted and no product state was mutated. |
| whole-product-01 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-02 | No credentials were submitted and no product state was mutated. |
| whole-product-02 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-03 | No credentials were submitted and no product state was mutated. |
| whole-product-03 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |
| whole-product-04 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-04 | No credentials were submitted and no product state was mutated. |
| whole-product-04 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-05 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-05 | No credentials were submitted and no product state was mutated. |
| whole-product-05 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-06 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-06 | No credentials were submitted and no product state was mutated. |
| whole-product-06 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-07 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-07 | No credentials were submitted and no product state was mutated. |
| whole-product-07 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-08 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-08 | No credentials were submitted and no product state was mutated. |
| whole-product-08 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| whole-product-09 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| whole-product-09 | No credentials were submitted and no product state was mutated. |
| whole-product-09 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| performance-01 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| performance-01 | No credentials were submitted and no product state was mutated. |
| performance-01 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| performance-02 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| performance-02 | No credentials were submitted and no product state was mutated. |
| performance-02 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| performance-03 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| performance-03 | No credentials were submitted and no product state was mutated. |
| performance-03 | The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports. |
| performance-04 | The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked. |
| performance-04 | No credentials were submitted and no product state was mutated. |
| performance-04 | The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop. |

## Independent reproduction results

| Agent | Finding fingerprint | Reproducing agent | Outcome | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| preflight-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-02 | reproduced | None | See preflight-02 for an independent Luna Max reproduction. |
| preflight-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| preflight-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-04 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-05 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-06 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-07 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-08 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| board-09 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-04 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-05 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-06 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-07 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-08 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-09 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-10 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-11 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| widgets-12 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-04 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-05 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-06 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-07 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| core-v2-08 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-04 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-05 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-06 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-07 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-08 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| whole-product-09 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| performance-01 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| performance-02 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| performance-03 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |
| performance-04 | release-v2-auth-locale-redirect-loop | qa-v2-preflight-01 | reproduced | None | See preflight-01 for an independent Luna Max reproduction. |

## Severity totals

| P0 | P1 | P2 | P3 |
| ---: | ---: | ---: | ---: |
| 0 | 1 | 0 | 0 |

Deduplicated by explicit fingerprint, or by severity + area + title when no fingerprint is supplied.

| Severity | Area | Finding | Packets | Cases |
| --- | --- | --- | --- | --- |
| P1 | routing/authentication | Locale rewrite causes an infinite browser redirect before the application renders | preflight-01, preflight-02, preflight-03, board-01, board-02, board-03, board-04, board-05, board-06, board-07, board-08, board-09, widgets-01, widgets-02, widgets-03, widgets-04, widgets-05, widgets-06, widgets-07, widgets-08, widgets-09, widgets-10, widgets-11, widgets-12, core-v2-01, core-v2-02, core-v2-03, core-v2-04, core-v2-05, core-v2-06, core-v2-07, core-v2-08, whole-product-01, whole-product-02, whole-product-03, whole-product-04, whole-product-05, whole-product-06, whole-product-07, whole-product-08, whole-product-09, performance-01, performance-02, performance-03, performance-04 | PF-001-ENVIRONMENT, PF-001-ACCESS, PF-002-ENVIRONMENT, PF-002-ACCESS, PF-003-ENVIRONMENT, PF-003-ACCESS, BD-001-THRESHOLDS, BD-001-MUTATION, BD-001-PERSISTENCE, BD-001-ACCESS-RECOVERY, BD-002-THRESHOLDS, BD-002-MUTATION, BD-002-PERSISTENCE, BD-002-ACCESS-RECOVERY, BD-003-THRESHOLDS, BD-003-MUTATION, BD-003-PERSISTENCE, BD-003-ACCESS-RECOVERY, BD-004-THRESHOLDS, BD-004-MUTATION, BD-004-PERSISTENCE, BD-004-ACCESS-RECOVERY, BD-005-THRESHOLDS, BD-005-MUTATION, BD-005-PERSISTENCE, BD-005-ACCESS-RECOVERY, BD-006-THRESHOLDS, BD-006-MUTATION, BD-006-PERSISTENCE, BD-006-ACCESS-RECOVERY, BD-007-THRESHOLDS, BD-007-MUTATION, BD-007-PERSISTENCE, BD-007-ACCESS-RECOVERY, BD-008-THRESHOLDS, BD-008-MUTATION, BD-008-PERSISTENCE, BD-008-ACCESS-RECOVERY, BD-009-THRESHOLDS, BD-009-MUTATION, BD-009-PERSISTENCE, BD-009-ACCESS-RECOVERY, WG-001-RENDER-SIZE, WG-001-STATES-RECOVERY, WG-001-OPTIONS-PERSISTENCE, WG-001-ACCESS-READONLY, WG-001-EVIDENCE, WG-002-RENDER-SIZE, WG-002-STATES-RECOVERY, WG-002-OPTIONS-PERSISTENCE, WG-002-ACCESS-READONLY, WG-002-EVIDENCE, WG-003-RENDER-SIZE, WG-003-STATES-RECOVERY, WG-003-OPTIONS-PERSISTENCE, WG-003-ACCESS-READONLY, WG-003-EVIDENCE, WG-004-RENDER-SIZE, WG-004-STATES-RECOVERY, WG-004-OPTIONS-PERSISTENCE, WG-004-ACCESS-READONLY, WG-004-EVIDENCE, WG-005-RENDER-SIZE, WG-005-STATES-RECOVERY, WG-005-OPTIONS-PERSISTENCE, WG-005-ACCESS-READONLY, WG-005-EVIDENCE, WG-006-RENDER-SIZE, WG-006-STATES-RECOVERY, WG-006-OPTIONS-PERSISTENCE, WG-006-ACCESS-READONLY, WG-006-EVIDENCE, WG-007-RENDER-SIZE, WG-007-STATES-RECOVERY, WG-007-OPTIONS-PERSISTENCE, WG-007-ACCESS-READONLY, WG-007-EVIDENCE, WG-008-RENDER-SIZE, WG-008-STATES-RECOVERY, WG-008-OPTIONS-PERSISTENCE, WG-008-ACCESS-READONLY, WG-008-EVIDENCE, WG-009-RENDER-SIZE, WG-009-STATES-RECOVERY, WG-009-OPTIONS-PERSISTENCE, WG-009-ACCESS-READONLY, WG-009-EVIDENCE, WG-010-RENDER-SIZE, WG-010-STATES-RECOVERY, WG-010-OPTIONS-PERSISTENCE, WG-010-ACCESS-READONLY, WG-010-EVIDENCE, WG-011-RENDER-SIZE, WG-011-STATES-RECOVERY, WG-011-OPTIONS-PERSISTENCE, WG-011-ACCESS-READONLY, WG-011-EVIDENCE, WG-012-RENDER-SIZE, WG-012-STATES-RECOVERY, WG-012-OPTIONS-PERSISTENCE, WG-012-ACCESS-READONLY, WG-012-EVIDENCE, CV-001-HAPPY-PATH, CV-001-MUTATION-PERSISTENCE, CV-001-ACCESSIBILITY-ACCESS, CV-001-DEGRADED-RECOVERY, CV-002-HAPPY-PATH, CV-002-MUTATION-PERSISTENCE, CV-002-ACCESSIBILITY-ACCESS, CV-002-DEGRADED-RECOVERY, CV-003-HAPPY-PATH, CV-003-MUTATION-PERSISTENCE, CV-003-ACCESSIBILITY-ACCESS, CV-003-DEGRADED-RECOVERY, CV-004-HAPPY-PATH, CV-004-MUTATION-PERSISTENCE, CV-004-ACCESSIBILITY-ACCESS, CV-004-DEGRADED-RECOVERY, CV-005-HAPPY-PATH, CV-005-MUTATION-PERSISTENCE, CV-005-ACCESSIBILITY-ACCESS, CV-005-DEGRADED-RECOVERY, CV-006-HAPPY-PATH, CV-006-MUTATION-PERSISTENCE, CV-006-ACCESSIBILITY-ACCESS, CV-006-DEGRADED-RECOVERY, CV-007-HAPPY-PATH, CV-007-MUTATION-PERSISTENCE, CV-007-ACCESSIBILITY-ACCESS, CV-007-DEGRADED-RECOVERY, CV-008-HAPPY-PATH, CV-008-MUTATION-PERSISTENCE, CV-008-ACCESSIBILITY-ACCESS, CV-008-DEGRADED-RECOVERY, WP-001-JOURNEY, WP-001-THRESHOLDS, WP-001-PERSISTENCE-ACCESS, WP-001-FAILURE-EVIDENCE, WP-002-JOURNEY, WP-002-THRESHOLDS, WP-002-PERSISTENCE-ACCESS, WP-002-FAILURE-EVIDENCE, WP-003-JOURNEY, WP-003-THRESHOLDS, WP-003-PERSISTENCE-ACCESS, WP-003-FAILURE-EVIDENCE, WP-004-JOURNEY, WP-004-THRESHOLDS, WP-004-PERSISTENCE-ACCESS, WP-004-FAILURE-EVIDENCE, WP-005-JOURNEY, WP-005-THRESHOLDS, WP-005-PERSISTENCE-ACCESS, WP-005-FAILURE-EVIDENCE, WP-006-JOURNEY, WP-006-THRESHOLDS, WP-006-PERSISTENCE-ACCESS, WP-006-FAILURE-EVIDENCE, WP-007-JOURNEY, WP-007-THRESHOLDS, WP-007-PERSISTENCE-ACCESS, WP-007-FAILURE-EVIDENCE, WP-008-JOURNEY, WP-008-THRESHOLDS, WP-008-PERSISTENCE-ACCESS, WP-008-FAILURE-EVIDENCE, WP-009-JOURNEY, WP-009-THRESHOLDS, WP-009-PERSISTENCE-ACCESS, WP-009-FAILURE-EVIDENCE, PE-001-BASELINE, PE-001-THRESHOLD, PE-001-STRESS, PE-001-RECOVERY-EVIDENCE, PE-002-BASELINE, PE-002-THRESHOLD, PE-002-STRESS, PE-002-RECOVERY-EVIDENCE, PE-003-BASELINE, PE-003-THRESHOLD, PE-003-STRESS, PE-003-RECOVERY-EVIDENCE, PE-004-BASELINE, PE-004-THRESHOLD, PE-004-STRESS, PE-004-RECOVERY-EVIDENCE |

## Critical gaps

| Packet | Case | Status |
| --- | --- | --- |
| preflight-01 | PF-001-ENVIRONMENT | failed |
| preflight-01 | PF-001-ACCESS | blocked |
| preflight-02 | PF-002-ENVIRONMENT | failed |
| preflight-02 | PF-002-ACCESS | blocked |
| preflight-03 | PF-003-ENVIRONMENT | failed |
| preflight-03 | PF-003-ACCESS | blocked |
| board-01 | BD-001-THRESHOLDS | blocked |
| board-01 | BD-001-MUTATION | blocked |
| board-01 | BD-001-PERSISTENCE | blocked |
| board-01 | BD-001-ACCESS-RECOVERY | blocked |
| board-02 | BD-002-THRESHOLDS | blocked |
| board-02 | BD-002-MUTATION | blocked |
| board-02 | BD-002-PERSISTENCE | blocked |
| board-02 | BD-002-ACCESS-RECOVERY | blocked |
| board-03 | BD-003-THRESHOLDS | blocked |
| board-03 | BD-003-MUTATION | blocked |
| board-03 | BD-003-PERSISTENCE | blocked |
| board-03 | BD-003-ACCESS-RECOVERY | blocked |
| board-04 | BD-004-THRESHOLDS | blocked |
| board-04 | BD-004-MUTATION | blocked |
| board-04 | BD-004-PERSISTENCE | blocked |
| board-04 | BD-004-ACCESS-RECOVERY | blocked |
| board-05 | BD-005-THRESHOLDS | blocked |
| board-05 | BD-005-MUTATION | blocked |
| board-05 | BD-005-PERSISTENCE | blocked |
| board-05 | BD-005-ACCESS-RECOVERY | blocked |
| board-06 | BD-006-THRESHOLDS | blocked |
| board-06 | BD-006-MUTATION | blocked |
| board-06 | BD-006-PERSISTENCE | blocked |
| board-06 | BD-006-ACCESS-RECOVERY | blocked |
| board-07 | BD-007-THRESHOLDS | blocked |
| board-07 | BD-007-MUTATION | blocked |
| board-07 | BD-007-PERSISTENCE | blocked |
| board-07 | BD-007-ACCESS-RECOVERY | blocked |
| board-08 | BD-008-THRESHOLDS | blocked |
| board-08 | BD-008-MUTATION | blocked |
| board-08 | BD-008-PERSISTENCE | blocked |
| board-08 | BD-008-ACCESS-RECOVERY | blocked |
| board-09 | BD-009-THRESHOLDS | blocked |
| board-09 | BD-009-MUTATION | blocked |
| board-09 | BD-009-PERSISTENCE | blocked |
| board-09 | BD-009-ACCESS-RECOVERY | blocked |
| widgets-01 | WG-001-RENDER-SIZE | blocked |
| widgets-01 | WG-001-STATES-RECOVERY | blocked |
| widgets-01 | WG-001-OPTIONS-PERSISTENCE | blocked |
| widgets-01 | WG-001-ACCESS-READONLY | blocked |
| widgets-01 | WG-001-EVIDENCE | blocked |
| widgets-02 | WG-002-RENDER-SIZE | blocked |
| widgets-02 | WG-002-STATES-RECOVERY | blocked |
| widgets-02 | WG-002-OPTIONS-PERSISTENCE | blocked |
| widgets-02 | WG-002-ACCESS-READONLY | blocked |
| widgets-02 | WG-002-EVIDENCE | blocked |
| widgets-03 | WG-003-RENDER-SIZE | blocked |
| widgets-03 | WG-003-STATES-RECOVERY | blocked |
| widgets-03 | WG-003-OPTIONS-PERSISTENCE | blocked |
| widgets-03 | WG-003-ACCESS-READONLY | blocked |
| widgets-03 | WG-003-EVIDENCE | blocked |
| widgets-04 | WG-004-RENDER-SIZE | blocked |
| widgets-04 | WG-004-STATES-RECOVERY | blocked |
| widgets-04 | WG-004-OPTIONS-PERSISTENCE | blocked |
| widgets-04 | WG-004-ACCESS-READONLY | blocked |
| widgets-04 | WG-004-EVIDENCE | blocked |
| widgets-05 | WG-005-RENDER-SIZE | blocked |
| widgets-05 | WG-005-STATES-RECOVERY | blocked |
| widgets-05 | WG-005-OPTIONS-PERSISTENCE | blocked |
| widgets-05 | WG-005-ACCESS-READONLY | blocked |
| widgets-05 | WG-005-EVIDENCE | blocked |
| widgets-06 | WG-006-RENDER-SIZE | blocked |
| widgets-06 | WG-006-STATES-RECOVERY | blocked |
| widgets-06 | WG-006-OPTIONS-PERSISTENCE | blocked |
| widgets-06 | WG-006-ACCESS-READONLY | blocked |
| widgets-06 | WG-006-EVIDENCE | blocked |
| widgets-07 | WG-007-RENDER-SIZE | blocked |
| widgets-07 | WG-007-STATES-RECOVERY | blocked |
| widgets-07 | WG-007-OPTIONS-PERSISTENCE | blocked |
| widgets-07 | WG-007-ACCESS-READONLY | blocked |
| widgets-07 | WG-007-EVIDENCE | blocked |
| widgets-08 | WG-008-RENDER-SIZE | blocked |
| widgets-08 | WG-008-STATES-RECOVERY | blocked |
| widgets-08 | WG-008-OPTIONS-PERSISTENCE | blocked |
| widgets-08 | WG-008-ACCESS-READONLY | blocked |
| widgets-08 | WG-008-EVIDENCE | blocked |
| widgets-09 | WG-009-RENDER-SIZE | blocked |
| widgets-09 | WG-009-STATES-RECOVERY | blocked |
| widgets-09 | WG-009-OPTIONS-PERSISTENCE | blocked |
| widgets-09 | WG-009-ACCESS-READONLY | blocked |
| widgets-09 | WG-009-EVIDENCE | blocked |
| widgets-10 | WG-010-RENDER-SIZE | blocked |
| widgets-10 | WG-010-STATES-RECOVERY | blocked |
| widgets-10 | WG-010-OPTIONS-PERSISTENCE | blocked |
| widgets-10 | WG-010-ACCESS-READONLY | blocked |
| widgets-10 | WG-010-EVIDENCE | blocked |
| widgets-11 | WG-011-RENDER-SIZE | blocked |
| widgets-11 | WG-011-STATES-RECOVERY | blocked |
| widgets-11 | WG-011-OPTIONS-PERSISTENCE | blocked |
| widgets-11 | WG-011-ACCESS-READONLY | blocked |
| widgets-11 | WG-011-EVIDENCE | blocked |
| widgets-12 | WG-012-RENDER-SIZE | blocked |
| widgets-12 | WG-012-STATES-RECOVERY | blocked |
| widgets-12 | WG-012-OPTIONS-PERSISTENCE | blocked |
| widgets-12 | WG-012-ACCESS-READONLY | blocked |
| widgets-12 | WG-012-EVIDENCE | blocked |
| core-v2-01 | CV-001-HAPPY-PATH | blocked |
| core-v2-01 | CV-001-MUTATION-PERSISTENCE | blocked |
| core-v2-01 | CV-001-ACCESSIBILITY-ACCESS | blocked |
| core-v2-01 | CV-001-DEGRADED-RECOVERY | blocked |
| core-v2-02 | CV-002-HAPPY-PATH | blocked |
| core-v2-02 | CV-002-MUTATION-PERSISTENCE | blocked |
| core-v2-02 | CV-002-ACCESSIBILITY-ACCESS | blocked |
| core-v2-02 | CV-002-DEGRADED-RECOVERY | blocked |
| core-v2-03 | CV-003-HAPPY-PATH | blocked |
| core-v2-03 | CV-003-MUTATION-PERSISTENCE | blocked |
| core-v2-03 | CV-003-ACCESSIBILITY-ACCESS | blocked |
| core-v2-03 | CV-003-DEGRADED-RECOVERY | blocked |
| core-v2-04 | CV-004-HAPPY-PATH | blocked |
| core-v2-04 | CV-004-MUTATION-PERSISTENCE | blocked |
| core-v2-04 | CV-004-ACCESSIBILITY-ACCESS | blocked |
| core-v2-04 | CV-004-DEGRADED-RECOVERY | blocked |
| core-v2-05 | CV-005-HAPPY-PATH | blocked |
| core-v2-05 | CV-005-MUTATION-PERSISTENCE | blocked |
| core-v2-05 | CV-005-ACCESSIBILITY-ACCESS | blocked |
| core-v2-05 | CV-005-DEGRADED-RECOVERY | blocked |
| core-v2-06 | CV-006-HAPPY-PATH | blocked |
| core-v2-06 | CV-006-MUTATION-PERSISTENCE | blocked |
| core-v2-06 | CV-006-ACCESSIBILITY-ACCESS | blocked |
| core-v2-06 | CV-006-DEGRADED-RECOVERY | blocked |
| core-v2-07 | CV-007-HAPPY-PATH | blocked |
| core-v2-07 | CV-007-MUTATION-PERSISTENCE | blocked |
| core-v2-07 | CV-007-ACCESSIBILITY-ACCESS | blocked |
| core-v2-07 | CV-007-DEGRADED-RECOVERY | blocked |
| core-v2-08 | CV-008-HAPPY-PATH | blocked |
| core-v2-08 | CV-008-MUTATION-PERSISTENCE | blocked |
| core-v2-08 | CV-008-ACCESSIBILITY-ACCESS | blocked |
| core-v2-08 | CV-008-DEGRADED-RECOVERY | blocked |
| whole-product-01 | WP-001-JOURNEY | blocked |
| whole-product-01 | WP-001-THRESHOLDS | blocked |
| whole-product-01 | WP-001-PERSISTENCE-ACCESS | blocked |
| whole-product-01 | WP-001-FAILURE-EVIDENCE | blocked |
| whole-product-02 | WP-002-JOURNEY | blocked |
| whole-product-02 | WP-002-THRESHOLDS | blocked |
| whole-product-02 | WP-002-PERSISTENCE-ACCESS | blocked |
| whole-product-02 | WP-002-FAILURE-EVIDENCE | blocked |
| whole-product-03 | WP-003-JOURNEY | blocked |
| whole-product-03 | WP-003-THRESHOLDS | blocked |
| whole-product-03 | WP-003-PERSISTENCE-ACCESS | blocked |
| whole-product-03 | WP-003-FAILURE-EVIDENCE | blocked |
| whole-product-04 | WP-004-JOURNEY | blocked |
| whole-product-04 | WP-004-THRESHOLDS | blocked |
| whole-product-04 | WP-004-PERSISTENCE-ACCESS | blocked |
| whole-product-04 | WP-004-FAILURE-EVIDENCE | blocked |
| whole-product-05 | WP-005-JOURNEY | blocked |
| whole-product-05 | WP-005-THRESHOLDS | blocked |
| whole-product-05 | WP-005-PERSISTENCE-ACCESS | blocked |
| whole-product-05 | WP-005-FAILURE-EVIDENCE | blocked |
| whole-product-06 | WP-006-JOURNEY | blocked |
| whole-product-06 | WP-006-THRESHOLDS | blocked |
| whole-product-06 | WP-006-PERSISTENCE-ACCESS | blocked |
| whole-product-06 | WP-006-FAILURE-EVIDENCE | blocked |
| whole-product-07 | WP-007-JOURNEY | blocked |
| whole-product-07 | WP-007-THRESHOLDS | blocked |
| whole-product-07 | WP-007-PERSISTENCE-ACCESS | blocked |
| whole-product-07 | WP-007-FAILURE-EVIDENCE | blocked |
| whole-product-08 | WP-008-JOURNEY | blocked |
| whole-product-08 | WP-008-THRESHOLDS | blocked |
| whole-product-08 | WP-008-PERSISTENCE-ACCESS | blocked |
| whole-product-08 | WP-008-FAILURE-EVIDENCE | blocked |
| whole-product-09 | WP-009-JOURNEY | blocked |
| whole-product-09 | WP-009-THRESHOLDS | blocked |
| whole-product-09 | WP-009-PERSISTENCE-ACCESS | blocked |
| whole-product-09 | WP-009-FAILURE-EVIDENCE | blocked |
| performance-01 | PE-001-BASELINE | blocked |
| performance-01 | PE-001-THRESHOLD | blocked |
| performance-01 | PE-001-STRESS | blocked |
| performance-01 | PE-001-RECOVERY-EVIDENCE | blocked |
| performance-02 | PE-002-BASELINE | blocked |
| performance-02 | PE-002-THRESHOLD | blocked |
| performance-02 | PE-002-STRESS | blocked |
| performance-02 | PE-002-RECOVERY-EVIDENCE | blocked |
| performance-03 | PE-003-BASELINE | blocked |
| performance-03 | PE-003-THRESHOLD | blocked |
| performance-03 | PE-003-STRESS | blocked |
| performance-03 | PE-003-RECOVERY-EVIDENCE | blocked |
| performance-04 | PE-004-BASELINE | blocked |
| performance-04 | PE-004-THRESHOLD | blocked |
| performance-04 | PE-004-STRESS | blocked |
| performance-04 | PE-004-RECOVERY-EVIDENCE | blocked |

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

- [preflight-01: Candidate identity and services](reports/preflight-01/report.md) — failed
- [preflight-02: Fixture and persona access](reports/preflight-02/report.md) — failed
- [preflight-03: Browser evidence hygiene](reports/preflight-03/report.md) — failed
- [board-01: 24-column placement and resize](reports/board-01/report.md) — blocked
- [board-02: Scrollable canvas and collapse states](reports/board-02/report.md) — blocked
- [board-03: Dense collision handling](reports/board-03/report.md) — blocked
- [board-04: Nested containers](reports/board-04/report.md) — blocked
- [board-05: Responsive layout boundaries](reports/board-05/report.md) — blocked
- [board-06: Icons, bookmarks, and compact layout](reports/board-06/report.md) — blocked
- [board-07: Permission-aware editing](reports/board-07/report.md) — blocked
- [board-08: Board import and export](reports/board-08/report.md) — blocked
- [board-09: Keyboard-only grid operation](reports/board-09/report.md) — blocked
- [widgets-01: Time and environment](reports/widgets-01/report.md) — blocked
- [widgets-02: Apps, embeds, video, game status, and stocks](reports/widgets-02/report.md) — blocked
- [widgets-03: Notes, bookmarks, feeds, and timetable](reports/widgets-03/report.md) — blocked
- [widgets-04: Downloads, containers, indexers, and DNS](reports/widgets-04/report.md) — blocked
- [widgets-05: Smart home, health, and system telemetry](reports/widgets-05/report.md) — blocked
- [widgets-06: Network availability and operations](reports/widgets-06/report.md) — blocked
- [widgets-07: Beszel and update monitoring](reports/widgets-07/report.md) — blocked
- [widgets-08: Power, VPN, speed, routing, and analytics](reports/widgets-08/report.md) — blocked
- [widgets-09: Media overview and requests](reports/widgets-09/report.md) — blocked
- [widgets-10: Media activity, Immich, and audio](reports/widgets-10/report.md) — blocked
- [widgets-11: Documents, patching, media services, and releases](reports/widgets-11/report.md) — blocked
- [widgets-12: Coolify, ArchiveTeam, Custom API, and Assistant](reports/widgets-12/report.md) — blocked
- [core-v2-01: Custom widget authoring](reports/core-v2-01/report.md) — blocked
- [core-v2-02: Assistant tool flow](reports/core-v2-02/report.md) — blocked
- [core-v2-03: Onboarding happy path](reports/core-v2-03/report.md) — blocked
- [core-v2-04: Authentication and session transitions](reports/core-v2-04/report.md) — blocked
- [core-v2-05: Integration management](reports/core-v2-05/report.md) — blocked
- [core-v2-06: Search, menus, and dialogs](reports/core-v2-06/report.md) — blocked
- [core-v2-07: Read-only enforcement](reports/core-v2-07/report.md) — blocked
- [core-v2-08: Failure and recovery states](reports/core-v2-08/report.md) — blocked
- [whole-product-01: Admin day-one journey](reports/whole-product-01/report.md) — blocked
- [whole-product-02: Owner customization journey](reports/whole-product-02/report.md) — blocked
- [whole-product-03: Editor daily journey](reports/whole-product-03/report.md) — blocked
- [whole-product-04: Viewer and outsider boundaries](reports/whole-product-04/report.md) — blocked
- [whole-product-05: Mobile journey](reports/whole-product-05/report.md) — blocked
- [whole-product-06: Media operator journey](reports/whole-product-06/report.md) — blocked
- [whole-product-07: Infrastructure operator journey](reports/whole-product-07/report.md) — blocked
- [whole-product-08: Creator and Assistant journey](reports/whole-product-08/report.md) — blocked
- [whole-product-09: Accessibility and destructive-action pass](reports/whole-product-09/report.md) — blocked
- [performance-01: Cold and warm board load](reports/performance-01/report.md) — blocked
- [performance-02: Grid interaction responsiveness](reports/performance-02/report.md) — blocked
- [performance-03: Widget network and render budget](reports/performance-03/report.md) — blocked
- [performance-04: Long-session stability](reports/performance-04/report.md) — blocked

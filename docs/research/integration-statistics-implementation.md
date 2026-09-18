# Integration statistics implementation

Branch `feat/new-integration-stats`, based on `origin/release/v2` at `4305dd3b7dbe30032e93cf6cc1691b89349babca`.

This implements the first straightforward batch: **24 new integration types**, plus statistics adapters for **all 55 existing real integration types and Mock**. The combined catalog exposes 247 metrics across 80 types. This is not full Homepage feature parity or every medium-difficulty integration from the research inventory. One Luna agent handled each new provider; the main agent implemented registration, existing adapters, cache, API, and widget.

## Widget and infrastructure

- Choose integration instances and individual metrics in widget settings. Interleave sources, rename, hide, reorder, and compact individual values. Select cards or rows, spacing, source names/icons, and timestamps. The bookmark-inspired compact grid has aligned tabular values, small corner icons, no heading, and hover/focus details. Advanced view expands the cards and displays source metadata. Settings participate in the existing widget/board save workflow.
- Cache-only reads; missing or hour-old snapshots refresh while a dashboard is visible. Manual refresh bypasses freshness. Redis retains one snapshot per integration without a TTL. Failures preserve previous values and timestamps and set a one-minute retry delay. There is no unattended cron refresh or durable job queue.
- Four distributed source-refresh slots, renewable per-source locks, and in-process deduplication. Multiple fields share one provider fetch, which may issue multiple API calls internally. Cold sources acquire slots independently.
- Every read and refresh uses existing Query permission checks. Credential/URL/generation changes invalidate prior snapshots. Redis unavailability fails closed; persistent snapshots are caches and can be evicted.
- Typed provider catalogs and validated new-adapter responses. Existing adapters reuse established integration clients and their validation. New adapters honor cancellation; legacy client methods retain their own transport timeout behavior.
- tRPC and MCP catalog/snapshot/refresh procedures, integration connection testing, integration documentation, and widget documentation. No database migration.

## New providers

| Integration        | Metrics                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Caddy              | Upstreams, Active requests, Failed requests                                                  |
| Changedetection.io | Diffs detected, Total observed                                                               |
| FileFlows          | Queued, Processing, Processed, Processing time                                               |
| Gatus              | Up, Down, Unknown, Total                                                                     |
| Healthchecks       | Up checks, Down checks, Checks in grace, New checks                                          |
| Homebox            | Items, Locations, Labels, Items with warranty, Total value, Users                            |
| Karakeep           | Bookmarks, Favorites, Archived, Highlights, Lists, Tags                                      |
| Linkwarden         | Links, Collections, Tags                                                                     |
| Maintainerr        | Items handled, Episodes handled, Movies handled, Reclaimable storage                         |
| Mealie             | Recipes, Users, Categories, Tags                                                             |
| Miniflux           | Read, Unread                                                                                 |
| MySpeed            | Ping, Download, Upload                                                                       |
| Netdata            | Warnings, Criticals                                                                          |
| Plant-it           | Plants, Species, Photos, Events                                                              |
| Prometheus         | Targets, Up, Down                                                                            |
| RomM               | Platforms, ROMs, Saves, States, Screenshots, Total file size                                 |
| Spoolman           | Spools, Remaining weight                                                                     |
| Stash              | Scenes, Scene size, Scene duration, Images, Image size, Galleries, Performers, Studios, Tags |
| Syncthing Relay    | Active sessions, Connections, Bytes proxied                                                  |
| Tandoor            | Users in first space, Recipes in first space, Keywords                                       |
| Trilium            | Version, Notes, Database size                                                                |
| Unmanic            | Active workers, Total workers, Pending records                                               |
| xTeVe              | All streams, Active streams, XEPG streams                                                    |
| Your Spotify       | Songs listened, Listening time, Artists listened                                             |

## Existing adapters

These expose the read-only fields already supported by Homarr clients, not all fields advertised by Homepage. Retrieved notifications/notes are counts of the returned collection, not total server inventory. Calendar counts cover the next seven days. Hour-old operational data is explicitly a snapshot.

| Integration          | Metrics                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| AdGuard Home         | Queries today, Blocked today, Blocked, Blocked domains                       |
| Anchor               | Retrieved notes                                                              |
| ArchiveTeam Warrior  | Running, Completed, Failed                                                   |
| Aria2                | Download, Upload, Paused                                                     |
| Audiobookshelf       | Libraries, Audiobooks, Podcasts, Listening time, Active sessions             |
| Bazarr               | Missing episode subtitles, Missing movie subtitles, Providers                |
| Beszel               | Systems                                                                      |
| Coolify              | Applications, Services, Servers                                              |
| Dash.                | CPU, Memory used, Memory available, Uptime                                   |
| Deluge               | Download, Upload, Paused                                                     |
| Emby                 | Playback sessions                                                            |
| Glances              | CPU, Memory used, Memory available, Uptime                                   |
| Gluetun              | VPN status, Public IP, Country                                               |
| Gotify               | Retrieved notifications                                                      |
| Home Assistant       | Entities, Unavailable entities, Lights on, People home                       |
| iCal                 | Events in the next 7 days                                                    |
| Immich               | Users, Photos, Videos, Storage                                               |
| Jellyfin             | Playback sessions                                                            |
| Jellyseerr           | Pending requests, Approved requests, Available requests, Processing requests |
| Lidarr               | Events in the next 7 days                                                    |
| llama.cpp            | Health, Tokens generated, Requests processing                                |
| Mock                 | Documents, Songs, Storage                                                    |
| Navidrome            | Artists, Albums, Songs                                                       |
| Nextcloud            | Retrieved notifications                                                      |
| ntfy                 | Retrieved notifications                                                      |
| NZBGet               | Download, Upload, Paused                                                     |
| OpenMediaVault       | CPU, Memory used, Memory available, Uptime                                   |
| OPNsense             | CPU                                                                          |
| Overseerr            | Pending requests, Approved requests, Available requests, Processing requests |
| Paperless-ngx        | Documents, Inbox, Tags, Correspondents, Document types                       |
| PatchMon             | Hosts, Hosts needing updates, Security updates, Outdated packages            |
| PeaNUT               | UPS devices, On battery, Low battery                                         |
| Pi-hole              | Queries today, Blocked today, Blocked, Blocked domains                       |
| Plex                 | Playback sessions                                                            |
| Prowlarr             | Indexers                                                                     |
| Proxmox              | Nodes, Virtual machines, Containers                                          |
| qBittorrent          | Download, Upload, Paused                                                     |
| Radarr               | Missing, Queued                                                              |
| Readarr              | Events in the next 7 days                                                    |
| SABnzbd              | Download, Upload, Paused                                                     |
| Seerr                | Pending requests, Approved requests, Available requests, Processing requests |
| Slskd                | Download, Upload, Paused                                                     |
| Sonarr               | Missing, Queued                                                              |
| Speedtest Tracker    | Latency, Download, Upload                                                    |
| Synology DiskStation | CPU, Memory used, Memory available, Uptime                                   |
| Tdarr                | Files, Transcodes, Failed transcodes                                         |
| Technitium DNS       | Queries today, Blocked today, Blocked, Blocked domains                       |
| Tracearr             | Active streams, Users, Sessions, Recent violations                           |
| Traefik              | Routers, Services, Middleware                                                |
| Transmission         | Download, Upload, Paused                                                     |
| TrueNAS              | CPU, Memory used, Memory available, Uptime                                   |
| Umami                | Websites                                                                     |
| Unifi Controller     | Wi-Fi clients, Wired clients, WAN latency                                    |
| Unraid               | CPU, Memory used, Memory available, Uptime                                   |
| Uptime Kuma          | Monitors, Up, Down, Average uptime                                           |
| What's Up Docker     | Containers, Updates available                                                |

## Source and validation boundary

New provider contracts were researched against official service documentation and [Homepage's adapter source](https://github.com/gethomepage/homepage/tree/b8ed72a03fc401ba5a856ac76d40e5063d284d4d/src/widgets). Version/auth limitations are documented on each new integration page. Notable scopes: Mealie v2 household statistics, Tandoor's first returned space, Your Spotify all-time history, and Prometheus target health rather than arbitrary queries.

Focused Widgets, API, Next.js, and Docs TypeScript checks passed. Manual browser validation uses an isolated SQLite/Redis environment and two HTTP fixture instances plus Homarr Mock. It proves widget/cache behavior, not compatibility with 24 live services. No automated tests or Docker builds were added or run.

Browser checks: mixed-source rendering; two fields sharing one source request; dashboard reload with zero extra upstream requests; manual refresh fetching each source once; a failed source retaining its old value/timestamp while other sources update; settings add/rename/reorder/hide/compact-number save and reload; compact row alignment; compact desktop and 390px layouts; keyboard entry to advanced view with source/timestamp details.

Real-service follow-up: [23 new providers validated through Homarr; Your Spotify needs external credentials](integration-statistics-live-validation.md). This supersedes the earlier live-service validation boundary.

# Config Portability & Import/Export

## New features

### Full Configuration Export & Import (`/manage/tools/import-export`)

New dedicated tool page under **Manage → Tools → Import / Export** with:

- **Export Full Configuration** — downloads a JSON bundle containing all boards, apps, integrations (with encrypted secrets), server settings, search engines, and groups. The encryption key is embedded so secrets can be restored on another instance. A popover with warnings and a preview summary is shown before download.
- **Import Homarr Configuration** — upload a previously exported JSON file. Shows a compatibility check, a preview of what will be created / reused / skipped / updated, then imports everything transactionally. Server settings that haven't changed are no longer counted as "Will update".
- **Import Homepage services.yaml** — parse a Homepage dashboard `services.yaml`, resolve `{{HOMEPAGE_VAR_*}}` template variables with a form, and create a board with apps and integrations.
- **Docker Label Discovery** — scan running Docker containers for `homarr.*` or `homepage.*` labels and sync discovered services into boards. Moved here from the Docker page. Discovery is now triggered manually via the **Scan** button (the background cron job was removed).

### Onboarding: Import Homarr JSON

The onboarding flow (`/init`) now offers a third option:

- **Import Homarr configuration (.json)** — alongside "Start from scratch" and "Import from Homarr before 1.0"
- Uses the same preview panel (compatibility, create/reuse/skip/update counts) as the admin import tool
- Boards are created with `creatorId: null` (no admin user exists yet at this step)

### Board Portability package (`@homarr/board-portability`)

New package with:

- **Schema** (`homarrConfigBundleSchema`) — v2.0 bundle format with boards, apps, integrations (encrypted secrets), server settings, search engines, groups
- **Export** — `exportFullConfigAsync`, `previewExportFullConfigAsync`, `serializeBoard`, `toJson`
- **Import** — `importFullConfigAsync`, `previewImportFullConfigAsync`, `planFullConfigImport`, `parseBundle`, `matchApps`
- **Homepage** — `parseServicesYaml`, `prepareHomepageImport`, `extractHomepageEnvVariables`, `replaceHomepageEnvVariables`, widget type mapping
- **Compat** — `assessBundleCompatibility`, `parseConfigBundleJson`, format version validation

### Docker Label Discovery (`@homarr/docker/discovery`)

- `listDiscoveredContainersAsync` — scans Docker hosts for labeled containers
- `parseContainerLabels` — parses `homarr.*` and `homepage.*` label sets
- `syncDiscoveredServicesAsync` — creates/updates apps and board items from discovered services
- `docker_app_source` table + migrations (SQLite/MySQL/PostgreSQL) — tracks which apps were created by discovery

### CLI commands (`@homarr/cli`)

- `boards list` — list all boards
- `boards export` — export a board bundle by name

### Export/Import modals (`@homarr/modals-collection`)

- `ExportBoardModal` — single-board export
- `ImportBundleModal` — single-board bundle import
- `ImportHomepageModal` — Homepage services.yaml import (also used from board card menu)

### Example docker-compose (`examples/docker-compose.yml`)

Media stack (Sonarr, Radarr, Prowlarr, qBittorrent, Jellyfin, Overseerr) with `homarr.*` labels for discovery.

## Bug fixes

- **xterm.js crash** — removed `@xterm/addon-canvas` which is incompatible with `@xterm/xterm` v6 (canvas renderer was removed upstream). The logs terminal now uses the built-in DOM renderer. This fixed `TypeError: can't access property "onShowLinkUnderline", this._linkifier2 is undefined` that appeared when navigating between pages.
- **Homepage env variable editing** — fixed `MISSING_MESSAGE: field.envVariables.label` (wrong i18n namespace in import-homepage-card) and `TypeError: can't access property "value", t.currentTarget is null` (React 19 null `currentTarget` in onChange handlers).

## Changes

- **Docker Label Discovery** is no longer a background cron job. The `discoveryEnabled` server setting was removed. Discovery is now triggered manually from the Import/Export page.
- **Docker settings form** no longer shows the "Enable Docker label discovery" toggle.
- **Import/Export sidebar entry** added under Manage → Tools.
- **Board card menu** — removed bundle/homepage import options from the boards create menu (they live in Import/Export now).
- **Server settings preview** compares serialized values and only counts settings that actually differ (re-importing the same export shows 0 updates).
- **Shared UI components** — `ConfigImportPreviewPanel` and `ConfigSummaryList` extracted to `~/components/config-import/` for reuse between the admin tool and onboarding.

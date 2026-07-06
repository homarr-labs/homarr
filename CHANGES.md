# Changes

## Goal

Remove widget-only services from Homarr's global Integration system.

The affected services are release providers and Search.ch. They are only used by specific widgets, so keeping them as global integrations added unnecessary setup, UI, database rows, docs pages, and integration package code.

ArchiveTeam Warrior remains a proper integration but is no longer auto-seeded on first install.

## Why

These services do not need shared integration state.

- Release providers are selected per Releases widget repository.
- Search.ch is only used by the Timetable widget.

Moving them into widget options makes configuration simpler and removes dead-weight integration code from `packages/integrations`.

## What Changed

### Release Providers

- Added release provider definitions in `packages/definitions/src/release-provider.ts`.
- Removed release providers from `IntegrationKind`.
- Moved release-fetching code out of `packages/integrations` and into `packages/request-handler/src/release-providers.ts`.
- Updated the Releases widget to store provider configuration directly in widget options:
  - `provider`
  - `identifier`
  - `versionFilter`
  - `providerUrl`
- Updated the Releases widget editor to use a provider select instead of an integration select.
- Updated Docker import mapping so `ghcr.io` maps to `gitHubContainerRegistry`.
- GitHub Container Registry now uses the public OCI registry API and accepts full image references such as `ghcr.io/homarr-labs/homarr:latest`.

### Timetable / Search.ch

- Removed Search.ch as an integration.
- Added a Timetable widget `baseUrl` option, defaulting to `https://search.ch`.
- Moved Search.ch request/parsing logic into `packages/request-handler/src/timetable.ts`.
- Updated the Timetable API to receive `baseUrl` directly from widget options.

### ArchiveTeam Warrior

- Kept as a proper integration (not removed).
- Removed `defaultUrl` from the integration definition to prevent auto-seeding on first install.

### Integration Cleanup

- Removed creators, exports, docs references, and implementation files for the deleted integrations.
- Removed unused dependencies from `packages/integrations/package.json`.

### Database Migration

- Added `packages/db/migrations/custom/0003_remove_widget_only_integrations.ts`.
- The migration moves old integration-linked widget config into widget options, then deletes the old widget-only integration rows.
- Updated the earlier release widget migration to use the new `provider` field instead of `providerIntegrationId`.

### Docs

- Updated Releases widget docs to describe providers instead of integrations.
- Updated Timetable docs to remove Search.ch integration setup.
- Removed obsolete integration docs pages for the deleted integration kinds.
- Updated docs sitemap and integration docs mappings.

### Translations

- Added English labels for the new widget options:
  - `widget.timetable.option.baseUrl.label`
  - `widget.releases.option.repositories.providerUrl.label`

## How It Works Now

Release provider configuration lives on each Releases widget repository entry. The request handler resolves provider metadata and fetches releases directly from the provider-specific endpoint. GHCR uses anonymous OCI registry access for public packages.

Timetable passes its widget URL option directly to its API router and request handler. No global integration lookup is needed.

ArchiveTeam Warrior continues to use the standard integration system, but users must manually add the integration (it is not auto-created on install).

## Deliberate Non-Goals

- No provider secret/token support was added.
- No new secret storage model was introduced.
- No compatibility layer was kept in `packages/integrations`.

Widget options are client-visible, so storing provider credentials there would be wrong. If authenticated provider requests are needed later, they need a separate secret-storage design.

## Verification So Far

- Focused typechecks passed for affected packages.
- Full `pnpm turbo typecheck` passed.
- Full `pnpm lint` passed with existing warnings.
- Focused release provider normalization tests passed.
- Widget translation test passed.
- Live GHCR smoke checks passed for `ghcr.io/muchobien/pocketbase:latest` and `ghcr.io/homarr-labs/homarr:latest`.
- `pnpm test packages/integrations/test/pi-hole.spec.ts` passed earlier, but failed on rebased reruns because Pi-hole reported `domainsBeingBlocked` as `-2`/`0` instead of `> 1`.

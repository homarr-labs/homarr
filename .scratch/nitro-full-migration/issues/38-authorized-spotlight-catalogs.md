# 38: Authorized Spotlight catalogs

**What to build:** Search/navigate current board/app/user/group/widget/integration/management catalogs and valid creation/settings commands with capability filtering, bounded freshness and scoped board-local app cleanup.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Actual authorized source adapters provide bounded search, query-on-open/debounce, cancellation and source-specific loading/error/empty states for boards/apps/users/groups/integrations/widget choices and management pages. Direct catalog/search services enforce policy independently of presentation filtering.
- [ ] Own `board.catalog` and `board.search` orchestration against the authorized read repository, preserving encoded canonical targets and filtered children actions; no unrelated identity/app/provider service is duplicated.
- [ ] Board-local placed-app registration consumes #27's scoped descriptor/#35's authorized lookup, deduplicates IDs and unregisters on board/route/identity changes so private apps cannot linger.
- [ ] Global/page/creation commands navigate real contributed routes for board/app/integration/user and permitted subpages. Explicitly resolve user-create target, hidden/hide, navigation/page visibility and refresh discrepancies instead of reproducing broken links.
- [ ] Rename/delete/home/app/grant changes refresh the right catalogs/actions. Focused future restricted catalog, board-local cleanup and real command/direct-load/Back/Forward regressions prove useful target navigation without requiring all provider/admin tickets to finish first.

## Coverage

SEARCH-03: search/apps/command/userGroup mode adapters, page catalog group/global commands, primary `board.catalog`, `board.search`, widget/integration/manage catalog groups and placed-app registrar. #23 owns nav metadata; #26 read/home projection; #35 apps; #13/#15 identity; #41 integrations; #67/#68 widget metadata/eligibility. Page is not a new Spotlight mode.

## Required contracts

#37's action/mode contribution interface; #23's navigation metadata; #26/#02/#04's authorized board search projection; #27's placement descriptor; #35/#13/#15/#41/#67's exact selectable catalog projections; #22's targets and #03's scoped invalidation. Only consumed accepted revisions gate start, never entire provider/admin areas.

## Decision holds

Discoverability/filter/source discrepancy decisions, including creation targets and hide/hidden semantics, require explicit approval. Detailed private-catalog freshness/revocation/SSR policy remains held; Q12 preserves IDs/references, not old target aliases. Unavailable source evidence stays unverified, not an empty successful catalog.

## Ownership

One local writer owns board catalog/search services/endpoints, source adapters/registration clients and focused regressions. Other resource owners retain underlying services; #37 alone writes local mode registry, #01 root SSR/providers/central routes/manifests. Descriptive folder-based route contributions/ignored helpers respect layout/pathless/non-nested/dynamic semantics. Allocate files and accept contracts before dispatch.

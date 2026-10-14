# 36: Search engines and shortcuts

**What to build:** Manage engines, defaults, search preferences and shortcut/bang choices, then execute deliberate safe external/new-tab searches through the actual consumer without dangling defaults.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Nine search-engine capabilities reach real authorized repositories/endpoints: paginated/selectable/by-ID/default/catalog/search and create/update/delete, enforcing independent create/modify/full grants and approved public/default selection rather than blanket administration access.
- [ ] Validated name/URL/query-template/shortcut and existing engine fields survive create/edit/reload with safe encoded target construction and actionable pending/field/not-found errors.
- [ ] List/search/page/size/empty and direct new/edit routes use #22's normalized model; Back/Forward and create/edit/delete completion refresh the correct routes/catalogs while preserving failed input.
- [ ] Engine/default/new-tab/bang preference choices use #16/#17's single user/instance authorities. Delete/default changes implement explicit fallback/clear policy, update integration-related selectable choices and #39 immediately, and preserve historical stored defaults unless deliberately converted.
- [ ] Demonstrate real engine CRUD → choose default/shortcut → execute safe external/new-tab search with #39. Focused future deleted-default and encoded-target regressions verify durability and policy without paid/live-provider matrices.

## Coverage

SEARCH-01: primary `searchEngine.getPaginated`, `getSelectable`, `byId`, `getDefaultSearchEngine`, `catalog`, `search`, `create`, `update`, `delete`; list/new/edit forms, default/shortcut configuration and preference consumers. #39 owns external execution, generic integration-search and `bangs.search` lookup; this ticket must not duplicate those services.

## Required contracts

#02/#04's engine repository/grants; #16/#17's user/instance preference patch/default result; #22/#08/#05's navigation/form/translation; #39's encoded execution/invalidation and #40/#41's integration-related choice projection. Exact accepted interfaces, not complete peer tickets, gate dispatch.

## Decision holds

Selected-engine deletion/fallback, default/public/integration selection and historical dialect default differences need approval. Search/new-tab/bang redesign and URL-template safety choices are explicit holds where changed. Q12 controls stored-content conversion; detailed locale/dirty-form and SSR/cache policy remain held where used.

## Ownership

One local writer owns engine service/endpoints/forms/routes/effects/focused regressions, consuming preference services and execution rather than rewriting them. #02 alone writes schema; #01 alone owns root SSR/providers/central routing/manifests. Descriptive folder-based routes use ignored helpers and correct layout/pathless/non-nested/dynamic semantics. No old URL alias requirement; record exclusive allocation and accepted contracts before dispatch.

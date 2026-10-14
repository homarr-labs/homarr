# 35: Apps, bookmarks, pickers and embedded forms

**What to build:** Manage and safely launch apps/bookmarks through one durable app service and reusable validated create/edit/selection/quick-add flows in management, boards, widgets, integrations and Assistant, preserving async drafts/focus.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Real list/search/selectable/by-ID/by-IDs/create/create-many/update/delete services distinguish create-only, global modify/full and public-placement visibility. Direct endpoints enforce policy; create-only users never receive the global catalog or unauthorized names/URLs.
- [ ] Shared fields validate name/description/icon/href and optional separate ping URL/clear semantics, preserve intended blank/protocol links under approved safe-launch policy and offer actual icon suggestions/media/ping behavior with localized pending/field errors.
- [ ] Management list/new/edit, search/page/size/out-of-range/empty/mobile states, create-another and clean-record reinitialization use real authorized records; async failures retain drafts rather than navigate to stale success or overwrite dirty edits.
- [ ] App selection/inline create/quick-add/embedded edit return canonical IDs/records without forced management redirects. No-buttons/submit/dirty/pending/error callbacks support board add, widget input/edit, integration linking and Assistant human-review callers using route-independent components.
- [ ] Nested modal retention/close interception/cancel/focus-return remains correct after success/failure. Mutation effects refresh lists, placements/bookmarks, linked integrations, selectors/Spotlight and render inputs without duplicate writes or falsely completing sibling widget/tool logic.
- [ ] Focused future authorized CRUD → select/quick-add → place/launch → reload and async-failure/dirty/focus regressions prove durable services and named real consumers, including batch creation used by Docker discovery.

## Coverage

APP-01 plus all APP-02: primary `app.getPaginated`, `all`, `search`, `selectable`, `byId`, `byIds`, `create`, `createMany`, `update`, `delete`; management list/new/edit, reusable form, AppSelect/QuickAdd/embedded completion, app launch and linked-app effects. App/bookmarks widget renderers/options remain #67/#68; background ping #20 and widget ping consumer remain their owners.

## Required contracts

#02/#04's app/reference repository and create/modify/full/public-placement policy; #115/#113's icon/media selectors; #20's ping service interface where consumed; #22/#08's navigation/forms/overlays; #29/#68/#41/#97's placement/option/linking/human-review callbacks. Accepted exact revisions suffice without whole producer completion.

## Decision holds

Anonymous/by-ID/selectable visibility, blank/protocol href policy and integration linking/source discrepancies require disposition where changed. Q12 preserves apps/links/ping/references via the approved conversion; locale switching/unsaved-work and SSR/private-cache policy remain held where consumed.

## Ownership

One exclusive local writer owns complete app services/endpoints/routes/shared forms/pickers/quick-add/embedded adapters and focused regressions. Caller owners contribute their own logic; no parallel APP-02 owner remains. #02 writes schema; #01 alone composes root SSR/providers/central routes/manifests. Descriptive folder-based routes/ignored helpers respect layout/pathless/non-nested/dynamic semantics; old URLs need no aliases.

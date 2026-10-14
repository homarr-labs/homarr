# 68: Bookmark collections and common option editing

**What to build:** Save/reorder/group app-backed and direct-URL bookmark collections through one definition-driven editor and authorized preview, and supply the common option get/save service to every placement and table consumer.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 15 bookmark options, app/direct-URL items, reordered groups/customUrls and collapsed-group behavior convert, save and reload; batch app resolution covers saved and authorized unsaved previews, preserving false/zero/empty strings and original identities.
- [ ] Own `widget.options.getWidgetOptionSettings/saveItemOptions` end to end: declared type/default/enum/unit/refinement/visibility validation, board-modify and item-board/kind membership, hidden fields and family-specific timetable/custom placement policies. Rejected saves retain the current draft; table consumers use this same wrapper rather than competing persistence services.
- [ ] Shared editor assembles `OPTIONS_SUPER_REFINE`, multi-text validation, min/max/required compatible integrations and advanced title/classes/border. Dirty embedded app/integration forms save first under app-modify/integration-full policy; failure keeps the resource tab/draft open instead of committing invalid options.
- [ ] Measured/resizable/scaled/wrapped inert previews preserve integration/Spotlight context, live options and error reset for real or undefined IDs; mounted selector/read queries still require explicit preview authority, and custom admin configuration/timetable hooks remain distinct.
- [ ] Single input dispatch accepts all 25 contributions and 68 native choices plus dynamic custom definitions without implementing family-owned inputs twice; missing/disabled/legacy selections remain repairable. #29 hosts board picker/placement dialogs, #67 consumes this editor in its standalone workbench, and #76 supplies shared table debounce.
- [ ] Bookmark focus/refresh and save/reload demonstrate actual app keys, stale/error/forbidden clearing, the approved initial HTML/hydration boundary and listener cleanup; record focused future invalid-save/undefined-preview/embedded-form-failure/conversion evidence at scoped target gates, not an all-family start prerequisite.

## Coverage

Primary kind `bookmarks` — 15 direct options: `title`, `showTitle`, `titleSize`, `layout`, `variant`, `spacing`, `hideTitle`, `hideIcon`, `hideHostname`, `openNewTab`, `withBorder`, `grow`, `customUrls`, `groups`, `items`. Primary inputs `text`, `slider`, `internal`, `sortableItemList`; also consumes `switch`, `select`. App reads `app.byIds/selectable` are #35-owned services. Common option leaves `widget.options.getWidgetOptionSettings/saveItemOptions` are primary here. Dispatch-only coverage: `app`, `switch`, `select`, `text`, `slider`, `internal`, `sortableItemList`, `dateTimeEventList`, `timezoneList`, `number`, `anchorNote`, `location`, `multiText`, `multiReleasesRepositories`, `dynamicSelect`, `multiSelect`, `dynamicMultiSelect`, `integrationMultiSelect`, `statsEntries`, `umamiWebsite`, `umamiEventName`, `umamiEventNames`, `integrationSelect`, `customWidgetSelect`, `customWidgetConfiguration`. Their behavioral owners remain the exact [input ledger](../drafts/widgets.md#input-type-primary-delivery-ledger), with the last two transferred to #104.

Common completion standard: [PUBLISHING](../PUBLISHING.md) and [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), subject to [DESIGN](../DESIGN.md). This includes durable conversion, saved-placement/type/authorization checks, key-scoped error recovery, hydration/client isolation, cleanup and deferred focused verification, not old transport compatibility.

## Required contracts

Initially unaccepted: #67 local definitions/loaders/query identity; #26/#27 board projection/geometry; #28 ordered commands; #29 placement/dialog host; #35 app batch selection/forms; #40/#41 compatible integration DTO/full-access forms; #04/#09 policy/session; #05/#08 localized validation/modal feedback; #02 repository conversion; #120 service/error/key contribution. Family schema/input descriptors can be accepted independently. Final registry/input reconciliation and real option/bookmark/provider joins require evidence, not all 89 completed providers before starting.

## Decision holds

Q11/Q12 concrete repository/conversion; Q13 coherent draft/save timing; Q15 session continuity only where relevant. Server option-validation/refinement/durable repair and undefined-ID preview policy, populated bookmark HTML/SSR and freshness/demo behavior remain held until explicit disposition. Resolved UI/localization/auth-candidate/singleton/Redis/file-route choices are not reopened.

## Ownership

#68 owns shared editor/input dispatch/preview composition, bookmark renderer and common authorized option get/save wrapper. Families own local schemas and behavioral inputs; #104 owns custom inputs; #76 owns shared debounce, not options persistence. #29 owns picker/dialog/placement hosting; #67 owns standalone route/layout. Physical schema stays #02-owned; COMPOSITION owns central installation/exports/dependencies. Require exclusive local allocation before dispatch.

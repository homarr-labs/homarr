# 99 — Portable definition management

## What to build
Deliver authorized list/new/edit/enable/duplicate/delete and reviewed JSON/Markdown import/export of versioned Custom JSX definitions, including linked placement effects and recoverable errors.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary CUSTOM-01. customWidget.list, get, create, update, toggleEnabled, delete, duplicate, export, import (9). Own Custom Widgets list/new/edit and transfer/enable/duplicate/delete flows. Behavior model customWidgetDefinitions: schema/options/template/sources/requests/creator/enabled/version. Portable JSON/Markdown omits deployment bindings and secrets. Direct authorized form/import CRUD is distinct from #102 preview-evidence saves.

## Required contracts
Initially unaccepted: #02 definition repository/transactions/reference errors; #04 admin/crypto policy; #103 binding/configured projection; #104 enabled/placement eligibility/invalidation; #120 typed clients/errors; #05–08 forms and #22 navigation. Supply portable import/export revisions to #100/#102/#105/#106 before complete peers are required.

## Decision holds
Q11/Q12 concrete repository and conversion matrix; source-retention/delete-linked-placement policy and import review limits require explicit disposition. Detailed locale/forms scope remains unknown only where relevant. External format compatibility is not required, but all durable definition content must convert.

## Ownership
Own local definition CRUD/transfer service and management UI. #02 alone writes schema; #103 owns secrets; #104 owns runtime/customApi; COMPOSITION owns central registrations/exports/dependencies. Real persistence/runtime and Workshop joins are acceptance evidence, not start blockers; #125 closes product convergence.

## Acceptance criteria
- [ ] Target list/new/edit/enable/duplicate/delete flows reach authorized typed services and durable storage; stale/invalid writes or failed deletes cannot corrupt definitions or silently discard linked content.
- [ ] Reviewed imports validate bounded JSON/Markdown and source/binding requirements, assign independent local IDs and leave durable state unchanged on rejection; exports contain no local integration IDs or secret values.
- [ ] Creator/version/enabled/options and dependent-placement eligibility refresh coherently; direct admin CRUD remains usable without falsely demanding preview evidence for every save.
- [ ] Old v2 definitions/templates/options/requests/sources explicitly convert and reload; focused future foreign/admin-denied CRUD, transfer redaction, rejected import and linked-placement regressions exercise real management/repository paths.

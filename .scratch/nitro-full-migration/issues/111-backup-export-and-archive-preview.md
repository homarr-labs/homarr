# 111 — Backup export and archive preview

## What to build
Own the backup parent screen, bounded archive decoder/inspect/export/snapshot service and browser preview/count/board-selection flow. Supply the authoritative preparation handoff used by #112; preview never authorizes live replacement.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary DATA-03 plus transferred CORE-07 archive scope. H13 export GET and H15/H16 migration/SQL-WASM GET capabilities. Backup management parent owns inspect/export panels and hosts #112's exported restore panel. SQLite consistent snapshot ZIP and metadata/version/dialect/key-carriage policy; original db.sqlite + metadata.json is an explicit conversion input, not compulsory target format. Browser JSZip/sql.js migration/count/board-choice preview and packaged SQL/WASM requests; PostgreSQL export is currently unsupported, not silently promised. SQL archive is not a Redis-history/image-map or certificate-file whole-volume backup.

## Required contracts
Initially unaccepted: #02 engine snapshot/readonly/migration/reference/errors for supported dialects; #04 admin-or-scoped-setup inspect/sensitive-delivery policy; #112 inspect→prepare→apply result and exported panel interface; #21 packaged SQL/journal/WASM resources; #01 native response/abort/assets; #05–08 browser-only preview/download UI. Agree the narrow preparation revision before consumers start, not whole restore completion.

## Decision holds
Q11/Q12 supported engine/old/new archive conversion frontier; human archive confidentiality/key carriage choice; snapshot consistency/bounds/temporary-output and ingress evidence. Locale scope remains unknown where needed. No automatic key-in-metadata approval or PostgreSQL ZIP-export expansion is implied.

## Ownership
Own archive decoder/inspect/snapshot/export, preparation contribution and sole backup parent. #112 alone owns live replacement/maintenance and restore panel; #02 engine primitives/schema; #21 ships resources; COMPOSITION mounts. Real consistent snapshot + shipped preview resources + parser agreement is production acceptance; #125 is separate convergence.

## Acceptance criteria
- [ ] Authorized actual export client downloads an isolated consistent SQLite snapshot with valid metadata; simultaneous exports/errors cannot share or corrupt temporary outputs, and unsupported PostgreSQL export returns a deliberate typed outcome.
- [ ] UI/headers describe sensitive SQL scope and explicitly chosen key carriage/confidentiality/cache behavior, never call it sanitized or whole-volume recovery; denied clients cannot inspect/export secrets.
- [ ] Bounded browser decoder previews every approved old/new format on a copy, reports counts/board choices, loads shipping SQL/journal/WASM resources and handles cancel/parser/migration failure without touching live storage.
- [ ] Server preparation and browser preview agree on selected board/reference identity and malformed/wrong-dialect/oversized/unsupported rejection; preview cannot trigger apply, and parent hosts only #112's restore control.
- [ ] Focused future concurrent-export, archive-bound/parser, denied-inspect and shipped-preview regressions use disposable snapshots and demonstrate a real preparation handoff, not fixture-only backup parity.

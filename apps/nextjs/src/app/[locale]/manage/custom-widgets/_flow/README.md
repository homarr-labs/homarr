# Custom Widget workbench

The flow editor projects the existing Custom Widget definition. It does not execute a graph or replace the dashboard
runtime. The canvas is the default authoring surface; the complete form remains available from the More menu.

The workspace fills the management area by default, beside a collapsible icon rail. Optional immersive full-screen mode
hides management chrome through CSS and background focus isolation; it preserves the React tree, form association, draft,
and execution session. Save errors render inside the workspace.

## Ownership

- `document-store.ts` owns definition transactions and bounded Undo/Redo. Credentials stay in the live form;
  `credential-bindings.ts` restores their association across source renames without putting values in history.
- `graph.ts` projects references into nodes and edges. `commands.ts` and the specialized editors change manifest fields.
  Template edits use parser source ranges and preserve unrelated formatting and comments. Complex relationships are
  inspectable in code rather than converted into a visual component tree.
- Layout metadata lives beside the persisted definition. Moving nodes does not notify definition subscribers, parse JSX,
  invalidate preview evidence, or call the executor. ELK is loaded on demand for explicit arrangement.
- Selection, viewport, panes, response bodies, temporary parameters, and Assistant conversation state are session state.
  Node data contains compact summaries and stable identifiers, not credentials or response bodies.
- `canvas-preview.tsx` mounts the live preview inside the Widget node. Its header drags the node; preview controls and
  authored interactions use `nodrag`, `nopan`, and `nowheel`. CodeMirror and Assistant live in a contextual side pane,
  outside canvas zoom, and remain mounted when hidden. Preview tools open in a portaled popup. The preview theme surface
  isolates its styles and portal content from management chrome. Runtime-owned dropdown targets escape widget paint
  containment while preserving scoped CSS, preview themes, and dialog focus traps. Nested menus and popovers retain
  inline dropdowns; interpreter-authored events and portal targets remain blocked.
- Assistant draft commands use the existing conversation and client-tool infrastructure. Draft identity and generation
  preconditions reject delayed patches. An accepted patch is one document transaction, not an implicit save or action.

## Compatibility and capabilities

Plain HTTP and static widgets retain the v2 schema. A definition with runtime extensions uses v3; strict v2 definitions
never acquire extension fields. Editor layout is not portable runtime content. Empty sources and requests support static
widgets without a placeholder service URL.

V3 adds scoped styles and keyframes, theme/container bindings, named views, supported detail overlays and embeds,
per-user browser preferences, permissioned shared board content, and curated native capabilities. The initial native
catalog covers Beszel systems/history/alerts/live data, calendars, media requests, Home Assistant, and Docker. It does not
expose arbitrary tRPC methods. Other services use HTTP or embeds; services without these interfaces need an external bridge.

The executable Beszel reference definition and current capability inventory are documented under
`apps/docs/docs/management/custom-widgets/`. The reference includes system selection, historical charts, container statistics,
live statistics, preferences, and partial failures. The catalog is an explicit coverage boundary, not a claim that every
native Homarr widget has a dedicated capability descriptor.

Workshop installation and MCP use the same install procedure. Provenance records endpoint, submission, revision, and
portable fingerprints. Update review retains local connections and secrets, rejects incompatible/local changes, and keeps
one previous package for rollback. Publication updates the existing owned submission or creates an attributed remix.
PocketBase schema validation and SQLite, MySQL, and PostgreSQL migrations ship with these changes.

## Authoring connections

`connection-planner.ts` validates the same operations for ports and the inspector picker. Source associations and action
invalidations update their manifest fields directly. Query, action, and option connections open a binding dialog: choose a
response field, display, or parameter mapping before applying a bounded JSX/manifest edit. Repeated connections can add
another field or display for the same relationship. Query and action creation never runs a remote operation implicitly.

`template-insertion.ts` preserves existing source text around inserted components. Generated bindings carry portable
comment markers for ownership checks. Only unchanged, wholly generated relationships can be removed or replaced visually;
authored or mixed references open in JSX. Replacement applies the removal and new binding in one document transaction.
A stale dialog cannot overwrite changes made after it opened.

## Acceptance evidence and limits

The current canvas presentation has been checked in the isolated SQLite development app with Chromium on Linux. Focused
browser checks cover real query/option/action bindings, repeated mappings, shared Undo, live JSX rendering, invalid-JSX
preview continuity, generated binding disconnect/reconnect and cancellation, compact controls, theme and size changes,
and recovery while the inspector is closed. The preview tools fit a 390px viewport. Real pointer movement and zoom retained the preview shadow tree and CodeMirror
without execution requests. Scoped light/dark accessibility scans found no violations; overlap prevents automated contrast
verification for some canvas elements. The 38 focused existing workbench/runtime/preview tests passed. Tests use local/sample data and simulated actions; these checks do not exercise a real external action
or public Workshop publication.

Earlier implementation passes covered local mock Beszel data and a deterministic Assistant provider, Workshop installation
and board rendering, scoped portals, focused runtime tests, and production builds. Earlier production canvas measurements
covered 16 nodes, 64 requests, and a template near 50,000 characters with zero execution requests or parser entries during
movement; board manifests excluded React Flow, ELK, and workbench chunks. Those measurements predate the preview-in-node
presentation and are not production performance or bundle proof for this final UI.

Physical touch/trackpad testing, a broader browser/device matrix, a fresh production performance pass, real external service
actions, and executing the MySQL/PostgreSQL migrations against live database servers remain separate acceptance work.
Schema snapshots and migration ancestry were checked for all three drivers. An existing demo-gallery test requires the
unavailable llama.cpp demo module. The current development acceptance uses repository routing unchanged; an earlier
production QA instance needed a temporary generated server-routing override.

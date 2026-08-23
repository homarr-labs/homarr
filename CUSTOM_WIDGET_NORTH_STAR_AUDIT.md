# Custom Widget North-Star Audit

Date: 2026-08-23

Scope: Custom JSX v2 authoring, preview/runtime behavior, Assistant and MCP authoring, persistence, Workshop lifecycle, performance, UI/UX, human DX, LLM DX, security, and future capabilities.

## Audit status and evidence standard

This began as a code-informed product and architecture audit and was followed by an authenticated live QA pass against the writable demo at `100.111.30.70:3021`. The workbench, renderer, editor history, preview state, Assistant/clipboard prompt handoffs, and Workshop browse/install flows were exercised directly. React DevTools, DOM identity checks, CodeMirror state, scoped axe 4.12.1 audits, HTTP 200 checks, and a real HMR WebSocket 101 handshake were used as evidence.

This worktree includes the highest-value quick wins found by the audit. Focused existing specs, formatting, lint, and live browser checks were run; no broad build, full typecheck, E2E suite, Docker build, or production benchmark is claimed. Recommendations below are explicitly separated into **delivered in this slice** and **remaining north-star work**.

## Operating assumption: one owner, not collaborative editing

The normal case is one person managing a dashboard. This report therefore does **not** recommend collaborative editing, record locks, leases, presence, merge conflict resolution, compare-and-swap head pointers, or a durable local version-history system.

The lightweight model is:

- one current saved definition;
- one optional crash-recovery draft;
- an in-memory undo/redo stack with `Ctrl+Z` and `Ctrl+Shift+Z`;
- **Reset to saved** for a simple escape hatch;
- a short-lived `draftGeneration` counter and content fingerprint used only to prevent an old compile, preview, or AI result from replacing newer text;
- Workshop origin metadata only when it is needed to install, update, or publish a community widget.

`draftGeneration` is not a collaborative lock or user-facing version. It disappears with the authoring session. Network concurrency is a separate concern: one widget owned by one person can still launch many HTTP requests at once, so bounded request scheduling remains necessary.

## Executive verdict

Custom Widgets already has a much stronger safety and authoring foundation than the word “custom” usually implies: a constrained JSX language, a component allowlist, credential separation, SSRF protections, request/action separation, preview sessions, an exact-tested `createFromPreview` API/MCP path, schema references, examples, an Assistant workflow, and Workshop distribution.

One important split must be made explicit: the management workbench’s ordinary create/update buttons currently send the definition directly to `create` or `update`; they do not require a preview or successful query evidence. Exact-tested persistence is therefore a strong existing platform primitive, not yet the invariant of the human authoring flow.

The weak point is not the safety model. It is the authoring model.

Before this slice, the workbench treated every keystroke as if a complete widget manifest changed. That caused broad form rerenders, repeated JSON parsing and JSX validation, CodeMirror reconfiguration, raw-manifest reserialization, and a deliberately keyed preview renderer remount. The delivered quick wins preserve the CodeMirror and preview instances, reconcile compatible renderer bindings, defer expensive analysis, memoize the preview path, and avoid mounting heavy advanced editors until first use. The root Mantine form still renders for a field change, and the UI, Assistant, MCP tools, preview API, and persistence layer still coordinate closely related lifecycle rules in different places.

The north star should be:

> A fast, evidence-driven authoring environment where humans and agents edit the same draft, inspect the same structured diagnostics and data, test one exact candidate fingerprint, and save exactly what was proven—without collaborative machinery, secret exposure, or arbitrary JavaScript.

The highest-value changes are:

1. Make typing local and immediate. Do not rebuild the application-level candidate or remount the preview on every character.
2. Introduce one deep `CustomWidgetAuthoringSession` shared by the workbench, Assistant, and MCP adapters.
3. Compile once per draft generation, discard stale async results, and save only the exact tested fingerprint.
4. Redesign the workbench around **Define → Test → Publish**, with a data inspector and actionable diagnostics beside the editor.
5. Split the AI contract into channel-specific protocols. The in-product Assistant should use tools and patches; the clipboard flow should return a structured import envelope.
6. Add lightweight draft recovery, workbench-wide undo/redo, reset to saved, and explicit Workshop install/update/publish metadata.
7. Add safe declarative capabilities—transforms, request dependencies, scenarios, pagination, scoped state, and localization—before considering arbitrary code or imports.

## North-star scorecard

These scores are directional product judgments, not benchmark results.

| Dimension               | Current | North-star assessment                                                                                                                             |
| ----------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime safety          |  8.5/10 | Strong constraints and network defenses; preserve them while capabilities grow.                                                                   |
| Core authoring breadth  |    7/10 | Sources, requests, options, JSX, preview, import/export, Assistant, MCP, and Workshop are substantial.                                            |
| Typing performance      |    6/10 | Editor/preview identity is stable and expensive analysis is deferred, but the root controlled form still commits broadly.                         |
| Preview trustworthiness |    6/10 | Late preview results are rejected and edits invalidate evidence, but ordinary save still bypasses exact preview evidence.                         |
| Human workbench UX      |    6/10 | Good ingredients, but the workflow is a long form rather than an integrated authoring environment.                                                |
| Recovery/undo           |    5/10 | Editor-local keyboard/toolbar history is reliable and survives advanced-panel collapse; unified workbench undo and crash recovery remain.         |
| LLM authoring           |    7/10 | Assistant and clipboard contracts are now distinct and include redacted raw drafts plus diagnostics; session/evidence context remains incomplete. |
| Observability           |    3/10 | Preview journals help, but durable safe traces and production health evidence are limited.                                                        |
| Workshop continuity     |    5/10 | Browse/install handoffs now use one server-resolved public URL without hydration drift; installed/published provenance is still not retained.     |
| Extensibility           |    6/10 | The interpreter and runtime port are good foundations; workbench orchestration is not yet a deep module.                                          |

## What should remain

The rethink should build on the parts that are already correct:

- Keep Custom JSX declarative and interpreted. Do not add `eval`, arbitrary imports, hooks, browser fetches, or unrestricted event handlers.
- Keep configured/plaintext secret values and authentication material separate from credential-free definitions, prompts, exports, diagnostics, preview metadata, and logs. Upstream response payloads are untrusted data and may themselves contain sensitive-looking values, so they still require redaction and deliberate handling.
- Keep public/private/loopback source policy, DNS pinning, redirect checks, response limits, timeouts, depth budgets, and action confirmation.
- Keep queries and actions distinct. Automatic retry may be valid for idempotent queries; it must not silently retry actions.
- Keep the canonical component catalog and safe property model.
- Keep exact-tested `createFromPreview` through a preview session. Route ordinary workbench create/update through the same evidence-bound authority and generalize it; do not replace it with a looser save path.
- Keep both visual builders and raw JSON/manifest escape hatches.
- Keep loading, empty, error, success, size, theme, and action simulation as first-class preview concepts.
- Keep import/export and Workshop as distribution mechanisms. Add only the origin fields needed for clear install/update/publish actions; do not build a general provenance or local version-history system.

## Confirmed original cause of the “whole workbench reloads while typing” problem

The original behavior was not one isolated React mistake. It was a cascade. The key CodeMirror, preview-remount, hidden-editor, and synchronous-analysis amplifiers in this diagram are now mitigated; the root controlled-form render remains.

```text
CodeMirror character edit
  → root Mantine form field changes
  → CustomWidgetForm renders again
  → complete candidate is rebuilt and validated
  → JSON fields and JSX are analyzed again
  → completions and large child prop objects are recreated
  → CodeMirror extensions are reconfigured
  → raw manifest is serialized and mirrored into local state
  → when the candidate remains valid, preview renderer receives a new template
  → key={template} unmounts the renderer session
  → preview-local inputs, errors, IDs, boundaries, and child state reset
```

### Direct evidence

| Finding                                                                                                | Evidence                                                                                                                                                                                                                   | Consequence                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One root form owns every authoring field.                                                              | [`_custom-widget-form.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form.tsx), around lines 59–76                                                                                                | A change to one field rerenders `CustomWidgetForm` and recreates its child element tree; a profiler is needed to count deeper React/Mantine bailouts.                                                                                                                |
| The full definition is rebuilt from `form.values`.                                                     | Same file, line 76; [`_custom-widget-form-utils.ts`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form-utils.ts), around lines 15–25                                                                  | Unrelated edits pay parsing and complete schema-validation work.                                                                                                                                                                                                     |
| Request IDs were parsed twice in one render path.                                                      | `_custom-widget-form.tsx`, around lines 77–86                                                                                                                                                                              | This quick-win slice now parses them once and reuses the result.                                                                                                                                                                                                     |
| JSX completion identity was tied to the entire `form.values` object.                                   | `_custom-widget-form.tsx`, around lines 88–95                                                                                                                                                                              | Completion derivation now depends only on sources, options, and the semantic request-ID signature, so template and general-field edits keep the language compartment stable.                                                                                         |
| The template is validated in the full schema and analyzed separately.                                  | [`custom-jsx-schema.ts`](packages/custom-widgets/src/core/custom-jsx-schema.ts), around lines 31–44; [`analyzer.ts`](packages/custom-widgets/src/workbench/analyzer.ts), around lines 35–45                                | Acorn/parser work is duplicated for a draft generation.                                                                                                                                                                                                              |
| The preview renderer was keyed by the complete template string.                                        | [`custom-jsx-renderer.tsx`](packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx)                                                                                                                                   | The key is removed. One renderer session now reconciles registrations, preserving compatible name/type bindings, pruning removed bindings, and resetting incompatible ones.                                                                                          |
| Renderer-local state lived below that key.                                                             | `custom-jsx-renderer.tsx`                                                                                                                                                                                                  | Live QA confirmed the same bound input DOM node and value survive a valid template edit; focused runtime specs cover preservation, pruning, reset, and conflicts.                                                                                                    |
| Rendering and a template+bindings hash are synchronous.                                                | `custom-jsx-renderer.tsx`, around lines 165–181 and 231–235                                                                                                                                                                | JSX interpretation and `JSON.stringify(bindings)` are on the render path.                                                                                                                                                                                            |
| Preview analysis, display data, summary, and reset serialization previously ran on every panel render. | [`_custom-widget-preview-panel.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-preview-panel.tsx), around lines 50–100                                                                             | These are now memoized across journal polling and unrelated panel state; broad candidate reconstruction can still invalidate request-derived inputs after some root-form edits. The contained error-boundary reset key is not itself evidence of a renderer remount. |
| CodeMirror previously reconfigured when the entire props object changed.                               | [`direct-code-mirror.tsx`](packages/custom-widgets/src/workbench/direct-code-mirror.tsx), around lines 90–145                                                                                                              | Independent compartments now reconfigure only language/completions, diagnostics, accessibility, editability, placeholder, height, or theme as those semantic inputs change; callback identity changes only update the callback registry.                             |
| The advanced manifest previously serialized the entire draft while its accordion was closed.           | [`_custom-widget-advanced-manifest.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-advanced-manifest.tsx)                                                                                          | Serialization/editor creation now starts on first expansion and the mounted editor survives collapse. Explicit Apply/Discard transactions and conflict handling remain future work.                                                                                  |
| Preview query state previously had no definition/configuration identity beyond item/request/params.    | [`custom-jsx-display.tsx`](packages/widgets/src/custom-api/custom-jsx-display.tsx), [`sub-fetch.tsx`](packages/custom-widgets/src/runtime/sub-fetch.tsx), [`custom-api.ts`](packages/api/src/router/widgets/custom-api.ts) | Template-only edits now preserve compatible state, while published query state and React Query entries are scoped by a server-derived request/source/secret/configuration identity so a materially changed saved definition cannot reuse stale SubFetch data.        |

### What is and is not proven

Proven from code and live QA:

- A template character still changes the root form, but schema/JSON/JSX analysis consumes a deferred draft and the memoized preview skips the urgent pass.
- Only the visible JSX CodeMirror mounts on initial load. Advanced manifest, raw request/option, and request-body editors mount on first expansion and then remain mounted so invalid drafts, selection, and undo history survive collapse.
- CodeMirror configuration updates through independent compartments. Controlled React synchronization preserves/clamps selection, does not echo `onChange`, and does not enter editor history.
- The same workbench, editor, renderer, and compatible bound input nodes remain connected through a valid template edit; the input value is preserved.
- Saved request/source/secret/configuration changes receive a new query-cache identity; template-only edits do not discard compatible query/input state.
- Toolbar Undo/Redo and exact CodeMirror `Ctrl+Z` / `Ctrl+Shift+Z` transactions round-trip the draft and retain focus.
- A clean five-second development profile captured no idle renders. The one-edit development profile still shows a broad root commit plus a deferred pass; aggregate DevTools render totals are inflated by Strict Mode, providers, and overlapping parent timings and are not a production benchmark.

Still not proven:

- Production keystroke latency and allocation/GC behavior at 10 KB, 25 KB, and 50 KB templates.
- Production React commit duration on representative low-end hardware.
- A complete field-scoped store implementation eliminating the remaining root form commit.

Ordinary typing does not directly invoke the save or preview API in the inspected form actions. The stable renderer session also removes the previous keyed `SubFetch` subtree remount. A production network trace is still appropriate before making broader request-cache claims, but no typing-triggered remote-preview behavior is claimed by this report.

## Performance north star

### Required interaction model

Editing and testing must be different classes of work.

```text
Immediate lane                         Deferred lane                         Explicit remote lane
──────────────                         ─────────────                         ────────────────────
Update one draft field                 Parse changed JSON once               Create preview session
Update editor text                     Compile/analyze latest generation      Execute query probes
Preserve focus/selection               Publish diagnostics if still current  Simulate/live-test action
Mark evidence stale                    Refresh last-good local preview        Save tested fingerprint
< 16 ms desired                        cancellable/coalesced                  user or agent intent only
```

Rules:

1. A raw draft may be temporarily invalid. Typing must never be rejected because an intermediate JSON or JSX fragment does not parse.
2. An edit synchronously increments an in-memory draft generation and returns control to the editor.
3. Compilation is latest-generation-wins. Older results cannot replace current diagnostics.
4. While the current draft is invalid or still compiling, preserve the last-good preview and label it **Preview out of date—showing the last valid draft**. Do not expose internal generation numbers unless diagnostics mode needs them.
5. Remote queries never run merely because a character changed.
6. A preview result is identified by draft generation, credential-free fingerprint, and preview session ID.
7. Save/publish can use only evidence that matches the exact current fingerprint.

### P0 performance fixes

#### 1. Remove template identity from the renderer component key

Keep the preview shell and renderer session mounted. A template update should replace a compiled artifact, not the identity of the authoring environment.

State preservation must be explicit:

- Preserve preview viewport, selected tab, scroll position, diagnostics panel, and data inspector.
- Preserve declared inputs whose names and types still exist.
- Remove inputs that disappeared from the new artifact.
- Reset only incompatible input types and explain the reset.
- Give the error boundary a compile-artifact identity without remounting the whole renderer.

Simply deleting the key is not the complete fix; it needs these reconciliation rules so stale input/boundary state does not leak across materially different templates.

#### 2. Stop subscribing the complete workbench to every value

Split the root form into field-scoped stores or a session store with selectors. Each panel should subscribe only to the fields and diagnostics it renders.

Examples:

- General information subscribes to `name`, `description`, and `iconUrl`.
- Source cards subscribe to their own source IDs.
- A request card subscribes to one stable request entity.
- The JSX editor subscribes to `template`, request IDs, option IDs, and its own diagnostics—not all form values.
- Preview subscribes to the last compiled artifact and selected fixture, not raw editor text.
- Save actions subscribe to dirty state, current fingerprint, validation status, and evidence status.

Use stable entity IDs for request and option cards. `key={index}` should be removed so reorder/delete operations do not transfer local control state to a different item.

#### 3. Parse and compile once per draft generation

Build one intermediate result:

```ts
type CompileArtifact = {
  generation: number;
  fingerprint: string;
  normalized?: CredentialFreeDefinition;
  ast?: CustomJsxAst;
  diagnostics: readonly Diagnostic[];
  symbols: {
    requestIds: readonly string[];
    optionIds: readonly string[];
    inputNames: readonly string[];
  };
};
```

The form validator, diagnostics panel, completions, preview renderer, Assistant context, and save eligibility should consume this artifact. They should not each parse the same strings. Neither the generation nor the fingerprint needs a durable history table.

Start with a short idle debounce or `useDeferredValue`; move parsing/analysis to a worker if measurement shows main-thread impact at the supported 50,000-character limit. A worker is not a substitute for eliminating duplicate work.

#### 4. Make CodeMirror configuration incremental

Use CodeMirror compartments or equivalent targeted effects for the pieces that actually change:

- language compartment changes rarely;
- completion data changes when request/option/component symbols change;
- diagnostics change after analysis;
- read-only/theme/keymap change independently;
- `onChange` should be held through a stable callback/ref.

Do not dispatch a full `StateEffect.reconfigure` because a React props object has a new identity.

#### 5. Make the raw manifest an explicit editing mode

Do not serialize and mirror a 50 KB manifest while its accordion is closed.

- Serialize lazily when the raw-manifest editor opens.
- Take a draft-generation snapshot when raw mode opens.
- Let raw text diverge without an effect overwriting it.
- Offer **Apply raw manifest**, show a structured diff, and ask for confirmation if the visual editor changed after raw mode opened.
- Offer **Discard raw changes**.

This turns a dangerous two-way mirror into an understandable transaction.

#### 6. Finish asynchronous cancellation and explicit states

Preview actions now carry an ephemeral operation generation plus candidate/options/secrets identity. A layout-timed current-input ref and post-await checks prevent an older preview or notification from replacing newer draft state. The remaining work is transport cancellation and explicit lifecycle presentation. This is ordinary async freshness, not multi-user locking.

Use all of:

- exact generation/fingerprint on request and response;
- latest-operation token on the client;
- cancellation when superseded;
- stale-result rejection even when transport cancellation is impossible;
- explicit `cancelled`, `expired`, `stale`, and `failed` states.

#### 7. Align request scheduling with server limits

The definition schema permits up to 64 requests, while the inspected limiter permits four concurrent requests per user/item and eight per definition. Production widget loading in [`custom-api.ts`](packages/api/src/router/widgets/custom-api.ts), around lines 204–241, and the standalone preview route fan out load queries with `Promise.all`; the limiter rejects excess acquisitions rather than queueing them. This quick-win slice changes the management workbench’s previously sequential `loadPreviewQueries` helper to a local four-worker queue. Production and preview callers still need one shared bounded scheduling policy.

Introduce a platform-owned scheduler:

- bounded queue with a concurrency budget;
- deduplication by request, params, source, and current definition fingerprint;
- priority for visible/critical requests;
- cancellation when no consumer remains;
- partial-success state instead of an all-or-nothing blank widget;
- deterministic ordering for preview evidence;
- separate policy for actions;
- optional dependency graph scheduling.

### Additional performance fixes

- Do not poll preview journals every two seconds when the page or diagnostics tab is hidden. Resume on focus or use event-driven updates where practical.
- Load independent preview queries through the bounded scheduler rather than a sequential UI loop or unbounded runtime fan-out.
- Virtualize or progressively render the component reference. Searching hundreds of components and hundreds of global props per component should not block typing.
- Precompute normalized searchable catalog tokens once per catalog version.
- Keep large preview response bodies outside React component state when only a selected path is visible; expose selectors and structural sharing.
- Memoize stable runtime bindings and component maps by artifact/runtime version.
- Avoid hashing `JSON.stringify` of full bindings during render. Compute a small artifact/bindings generation when data changes.
- Pause previews when offscreen; do not destroy them.
- Cache compilation by credential-free digest, with bounded memory and explicit runtime/catalog version in the key.
- Lazy-load heavy editor/reference panels, but do not make the initial focused editor feel delayed.

### Performance budgets

These are proposed acceptance targets, not current measurements. Before enforcing them, name a reference device/CPU profile and browser version and commit a repeatable benchmark harness with fixed 10 KB and 50 KB fixtures. CI can use a calibrated CPU throttle; release profiling should also run on representative physical hardware.

| Scenario                                                       |                                         Target |
| -------------------------------------------------------------- | ---------------------------------------------: |
| Editor input handler p95                                       |                                         < 8 ms |
| Keystroke to paint p95                                         | < 16 ms for a 10 KB template; < 32 ms at 50 KB |
| Unrelated workbench sections rerendered per template character |                                              0 |
| CodeMirror full reconfigurations per ordinary character        |                                              0 |
| Preview shell remounts per ordinary character                  |                                              0 |
| Remote requests caused by ordinary typing                      |                                              0 |
| Local diagnostic update after idle                             |           < 150 ms at 10 KB; < 300 ms at 50 KB |
| Stale async results applied                                    |                                              0 |
| Component search first result                                  |                      < 50 ms for local catalog |
| Preview state switch using existing fixtures                   |                                       < 100 ms |
| Long task budget while continuously typing                     |                                no task > 50 ms |

Add automated counters in development builds:

- form/panel render count;
- editor reconfiguration count;
- parser/analyzer count by draft generation;
- renderer mount count;
- preview session creation/query count;
- stale result drop count;
- compile duration and template size;
- request queue depth and wait time.

## Product model: from a long form to Define → Test → Publish

The current workbench has good components but presents them as one vertically stacked form. The north-star product should be an authoring workspace with an explicit lifecycle.

### Desktop structure

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Service health widget   Draft saved 8s ago   Undo  Redo   2 errors   Preview stale  [Publish] │
├────────────────┬──────────────────────────────────────────────┬──────────────────────────────┤
│ DEFINE         │ EDIT                                         │ PREVIEW / INSPECT            │
│                │                                              │                              │
│ ✓ General      │  JSX editor / selected visual builder        │  [Live] [Loading] [Empty]    │
│ ✓ Sources      │                                              │  [Error] [Custom scenario]   │
│ ! Requests     │  inline diagnostics                          │                              │
│ • Options      │                                              │  rendered widget             │
│ ! JSX          │                                              │                              │
│                │                                              │  S / M / L   light / dark    │
│ TEST           │  context rail:                               │                              │
│ 3/4 queries    │  Components | Bindings | Data paths | Docs   │  Data | Requests | Actions   │
│ 6 scenarios    │                                              │  Diagnostics | A11y | Perf   │
│                │                                              │                              │
│ PUBLISH        │                                              │                              │
│ Workshop       │                                              │                              │
│ Export         │                                              │                              │
└────────────────┴──────────────────────────────────────────────┴──────────────────────────────┘
```

The panes should be resizable and persist layout per user. The preview remains mounted while the center editor changes.

### Mobile structure

The current mobile screenshot shows a large beta banner, a horizontally constrained section navigator, and bottom controls competing for viewport space. The mobile model should be task-oriented:

- top status row: draft state, undo/redo availability, errors, and whether preview is current;
- three full-width tabs: **Define**, **Test**, **Preview**;
- section list opens as a sheet with error counts and completion state;
- bottom action bar uses safe-area padding and does not cover editor content;
- Preview is a dedicated full-height canvas with a quick return to the exact diagnostic/editor line;
- the beta explanation collapses after first acknowledgment and remains available through help;
- Assistant appears as a focused sheet, not an always-large card above the work.

### Entry experience

On create, offer four clear starting points:

1. **Starter** – minimal safe widget with one fixture and comments.
2. **Example** – choose from maintained patterns such as status, list, metrics, actions, pagination, and authentication.
3. **Describe with AI** – structured brief plus optional documentation and sample response.
4. **Import** – credential-free manifest or authoring response envelope.

Ask for the outcome first, not every implementation detail. Progressive disclosure should reveal sources, requests, options, and JSX as needed.

### Authoring status must always be explicit

The header should distinguish:

- **Draft saved locally** versus **Saved to Homarr**;
- **Checking current draft**;
- **Current draft is invalid**;
- **Showing the last valid preview**;
- **Preview tested with fixtures only**;
- **Live queries passed**;
- **Preview out of date after edit**;
- **Ready to publish**;
- **Saved widget has unsaved draft changes**.

An empty preview must never look equivalent to a validated empty state. Use an explicit **Untested** presentation until a scenario or live query was run.

## Detailed UI/UX recommendations

### General information

- Put name, icon, and description in a compact identity header rather than giving simple fields disproportionate vertical space.
- Show where the widget will appear and whether this is a reusable definition or a configured board instance.
- Add tags/category only if Workshop discovery and local organization will use them consistently.

### Sources

- Render each source as a security card: scope, base URL class, credential status, permissions, and dependent requests.
- Explain public/private/loopback implications in context.
- Let a user test source reachability separately from a particular request without leaking sensitive URL details into logs.
- Show credential status only—never the value—after configuration.
- Optional future capability: a delegated configuration link/session so another authorized person can enter credentials without seeing the widget draft. This is an enhancement, not a correction to the current admin-gated design.

### Requests

- Give every request a stable ID and card identity.
- Show method, source, path template, parameters, cache/refresh policy, dependents, and last test status in the collapsed summary.
- Add **Test request** on the card and show response status, duration, redacted size, and shape.
- Make parameter/binding references autocomplete and refactor-safe when a request or option is renamed.
- Visualize request dependencies as a small DAG when one request uses another request’s result.
- Provide critical/optional classification so one secondary request does not blank the whole widget.
- Provide pagination/cursor configuration as a declarative primitive.
- Warn when declared request concurrency exceeds effective server policy.

### Options

- Use a compact table for ID, type, label, default, required, and preview value.
- Add option usage counts and jump-to-template references.
- Generate the settings preview beside the table.
- Preserve stable IDs across reorder and rename.
- Add locale-aware number/date/color choice types only when the runtime can serialize them deterministically.

### JSX editor

- Keep CodeMirror focus, selection, scroll, undo history, and extensions stable across all unrelated edits.
- CodeMirror already exposes undo/redo depth and toolbar actions. Keep that behavior, retain its default `Ctrl+Z` / `Ctrl+Shift+Z` shortcuts, and connect it to the workbench-wide undo model described below.
- Add a context rail with four high-value sources: component search, bindings, real response paths, and examples.
- Insert a component skeleton or selected data path at the cursor.
- Make diagnostics clickable and range-aware; offer safe quick fixes where deterministic.
- Show the current JSX language/runtime/catalog version.
- Indicate whether the displayed preview is current, compiling, or last-good.
- Allow split editor/preview and preview-only modes.
- Add command palette actions and documented shortcuts for preview, format, jump to next issue, component search, state switch, and publish.
- Keep the 50,000-character limit visible before it becomes an error.

### Data inspector

The application currently presents preview data largely as raw read-only JSON even though richer response-tree components exist in the package. Make the tree the default:

- searchable expandable response tree;
- type, sample, nullability, and array-size summary;
- copy path;
- insert `data.request.path` at cursor;
- compare two scenarios or compare the current draft with the last saved widget;
- show truncation explicitly;
- pin frequently used paths;
- show which JSX expressions consume a path;
- allow a sanitized response to become a named fixture.

Raw JSON remains available as a secondary tab.

### Diagnostics

Use one normalized diagnostic model across form schema, request analyzer, JSX parser, runtime, query tests, accessibility, compatibility, and AI.

Each diagnostic should have:

```ts
type Diagnostic = {
  code: string;
  severity: "error" | "warning" | "info";
  source: "schema" | "request" | "jsx" | "runtime" | "query" | "a11y" | "compatibility";
  path?: readonly (string | number)[];
  range?: { from: number; to: number };
  message: string;
  help?: string;
  quickFixes?: readonly QuickFix[];
};
```

Clicking an issue must activate the correct pane, expand the correct card, focus the field/range, and preserve keyboard focus semantics. Save failures should use this system rather than only toasts or a detached issue list.

### Preview and scenarios

Treat preview as a state machine, not a single canvas:

- untested;
- compiling;
- invalid—showing last good;
- fixture ready;
- live testing;
- partially successful;
- failed;
- tested and current;
- tested but stale;
- expired.

Add named scenarios containing:

- fixture response per query;
- loading/empty/error/success status;
- option values;
- input values;
- viewport S/M/L or explicit pixel dimensions;
- light/dark/high-contrast theme;
- locale/timezone;
- simulated action result.

Ship a default scenario matrix and let authors add edge cases. The scenario set is session-scoped evidence for human and agent review. It may be exported as a credential-free test bundle, but it does not need a server-side evidence history.

### Actions

- Simulation remains default.
- Make live action mode visually unmistakable and time-limited.
- Require confirmation for destructive methods and show the exact request label/target class, without revealing secrets.
- Put results inline per action with status, duration, response summary, and trace ID rather than relying only on a toast.
- Never automatically retry an action.
- Keep an explicit journal of simulated versus live executions.

### Undo, redo, and lightweight recovery

Do not build version history or collaborative recovery. Add one session-wide undo manager for credential-free draft edits:

- `Ctrl+Z` undoes the most recent authoring change;
- `Ctrl+Shift+Z` redoes it; optionally retain `Ctrl+Y` for platform familiarity;
- visible Undo and Redo buttons show the same shortcuts and disabled state;
- consecutive text input is coalesced into understandable transactions rather than one history item per character;
- a visual-builder change, format operation, AI proposal, raw-manifest apply, import replacement, or multi-field rename is one atomic undo step;
- undo/redo restores editor selection and focus where practical;
- secret entry is never stored in the undo stack;
- saving does not need to erase the in-memory stack, but **Reset to saved** becomes a clear single action;
- history is bounded by count/bytes and disappears when the authoring session ends.

CodeMirror already has its own history, undo/redo commands, depth counters, toolbar buttons, and default keymap through `basicSetup`. The implementation should avoid two competing histories. Route CodeMirror document transactions into the authoring undo manager, or let the focused editor own text undo while the session manager owns semantic cross-field operations with an explicit focus-aware policy. Test the shortcut behavior before changing this code; the missing capability is primarily consistent workbench-wide undo, not basic JSX-editor undo.

For crash recovery, keep only:

- one local autosaved credential-free draft keyed by definition;
- last-saved timestamp and dirty indicator;
- restore/discard prompt after reload;
- **Reset section** and **Reset to saved**.

A server-side draft, comments, presence, locks, merge UI, durable history, and rollback are unnecessary for the stated single-owner workflow. The navigation guard remains a last defense rather than the only recovery mechanism.

### Accessibility

- Add `aria-current` to the active section and a scroll-spy relationship between navigation and panels.
- Ensure horizontally scrollable controls have discoverable overflow and keyboard behavior.
- Move focus to the exact field/range after activating a diagnostic.
- Announce compile/preview state changes without announcing every keystroke.
- Make resize handles and pane switching keyboard-operable.
- Respect reduced motion in transitions and preview state simulations.
- Include high contrast, zoom, keyboard-only, and screen-reader checks in the scenario/evidence workflow.
- Ensure the mobile action bar never covers the active CodeMirror line or validation message.

## Human developer experience

“DX” here includes both widget authors and Homarr maintainers.

### Widget-author DX

- One canonical manifest schema with clear current runtime/catalog compatibility.
- Generated schema docs with searchable components, examples, props, binding types, limits, and capability policy.
- Error codes that are stable enough for search, documentation, and AI quick fixes.
- Import/export that preserves formatting where possible and always shows a diff before applying.
- A CLI or offline validator using the same compiler artifact and catalog version as the server.
- Optionally exportable preview bundles containing the credential-free definition, fixtures, scenarios, compatibility facts, and expected outcomes—without a durable evidence ledger.
- Starter recipes for common API patterns rather than a blank editor.
- OpenAPI-assisted route discovery and schema sampling, with explicit human review before requests are created.

### Homarr-maintainer DX

- One compiler entry point that parses/normalizes/analyzes each draft generation once.
- One authoring lifecycle module rather than separate rules in a form hook, Assistant instructions, MCP descriptions, and persistence procedures.
- Production and in-memory adapters that execute identical session invariants.
- Generated prompt/docs/tool descriptions from the same capability contract.
- Focused compatibility tests when the schema, runtime language, or component catalog changes; no durable definition-version system is required.
- Small typed diagnostic and evidence contracts instead of transport exceptions and UI-only state.
- Instrumented performance tests for render count, parser count, mounts, stale result rejection, and network requests.

The package already contains a runtime port that is a meaningful seam. The workbench port is currently not a meaningful seam because repository search found it declared but not used, and the app reimplements preview UI despite richer workbench preview components existing in the package. Either make the workbench package own a real authoring session and reusable panels, or remove the hypothetical port. Keeping both app-specific orchestration and unused abstraction increases surface area without hiding complexity.

## LLM and AI audit

### What the existing prompt does well

The current prompt is unusually disciplined:

- asks for a credential-free definition;
- teaches the safe JSX restrictions;
- includes a lean schema shape and maintained examples;
- recommends responsive and accessible states;
- covers loading, empty, error, and success;
- applies redaction and a 12,000-character budget;
- tells MCP agents to validate, preview, test every query, visually inspect, and create from the exact preview;
- recommends `templateLines` in tool calls to avoid multiline JSON escaping;
- reinforces secret handling and network constraints.

These rules should survive. The problems are context, channel design, and state coordination.

### AI problems and delivered corrections

#### 1. The in-product Assistant receives conflicting interaction contracts

The original reusable prompt ended with:

> Return exactly one complete JSON fenced block … Do not include prose or additional code blocks.

The workbench sent that same clipboard-oriented prompt to the Assistant while the Assistant system policy separately required a tool-driven lifecycle: validate, preview, execute every query, inspect, and create from the preview session.

This is corrected in the delivered slice: clipboard and Assistant builders are separate, and only the clipboard contract requests one fenced manifest. The Assistant contract ends with the validate/preview/query-test/create-or-update lifecycle.

#### 2. Invalid drafts disappear from “fix with AI” context

This is corrected in the delivered slice: both channels receive bounded credential-free raw draft fields and normalized diagnostics even while the manifest is invalid. User-authored intent is explicitly bounded from safety/tool/output rules; draft, diagnostic, and API-response sections are marked untrusted inert data and use fences longer than any embedded backtick run.

#### 3. The target definition and draft freshness are absent

The card does not identify a target definition ID, session ID, draft generation, or fingerprint. An agent cannot reliably know whether it is creating, updating, or proposing a change against the draft currently visible. These are short-lived session facts, not multi-user locks or saved versions.

#### 4. Useful preview evidence is not supplied

The general prompt builder can accept a raw response, but the inspected workbench card does not pass the preview response. It also omits selected data paths, query statuses, runtime diagnostics, scenario results, and whether the preview matches the current draft.

#### 5. The same rules are copied across several surfaces

Core prompts, skill documentation, Assistant policy, MCP tool descriptions, resource docs, examples, and user docs repeat the capability/lifecycle model. Manual copies will drift as schemas, limits, components, and tools evolve.

#### 6. Full escaped JSON is a fragile edit protocol

For clipboard use, asking a model to resend an entire manifest and JSON-escape a large JSX string is costly and error-prone. It loses a useful diff and makes a tiny change proportional to the whole widget.

### AI north-star architecture

Create one machine-readable **Authoring Capability Contract** generated from or validated against:

- manifest schema/version;
- runtime language version;
- component catalog version and digest;
- allowed bindings and functions;
- request/action/network policy;
- limits;
- diagnostics catalog;
- preview/save lifecycle;
- tool availability.

From that contract, generate channel adapters:

1. **In-product Assistant adapter** – structured session context and tools; no fenced-output instruction.
2. **MCP adapter** – schema/catalog search, draft edit, validate, preview, inspect, test, save, and Workshop tools.
3. **Clipboard adapter** – standalone prompt plus a versioned authoring response envelope.
4. **Documentation adapter** – human-readable reference tables and examples.
5. **Evaluation adapter** – deterministic tasks and expected lifecycle assertions.

This does not mean every prompt is identical. It means policy facts have one source while each channel has an interaction contract suited to it.

### In-product Assistant prompt skeleton

The internal system instruction should be short because live capability facts come from the contract and tools:

```text
You are editing one Homarr Custom Widget authoring session.

Start by inspecting the session. Treat sessionId, targetDefinitionId,
draftGeneration, currentFingerprint, diagnostics, and evidence as authoritative. Use catalog search and
response inspection instead of inventing components, props, bindings, or paths.

Propose the smallest credential-free change. Never include, request, repeat, or
store credential values. If the draft changed while you were working, inspect it
again and present a fresh diff; do not apply an old proposal blindly.

After a change, validate the current fingerprint. Preview that exact artifact,
test every required query, inspect real response shapes, and repair through another
small change. Simulate actions unless the user explicitly authorizes a live test.

Show the user the diff, assumptions, capability/security changes, and invalidated
evidence. Do not save or publish until the user approves. Save only from the evidence
for the exact current fingerprint. Never resend different content at save time.
```

The adapter should append only the current structured context and available tool descriptions. It should not append the clipboard instruction to return one fenced JSON block.

### Structured Assistant context

The in-product Assistant should receive a compact context object like:

```json
{
  "protocol": "homarr-custom-widget-session-v1",
  "sessionId": "cw-session-…",
  "mode": "edit",
  "targetDefinitionId": "…",
  "draftGeneration": 44,
  "currentFingerprint": "sha256:…",
  "runtimeTarget": {
    "schemaVersion": "homarr-custom-widget-v2",
    "runtimeVersion": "…",
    "catalogDigest": "sha256:…"
  },
  "request": "Make the failed services more prominent",
  "draft": {
    "rawFields": { "template": "…" },
    "parseState": "invalid"
  },
  "diagnostics": [
    {
      "code": "JSX_UNCLOSED_TAG",
      "path": ["template"],
      "range": { "from": 381, "to": 388 },
      "message": "…"
    }
  ],
  "selectedEvidence": {
    "queryId": "services",
    "paths": ["data.items[].status"],
    "shapeTruncated": true
  },
  "allowedNextActions": ["patchDraft", "validate", "preview"]
}
```

Important rules:

- Include invalid raw fields safely; do not require a valid complete candidate.
- Never include credential values.
- Include a truncation flag and the selected shape/path, not a deceptively incomplete body.
- Include the exact target and current draft fingerprint.
- Include only relevant component documentation, retrieved through catalog search.
- Include normalized diagnostic codes and ranges.

### Assistant editing protocol

Add a generalized optimistic draft-patch operation:

```ts
type DraftPatch = {
  sessionId: string;
  sourceGeneration: number;
  operations: readonly PatchOperation[];
  rationale?: string;
};
```

The result should return:

- updated draft generation and fingerprint;
- field/manifest diff;
- diagnostics;
- evidence invalidated by the edit;
- required next actions;
- a review-only result if the draft changed while the proposal was being generated.

The Assistant may propose and apply to the draft, but it should not silently save or publish. The UI shows a reviewable diff with **Apply**, **Apply selected**, and **Reject**. Applying or rejecting the complete proposal is one undoable workbench action. After application, both humans and agents use the same validation and preview session.

### Clipboard response protocol

For external chat tools without Homarr tools, keep one fenced JSON block but return a schema-tagged authoring envelope rather than pretending it is already an installed widget:

```json
{
  "protocol": "homarr-custom-widget-authoring-response-v1",
  "sourceFingerprint": "sha256:… or null",
  "widget": {
    "$schema": "homarr-custom-widget-v2",
    "name": "…",
    "sources": {},
    "requests": {},
    "options": {},
    "templateLines": ["<Stack>", "  …", "</Stack>"]
  },
  "assumptions": [],
  "unresolved": [],
  "evidenceUsed": ["sample response: services"],
  "suggestedScenarios": ["loading", "empty", "partial failure", "success"]
}
```

The importer should:

1. validate the protocol and limits;
2. normalize `templateLines`;
3. redact/check credential literals;
4. show a diff;
5. apply it as one undoable draft operation;
6. require local preview/testing before save or publish.

For small edits, allow a patch envelope with `sourceFingerprint`; if the current draft no longer matches, show the diff without auto-applying it. Fall back to a complete widget when no common source exists.

### Better LLM tools

Agents need a small, composable tool surface:

- `authoring.open` – open create/edit/import/Workshop mode and return session, current draft facts, and capabilities.
- `authoring.inspect` – return compact snapshot, diagnostics, evidence, and allowed next actions.
- `authoring.edit` – apply a typed draft change or return a reviewable diff if its source generation is stale.
- `authoring.searchCatalog` – rank components/props/examples; do not dump the whole catalog.
- `authoring.inspectResponse` – query a shape/path with explicit truncation and redaction.
- `authoring.validate` – compile the current fingerprint once.
- `authoring.preview` – create/reuse a preview for the current fingerprint.
- `authoring.testQuery` / `authoring.simulateAction` – attach evidence to that preview/fingerprint.
- `authoring.commitTested` – persist only exact current evidence.

These may map internally to fewer command/query entry points. Tool names optimize model discoverability; the domain module optimizes architectural depth.

### AI proposal review UI

Before applying an AI proposal, show:

- target definition and source fingerprint;
- changed sources, requests, options, and JSX;
- new or removed capabilities;
- network/security implications;
- diagnostics fixed and introduced;
- evidence invalidated;
- assumptions and unresolved fields;
- fixture/sample data used;
- estimated prompt truncation;
- apply-selected controls.

### AI evaluation suite

Measure end-to-end authoring, not whether the model emitted parseable JSON:

- valid schema and safe JSX;
- no invented components, props, bindings, request IDs, or data paths;
- no credential leakage;
- tool lifecycle order;
- exact tested fingerprint saved;
- recovery from invalid draft and an AI proposal generated for older draft text;
- every required query tested;
- responsive S/M/L rendering;
- loading, empty, error, partial, and success scenarios;
- light/dark/high-contrast behavior;
- keyboard and accessibility diagnostics;
- action simulation versus live-action discipline;
- prompt tokens, latency, tool count, retries, and repair count;
- visual regression and remount/network counters.

## Recommended deep architecture

The current feature is more than 20,000 lines across the custom-widgets package, API, and management UI. Its lifecycle rules are too important to remain coordinated by a React form and several parallel prompt/tool descriptions.

### Design-It-Twice comparison

Three independently explored interfaces optimized different callers. The single-owner assumption changes the recommendation.

| Design                         | Public shape                                        | Best property                                                                         | Main cost                                                                                             |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Minimal command session        | `snapshot`, `subscribe`, `dispatch(command)`        | Smallest surface; centralizes freshness and evidence rules.                           | A large command union obscures immediate versus asynchronous work.                                    |
| Single-owner authoring session | `state`, `edit(command)`, `run(intent)`             | Immediate typing, bounded undo/redo, and one lifecycle for UI/Assistant/MCP/Workshop. | Workshop browse/search remains a thin external adapter, which is acceptable.                          |
| Durable command platform       | `run(command)`, `read(query)` plus artifact history | Strong for collaborative workflows, batch migration, and historical audit.            | Adds revision repositories, CAS, conflict semantics, and persistence that this product does not need. |

### Recommendation: one single-owner authoring session

Use one deep module. The workbench, Assistant, MCP, file import, and Workshop install/update adapt to the same session. Workshop browsing can remain outside it; once content is selected, it opens an authoring session like any other import.

```ts
interface CustomWidgetAuthoring {
  open(input: OpenAuthoringInput): AuthoringSession;
}

interface AuthoringSession {
  readonly state: {
    getSnapshot(): AuthoringSnapshot;
    subscribe(listener: () => void): () => void;
  };

  // Synchronous, credential-free, no network. Invalid intermediate text is allowed.
  edit(command: DraftChange | { kind: "undo" } | { kind: "redo" } | { kind: "reset-to-saved" }): EditReceipt;

  // Validate, preview, test, save, import/replace, or interact with Workshop.
  run<C extends AuthoringCommand>(command: C, options?: { signal?: AbortSignal }): Promise<Result<CommandResult<C>>>;
}
```

The module has one setup operation, `open`. The session has two behavioral entry points, `edit` and `run`; `state` is compatible with `useSyncExternalStore`. Undo and redo remain part of the edit model instead of widening the interface.

### Session snapshot

```ts
type AuthoringSnapshot = {
  sessionId: string;
  mode: "create" | "edit" | "import" | "workshop" | "migration";
  targetDefinitionId?: string;
  draftGeneration: number; // Ephemeral; never persisted as history.
  currentFingerprint: string;
  savedFingerprint?: string;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  phase: "draft" | "checking" | "invalid" | "previewing" | "tested" | "saving" | "saved" | "blocked";
  draft: CredentialFreeRawDraft;
  compile: {
    generation: number;
    status: "pending" | "ready" | "invalid";
    artifactId?: string;
    fingerprint?: string;
    diagnostics: readonly Diagnostic[];
  };
  preview: {
    status: "idle" | "pending" | "ready" | "failed" | "cancelled" | "expired";
    generation?: number;
    fingerprint?: string;
    previewId?: string;
  };
  evidence: EvidenceLedger;
  secrets: Readonly<Record<string, "missing" | "configured" | "optional" | "invalid">>;
  workshop?: WorkshopLinkStatus;
  nextActions: readonly NextAction[];
};
```

Plaintext secrets are accepted only through a narrowly scoped command input and must never appear in the snapshot, undo stack, crash-recovery draft, compiler artifact, evidence, prompt, log, trace, export, or tool result.

### Core invariants

1. Every edit, undo, or redo increments the ephemeral draft generation and invalidates prior evidence.
2. Editing is synchronous and has no network/database side effects.
3. Raw JSON and JSX may be invalid between keystrokes.
4. Each compile result is tagged with its generation; stale results are discarded.
5. A candidate is normalized deterministically and receives a credential-free fingerprint.
6. A compiled artifact is reused by diagnostics, preview, Assistant, and MCP.
7. Preview and tests are keyed by the exact candidate fingerprint.
8. Async operations are cancellable; late completions cannot become current.
9. Query evidence is per request and records redacted status/duration/shape identity.
10. Simulated actions are default; live actions need an explicit confirmed command.
11. Save verifies that preview evidence matches the current fingerprint, then updates the one current definition.
12. The local definition remains last-write-wins; there is no authoring lock, CAS head, merge, or durable revision ledger. Retain localized stale-operation guards already used by template patches, preview-session updates, and Workshop transport, but do not expose them as collaboration or version-history concepts.
13. Undo/redo is bounded, in-memory, credential-free, and coalesces understandable edit transactions.
14. Workshop remote revision checks remain hidden transport protection. A stale remote update is refetched and retried only after the owner confirms.

### Hidden internal modules

```text
CustomWidgetAuthoring
├── DraftStore                  raw invalid text + structural sharing
├── UndoManager                 bounded/coalesced local edit transactions
├── GenerationTracker           stale async protection + fingerprints
├── Compiler                    parse, normalize, validate, analyze once
├── CapabilityPolicy            language, component, request, network rules
├── PreviewCoordinator          session lifecycle, cancellation, freshness
├── RequestPlanner              bounded DAG, dedupe, priority, partial success
├── EvidenceLedger              exact tests and scenarios
├── SecretAuthority             values in, status out
├── SaveCoordinator             exact-tested update of one current definition
├── WorkshopBridge              install/update/publish link and security review
└── PromptAdapters              Assistant, MCP, clipboard, docs, evaluations
```

### Dependency adapters

| Category            | Production                                                                 | In-memory/test                                     |
| ------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| In-process          | Zod schema, Acorn/parser/analyzer, catalog, interpreter                    | Same pure compiler where possible                  |
| Local substitutable | current-definition repository, browser recovery store, Redis preview store | Maps and a bounded undo stack                      |
| Remote owned        | Homarr API/runtime and Workshop adapters                                   | Fake runtime and Workshop repository               |
| True external       | bounded HTTP executor and credential broker                                | fixture responses and redacting credential adapter |
| Observability       | logger, metrics, tracing                                                   | collected events/assertions                        |
| Determinism         | clock, IDs, digest service                                                 | fixed clock/IDs and digest assertions              |

This boundary lets unit-level session tests validate the hard lifecycle without mounting React, Mantine, Redis, or a database, while adapter tests verify production integration.

## Single-owner persistence and Workshop continuity

Keep the current one-row-per-definition persistence model. Do not add a definition revision table, head pointer, collaboration lock, or durable evidence history.

Persist only what has direct product value:

```ts
type CustomWidgetWorkshopLink = {
  installedFrom?: {
    submissionId: string;
    workshopRevision: number;
    workshopFingerprint: string;
    localFingerprintAtInstall: string;
  };
  publishedAs?: {
    submissionId: string;
    workshopRevision: number;
    localFingerprintAtPublish: string;
    publishedFingerprint: string;
  };
  lastCheckedAt?: string;
};
```

The definition still stores one current credential-free manifest and encrypted secrets. The browser may keep one crash-recovery draft and a bounded undo stack. The existing `$schema` remains the compatibility identifier. If a future runtime/catalog change is actually breaking, add a focused compatibility warning or migration for that change rather than prebuilding a generalized local version platform.

Adding these optional Workshop link fields requires equivalent schema and migration changes for PostgreSQL, MySQL, and SQLite.

### Current Workshop integration

The current integration already provides substantial value:

- management UI browsing, listing metadata, screenshots, community links, votes, reports, and outdated warnings;
- read-only source inspection and exact Custom Widget schema validation;
- source/network/authentication review and local source overrides before installation;
- optional credential entry with encrypted local persistence;
- a shared `useCustomWidgetImport` pipeline for file/clipboard import, Workshop UI install, and legacy migration setup;
- admin/MCP `workshopSearch`, `workshopGet`, and `workshopInstall` tools;
- local credential-free export and raw Workshop submission export;
- create-only publishing with title, description, screenshots, private-source review, and a last-second definition-change check;
- installed widgets continuing to work if Workshop is unavailable.

The important gaps are continuity gaps:

- the Workshop UI installs through generic `customWidget.import`, while MCP has a separate `workshopInstall` path;
- neither path stores submission ID, Workshop revision, or the imported fingerprint on the local definition;
- the publish page always creates a new submission and does not store the returned submission ID on the widget;
- the generic Workshop client supports update, but Custom Widgets do not expose **Publish update**;
- there is no simple “Workshop update available” state for an installed widget.

### Minimal Workshop-aware lifecycle

#### Install

1. Browse or search Workshop.
2. Inspect screenshots, author/community state, complete source, reports/outdated warning, requests, actions, permissions, network scopes, and authentication requirements.
3. Configure local source URLs and optional credentials.
4. Validate and, when configuration permits, preview/test against this Homarr installation.
5. Install one current local definition and record `installedFrom`.
6. Show **Needs setup** if required local configuration remains missing; do not pretend installation proved live data works.

UI and MCP should call the same Workshop install module. That module must unify submission refetch/validation, source overrides, network-scope review, secret requirements, encrypted credential persistence, missing-credential results, and `installedFrom` persistence—not merely attach metadata after two different install implementations. Generic file/clipboard import can reuse its core security/setup implementation without receiving a Workshop link.

#### Update an installed Workshop widget

Check for updates when the installed list/detail is opened or the user explicitly refreshes—not through constant background polling.

If the Workshop revision is newer:

1. fetch and validate it again;
2. show a security/capability diff first, then the manifest/visual diff;
3. preserve local source URLs and encrypted credentials only where source IDs and authentication shapes remain compatible;
4. explicitly invalidate/delete incompatible encrypted secret bindings and require re-entry for changed/new authentication or sources;
5. offer **Replace local widget**, **Install as copy**, or **Keep mine**;
6. open the replacement as one undoable draft operation and require preview/test before save.

There is no three-way merge. If the current local fingerprint differs from `localFingerprintAtInstall`, say **This widget has local edits; replacing it will discard them** and offer **Export** or **Duplicate** before replacement. `workshopFingerprint` separately identifies the credential-free community content before local source overrides.

#### Publish

For first publication:

1. require the current local definition to be saved, valid, and tested;
2. review public title, description, screenshots, actions/permissions, and source URLs;
3. build and review a public-safe publication copy in which private/loopback source URLs are deliberately replaced with placeholders; acknowledgment alone is not enough, and the working local definition does not need to lose its functional URL;
4. publish that exact reviewed content;
5. store `publishedAs` from the returned Workshop submission.

For later publication:

- show **Publish update** when the local fingerprint differs from `localFingerprintAtPublish`;
- fetch the linked Workshop submission, verify the signed-in Workshop account owns it, and show the outgoing diff;
- let the owner update title, description, changelog, content, and screenshot additions/removals supported by the Workshop client;
- call the existing Workshop update capability with the reviewed metadata and content;
- keep Workshop’s `expectedRevision` as a remote transport detail;
- if the remote revision changed, refetch and ask the single owner to review and retry or cancel—no merge UI or local lock;
- update `localFingerprintAtPublish`, `publishedFingerprint`, and remote revision after success.

If a linked submission becomes outdated, heavily reported, or deleted, show that state on the local widget. The local widget continues working. The owner can unlink it, publish again, or keep it local.

#### Assistant and MCP

Expose the same lifecycle to agents:

- search/get returns Workshop metadata and validated security facts;
- install records the Workshop link and returns missing local setup;
- an agent may propose a Workshop replacement or publication diff;
- source configuration and preview/testing use the normal authoring session;
- publishing or replacing locally edited content still requires explicit user approval;
- secrets never return through Workshop tools.

#### Edge behavior

- If the same Workshop submission is already installed, offer **Open installed widget** or **Install another copy** rather than silently duplicating it.
- A duplicated local widget drops `installedFrom` and `publishedAs` by default. It is a new local widget, not another controller for the same Workshop submission.
- Portable JSON export remains the credential-free widget manifest and excludes server-local Workshop link metadata. Re-importing that file is a generic import.
- Publishing a community-installed widget owned by someone else creates a new Workshop submission/fork; it never updates the original author’s submission.
- Deleting or disabling a local widget does not delete/unpublish Workshop content. Remote deletion is a separate explicit account-authorized action.
- Unlinking removes only local continuity metadata and never breaks the installed widget.
- Workshop checks stay out of dashboard rendering and request execution. Run them on management screens or explicit refresh so Workshop outages cannot affect installed dashboards.
- Reports, outdated state, or remote deletion produce management warnings; they never remotely disable a local widget.

## Feature capability roadmap

### Now: foundations with immediate user value

| Capability                             | Why it matters                                              | Safety/shape                                     |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Workbench-wide Undo/Redo               | Makes experimentation cheap without durable version history | Bounded, credential-free, coalesced              |
| Workshop link and update flow          | Connects install/publish actions over time                  | Submission ID, remote revision, fingerprint only |
| Named preview scenarios and fixtures   | Reproducible loading/empty/error/success and edge cases     | Credential-free, bounded, schema-tagged          |
| Data tree and path insertion           | Removes guesswork for humans and LLMs                       | Redacted, explicit truncation                    |
| One crash-recovery draft               | Prevents accidental loss                                    | Local, replaceable, no secret values             |
| Structured diagnostics and quick fixes | Makes errors actionable and machine-usable                  | Stable codes/ranges                              |
| AI diff/edit review                    | Safer and cheaper edits; one Undo reverts application       | Current fingerprint and explicit apply           |
| Bounded request planner                | Aligns runtime with limits                                  | Queue, dedupe, cancellation                      |

### Next: expressive declarative data work

Add a small, typed transform language shared by preview, runtime, and LLM tooling:

- `select` / map fields;
- `filter` with bounded predicates;
- `sort`;
- `group`;
- `aggregate` such as count, sum, min, max, average;
- `limit` / slice;
- `join` by explicit bounded keys;
- defaults/coalesce;
- date/number formatting through locale-aware functions.

This solves common dashboard tasks without reintroducing general JavaScript or asking authors to build large expressions in JSX. Transform steps should have input/output shape inspection, cost budgets, and diagnostics.

Also add:

- request dependency DAG and request-to-request bindings;
- conditional queries;
- cursor/page pagination primitives;
- explicit cache/freshness policy within server limits;
- query-only retry/backoff policy;
- critical versus optional requests and partial-success rendering;
- typed contract snapshots for API response shapes;
- OpenAPI-assisted request setup with review;
- trusted reusable recipes/snippets.

### Later: stateful and real-time widgets, under explicit policy

#### Scoped state

Provide declarative persisted instance state instead of `localStorage`:

- scopes: session, device, user, or board;
- schema, default, size budget, retention, and reset behavior;
- permission and privacy labels;
- migration when the state schema changes;
- no secret storage.

#### Localization

- message dictionaries with fallback;
- current locale/timezone bindings;
- locale-aware date/number/duration formatting;
- scenario switching for long translations and right-to-left layouts.

#### Safe subscriptions

SSE/WebSocket support should be a server-owned audited capability with:

- allowlisted source and protocol policy;
- connection and message budgets;
- reconnect/backoff policy;
- visibility pause;
- redaction;
- deterministic fixture replay;
- no direct arbitrary browser socket.

#### Composition

- trusted local subcomponents or recipes with version pins;
- reusable typed transforms;
- widget packs/templates;
- shared design tokens.

Do not allow arbitrary npm packages or imports. If community capabilities grow substantially, consider an isolated render root or iframe/worker boundary in addition to the interpreter. The current same-DOM interpreter is constrained, but broader future capabilities increase the value of a harder isolation boundary.

### Explicit non-goals

- Arbitrary JavaScript or TypeScript execution.
- Arbitrary npm dependencies.
- Direct browser network access.
- Raw DOM/event APIs.
- Unbounded loops, recursion, response bodies, transforms, subscriptions, or storage.
- Secrets in manifests, fixtures, prompts, exports, undo/recovery state, traces, or Workshop submissions.
- Silent retries of actions.
- Silent compatibility migration.
- AI auto-publish without review and exact current evidence.

## Safe observability

Add durable, privacy-preserving signals:

- trace ID for preview/run/action lifecycle;
- definition ID and current fingerprint prefix;
- runtime/catalog version;
- request ID, status class, duration, queue time, response-size bucket, cache result;
- render/compile duration and diagnostic counts;
- stale/cancelled operations;
- action simulated/live marker;
- compatibility warning;
- Workshop link/update state.

Never record:

- credential values;
- authorization headers;
- complete private URLs where path/query may be sensitive;
- raw response bodies by default;
- raw templates in telemetry;
- user input values that may contain sensitive data.

Expose an author-facing health view using sanitized aggregates: success rate, last successful refresh, latency, rate-limit/backoff state, and trace ID for administrator diagnosis.

## Prioritized findings and backlog

### P0 — do before adding broad new capabilities

| ID      | Change                                  | Acceptance criterion                                                                                                                          |
| ------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-01 | Stable preview/renderer session         | A template character causes zero preview shell remounts and preserves compatible inputs.                                                      |
| PERF-02 | Field-scoped authoring state            | Unrelated workbench sections do not render during template typing.                                                                            |
| PERF-03 | Single compile artifact                 | One parse/analyze pass per settled draft generation; all consumers reuse it.                                                                  |
| PERF-04 | Incremental CodeMirror configuration    | Ordinary input causes no full editor reconfiguration.                                                                                         |
| PERF-05 | Transactional raw manifest mode         | Closed editor does no serialization; external edits cannot overwrite a raw draft silently.                                                    |
| PERF-06 | Generation-aware async actions          | Stale preview/query results are never applied; superseded work is cancelled.                                                                  |
| PERF-07 | Bounded HTTP request scheduler          | A valid high-request widget queues within policy instead of immediately tripping request-concurrency rejects.                                 |
| ARCH-01 | Single-owner authoring session          | UI, Assistant, MCP, import, and Workshop share draft, diagnostic, preview, and evidence invariants without locks or version history.          |
| UX-01   | Lightweight draft recovery              | Reload/crash restores the one labeled local draft or lets the user discard it.                                                                |
| UX-UNDO | Unified Undo/Redo                       | `Ctrl+Z` and `Ctrl+Shift+Z` work predictably across editors and semantic builder changes; AI/import changes are atomic undo steps.            |
| AI-01   | Split Assistant and clipboard contracts | Assistant tool policy has no fenced-output conflict.                                                                                          |
| AI-02   | Invalid draft context                   | “Fix with AI” receives raw invalid fields and diagnostics without secrets.                                                                    |
| AI-03   | Target/fingerprint-safe editing         | Every AI proposal names the session, target, and source fingerprint; an older proposal becomes review-only rather than overwriting the draft. |
| SAVE-01 | Evidence-bound workbench persistence    | Ordinary create/update cannot publish a definition that differs from or bypasses current tested evidence.                                     |

### P1 — make the workbench excellent

| ID          | Change                        | Acceptance criterion                                                                                                                   |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| UX-02       | Define/Test/Publish workspace | Current task, draft status, preview freshness, and next action are always visible.                                                     |
| UX-03       | Data tree/path insertion      | A user can inspect, copy, and insert a real response path without editing raw JSON.                                                    |
| UX-04       | Unified clickable diagnostics | Every actionable issue navigates to and focuses its source.                                                                            |
| UX-05       | Named scenario matrix         | S/M/L, theme, status, options, inputs, and fixtures can be saved and replayed.                                                         |
| UX-06       | Accessible mobile workspace   | No clipped navigator or action-bar overlap; all core tasks are keyboard/screen-reader reachable.                                       |
| WORKSHOP-01 | Persist Workshop links        | UI and MCP install store source submission/revision/fingerprint; publish stores destination submission/revision/fingerprint.           |
| WORKSHOP-02 | Install and publish updates   | Security diff, local override preservation, replace/copy/keep choices, and create-versus-update publishing work without a merge model. |
| OBS-01      | Safe trace/health view        | Authors can diagnose request health without exposing URLs, bodies, or secrets.                                                         |
| AI-04       | Proposal diff/review          | Users can apply or reject individual AI changes and see evidence invalidation.                                                         |
| AI-05       | Canonical capability contract | Tool descriptions, prompts, docs, and evaluations detect policy/schema drift.                                                          |

### P2 — expand the safe platform

| ID          | Change                       | Acceptance criterion                                                                         |
| ----------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| DATA-01     | Declarative transforms       | Common select/filter/sort/group/aggregate workflows need no arbitrary JS.                    |
| DATA-02     | Request DAG                  | Dependencies, conditional execution, priority, and partial success are explicit and bounded. |
| DATA-03     | Pagination                   | Cursor/page flows work in preview and runtime with deterministic limits.                     |
| STATE-01    | Declarative scoped state     | Persisted state has schema, scope, quota, reset, privacy, and migration.                     |
| I18N-01     | Locale/timezone support      | Scenarios and runtime share locale-aware formatting and messages.                            |
| IMPORT-01   | Reviewed OpenAPI assistance  | Route/schema suggestions are inspectable and never silently create live actions.             |
| REALTIME-01 | Audited server subscriptions | Realtime data obeys source policy, budgets, pause, replay, and redaction.                    |

## Suggested delivery sequence

### Quick-win slice claimed in this worktree

This first slice deliberately claims only the improvements that can land without introducing the full authoring-session architecture:

- **PERF-01:** the template key is removed and the renderer reconciles bindings explicitly. Compatible name/type bindings preserve their value and DOM identity; removed bindings are pruned; incompatible types reset; simultaneous incompatible declarations still report a conflict.
- **PERF-04:** CodeMirror now reconfigures independent compartments only when their inputs change. Fresh React callback identities no longer rebuild the extension graph, and controlled value synchronization does not pollute editor undo history.
- **Partial PERF-02/PERF-03:** expensive candidate construction, JSON analysis, JSX analysis, diagnostics, and completion derivation use a deferred draft. The preview subtree is memoized and stable across the urgent typing pass. The root Mantine form still renders, so field-scoped subscriptions and one shared compile artifact remain future work.
- Heavy advanced CodeMirror editors mount only after their panel is first opened. They stay mounted after that first use, preserving invalid text, selection, focus semantics, and editor-local history through collapse/reopen.
- **Partial PERF-06:** preview operations carry an ephemeral generation plus candidate, option, and secret fingerprints. Editing any preview input invalidates the operation, clears stale evidence/session state, and prevents late results or notifications from applying.
- Automatic preview queries execute with bounded concurrency of four instead of accumulating request latency serially or exceeding the enforced preview limit.
- Preview analysis, display-data construction, summary calculation, and reset-key serialization are memoized across journal polling rerenders.
- Request manifests and option names are parsed once per relevant render, and request/option cards use semantic IDs so reorder operations cannot transfer editor state to another item.
- Existing CodeMirror `Ctrl+Z` / `Ctrl+Shift+Z` behavior is preserved and exposed through `aria-keyshortcuts`; this is editor-local undo, not yet the unified workbench history promised by UX-UNDO.
- Clipboard and in-product Assistant prompts are separate protocols. Both receive a credential-free raw draft and normalized diagnostics even when the draft is invalid; the Assistant protocol directs tool-based validate/preview/test/save instead of requesting a fenced manifest response.
- Clipboard, Assistant, and MCP prompt context now distinguishes product intent from untrusted documentation/draft/diagnostic/API data, repeats that boundary in the Assistant/footer protocol, and chooses Markdown fences that supplied content cannot close.
- Workshop browse links now receive the server-resolved public Workshop URL, including per-item handoffs, eliminating the configured-origin hydration mismatch.
- Scoped workbench text contrast, preview-size accessible names, labelled lazy accordion regions, unique ARIA IDs, accessible CodeMirror line numbers, and an explicit CodeMirror textbox tab stop bring the expanded live `main` WCAG A/AA audit to zero violations; one indeterminate group remains for fold/short-glyph and syntax-highlight geometry.
- Saved-definition SubFetch data is keyed by a server-derived identity covering request/source/secret/configuration inputs, while template-only edits preserve compatible local renderer/query state.

This slice does **not** claim field-scoped form subscriptions, a single compile artifact, workbench-wide undo, crash recovery, transport cancellation, transactional raw-manifest apply/discard, authoritative Assistant session/evidence context, Workshop provenance/linkage, or evidence-bound ordinary save/update persistence.

The next highest-value slices should remain small and single-owner:

1. **Field-scoped compile path:** isolate each panel from unrelated form fields and produce one debounced generation-tagged compile artifact consumed by diagnostics, completions, preview, AI context, and Save.
2. **Unified undo/redo:** add one bounded in-memory command history for semantic builder changes, raw-manifest Apply, AI proposals, imports, and option/request reorder operations. Route `Ctrl+Z` and `Ctrl+Shift+Z` to the focused CodeMirror when focus is inside an editor and to workbench history everywhere else. Do not add locks, branches, persisted versions, or a history service.
3. **Transactional raw mode and cancellation:** replace automatic raw-manifest application with Apply/Discard plus a structured diff, and add abort signals to superseded remote preview/query work while retaining stale-result rejection.
4. **Workshop continuity:** persist only optional `installedFrom` and `publishedAs` link metadata on the current definition; unify UI and MCP installation behind one procedure; expose update availability and a reviewed replace/copy/keep/publish-update flow. Workshop revisions are external provenance, not local version history.

### Phase 0: measure and stop the reload

1. Add development counters and one focused interaction benchmark.
2. Stabilize renderer identity and define input reconciliation.
3. Replace root-wide subscriptions with field/selector subscriptions around the JSX and preview path.
4. Make CodeMirror reconfiguration granular.
5. Make raw manifest lazy and transactional.
6. Add draft-generation tokens and cancellation to preview actions.

Ship this as narrow PRs with before/after profiles. Do not wait for the full architecture rewrite to fix the known pain.

### Phase 1: create the authoring session seam

1. Define raw draft, ephemeral generation, fingerprint, undo command, compile artifact, diagnostic, preview, evidence, and typed error contracts.
2. Move parse/normalize/analyze into one compiler.
3. Implement session state with structural sharing, a bounded undo manager, and latest-generation-wins compilation.
4. Put preview/test/save orchestration behind session commands.
5. Adapt the current form to selectors over the session.
6. Adapt Assistant and MCP handlers without changing their external names initially.
7. Remove duplicate/unused workbench orchestration after parity.

### Phase 2: finish recovery and Workshop continuity

1. Add one browser crash-recovery draft plus restore/discard and reset-to-saved actions.
2. Make `Ctrl+Z` / `Ctrl+Shift+Z` and visible Undo/Redo coherent across CodeMirror and visual builders.
3. Unify UI and MCP Workshop installation behind the same install module.
4. Persist `installedFrom` and `publishedAs` Workshop links on the current definition across PostgreSQL, MySQL, and SQLite migrations.
5. Add Workshop update detection, security diff, replace/copy/keep, and **Publish update**.

### Phase 3: redesign the workspace and AI experience

1. Introduce Define/Test/Publish layout and mobile task tabs.
2. Reuse/finish the response-tree and preview-inspector components.
3. Add normalized clickable diagnostics and scenario matrix.
4. Generate channel adapters from the capability contract.
5. Add AI edit/diff review and exact target/fingerprint context.
6. Expand evaluation gates.

### Phase 4: add capabilities safely

1. Bounded request planner and dependency graph.
2. Declarative transforms and pagination.
3. Scoped state and localization.
4. Audited real-time capability only after the preceding policies and evidence model are proven.

## Verification strategy

### Focused performance tests

- Type 100 characters into a 10 KB and 50 KB JSX template.
- Assert editor focus/selection/undo history stays intact.
- Assert preview shell mount count remains one.
- Assert compatible input state survives.
- Assert unrelated section render counters remain zero.
- Assert one settled compile per draft-generation window.
- Assert no remote call occurs from typing.
- Assert an older delayed compile/preview cannot replace a newer result.
- Assert closed raw-manifest mode performs no full serialization.
- Assert component search stays within budget.

### Lifecycle contract tests

- Invalid intermediate raw text remains editable.
- An edit, undo, or redo increments the ephemeral generation and invalidates evidence.
- `Ctrl+Z` restores the previous credential-free draft and `Ctrl+Shift+Z` reapplies it.
- Text edits coalesce; AI apply, raw-manifest apply, rename, and Workshop replacement are atomic undo entries.
- Secret input never enters undo or crash-recovery state.
- Preview rejects an invalid or stale fingerprint.
- Superseded preview is cancelled and late completion is ignored.
- Query evidence is tied to the preview and exact fingerprint.
- Missing required query evidence blocks save.
- Changed draft blocks save from old evidence.
- Exact tested evidence updates the one current definition.
- UI and MCP Workshop install persist the same source link metadata.
- Workshop replacement preserves compatible local source overrides/secrets and requires setup for incompatible ones.
- A stale Workshop remote update is refetched and presented for retry without local locking or merge UI.
- Secret values never appear in snapshots, errors, logs, exports, undo/recovery state, or tool results.

### UI and accessibility checks

- Desktop at narrow and wide workbench widths.
- Mobile portrait and landscape.
- S/M/L widget canvas, light/dark/high contrast.
- Loading/empty/error/partial/success/custom scenario.
- Keyboard-only creation, test, diagnostic navigation, AI diff review, and publish.
- Screen-reader labels and state announcements.
- 200% and 400% zoom.
- Reduced motion.
- Long names, translations, nested response data, and maximum-size templates.

### AI evaluations

- Create from documentation plus sample response.
- Repair invalid JSON and invalid JSX without losing raw draft context.
- Edit an existing target from its exact current fingerprint.
- Turn a proposal generated for older draft text into a reviewable diff instead of applying it blindly.
- Search, inspect, install, configure, test, and place a Workshop widget through the shared lifecycle.
- Propose a Workshop update or publication diff and wait for explicit approval.
- Search component catalog instead of inventing components.
- Inspect selected response paths and recognize truncation.
- Test every query and save the exact current fingerprint.
- Never reveal or reproduce credentials.
- Distinguish simulated and live actions.
- Produce scenario coverage and accessible responsive UI.

## Next ten concrete changes I would make

The stable renderer, incremental CodeMirror configuration, stale-result guards, channel-specific AI prompts, and Workshop URL handoff are delivered in this slice. The next sequence is:

1. Replace the root all-values subscription with field-scoped authoring-session selectors.
2. Produce one generation-tagged compile artifact and preserve a clearly labeled last-good preview while the current draft is invalid or compiling.
3. Add a repeatable production-mode benchmark for mount count, urgent/deferred commit duration, parser work, allocation, and network activity at 10 KB, 25 KB, and 50 KB.
4. Make raw-manifest editing an explicit, undoable Apply/Discard transaction based on the draft snapshot taken when it opened.
5. Add abort signals and explicit cancelled/expired states to preview/query flows; retain operation IDs and stale-result rejection as the correctness backstop.
6. Add bounded workbench-wide semantic undo/redo while retaining CodeMirror-local history inside focused editors.
7. Give the Assistant authoritative target/session/fingerprint/evidence context and an inspectable patch/diff protocol.
8. Route ordinary create/update through exact tested evidence, with an intentional override only when product policy permits it.
9. Unify Workshop UI/MCP install, store minimal Workshop links, and add replace/copy/keep and **Publish update** flows.
10. Add safe traces, request health, scenarios, declarative transforms, request dependencies, and pagination in that order.

## Evidence map for implementation planning

This is the shortest useful map from the report back to the current code. Line numbers will drift; the responsibilities are the important part.

| Concern                                 | Current source                                                                                                                                                                                                                                                                      | Why it matters                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root form and derivations               | [`_custom-widget-form.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form.tsx)                                                                                                                                                                             | Expensive analysis is deferred and preview props are stable, but the root form subscription remains the next performance seam.                                                             |
| Candidate building and preview loading  | [`_custom-widget-form-utils.ts`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form-utils.ts)                                                                                                                                                                   | Schema assembly remains broad; preview-query loading now uses bounded concurrency of four.                                                                                                 |
| Async preview/save orchestration        | [`_use-custom-widget-form-actions.ts`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_use-custom-widget-form-actions.ts)                                                                                                                                                       | Preview now rejects stale generations and clears stale evidence, but cancellation and evidence-bound ordinary save/update remain; this is the natural first adapter into session commands. |
| Preview UI and journal polling          | [`_custom-widget-preview-panel.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-preview-panel.tsx)                                                                                                                                                           | Preview state, tabs, static canvas sizing, two-second journal polling, and raw data presentation.                                                                                          |
| Workbench responsive layout             | [`_custom-widget-form.module.css`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form.module.css)                                                                                                                                                               | Sticky navigation, mobile pane switching, two-column desktop layout, and bottom action behavior.                                                                                           |
| Raw manifest mirror                     | [`_custom-widget-advanced-manifest.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-advanced-manifest.tsx)                                                                                                                                                   | Serialization/editor mounting is lazy-once and history survives collapse; automatic apply still needs a transactional Apply/Discard redesign.                                              |
| CodeMirror bridge                       | [`direct-code-mirror.tsx`](packages/custom-widgets/src/workbench/direct-code-mirror.tsx) and [`_code-editor.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_code-editor.tsx)                                                                                              | Compartment-based reconfiguration is now incremental; the next seam is unified workbench history and narrower upstream editor subscriptions.                                               |
| Workbench package seam                  | [`ports.ts`](packages/custom-widgets/src/workbench/ports.ts)                                                                                                                                                                                                                        | Declared workbench port is not currently the lifecycle boundary used by callers.                                                                                                           |
| Existing richer data inspector          | [`preview-response-panel.tsx`](packages/custom-widgets/src/workbench/preview-response-panel.tsx) and [`response-tree.tsx`](packages/custom-widgets/src/workbench/response-tree.tsx)                                                                                                 | Reuse opportunity instead of maintaining raw JSON as the primary data UX.                                                                                                                  |
| Renderer session and synchronous render | [`custom-jsx-renderer.tsx`](packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx)                                                                                                                                                                                            | Stable session/binding reconciliation is delivered; interpretation and binding hashing still belong in a shared compile artifact.                                                          |
| Existing editor undo/redo               | [`code-editor.tsx`](packages/custom-widgets/src/workbench/code-editor.tsx) and [`direct-code-mirror.tsx`](packages/custom-widgets/src/workbench/direct-code-mirror.tsx)                                                                                                             | CodeMirror history, depth counters, toolbar commands, and `basicSetup` already exist; the missing layer is coherent workbench-wide undo.                                                   |
| Interpreter parse/render entry          | [`interpreter.tsx`](packages/custom-widgets/src/jsx/interpreter.tsx) and [`interpreter-parser.ts`](packages/custom-widgets/src/jsx/interpreter-parser.ts)                                                                                                                           | Candidate for a shared generation-tagged compile artifact.                                                                                                                                 |
| Runtime display bindings                | [`custom-jsx-display.tsx`](packages/widgets/src/custom-api/custom-jsx-display.tsx)                                                                                                                                                                                                  | Published/query-cache state is now definition-scoped while template-only edits preserve compatible state; shared compile/binding artifacts remain future work.                             |
| Prompt and channel contract             | [`ai-prompt.ts`](packages/custom-widgets/src/core/ai-prompt.ts), [`_copy-ai-prompt-button.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/_copy-ai-prompt-button.tsx), and [`assistant-tool-policy.ts`](apps/nextjs/src/app/api/assistant/chat/assistant-tool-policy.ts)   | Clipboard, Assistant, and MCP contracts are now separate and trust-bounded; authoritative session/fingerprint/evidence context remains the next seam.                                      |
| Assistant dynamic context               | [`custom-widget-authoring-context.ts`](apps/nextjs/src/app/api/assistant/chat/custom-widget-authoring-context.ts)                                                                                                                                                                   | Adapter point for session/fingerprint/diagnostic/evidence context.                                                                                                                         |
| Exact-tested creation                   | [`creation-procedures.ts`](packages/api/src/router/custom-widget/creation-procedures.ts), especially 53–109                                                                                                                                                                         | Existing invariant to preserve and generalize into evidence-bound workbench save/update.                                                                                                   |
| Preview session authority               | [`preview-sessions.ts`](packages/custom-widgets/src/server/preview-sessions.ts)                                                                                                                                                                                                     | Existing short-lived preview state; its internal update protection should not become a local authoring/version model.                                                                      |
| Request schema and concurrency policy   | [`request-schema.ts`](packages/custom-widgets/src/core/request-schema.ts), [`request-limits.ts`](packages/custom-widgets/src/server/request-limits.ts), and [`custom-api.ts`](packages/api/src/router/widgets/custom-api.ts)                                                        | Up to 64 declared requests meet a four-per-user/item, eight-per-definition limiter and an unbounded production fan-out attempt that can produce rejections.                                |
| Network executor and policy             | [`request-executor.ts`](packages/custom-widgets/src/server/request-executor.ts) and [`network-policy.ts`](packages/custom-widgets/src/server/network-policy.ts)                                                                                                                     | Security boundary to retain behind a bounded request planner.                                                                                                                              |
| Stored definition reconstruction        | [`stored-definition.ts`](packages/api/src/router/custom-widget/stored-definition.ts)                                                                                                                                                                                                | Shows the current-v2 reconstruction path and where compatibility metadata must enter.                                                                                                      |
| Workshop UI install                     | [`_workshop-detail.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/[id]/_workshop-detail.tsx) and [`use-custom-widget-import.ts`](apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts)                                                          | UI validates/reviews Workshop content but imports it generically, losing its Workshop link.                                                                                                |
| Workshop MCP install                    | [`workshop-procedures.ts`](packages/api/src/router/custom-widget/workshop-procedures.ts)                                                                                                                                                                                            | Separate install path also inserts a definition without persisting submission metadata.                                                                                                    |
| Workshop publish/update                 | [`_workshop-publish-form.tsx`](apps/nextjs/src/app/[locale]/manage/custom-widgets/publish/[id]/_workshop-publish-form.tsx) and [`backend.ts`](packages/workshop/src/backend.ts)                                                                                                     | Custom Widget publishing is create-only even though the generic Workshop client exposes an update operation.                                                                               |
| Current definition persistence          | [`postgresql.ts`](packages/db/schema/postgresql.ts), [`mysql.ts`](packages/db/schema/mysql.ts), and [`sqlite.ts`](packages/db/schema/sqlite.ts)                                                                                                                                     | Keep the one current definition; add only optional Workshop source/publication link fields.                                                                                                |
| Current visual baseline                 | [`workbench.png`](apps/docs/docs/management/custom-widgets/img/workbench.png), [`workbench-mobile.png`](apps/docs/docs/management/custom-widgets/img/workbench-mobile.png), and [`workbench-validation.png`](apps/docs/docs/management/custom-widgets/img/workbench-validation.png) | Static evidence for desktop/mobile hierarchy and validation presentation; not a live interaction trace.                                                                                    |

## Final product principle

The feature should not optimize for “a model can emit a JSON widget” or “an admin can eventually save a form.” It should optimize for a shared, inspectable act of authoring:

- humans and agents see the same current draft and fingerprint;
- both use the same diagnostics and component/data knowledge;
- both can propose small reviewable changes;
- every preview is explicit about freshness and evidence;
- every saved widget is the exact artifact that was tested;
- Workshop installation, local customization, and publication remain understandable without merge or history machinery;
- typing remains as stable and immediate as a dedicated code editor;
- safety does not depend on prompt obedience.

That is the standard that would make Custom Widgets feel like a first-class Homarr platform rather than a large configuration form with an embedded renderer.

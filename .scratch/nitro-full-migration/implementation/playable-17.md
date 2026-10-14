# PLAYABLE-WAVE32 lane17

## Exact write lease

- `apps/nitro/src/features/search/contracts.ts`
- `apps/nitro/src/features/search/search-content.tsx`
- `apps/nitro/src/features/search/index.ts`
- `apps/nitro/src/features/search/palette-host.tsx` (new)
- `apps/nitro/src/source-ui/search/palette.tsx` (new)
- `apps/nitro/src/source-ui/search/preferences.tsx` (new)
- `apps/nitro/src/source-ui/search/index.ts` (new)
- `packages/spotlight/src/components/runtime-palette.tsx` (new)
- `packages/spotlight/src/components/runtime-mode-rail.tsx` (new)
- this handoff

Next originals are read-only. Existing spotlight store/open intents, cancellation/scope lifetime, media request, management, provider and Widget modules remain untouched.

## Implementation intent

Reuse the original Mantine Spotlight root/search/actions/footer and mode-rail CSS, adapting provider-bound data/navigation to explicit props. Restore the eight original modes and nested preference selection with current values, disabled/unavailable reasons and real callback-only persistence. Existing RPC clients are not extended with invented methods. Boards, commands, users/groups, assistant and preference acquisition are explicit caller-owned capabilities; absent capabilities remain visibly held. Existing search lifetime/cancellation checks stay authoritative.

## Declaration request to01

The new frame lives inside `@homarr/spotlight`, whose existing manifest declares Mantine Spotlight, hooks, React and icons. Nitro consumes owned source by relative path, consistent with its existing source imports. For a public package import,01 can expose `./runtime-palette` pointing to `src/components/runtime-palette.tsx` and declare `@homarr/spotlight` in Nitro. No dependency installation, manifest or shared provider edits belong to this lane.

Status: **FROZEN after the final uncertainty-copy correction**. The five implementation corrections otherwise passed rereview `ses_ed46dc18affeFX0xqLP2mj9Sap`; the final scoped return below supersedes only their copy and hash.

## Final copy-only write enumeration (before edits)

- `apps/nitro/src/features/search/search-content.tsx`: replace dispatched-navigation rejection copy that asserts failure or suggests retry with accurate unconfirmed-outcome wording; correct the relevant shared action heading. Preserve the existing hold, acknowledgement, no-replay behavior and all controller/navigation/tree/contracts code.
- this owned handoff: record the final copy-only diff, isolated raw validation logs and replacement hashes.

No other implementation paths are reopened. Existing valid source translations will be reused only if they already describe these exact uncertainty states; no translation key will be invented or confirmed failure relabeled as uncertainty.

## Review correction write enumeration (before implementation)

- `packages/spotlight/src/components/runtime-palette.tsx`: disable Modal's automatic Escape close; forward actual Escape to the controller regardless of detail focus; retain search-managed app action navigation; honor explicit pending interaction blocking.
- `apps/nitro/src/features/search/search-content.tsx`: centralize back/close/mode/query pending guards, observe the existing real media transport's dispatch/outcome through delegation without editing its body or inventing a client method, retire binding-replaced operations with explicit unconfirmed outcome, restore original cross-mode command/preference/admin-directory groups, and acquire scoped private directory results through real supplied callbacks with debounce/cancellation/eight-result limits. The existing media mutation has no scoped mutation key; observing unrelated Query mutations would not safely identify it, so only the real `requestMedia` call will be instrumented.
- `apps/nitro/src/features/search/contracts.ts`: add actual caller-owned query-scoped directory acquisition signatures and lifecycle state contracts; preserve arrays as compatible display capabilities.
- `apps/nitro/src/source-ui/search/preferences.tsx`: allow the same searchable original preference rows to participate in Search/Commands while retaining nested preference selection and held writes.
- `apps/nitro/src/features/search/index.ts`: publish the precise added capability/prop types.
- `apps/nitro/src/features/search/palette-host.tsx`: make hotkey/event dismissal and intent replacement respect the mounted controller's pending guard instead of bypassing it.
- `apps/nitro/src/source-ui/search/palette.tsx`, `apps/nitro/src/source-ui/search/index.ts`, `packages/spotlight/src/components/runtime-mode-rail.tsx`: only adjust existing owned presentation exports/props if required; no new files or new scope.
- this handoff: record corrections, raw isolated validation log locations, exact public props and replacement implementation hash.

The prior freeze hash remains historical until these corrections are completed. No peer/provider/runtime/Git/new-test edits or child agents are authorized. The same owned search controller will additionally observe only the mounted original media detail's actual Mantine loading marker so its existing post-submit refresh pending guard is retained as well as the real transport guard. The installed Button loading projection is verified; unrelated/unkeyed Query mutations are not attributed to this detail.

## Immediately mountable exports for01

- `apps/nitro/src/features/search/index.ts`: `SearchPaletteHost`, `SearchContent`, all existing Search RPC/management exports, and the new `SearchPaletteHostProps`, `SearchPaletteSources`, `SearchOption`, `SearchAction`, `SearchPreference`, `SearchPreferenceKey`, `SearchPreferenceValue`, `SearchPreferenceChoice` types.
- `SearchPaletteHost({ binding, session, contextResults?, sources?, shortcut?, onOpenChange? })` is the global host. Mount once beneath the existing Mantine and Query providers, **without another Modal**. It installs the original pending-open/media-open event bridge and defaults to `mod + K`. A `null` shortcut disables only the hotkey, not open events. Scope changes remount the host and cancel only that scope's search-content queries.
- `SearchContent({ binding, session, contextResults?, sources?, initialMode?, initialQuery?, integrationIds?, opened?, openIntentRevision?, onClose })` is the direct, intent-keyed palette. `opened=false` unmounts it. A held binding still displays the original eight-mode palette shell with explicit holds, rather than pretending that transport exists.
- `apps/nitro/src/source-ui/search/index.ts`: `SearchPalette`, `SearchResultAction`, `SearchResultGroup`, `SearchPreferenceResults`, `runtimeSearchModes`, and presentation prop types.
- `packages/spotlight/src/components/runtime-palette.tsx`: provider-independent `RuntimeSearchPalette`, `RuntimeSearchAction`, `RuntimeSearchGroup`. The frame has its own Spotlight store per mounted lifetime; the accepted existing store/open modules are unchanged. Store selection helpers always receive that instance explicitly.
- `packages/spotlight/src/components/runtime-mode-rail.tsx`: `RuntimeSpotlightModeRail`, `runtimeSearchModes`, and rail prop/entry types. The eight original modes and prefix characters are preserved: Search `/`, Apps `#`, Commands `>`, Preferences `?`, Assistant, Web `!`, Media, Users/groups `@`. Users/groups retains the original admin rail visibility. Legacy `bookmarks` initial intents remain compatible but are not a ninth rail mode.

The original document must include `@homarr/spotlight/styles.css` (existing package export), alongside the normal Mantine core styles. The original palette and action-item CSS modules are reused directly, with no duplicated stylesheet or styling redesign.01/04 own that document composition.

## Original source mappings

| Destination                                               | Read-only/original source reused                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/spotlight/src/components/runtime-palette.tsx`   | `packages/spotlight/src/components/spotlight.tsx`: real Spotlight Root/Search/ActionsList/Footer tree, 760px sizing, offset, scrolling, blur, left prefix badge, back/close control, keyboard footer; existing `spotlight.module.css` and `actions/items/action-item.module.css`                                                                                                  |
| `packages/spotlight/src/components/runtime-mode-rail.tsx` | `packages/spotlight/src/components/mode-rail.tsx`: icon mapping, horizontal ScrollArea/nav/buttons, active state, prefix badges and admin visibility; mode order/prefixes from `modes/index.tsx` and each original mode definition                                                                                                                                                |
| `apps/nitro/src/source-ui/search/preferences.tsx`         | Original `modes/command/children/preferences/settings-children.tsx` BooleanRow/SelectRow/LinkRow body; `action-row.tsx` selection checkmark body; original `preferences/preference-registry.tsx` icons and `packages/settings/src/preferences/definitions.ts` keys/aliases/guest visibility captured as explicit local presentation definitions, without consuming mutable lane25 |
| `apps/nitro/src/features/search/search-content.tsx`       | Existing accepted Nitro RPC/query algorithms and lifetime controller retained; original `modes/app-integration-board/apps-search-group.tsx` app detail header and Open/Edit action rows replace the simplified app button inventory                                                                                                                                               |
| `apps/nitro/src/features/search/palette-host.tsx`         | Original `components/spotlight.tsx` pending/open/media event acquisition, adapted to per-scope React lifetimes and unchanged original `open.ts` APIs                                                                                                                                                                                                                              |

No Next originals, root routes, manifests, lock, provider composition, Widget runtime, original global store, original open queue, media-request body or management body were edited.

## Available and held joins

- Existing real Search RPC procedures remain the only transport: `searchEngine.catalog/getDefaultSearchEngine`, `app.selectable`, `integration.all/searchInIntegration/mediaRequestSearchTargets/searchMediaRequests/getMediaRequestOptions/requestMedia`, and `bangs.search`. Their accepted authority holds, debounce, safe URL policy, permission gates, scoped query keys and request cancellation remain intact. No fake client, extra procedure or fabricated principal was added.
- Search and Apps retain board-context deduplication/ranking plus real apps/integrations. Web retains configured engines, DDG bangs, locked-engine query continuation and integration results. Media uses the existing accepted rich seasons/request component unchanged.
- Commands, Pages, Boards, Users and Groups consume explicit scoped `SearchOption[]` in `sources`. `undefined` means visibly unavailable; `[]` means a supplied empty catalog. Options support real safe link/typed navigation, query continuation, mode switches, nested children and lifecycle-bound invocation. Optional `icon` preserves original source row icons. The host, not lane17, owns acquisition and Router navigation/prefetch. No actively edited peer implementation is imported for these joins.
- Preferences preserves all twelve original preference rows, guest visibility, aliases, boolean Switch presentation, current value labels, searchable nested choice actions, checkmarks, loading/error states and pending-write disabling. Supply `sources.preferences` with real current values and discriminated `held`/`ready` writers. A select row may expose choices while its writer is held; every write remains disabled and the hold reason is shown. Absent acquisition/persistence is visibly unavailable. There is no optimistic/fake preference update or success notification: values only change through caller-provided confirmed data.
- Assistant is the original mode/rail location with an explicit accepted rich-composer `render({ query, session, isCurrent })` seam; absent/held composition displays its reason. Lane21's active implementation was not consumed and a simplified assistant input was not substituted.
- Nested selections, mode/query changes, close, scope replacement and unmount invalidate asynchronous intentions. Invocation/preference writers receive `{ signal, isCurrent }`; callers must preserve these checks around their accepted effects. A callback is not mutation authority. Rejection produces an explicit unconfirmed-success error; no fallback success is synthesized. App open/edit/back focus targets remain real actionable controls, and returning from app/media detail preserves the prior search query/context.
- Existing `SearchDestination`/route inventory is unchanged: Search engine list/new/edit, app edit and integration edit. Additional original Pages/Boards/Commands destinations must come from01/03's frozen Router-backed source actions; no root route was invented here.

## Validation, copied immutable closure only

Snapshot: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable17-frozen-20261011`.

All checks ran with `env -i`, explicit Node24.18.0, temporary HOME, no emit and no tests/build/runtime. Source/dependencies/config were physically copied (APFS clone for installed dependencies); copied workspace links resolve only inside the snapshot. Dependency capture was for diagnostics, not acceptance of active peer joins. Subsequent refreshes copied only the nine owned implementation files, leaving the captured dependency graph fixed.

- Focused oxlint with `--max-warnings 0` on the exact nine changed implementation files: **PASS, 0 warnings, 0 errors**.
- Focused TypeScript7.0.2 `tsconfig.frame.json` for the actual Spotlight frame, mode rail and Nitro presentation reexport (including unchanged store/open/CSS dependencies): **PASS**.
- Focused full Search feature/source presentation `tsconfig.json`: **0 diagnostics in owned files**, but overall exit1 on eleven captured out-of-lane dependency diagnostics: `packages/api/src/nitro/routers/-integration-operations/helpers.ts` lines45/50/53 (PromiseLike/context/input), `packages/api/src/nitro/routers/integration-operations.ts` lines384/503/539 (missing snapshot context), and `packages/integrations/src/unifi-controller/unifi-controller-integration.ts` lines16/17/55/189/263 (missing installed UniFi declaration and resulting inference). These were not patched or hidden with stubs/casts. Integrated compilation and browser/race proof remain01's responsibility after those dependencies freeze.
- Verified installed Mantine Spotlight9.6.0 Root/Action/ActionsList declarations and actual Root/Search/store implementation; used supported `createSpotlight`, instance `store`, existing explicit-store selection helper and factory refs. Also verified package manifests before adding imports. Context7 was not used because the authoritative plan says its quota is exhausted.
- No child agents, Git actions, new tests, comments, unsafe casts, `any`, builds, installations, Docker, provider calls or preview processes.

Frozen implementation digest: SHA256 of sorted relative path + NUL + bytes + NUL for the nine files is `b82d7a6be68f2aaecd0c81a7db00d3c83d8013fff29912d849e264daf2cf313a`.

## Review return: all five requested corrections

1. **P1 Escape/window capture and media pending guard:** `RuntimeSearchPalette` sets `closeOnEscape=false` and `closeOnClickOutside=false`. Escape from the actual dialog subtree, including detail controls, is captured once and sent to `onEscape`; the controller decides nested back versus close. Back/close/mode/query/selection, host hotkey dismissal and host open-intent replacement all consult the same synchronous guard. Pending real request dispatch and the original media mutation's post-submit refresh loading projection block leaving. Unconfirmed dispatched outcomes remain visibly held until explicit acknowledgement. Native media anchors cannot bypass this guard. No original media body or global provider was changed.
2. **P2 original cross-mode groups:** Search again includes supplied Commands, searchable original preference rows and admin-only private directory groups, in addition to Pages/Boards/native app/integration/engine/context results. Commands displays the same real searchable preference rows rather than an unconditional Preferences gateway action. Opening a preference from Search/Commands preserves the originating mode and returns to that list. Held writers/acquisition remain visible; no action is invented.
3. **P2 private directory acquisition:** `sources.directory.users/groups` accept actual caller-owned asynchronous search callbacks. Reads are scoped to the existing session cache scope, admin/authenticated/current-session gated, trimmed, debounced180ms, minimum one character and capped at eight results per group both in the supplied input and the displayed output. Query keys include scope, source, debounced query, caller capability revision and local reader generation. Query/reader/scope/enable changes cancel the exact old key; callbacks receive `signal/isCurrent`; late completions and wrong-query/reader cached results are not displayed. No client procedure was added and no mutable peer reader was adopted. Existing arrays are compatible supplied display data, not a substitute for private acquisition.
4. **P2 explicit retirement:** the old independent coalescing boolean is removed. The active operation is the single synchronous coalescing authority. Binding changes (`navigation`, real client, `session.isCurrent`, `onClose`) explicitly retire the operation, abort its controller and clear busy/pending-preference state. A dispatched, unsettled operation produces an unconfirmed-outcome record and visible acknowledgement hold. Undispatched operations do not manufacture an outcome. Old continuations cannot clear a newer operation or claim current success. Forced unmount reports the outcome through the optional outliving callback; consumers replacing the whole scope should provide that callback to preserve the warning outside the old dialog.
5. **P2 app detail keyboard focus:** entering app detail retains the original Search input focus. Mantine Search continues to own ArrowUp/ArrowDown/Enter selection of the real Open/Edit Spotlight action rows; the controller no longer focuses a `tabIndex=-1` Open row that cannot drive those keys. Actual refs, safe URL checks, back control and lifetime checks remain intact.

The media observation delegates only the existing typed `runtime.client.integration.requestMedia` method to the same real client. All other properties are forwarded unchanged. The actual result is returned unchanged; only its cancellation signal is combined with the owned lifetime signal, and an obsolete completion becomes an explicit unconfirmed error. This is not a fabricated endpoint/client result. The original component has no scoped mutation key or pending callback, so its existing refresh-pending guard is read only from that mounted detail's verified Mantine Button `loading` projection (`button[data-loading]`), not from unrelated global mutations. A retired media mutation is detached from that projection while its unconfirmed outcome remains held, preventing a late, abort-ignoring mutation from keeping the controller's coalescing state stuck.

## Exact added/changed public props for review

`SearchContentProps` keeps every previous prop and adds:

```ts
controlsRef?: RefObject<SearchPaletteControls | null>;
onUnconfirmedOutcome?(outcome: SearchUnconfirmedOutcome): void;
```

```ts
interface SearchPaletteControls {
  requestClose(): boolean;
  canReplace(): boolean;
}

interface SearchUnconfirmedOutcome {
  scope: string;
  action: "navigation" | "command" | "preference" | "media";
  reason: string;
}
```

`requestClose()` returns false without closing while pending/unconfirmed; true means the controller actually issued its existing `onClose`. `canReplace()` is a synchronous guard, not permission to mutate. `SearchPaletteHostProps` inherits `onUnconfirmedOutcome`, but omits `controlsRef` because the host owns and supplies that ref itself. Existing `shortcut/onOpenChange` props remain unchanged. Pending intent replacement is rejected, not reported as an open success.

`SearchPaletteSources` keeps the previous optional arrays/preferences/assistant and adds:

```ts
directory?: {
  users?: SearchDirectoryCapability;
  groups?: SearchDirectoryCapability;
};

type SearchDirectoryCapability =
  | { kind: "held"; reason: string }
  | {
      kind: "ready";
      revision: string | number;
      search(
        input: { scope: string; query: string; limit: 8 },
        lifecycle: SearchNavigationLifecycle,
      ): Promise<SearchOption[]>;
    };
```

The callback must invoke the caller's real accepted scoped reader and map real records to the existing rich `SearchOption` actions/icons/children. Its `revision` identifies the accepted reader/authority binding. `scope` is the existing cache/lifetime identity, not a fabricated backend principal or grant. A held capability takes precedence over an array; absent callback and absent array show a hold.

`RuntimeSearchPaletteProps`/Nitro `SearchPaletteProps` add:

```ts
interactionBlocked?: boolean;
canLeave?(): boolean;
onEscape(): void;
```

`onEscape` is now required and is the single actual dialog Escape path. `interactionBlocked` projects disabled rail/back/query controls. `canLeave` supplies the synchronous controller guard for native-anchor capture, so an in-flight transition cannot bypass the guard before the disabled projection renders. `RuntimeSpotlightModeRailProps` adds `interactionBlocked?: boolean`. `hasSearchPreferenceResults(preferences, authenticated, query)` is exported from the owned source-UI barrel to keep empty-state detection aligned with the same original searchable rows.

`SearchDirectoryCapability`, `SearchPaletteControls`, `SearchUnconfirmedOutcome` are exported from `apps/nitro/src/features/search/index.ts`. No public manifest/export field was changed.

## Review validation: raw logs and final hash

The exact final nine-file closure was copied into the same isolated snapshot. Installed dependencies and captured transitive sources were **not refreshed from active peers**. Checks ran again with `env -i`, temporary HOME, explicit Node24.18.0, TypeScript7.0.2, no emit/cache/build/test/runtime/provider calls.

Raw, unfiltered final logs under `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable17-frozen-20261011/`:

| Check                                                                                       | Exit | Raw log                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Exact nine-path oxlint `--max-warnings 0`                                                   | 0    | `lint-review-final.raw.log`: 0 warnings, 0 errors                                                                                        |
| Actual frame/mode-rail/Nitro frame export TypeScript closure                                | 0    | `types-frame-review-final.raw.log`: empty, successful compiler output                                                                    |
| Full owned Search/presentation TypeScript roots plus captured real native inference closure | 1    | `types-search-review-final.raw.log`: the same eleven out-of-lane Integration/UniFi diagnostics listed above; zero owned-file diagnostics |

Initial review raw logs (`lint-review.raw.log`, `types-frame-review.raw.log`, `types-search-review.raw.log`) are retained separately. The three initial own lint warnings were fixed without suppressions; no compiler errors were hidden or patched in peer files. Installed Mantine Modal/Spotlight APIs and Button loading projection were checked against the physically copied installed9.6.0 sources.

**Final reviewed implementation SHA256:** `51cfe705ec97622191856a101abea4e90e4941609ba99f7b44929580d979218b`, using the same sorted path + NUL + bytes + NUL algorithm across all nine owned implementation paths. This replaces the historical first-freeze hash. No additional source writes are planned.

## Final scoped rereview return: uncertainty copy only

Only `apps/nitro/src/features/search/search-content.tsx` and this handoff were edited. Exactly four copy substitutions:

| Previous copy                                           | Final copy                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Navigation failed. Try again.`                         | `The navigation outcome is unconfirmed. Check the current page.`                                                                            |
| `Could not open the app editor.`                        | `App editor navigation is unconfirmed.`                                                                                                     |
| Shared heading `Could not complete action`              | Neutral heading `Action status`                                                                                                             |
| Shared unknown-outcome help suggesting submission again | `Aborting a request does not prove that the action was rolled back. Check the current page or affected service to establish what happened.` |

The neutral shared heading does not relabel a confirmed unsafe-URL/held-action condition as uncertainty. Navigation callback rejection now accurately reports an unconfirmed outcome, including when the actual navigation happened before callback rejection. No retry/replay instruction is presented by either navigation rejection message or the shared uncertainty help.

The actual unconfirmed hold, explicit acknowledgement, synchronous no-replay/coalescing guards, controllers, callback signatures, navigation calls/destinations and rendered tree are unchanged. No translation import/key was added: existing English source translations were checked for an applicable unconfirmed-navigation/outcome message, and none was found; the existing component's literal-copy pattern is retained rather than inventing a key or reusing a confirmed-failure translation.

Copy-only proof compared the final file against the prior physically copied `51cfe...` closure, applying precisely these four text replacements and allowing only formatting whitespace. It passed. The other eight implementation files were byte-for-byte identical to that frozen closure. Only the changed source file was refreshed in the isolated snapshot; captured dependency sources were not refreshed or adopted.

Raw, unfiltered final logs remain under `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable17-frozen-20261011/`:

| Focused immutable check                                                                                    | Exit | Raw log                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| Changed-file oxlint `--max-warnings 0`                                                                     | 0    | `lint-copy-final.raw.log`: 0 warnings, 0 errors, one file                                                                 |
| Existing frame TypeScript closure, unchanged source                                                        | 0    | `types-frame-copy-final.raw.log`: empty successful output                                                                 |
| Full owned Search/presentation TypeScript roots, including changed file and real captured native inference | 1    | `types-search-copy-final.raw.log`: unchanged eleven Integration/UniFi dependency diagnostics, zero owned-file diagnostics |

Commands used the same `env -i`, temporary HOME, explicit Node24.18.0/installed TypeScript7.0.2, no emit and no runtime/build/test/provider execution. No errors were hidden with casts/stubs and no peer path was patched. No `any`, comments, new tests, child agents or Git operations were added/performed.

**Final copy-only file SHA256:** `b7f63100d6cd69fc9cbe8cf2bc2e1dd004e17d3ca96dba7c197e7a6452c5ed2a` for `apps/nitro/src/features/search/search-content.tsx`.

**Final nine-file closure SHA256:** `7be2ccfd8e6bf019724fd92b3ca696708f5b77988bf9a101ea7f56722f7df492`, with the same sorted path + NUL + bytes + NUL algorithm. This is the current freeze hash and replaces the historical `51cfe...` review hash. Ready for final scoped rereview; no further source writes are planned.

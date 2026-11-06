# PROTOTYPE: add / edit widgets in place

> Three variants of the in-place widget picker + options card, switchable via `?variant=A|B|C` on the existing board route in edit mode. Throwaway code on branch `prototype/add-widget-in-place`; the winner gets rewritten properly on `new-add-widget`.

## Settled decisions (do not re-litigate)

Interaction (shared by every variant, built once in the stage):

1. Edit mode only. Hovering an empty grid cell shows a `+`. Click = 1×1 area. Press on the `+` and drag = rectangle area snapped to cells. The rectangle never covers occupied cells: it stops at obstacles, nothing reflows while selecting. Works in every `SectionGrid` (main canvas, rails, containers).
2. Releasing the pointer opens the picker for that area. The search input is autofocused. The input never moves; only the list below it grows/shrinks.
3. List = Mantine `Combobox` (keyboard: ↑/↓ highlight, Enter pick, Esc back). Max 10 option rows: built-in + custom widgets first, then existing apps by name (when both groups match, reserve ≥3 rows for apps: empty search = 7 widgets + 3 apps). No generic "App" entry. A pinned "Create app" row/footer sits below the list, outside the cap.
4. Widgets are ranked by fit: distance between the area size and the widget's `widgetDefaultSizes` entry (fallback 1×1); closest ones get a "Best fit" badge. Nothing is hidden for size reasons. Search matches widget name and supported integration names (same as the old `ItemSelectModal`).
5. Highlighting an entry (hover or ↑/↓) renders the real widget live inside the selected area after ~120 ms, with default options and the first matching integration. Widgets needing an integration the user lacks show a "needs setup" ghost.
6. When an entry is highlighted/picked, the area grows to the widget's default size if those cells are free; otherwise it keeps its size.
7. Keyboard resize: Alt+Arrow grows/shrinks the area (obstacle-aware) while the search input or options card has focus. Tab reaches the W×H inputs.
8. Picking a widget switches to the options card (iOS-widget style): option inputs, integration select (+ connect new service), advanced options (title, CSS classes, border colour), W×H inputs. The widget in the grid IS the preview and updates live (debounced) as options change. The rest of the board is dimmed and inert during the options step. Ctrl/⌘+Enter submits. Esc goes back (inline "Discard changes?" if dirty).
9. List step: clicking outside cancels the selection. Options step: outside clicks do nothing.
10. "Create app" swaps the list for the existing `AppForm` (`@homarr/forms-collection`); on save the app is created and placed into the area as an `app` item.
11. Add commits through `createItem` with an explicit position (edit-mode local state; discarding edit mode undoes it).
12. Global "Add widget" (header menu, empty state, checklist): enters edit mode if needed, finds the first free cell in the main canvas, scrolls to it, opens a 1×1 area there with the picker + W×H inputs.
13. Editing an existing widget: item menu "Edit", context menu "Edit", and double-click in edit mode open the SAME options card in place around the widget (board dimmed). The commit calls the same handler the old modal's `onSuccessfulEdit` used. The edit modal is going away; this replaces it on desktop.
14. Mobile (`useIsMobile()`): the same panel content renders in a bottom `Drawer` (context-menu pattern, `widget-context-menu.tsx`). Tap `+` = 1×1, resize via W×H inputs.

## What differs per variant (the question this prototype answers)

- **A – Anchored panel**: floating panel anchored beside the area, outside it, flipping sides near viewport edges. Input fixed at the top, list grows downward. After pick, the same panel morphs into the options card; board dims.
- **B – Docked sidebar**: non-modal right sidebar (does not cover the board). Same input/list/options card, always in the same place.
- **C – Size-first gallery (iOS)**: size is chosen first (mouse drag on grid or W×H stepper), then a strip beside the area shows live mini-previews of fitting widgets (ranked by fit) that you browse with ←/→ or ↑/↓; clicking fills the area and opens the options card.

## Code layout

```
apps/nextjs/src/components/board/add-in-place-prototype/
  PROTOTYPE.md            this file
  store.ts                flow store (shared)
  ...shared stage files   occupancy, empty-cell layer, area overlay, preview slot, dim layer, catalog, switcher, host
  variants/
    contract.ts           AddInPlacePanelProps (the only API variants consume)
    a/                    Variant A owns everything in here
    b/                    Variant B owns everything in here
    c/                    Variant C owns everything in here
packages/widgets/src/modals/widget-editor-form.tsx   modal-free options form (also used by the old modal)
```

Variant agents only edit files inside their own `variants/<x>/` folder. If they need a shared change, they say so in their final message instead of editing shared files.

## Rules

- Mantine 9.6 components and Styles API only (no Tailwind). Read `plugins/homarr-mantine/skills/mantine-ui/SKILL.md`, `/Users/ajnart/.agents/skills/mantine-custom-components/SKILL.md` (+ `references/`) and `/tmp/add-in-place/mantine-combobox/SKILL.md`. Lists use `Combobox` primitives (`useCombobox`, `Combobox.Target`, `Combobox.Option`). Custom reusable pieces use Mantine `factory()` + `useProps` + `useStyles` + CSS modules when they are real components.
- Icons: `@tabler/icons-react`. No new dependencies.
- No code comments. No tests. TypeScript strict: `unknown` over `any`, discriminated unions.
- Prototype strings may be hardcoded English; reuse existing i18n keys when obvious.
- Dev server: http://localhost:3100 (worktree `.env`, scratch DB `/tmp/add-in-place/db/homarr.sqlite`). Login `demo` / `demo` (if that fails, use the onboarding/sign-up flow at `/auth/login`). Enter edit mode from the board header.

# Shared frontend preparation

Status: source-preserving, unmounted preparation. No ticket, full UI, hydration, authenticated feature, or #22 completion is claimed. Only this lane's UI/form source and this handoff were written; manifests, package-root exports, app providers, routes, boards, feature collections, translation facade/catalogs and other workers' files were not edited.

## Source preserved and adapted

| Source                                                           | Adaptation                                                                                                                          | Preserved behavior                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/link.tsx`                            | Replace the Next Link alias with delegation to an explicitly supplied routed Link.                                                  | Existing string href consumers, React 19 anchor ref, native anchor/root props, children, event handlers, target/rel and replace/scroll/prefetch intent pass through unchanged. No manual click interception or document/history access.                     |
| `packages/ui/src/components/search-input.tsx`                    | Read pathname/raw search and replace from the candidate navigation adapter instead of Next hooks.                                   | The actual existing TextInput, search icon/spinner, clear button/accessibility labels, Escape handling, 250 ms debounce, trim/remove, reset an existing page to 1, unrelated/duplicate query preservation, default-value synchronization and loading state. |
| `packages/ui/src/components/table-pagination.tsx`                | Read pathname/raw search and replace from the same adapter; import the sibling Link rather than the UI package root.                | Existing responsive Mantine Pagination tree, translated label, no-total behavior, query-only native hrefs, replace callback, strict positive safe-integer/duplicate-page parsing and source control calculations.                                           |
| `packages/ui/src/hooks/use-translated-mantine-react-table.ts`    | Read the existing `useCurrentLocale` facade instead of the Next route's locale param.                                               | The existing suspense query, per-locale query key, real catalog MRT localization import and complete table options. No second locale state or table implementation.                                                                                         |
| `packages/form/src/index.ts` and `packages/form/src/resolver.ts` | Give the existing schema resolver a per-validation Zod error map instead of calling process-global `z.config` during a hook render. | Existing `useZodForm` signature/schema inference/options, sync validation, blur/change defaults, source `zodErrorMap`, first issue per field, nested dot paths and explicit schema messages. No form-state clone.                                           |

The theme, CSS, spacing, colors, Mantine 9.6 component trees, all other shared components and UI hooks remain unchanged. `packages/modals/src/**` and `packages/notifications/src/**` already contain no direct Next/router/API client dependencies and required no copy or rewrite. Their existing modal reducer/provider, close interceptor, focus trapping, stacked/keep-mounted presentation, pending confirmation/rejection behavior, footer actions and colored notification wrappers remain the source implementation. Translation continues through the existing facade, whose standalone replacement belongs to the localization worker.

## Existing contracts versus candidate ports

Existing signatures retained: `SearchInput`, `TablePagination`, `useTranslatedMantineReactTable`, `useZodForm`, modal actions/provider/footer/confirmation definitions, and success/error/warning notification helpers. The existing `useCurrentLocale` facade and locale configuration catalog are reused, not replaced.

Candidate, not accepted host wiring: `packages/ui/src/navigation/index.tsx` exports `NavigationProvider`, `useNavigation`, `NavigationAdapter` and `NavigationLinkProps`. Its interface is deliberately limited to the state/actions already consumed by these primitives:

```ts
interface NavigationAdapter {
  pathname: string;
  search: string;
  replace: (href: string) => void;
  Link: ComponentType<NavigationLinkProps>;
}
```

`search` is the raw search string, with or without its leading `?`. The host owns location updates and the component implementing routed links. The provider only supplies context: no independent Router, URL state, QueryClient, history patch, browser-global singleton or feature service. Missing context throws explicitly rather than silently falling back to a fake app workflow. Keep each host adapter request/router-local and its Link component identity stable across location changes.

`NavigationLinkProps` consists of native React 19 anchor props/ref, a required string `href`, and optional `replace`, `scroll`, and `prefetch` intent. Actual shared Link call sites inspected use string hrefs; Next URL-object/legacy Link props are not implemented. The selected host Link still must preserve safe native external/protocol navigation, modifier/new-tab/keyboard behavior, query/hash resolution, encoding, history/scroll/focus and dirty-navigation semantics. The wrapper does not claim to prove those behaviors by forwarding props.

`createZodFormResolver` is a source-local helper, not a new published form API. Its translator is captured by each resolver and used on each synchronous parse; it does not overwrite the global translator shared with other requests/forms. Existing code that incorrectly depended on `useZodForm` having a global Zod side effect will need its own explicit validation error map.

## Composition-owned manifest requirements

- Declare `@homarr/ui/navigation` as `./src/navigation/index.tsx` after accepting the candidate adapter. No central/root export was added by this lane.
- The existing MRT hook already imports installed `@tanstack/react-query` 5.101.2, but `packages/ui/package.json` currently does not declare it. Composition must add the existing catalog dependency before mounting/publishing this hook. No new query implementation or version is requested.
- UI's direct Next imports are now absent; composition can assess removing its `next` dependency with the migrated consumers. Existing docs use the separate server-safe `@homarr/ui/widget-icons` entrypoint, which was not changed.
- No new form/modal/notification dependency or public export is required. Standalone localization provider/dependencies/export decisions remain with the localization and composition owners.

## Validation

All executions used `bun --no-env-file`; no `.env`, user browser, current 3100 app, listener, container, live backend, credentials or appdata was used.

- Scoped oxlint: seven changed/new TypeScript/TSX source files passed.
- Scoped oxfmt check: all seven files passed.
- Scoped installed TypeScript 7.0.2 CLI check (`--ignoreConfig`, strict, Bundler resolution, seven explicit roots plus their imported types): passed with no diagnostics. The initial compiler-API probe could not run because the installed TypeScript package exposes version metadata rather than the old JS compiler API; the actual native CLI check succeeded instead.
- Existing `packages/modals/src/confirm-modal.spec.tsx`, Vitest DOM project: two tests passed, preserving pending/reject/keep-open behavior and callback ordering.
- Disposable resolver probe: interleaved translator A/B/A, nested first-issue field mapping, schema-message precedence and no global Zod mutation passed using the actual resolver, Zod and Mantine schema resolver.
- Disposable Link SSR probe: two isolated adapter instances, original href/root props and route-intent forwarding, and explicit missing-provider failure passed.
- Disposable JSDOM probe with only the translation facade stubbed: actual SearchInput 250 ms debounce, trim/page reset, duplicate unrelated query retention, Escape flush, plus Link DOM ref/event forwarding passed. JSDOM emitted its unsupported document-navigation diagnostic for the test anchor; this is not proof of native or TanStack navigation. No persistent speculative component tests were added.
- Targeted source search: no direct `next/`, `next-intl`, `@homarr/api/client` or `@homarr/auth` import remains in `packages/ui/src`. This does not certify the final transitive app graph: the translation facade is another worker's responsibility.

Installed declarations/source were verified for Mantine core/form/hooks/notifications 9.6.0, React 19.2.7, Zod 4.4.3 and MRT 9.0.3. The project Mantine MCP is keyless but unavailable in this session's tool catalog. Context7 returned its quota error. Official schema-validation, debounced-callback and Zod per-parse customization docs were read, then checked against installed declarations/implementation; the live docs currently display newer 9.7.1/4.6 releases and are not used as proof of installed APIs.

## Remaining joins and evidence

Composition must accept/export/mount the actual TanStack adapter and existing translation, Mantine, request-local QueryClient, modal, settings and notification providers. Feature owners still supply typed file routes/loaders/search schemas, authorized API queries/mutations, default values from normalized search, route errors/loading states and effect completion. No API client or Next-page feature dependency was transplanted or replaced with an invented contract.

The atomic board draft, dirty/save/cancel/unload blocker and successful-save bypass belong to board/feature/navigation integration, not this lane. Source page parsing/control semantics were retained rather than inventing normalization or range policy. Real authorized list/create consumers, native links/history/Back/Forward/hash/RTL behavior, SSR/hydration, pending route completion, notification/provider mounting and feature closure remain unverified. These primitives are preparation inputs, not a substitute for those joins or approval to expose incomplete features.

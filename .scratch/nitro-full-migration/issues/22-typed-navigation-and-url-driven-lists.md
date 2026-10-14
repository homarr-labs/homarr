# 22: Typed navigation and URL-driven lists

**What to build:** Make real links, list search, pagination, query/hash state and dirty-navigation recovery behave consistently through typed file-route search schemas and browser history. This is the single shared navigation implementation, including transferred I18N-04 behavior; feature forms and mutation services remain local to their owners.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] One routed Link preserves native href/ref/root props, keyboard/modifier/new-tab behavior, dynamic-target encoding and deliberate replace/scroll/focus behavior; external/protocol links use safe native navigation rather than accidental SPA dispatch.
- [ ] Search implements the approved 250 ms debounce, trim/remove, clear/Escape flush, loading and page reset while retaining meaningful unrelated parameters. Positive safe-integer/page-size parsing defines duplicate, invalid, unsafe, scientific-notation and out-of-range handling consistently with loaders.
- [ ] Direct loads, Back/Forward, push/replace and relative/query/hash navigation agree on normalization. Route owners supply board layout/edit/return/add, create, login-return and other feature search schemas; UI triggers are not arbitrary loader dependencies or mutation authority.
- [ ] The shared blocker adapter supports confirm/proceed/stay, unload and explicit successful-save/cancel bypass through feature dirty callbacks, without global history hacks or changing new-tab intent.
- [ ] Demonstrate one real authorized administration list and create/mutate consumer using distinct Query, Router-loader, backend-render and policy effects; narrowly focused future regressions cover history/parser behavior and dirty-navigation recovery, including localized/RTL controls.

## Coverage

SHELL-02 plus I18N-04: shared Link/Mantine composition, target building, debounce/search/page parser, query preservation, blocker adapter and mutation-completion convention. Board/app form collections retain their feature mutation/name-availability/create-another duties. All feature-owned route query schemas are contributions, not a second shared parser. Old URL spellings and aliases are not required.

## Required contracts

Accepted revisions of #01's request-local route/loader/effect contribution ports; #05/#06's translation/locale types; #08's form/overlay completion interface; #28's dirty/save-bypass callback and individual consumer route schemas. Require only the consumed interface, not completion of whole producer tickets. Unaccepted interfaces remain waiting.

## Decision holds

Raw/duplicate/unknown-query normalization, history replacement and affected navigation redesign need explicit disposition. Locale switch/query/hash/unsaved-work semantics remain held with #06; Q13 gates editor-specific dirty behavior, not independent Link work.

## Ownership

One exclusive local writer owns shared Link/search/pagination/blocker modules and focused regressions. Consumers own their call sites. #01's composer alone owns root SSR/providers, central route/type generation, shared assembly/exports and manifests. Route contributions use descriptive filenames in folders, ignored route-local helpers and correct layout/pathless/non-nested/dynamic semantics; allocate files before dispatch. Triage is not implementation authorization.

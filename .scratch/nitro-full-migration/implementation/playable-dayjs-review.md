# Independent standalone Day.js review

## Current P1 correction rereview

**Scoped browser-source PASS. Previous P1 resolved; no P0/P1/P2/P3 findings in the corrected contract. Candidate public export and actual root admission remain owner01 work; SSR ownership/hydration remain HELD.** This supersedes the historical source verdict below, not its retained evidence.

Reviewed the complete current source and immutable typechecked copy at recorded SHA-256 `7ee64f915468d638c5e9ed7ffb09fe8610edff432c2d642f79d7e13cbe112c04`, and the unchanged canonical root handoff `implementation/playable-dayjs.md` at recorded SHA-256 `eae0738298c5f819432ce43c1c360aa950680fbb7a0f73c6e3ff2f47adb34b00`. Hashes were checked against retained manifests, not freshly recomputed. Only this review was written; no commands, tests, builds, browser/runtime activity, source changes, Git or children.

### Selection/currentness

- `dayjs.ts:62-81`: the only default selector is the synchronous committed layout-effect setup. Render and loader completion cannot select. Interrupted/abandoned `de → cached fr` work returns `awaiting-commit` and runs no selection setup, retaining the mounted German default.
- `dayjs.ts:64-79`: a different mounted token throws before selecting. Every setup creates a fresh lease; cleanup retires only that exact lease and never restores/selects a default. There are no asynchronous effect continuations that could select an old locale or let a late cleanup retire a replacement lease.
- `dayjs.ts:84-91`: settled results require matching requested locale, exact resource and currently active lease. Initial mount and cached-locale changes cannot claim readiness before commit. On a committed switch, fallback replaces date descendants first; setup selects the loaded locale and schedules the readiness render. StrictMode setup/cleanup/setup produces a new lease and selection, so the retired lease cannot satisfy readiness. Actual installed React commit-layout implementation and hook declarations support this sequencing; no runtime exercise was performed.
- The exported return is the actual discriminated `DayJsLocalizationResult`, not the historical `void` declaration: `awaiting-commit | ready | failed-retained-default`. The handoff gates children on `ready`, prohibits implicit-default dates in fallback/eager parent computations, and discloses child unmount/state loss. This caller obligation is essential, not optional behavior implemented automatically by calling the hook.
- Failed imports retain the real default and expose the actual `dayjs.locale()` getter only after commit. They never produce `ready`; the sample stays on fallback. No guessed fallback, retry loop or requested-locale success is claimed.

### Retained boundaries

The canonical loaders/aliases and document-scoped resource cache are unchanged. Native promise completions update only their locale entry; cache survives initial suspension. No copied catalog, plugin/default-timezone mutation, Next dependency or request-global selection was introduced. The SSR guard runs before resource allocation, loader invocation or owner/default mutation. One canonical mounted browser owner and no unrelated default selectors remain explicit requirements; this is not multi-root isolation.

The inspected translation manifest still lacks `"./standalone/dayjs": "./src/standalone/dayjs.ts"`, and the Nitro source search finds no bridge consumer. Owner01 must accept/publish the changed result signature and actually mount a gated browser-only bridge with non-date fallback. Source PASS does not certify root lifecycle, consumer compliance, retained-state UX, concurrency at runtime or hydration. Server instance/request ownership, serialization/timezone decisions and hydration parity remain HELD.

### Correction evidence inspected

Directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-dayjs-p1-mz8a8zqk/`.

Read raw no-emit closure sections/search, all check argv/cwd/exit records, lint/format outputs, snapshot before/after manifests, 35 read-only before/after manifests, enumeration/API evidence and integrity records. Strict no-emit types and all-three-source lint exit **0**. Initial format exit **1** is genuinely retained and identifies only the handoff; subsequent final-format and exact source/final-handoff freeze-format checks exit **0**. No correction declaration emit exists; the historical `void` declaration is not evidence for this API.

The raw typecheck list confirms exactly seven non-dependency files: hook, canonical config/languages and original MRT `ca/lt/lv/sl` JSONs, with actual installed React/Day.js/MRT declarations. `--ignoreConfig` and `--skipLibCheck` are disclosed isolated-check limitations, not full-workspace/dependency strictness. Immutable source/check snapshots have equal before/after hashes; the final handoff hash is specifically covered by `freeze-format-integrity.json`, not the earlier differently hashed handoff snapshots. All **35** retained read-only hash pairs match; the original 14 remain unchanged. These establish bounded recorded validation, not independently rerun hashes or mounted runtime success.

## Historical original-source verdict

**Browser-source admission HELD: one P1 finding; no additional P0/P2/P3 findings. SSR owner and hydration remain HELD.** The canonical handoff remains `implementation/playable-dayjs.md`, unchanged.

Reviewed the complete `packages/translation/src/standalone/dayjs.ts` source and its recorded SHA-256 `1e9f7232b91c0fa5b6194343e942b9d650db1a7775a8a2a2d503d738f2fe5c7f`. This review inspected recorded integrity evidence, not a freshly computed source hash. No commands, tests, builds, browser activity, Git operations, child agents or source edits were performed. The only write is this review.

## P1 — Render-time default selection is not mounted/current selection authority

Location: `packages/translation/src/standalone/dayjs.ts:43-44`; affected claim: `implementation/playable-dayjs.md:36,40`.

`dayjs.locale(state.locale)` mutates the realm default during every loaded-locale render. A render that gets past this hook is not necessarily committed: React can interrupt, abandon or suspend the descendant tree. There is no mounted-owner token, committed selection, currentness check or reconciliation on abandonment.

Concrete single-root sequence, requiring no competing bridges:

1. The committed provider/bridge locale is `de`; `fr` is already cached.
2. A transition renders the same bridge with `fr`. Line 44 selects the global French default immediately.
3. A descendant suspends, or React abandons that work. The previously committed German tree remains mounted.
4. New Day.js instances created by that mounted tree's callbacks now use French. The German bridge need not rerender, so no correction is guaranteed.

An initial speculative bridge render can likewise select a default without ever mounting. A failed-locale render then preserves whatever default was left behind, not necessarily the mounted owner's last successful selection. The cache correctly prevents late _loader completions_ from selecting a default, but does not protect against speculative _render selection_. Document scoping and the documented single-bridge restriction do not solve this race.

Required before admission: establish an actual mounted browser owner and authoritative locale lifecycle that cannot publish abandoned render selections, while ensuring date consumers render with the intended locale. Moving selection into an effect alone does not establish the existing before-children guarantee; the host must settle that sequencing or use explicit instance localization. Keep resource loading separate from selection authority. Do not claim concurrent/current-locale correctness for these bytes.

## Verified bounded properties

- **Canonical configuration reused:** the hook directly calls `localeConfigurations[locale].importDayJsLocale()` from the real `config.ts` and imports the real `SupportedLanguage`. No copied language list, resolver, routing inference or alternate catalog. Existing aliases remain `cn → zh-cn`, `zh → zh-tw`, `cr → en-gb`, `no → nb`, `de-CH → de-ch`; the loaded locale object is selected, not the application alias string.
- **Suspense cache:** one module-level `WeakMap<Document, Map<SupportedLanguage, LocaleLoadState>>`; resources survive initial Suspense retries. Native promise callbacks execute after the pending entry is installed. Concurrent reads of one locale reuse its pending promise; different locale loads do not overwrite each other's entries. Completion callbacks only update resources. Loaded locales apply synchronously; failed entries do not automatically retry for that document.
- **Failure semantics honestly bounded:** rejected imports become `failed`, end suspension and do not select a default. This intentionally preserves the original hook's swallowed-import behavior, not successful localization. The handoff explicitly discloses failure and the original shared `loading` flag's failure to reset after success. The original hook also selects defaults from asynchronous completions; the new cache removes that particular race, not the P1 race above.
- **SSR rejects:** lines 16-20 throw before document-resource allocation, locale-loader invocation or default selection. Imports of the configuration define loader functions; they do not invoke them. No SSR no-op, request-global locale selection, plugin extension or default-timezone change is introduced. Installed Day.js 1.11.21 declarations confirm the real global/instance locale APIs; inspected installed locale modules register with `locale(object, null, true)` rather than selecting the default.
- **Actual root not admitted:** the apps search finds only the original Next hook consumer, not a standalone Day.js join. The inspected Nitro root/provider composition does not import this bridge. Handoff and owner01 ledger explicitly retain the join as held. Browser-global mutation is therefore proposed, not certified as owned by an actual mounted root.
- **Public export still owner01-only:** requested exact manifest field is `"./standalone/dayjs": "./src/standalone/dayjs.ts"`; it is absent from the inspected translation manifest. Actual emitted declaration is `export declare function useSuspenseDayJsLocalization(locale: SupportedLanguage): void;`. This is an acknowledged outstanding join, not a worker-owned manifest repair.

## Raw validation evidence inspected

Evidence directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-dayjs-f2lqshgp/`.

Read `enumeration.log`, both read-only hash JSONs, `integrity.json`, all four command JSONs, raw typecheck file-list sections/closure search, formatter output, both empty diagnostic logs and the actual emitted hook declaration. Recorded exits are all **0** for typecheck, lint, format and declaration emit. Empty lint/declaration logs are not treated as success without their corresponding exit records.

The entire non-dependency closure in the raw list is exactly seven files: the hook, actual `config.ts`, actual `languages.ts`, and existing MRT `ca`, `lt`, `lv`, `sl` JSONs. Lint explicitly covers all three TypeScript sources. Typecheck uses the real installed dependencies with strict/noUncheckedIndexedAccess, Bundler resolution, JSON resolution and no emit. `--ignoreConfig` makes this an isolated entry check, and `--skipLibCheck` skips dependency declaration checking; neither a full-workspace strict pass nor runtime/concurrency correctness is established. Day.js locale declarations and genuine MRT declarations appear in the raw list; no stub substitutions or ignored import errors are evidenced.

All **14** before/after recorded read-only hash pairs match: original hook, config, languages, translation manifest and all ten pre-existing standalone files (`catalogs`, `client`, `compatibility-check`, `compatibility-types`, `i18n.spec`, `index`, `server`, `tsconfig`, `types`, `vitest.config`). `integrity.json` also records `readonly_changed: []` and equal hash-manifest digests. These are retained worker snapshots, not an independently rerun integrity check.

**Release boundary:** isolated static checks and canonical-loader reuse are supported. Mounted latest-locale ownership is not. Owner01 export/root composition, concurrent browser integration, server instance/request ownership, serialization/timezone decisions and hydration parity remain HELD; no fake success or broader release credit.

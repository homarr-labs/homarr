# Standalone Day.js localization

## Ownership and public join

Fresh P1 correction lease owns only `packages/translation/src/standalone/dayjs.ts` and this existing root handoff. The original Next hook, configuration/loaders/aliases, resource cache, language catalog, standalone provider/catalogs, runtime culture, root composition and manifests remain read-only. No mounted consumers exist under this lease. This amended contract is a candidate until independent review and owner 01 acceptance; root integration remains HELD.

Canonical finding: `.scratch/nitro-full-migration/implementation/playable-dayjs-review.md`, P1. Before editing, the exact reviewed source freeze was verified as SHA-256 `1e9f7232b91c0fa5b6194343e942b9d650db1a7775a8a2a2d503d738f2fe5c7f`; all 14 original read-only hashes still matched. This correction replaces render-time selection, not the existing date framework.

Owner 01 must add exactly this public export to `packages/translation/package.json`; this worker does not edit the manifest:

```json
"./standalone/dayjs": "./src/standalone/dayjs.ts"
```

Exact export-signature amendment, enumerated before source editing: replace the former `void` return with this exported discriminated result. The function name and canonical locale argument are unchanged.

```ts
export type DayJsLocalizationResult =
  | { status: "awaiting-commit"; requestedLocale: SupportedLanguage }
  | {
      status: "ready";
      requestedLocale: SupportedLanguage;
      selectedLocale: string;
    }
  | {
      status: "failed-retained-default";
      requestedLocale: SupportedLanguage;
      selectedLocale: string;
    };
```

Function signature: `export function useSuspenseDayJsLocalization(locale: SupportedLanguage): DayJsLocalizationResult;`.

The host passes its canonical `SupportedLanguage`, such as the current standalone provider's locale. No routing, browser-language inference, locale resolver, new provider, alternate catalog, Next import or duplicate locale mapping is introduced.

## Browser composition

Proposed caller sample, enumerated before source editing: mount exactly one canonical bridge inside the existing Suspense boundary and an actually browser-only subtree. Gate date children until `ready`; pending imports suspend, while settled but not committed requests return `awaiting-commit`. The fallback must not format dates using implicit Day.js defaults.

```tsx
import type { ReactNode } from "react";
import { useCurrentLocale } from "@homarr/translation/standalone/client";
import { useSuspenseDayJsLocalization } from "@homarr/translation/standalone/dayjs";

type BrowserDayJsLocaleProps = {
  children: ReactNode;
  fallback: ReactNode;
};

function BrowserDayJsLocale({ children, fallback }: BrowserDayJsLocaleProps) {
  const localization = useSuspenseDayJsLocalization(useCurrentLocale());
  if (localization.status !== "ready") return fallback;
  return children;
}
```

The original document-scoped `WeakMap<Document, Map<SupportedLanguage, LocaleLoadState>>` resource cache and actual canonical loaders remain. Resources survive initial Suspense retries; native completion callbacks only record loaded/failed resources. All alias mappings remain source-owned: `cn → zh-cn`, `zh → zh-tw`, `cr → en-gb`, `no → nb`, `de-CH → de-ch`.

Selection is exclusively synchronous inside a committed React layout-effect setup, never render or loader completion. Each hook instance has a stable token; the browser realm has one active owner lease, initially absent rather than pretending a locale has already been selected. A second mounted token throws before selecting. Each setup captures a fresh lease; cleanup retires only that exact current lease and never selects/restores a locale. No asynchronous selection callback exists for an old load/effect retirement to overwrite a newer commit.

Component state records the requested locale, exact settled resource, active lease and actual Day.js return value only after setup. Render returns `ready`/`failed-retained-default` only when all captured identities still match, otherwise `awaiting-commit`. This includes cached locale switches and retired/reconnected owners. Layout-effect state updates enable a subsequent gated child render; merely calling a void effect hook would not protect children during the preceding render.

In the reviewed `de → cached fr` interrupted-transition sequence, the speculative `fr` render returns `awaiting-commit`, and abandoned work runs no selection effect. The still-mounted `de` tree retains its default. If `fr` commits, the first committed bridge tree withholds date children, selects French, and then admits them on the readiness render. This minimal gate may unmount existing date children on a committed locale switch; retained child drafts/state and broader root sequencing are host integration questions, not promises of this hook. Date computations must occur inside gated descendants, not eagerly while constructing child/fallback props above the bridge.

As in the original hook, rejected imports end suspension and retain the existing Day.js default without selecting anything. Only after a real commit does `failed-retained-default` disclose that default via the actual `dayjs.locale()` getter; it never claims requested-locale success. The sample retains its fallback on failure. A host may explicitly choose to admit failed results as untranslated dates, but must disclose that policy and wait for the committed failed result, not `awaiting-commit`. Failed resource entries do not automatically retry during the document lifetime. The original shared `loading` flag fails to reset after initial success; the retained per-locale cache avoids that defect. No plugins or time zone defaults change.

Day.js's default remains realm-global. One canonical mounted owner and no external default selectors are required; the owner guard is not independent-root localization. Retirement leaves the actual last default untouched and removes authority/readiness; it does not restore a guessed English/pre-owner default. Previously created Day.js instances retain their locale. This is not request-scoped date ownership, a second date framework, or protection against unrelated global mutators.

## Held SSR date join

The hook throws an explicit browser-owner error on server invocation before calling any locale loader, creating any document resource or selecting a default locale. `"use client"` alone does not prevent an SSR host from executing client components; the host must actually admit this bridge as browser-only, with a stable server/hydration fallback.

SSR-localized date parity is specifically held. A future admitted server date owner must load the canonical locale and bind it through the real instance API `dayjs(value).locale(localeObject)` per request/instance. It must migrate relevant consumers away from implicit `dayjs()` defaults and settle serialization, time zone and hydration ownership. No `dayjs.locale(...)` selection is permitted across SSR requests, and this browser bridge does not claim that join exists.

## API evidence and verification

React and Day.js are already declared by `@homarr/translation`; actual installed versions are React/React DOM 19.2.7, React types 19.2.17 and Day.js 1.11.21. Installed React README, `@types/react/index.d.ts` and React DOM commit/layout cleanup implementations were inspected. Actual APIs are `useState<S>(initialState: S | (() => S))` and `useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void`; the installed declaration documents synchronous post-mutation setup/state flush before paint. This timing does not imply before-child-render selection without the explicit gate.

Installed Day.js README, `index.d.ts`, `esm/index.js::parseLocale` and real locale registration modules were inspected. The global API is `dayjs.locale(preset?: string | ILocale, object?: Partial<ILocale>, isLocal?: boolean): string`; the getter reports the real current default and object selection returns its name. Instance API remains `Dayjs.locale(preset: string | ILocale, object?: Partial<ILocale>): Dayjs`. Locale modules register with `locale(object, null, true)` without selecting a default. No invented adapter/API or dependency is introduced.

Context7 monthly quota exhaustion was already recorded; this correction uses actual installed documentation/declarations/implementation, not another provider call, installation or training-only API guess.

No tests, child agents, Git operations, installs, builds, browser activity, live provider calls or root/provider/manifest/runtime-culture edits are part of this lease. The export, failure UI, gated browser-only mounting, stable SSR/hydration fallback and concurrent root integration remain owner 01 work after independent source review.

### Isolated immutable correction validation

Strict no-emit TypeScript and full isolated-source lint both exited 0 against a separate read-only copied closure with the actual installed dependencies linked. No stubs, alternate locale declarations, suppressed import errors, declaration emit or whole-workspace claims. The historical original checks/declaration emit remain only historical evidence at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-dayjs-f2lqshgp/`; the old `void` declaration is superseded.

Correction evidence directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-dayjs-p1-mz8a8zqk/`.

- TypeScript 7.0.2 uses the explicit hook entry, `--ignoreConfig --target ES2024 --lib ES2024,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --jsx react-jsx --strict --noUncheckedIndexedAccess --skipLibCheck --resolveJsonModule --esModuleInterop --types node,react,react-dom --noEmit --listFiles`. Bun runs with `--no-env-file`.
- The actual non-dependency file list is exactly seven copied files: hook, canonical config, canonical languages and original MRT `ca/lt/lv/sl` JSONs. Installed React, Day.js locale and genuine MRT declarations resolve normally; third-party declaration checking is skipped, not substituted.
- Oxlint 1.73.0 uses copied repository rules, `--deny-warnings`, and all three TypeScript files in that closure. The raw diagnostic log is empty; its recorded exit code is 0.
- Initial immutable formatting check exited 1 for handoff sample/signature wrapping only; source formatting passed. That failed log is retained, not reported as success. Final immutable handoff/source Oxfmt 0.58.0 check exited 0; its exact argv/output/exit and immutable before/after hashes are retained separately.
- `snapshot-before.json` and `snapshot-after.json` match for every copied file. All 35 read-only checkout before/after hashes match, including the original 14, runtime culture, custom MRT JSONs, root/providers/manifests and repository check configurations. Final integrity records retain exact source/handoff hashes without a self-referential handoff hash. These establish bounded file integrity, not mounted runtime/concurrency correctness.

Frozen corrected source SHA-256: `7ee64f915468d638c5e9ed7ffb09fe8610edff432c2d642f79d7e13cbe112c04`. Exact public signature/result is recorded above. Independent review and owner 01 export/root admission remain HELD; SSR date ownership, hydration parity and integration sequencing remain HELD.

Raw `typecheck.log` SHA-256: `ae548c6d8d736997fc1fca401c957476de14f8e1bde8d727fa5db25017ae1443`; raw `lint.log` SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Exact argv, snapshot working directory and exit codes are in their `*.command.json`; no declaration emit was run in this correction.

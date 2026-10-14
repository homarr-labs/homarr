# Concrete public producer binding — final A reconciliation

**Result: installed cookie API, public culture exports, coherent request-clock change, literal setup bridge and the two existing dependency resolution entries are reconciled. One precise hold remains before a literal complete binding allocation: the exact settings-store/server-settings-router resource-object member nesting is not present in the retained A12 summary or these authorized bodies. Do not guess it.** Also, the proposed `contracts.ts` cookie edit is unnecessary: its current parse result already matches the installed declaration. No product implementation or mounting was performed.

## Completed coverage reused after restarts

Approved plan `.scratch/nitro-full-migration/PUBLIC-PRODUCER-CONCRETE-BINDING-PLAN.md` reached 1–32 EOF. These already-returned dedicated sequential reads were reused, not repeated during final recovery; each requested from line 1 with limit 2000:

| Primary authorized body/declaration                             | Complete returned interval / EOF |
| --------------------------------------------------------------- | -------------------------------- |
| `packages/translation/src/runtime/index.ts`                     | 1–31 / 31                        |
| `apps/backend/src/server/runtime-composition/contracts.ts`      | 1–161 / 161                      |
| `apps/backend/src/server/runtime-composition/public-culture.ts` | 1–240 / 240                      |
| `apps/backend/src/server/runtime-composition/runtime.ts`        | 1–154 / 154                      |
| `node_modules/cookie/dist/index.d.ts`                           | 1–143 / 143                      |

Five complete primary reads / 729 lines. The explicitly permitted contingency was indispensable for the literal native setup constructor/resource argument mapping; both files reached complete EOF:

- `packages/api/src/nitro/resources/-setup-read/context.ts`: 1–106.
- `packages/api/src/nitro/resources/-setup-read/resources.ts`: 1–26.

Seven complete source/declaration reads / 861 lines. No source/declaration body was missing, clipped, oversized or left partial. No import from those bodies was followed into Auth/DB/Core/schema/native/SDK/options/catalog/date or cookie implementation. The new explicit cookie declaration admission is not a claim that its manifest had a types field.

Necessary prior backend/root/API/Translation manifest metadata and A12 producer facts were reused. This A task's lock metadata greps returned the backend record start 38, Translation workspace start 1039, cookie catalog 1504 and the two existing resolved module entries at 2003/3713. Two identical narrow grep results and two overlapping metadata reads occurred across the interrupted continuation; they are duplicate metadata observations, not independent source/currentness evidence. The metadata reads returned 38–60 and 38–59, each containing the entire intended backend record 38–57. Neither is claimed as whole-lock EOF.

**Preserved metadata boundary overrun:** those reads incidentally returned the next `apps/docs` record header/name/version at 58–60, beyond the intended backend record. This was not required and is not relabeled compliant backend-only evidence. No docs dependency fields or continuation were acquired. Tool “output truncated / continue” notices referred to the rest of the intentionally sliced lock, not a clipped backend record or primary body; no whole-lock continuation followed. No hashes were computed or captured as provenance; an integrity value appearing in the resolved cookie metadata was not used as identity/native evidence.

The server interruptions occurred after returned source reads and before the optional report write. No report write had returned success. The latest direct destination read returned file-not-found, and this is the sole new report patch. Final recovery performed no repeated review, source acquisition, typecheck or documentation lookup.

## Installed cookie adapter: exact and already type-compatible

The newly admitted installed declaration confirms:

- `Cookies = Record<string, string | undefined>` (22).
- `parseCookie(str: string, options?: ParseOptions): Cookies` (29).
- `SetCookie` has captured `name: string`, `value: string | undefined`, `maxAge?: number`, `path?: string`, `sameSite?: boolean | "lax" | "strict" | "none"` and other declared attributes (46–122).
- `stringifySetCookie(cookie: SetCookie, options?: StringifyOptions): string` (136).

The literal minimal codec proposal is:

```ts
const cookies: CookieCodec = {
  parse: parseCookie,
  serialize: (name, value, attributes) =>
    stringifySetCookie({ ...attributes, name, value }),
};
```

This uses the installed v2 public names, not legacy aliases or a homemade parser. Attribute spreading precedes explicit captured name/value, so even extra runtime properties cannot replace the captured descriptor identity. Current local `CookieCodec` already returns `Record<string, string | undefined>` and narrows serialization to real maxAge/lax/path (contracts 151–154). **No contracts change, widened attributes, new alias or default return is needed.** Installed manifest/version 2.0.1 and the version-tag README are retained prior metadata/user-provided documentation evidence; no fresh web call or cookie implementation execution was performed.

## Genuine public culture entry and same-instant options

Actual `@homarr/translation/runtime` barrel source exports locale resolution/cookie effects/sync (1), request culture loading (3), public `CultureSnapshotOptions` type (5), formatter/preferences (12–13). Its internal reexport targets were not followed. Supported languages and public language path are retained compliant A6 findings, not B4 extra-body evidence.

Infer the caller options from the public function, for example `NonNullable<Parameters<typeof loadRequestCulture>[1]>`, or use its already-declared public `CultureSnapshotOptions` export. Do not import a private standalone type path or maintain a replacement IntlConfig schema. Signature inference through the actual public export is the proposed compiler binding, not a claim that unread implementation signatures were freshly printed or tested here.

The exact necessary clock change is confined to the known culture selection seam:

1. `public-culture.ts` 53: change `snapshotOptions(context)` to `snapshotOptions(context, capturedNow: number)`.
2. Keep the existing single `options.now()` sample and finite check at 68–69. At 70 pass that same `capturedClock` as the additional argument.
3. Concrete runtime binding uses ordinary `Date.now` and returns `{ ...callerOptions(context), now: new Date(capturedNow) }` from that callback. Force only coherent `now`, after the caller spread; preserve supplied timezone/formats/error handlers and all existing supported options.
4. Keep existing Date validation/cloning (71–77), formatter `now: () => capturedClock` (90–92), seed recording (120–125), SQL/resource reads, preference/cookie behavior and origin/body policy unchanged.

This makes i18n options, formatter and recorded request instant agree without a second clock sample, global mutable timestamp, stale construction timestamp or invented epoch. No timezone choice/default is introduced: caller timezone policy remains supplied as before. Existing loopback-only locale POST policy remains held and unchanged.

## Literal native setup bridge: no missing hooks or substitute authority

Fresh authorized setup source now proves the native constructor is exactly:

```ts
createSetupBackedContext(input, admission, resources);
```

Its resources are exactly `{ operators: { eq }, now: Date.now }` (resources 14–17). Its admission is `{ database, schema, signal, assertCurrent }`, with actual schema containing users/onboarding/serverSettings (7–12). `runtime.ts` already receives actual `PublicBackendInput` plus `BackendAdmission` from the public RPC path; contracts 71–87 supplies the genuine request/signal/effect/onDispose and admitted database/schema/currentness.

The source-backed binding mapping is:

```ts
createSetupBackedContext(
  input,
  {
    database: admission.database,
    schema: admission.schema,
    signal: admission.signal,
    assertCurrent: admission.assertCurrent,
  },
  { operators: { eq }, now: Date.now },
);
```

Use public `@homarr/api/nitro/resources/setup-read`, not the inspected internal implementation paths as imports. The real setup constructor rejects signal mismatch (context 79), fences actual admitted DB/abort/currentness (18–29), constructs genuine setup reads and forwards request/effect/onDispose with that fence (85–105). It extracts claim token through its existing implementation; no cookie/claim internals were followed or replaced. Optional error callbacks are not a reason to fabricate request IDs, authority or no-op hooks.

The current public transport already delivers guarded hooks and genuine admission; no additional `PublicBackendInput` currentness field or hook repair is needed. Request disposal registration remains the actual request collector; freezing shapes is not authentication or permission evidence. Main owner admission must surround actual RPC handler/response completion as already retained; no native settlement/currentness-through-COMMIT claim is added.

## Minimal real producer/resource contract and remaining literal hold

Retained A12 evidence identifies these actual public constructors and values:

- `createSettingsStore`/`settingsCodec` from `@homarr/api/nitro/helpers/settings`.
- `createServerSettingsProcedures` from `@homarr/api/nitro/routers/server-settings`.
- `defineBackendContribution` and genuine native source metadata from their existing public API source entries; no stub descriptor or new export.
- Real `eq`/`and`/`inArray` from reviewed public `@homarr/db` exports.
- Actual captured `schema.serverSettings` for store/settings reads and `schema.boards` for the original router factory, including its required board/operator resources even when only public queries are selected.

Derive object contracts with `Parameters<typeof createSettingsStore>[0]` and `Parameters<typeof createServerSettingsProcedures>[0]`. Do not invent resource field names/nesting, private type imports, substitutes or additional tables/connections. The actual tables/operators/codec are known, but A12's retained prose does not contain literal resource-object nesting. These final A bodies do not declare either resource shape. Therefore this report cannot honestly present a verified literal settings/router object merely by guessing `codec` versus another slot or where schema fields belong.

**Smallest remaining reconciliation:** coordinator supplies the already-reviewed literal resource mapping/signature from A12, or separately admits only these exact known public producer implementations for signature recovery:

- `packages/api/src/nitro/routers/-settings-setup/settings.ts`.
- `packages/api/src/nitro/routers/server-settings.ts`.

Neither was reacquired here; no automatic scope expansion or import following is proposed. This is a gap in the available literal receipt, not an assertion that the factories or public types are missing/broken. If that literal mapping is supplied, the remaining wiring uses the existing constructor and exact actual factory values; no other producer framework is needed.

Construct the original router with its real resources, but enroll only `getCulture`/`getBranding` in the existing public registry. Preserve exact `serverSettings.getCulture` and `serverSettings.getBranding` identities, source query/public/guarded-demo metadata and `defineBackendContribution` validation. The protected reads/mutations of the six-procedure factory remain unmounted. No broad anonymous namespace or tRPC tunnel is justified.

## Dependency/lock reconciliation and prospective write scope

Backend/root/API/Translation manifest facts are retained from the completed A6 phase: API/DB/contracts are already directly declared; Translation and cookie are not directly declared by backend. Existing public language/runtime/API subpaths need no manifest export change.

The only prospective backend dependency additions are:

```json
"@homarr/translation": "workspace:^0.1.0",
"cookie": "catalog:"
```

The complete inspected backend lock record at 38–57 lacks those fields. Existing resolved entries are already present: `@homarr/translation@workspace:packages/translation` at 2003, and `cookie@2.0.1` at 3713; root lock catalog at 1504 is 2.0.1. Only the two corresponding backend workspace dependency fields would change. No installation, version/resolution/integrity update, dependency graph rewrite or package manager execution is needed or authorized by this report. A discrepancy discovered during future editing must stop, not trigger installation.

Prospective plan B paths reconcile as follows, **not a current code lease**:

1. `apps/backend/src/server/runtime-composition/runtime.ts`: concrete public producer selection, exact setup mapping and cookie adapter, public culture/language values and coherent supplied options; preserve one owner/actual captured schema/outside-admission cleanup/render/reporting.
2. `apps/backend/src/server/runtime-composition/public-culture.ts`: only the captured-time argument/signature/call addition, preserving all other policy/body behavior.
3. `apps/backend/src/server/runtime-composition/contracts.ts`: **no change needed** because CookieCodec is already exact; do not create an artificial fifth modification.
4. `apps/backend/package.json`: only the two existing-package direct declarations.
5. `bun.lock`: only the matching two backend dependency-record fields.

Thus the candidate five-path review scope needs at most **four actual product-file writes** once the literal resource mapping is reconciled and independently released. No native owner, assembly, public RPC, compose/barrel/entry/render/export/test source or production listener change is requested.

## Final gate and preservation receipt

The remaining hold is precise literal settings/router argument recovery, not a broad absence claim, missing request hook, broken language export, cookie implementation issue or need for another pool/library. Independent review/coordinator reconciliation must precede implementation. No literal unseen resource object or compiled compatibility result is invented.

Earlier A6 cookie API hold remains historical; the newly explicitly admitted declaration resolves that acquisition issue without inventing a manifest types field. B4 extra-five backend-read deviation remains unchanged and is not retroactively validated by this report. The incidental lock next-header overrun and duplicate interrupted metadata observations above are likewise preserved, not erased.

User-provided owner source/backend types 0 and Nitro 7 errors remain context, not fresh checks. Production is still foundation-only. No principal/session/epoch/adoption, nonretryable ambiguous-COMMIT/through-COMMIT authority, native close/drain/lifetime, private host, restore/restart or formal179/FILE-DATA/91-of334 acceptance follows. Default production and stored data were untouched. Ordinary-server self-hosting/no mandatory Cloudflare or tunnel remains; Darwin work is PAUSED.

Only this directly collision-checked new report was written. No product/dependency edit, command/compiler/lint/test/build/install, resolver/module evaluation, runtime/native/SQL/data/environment/secrets/capture/stat/hash/Git/browser/delegation or Context7 call occurred. The already-verified version-tag README was reused, not refetched. Restarts did not authorize duplicate source acquisition, implementation or status polling.

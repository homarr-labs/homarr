# PLAYABLE-WAVE32 lane04 — document/assets/styles

## Exact reviewer correction lease — before edits

Only `apps/nitro/src/source-ui/document/head.tsx` and this existing handoff are reopened. The other10 implementation files and all27 public assets stay frozen. Reviewer `ses_ed4a2f7ccffeBvNxRrAvPGLbI2` verified the prior11 source hashes/27 asset bytes/styles, but did not find retained raw lint/typecheck logs; prior summary is not represented as raw evidence.

Four corrections: expose `suppressHydrationWarning: true` only in returned HTML attributes; board Apple metadata omits title and uses resolved default status-bar style; emit original `mobile-web-app-capable=yes`; emit automatic OG-derived Twitter summary/title/description. Preserve all other snapshot/DOM/CSS/assets/nonce/Crowdin/manifest behavior. No contract file, font fetch, root/config, peer paths, tests, Git or child agents are reopened.

Verified read-only sources before correction: original root `layout.tsx:73–87,184–193`; board `_creator.tsx:207–217`; installed Next `resolve-metadata.js:203–205,619–652`, `resolvers/resolve-basics.js:185–201`, `resolvers/resolve-opengraph.js:166–176`, `metadata.js:601–637`; installed Mantine `ColorSchemeScript.mjs:4–9`. Board AppleWebApp is replaced, not deep-merged: absent title resolves null and is not emitted; absent statusBarStyle resolves `default` and that default tag IS emitted. Mantine writes `data-mantine-color-scheme` on documentElement before hydration, so matching snapshot does not remove the need for narrow HTML attribute suppression.

## Exact write inventory before implementation

All destinations below are NEW, except this handoff. Original Next sources/assets remain read-only. No output, config, manifests, credentials, appdata, SQL WASM, peer modules, Git, new tests or child agents are leased.

Source implementation:

- `apps/nitro/src/styles/color-scheme.css`
- `apps/nitro/src/styles/scroll-area.css`
- `apps/nitro/src/styles/font.css`
- `apps/nitro/src/styles/index.ts`
- `apps/nitro/src/source-ui/document/assets.ts`
- `apps/nitro/src/source-ui/document/contracts.ts`
- `apps/nitro/src/source-ui/document/font.tsx`
- `apps/nitro/src/source-ui/document/head.tsx`
- `apps/nitro/src/source-ui/document/manifest.ts`
- `apps/nitro/src/source-ui/document/service-worker-registration.tsx`
- `apps/nitro/src/source-ui/document/index.ts`

Safe original public copy mappings (same relative path under `apps/nextjs/public/` and `apps/nitro/public/`):

- `favicon.ico`
- `sw.js`
- `logo/logo.png`
- `images/demo-dashboard-background.svg`
- `images/mock/avatar.jpg`
- `images/pwa/192.maskable.png`
- `images/pwa/512.maskable.png`
- `images/apps/imdb.svg`
- `images/apps/lastfm.svg`
- `images/apps/lidarr.svg`
- `images/apps/nextcloud.svg`
- `images/apps/radarr.svg`
- `images/apps/readarr.svg`
- `images/apps/sonarr.svg`
- `images/apps/the-tvdb.svg`
- `images/apps/tmdb.svg`
- `images/apps/truenas.svg`
- `images/apps/unraid-alt.svg`
- `images/apps/vgmdb.svg`
- `images/kubernetes/configmaps.svg`
- `images/kubernetes/ingresses.svg`
- `images/kubernetes/namespaces.svg`
- `images/kubernetes/nodes.svg`
- `images/kubernetes/pods.svg`
- `images/kubernetes/secrets.svg`
- `images/kubernetes/services.svg`
- `images/kubernetes/volumes.svg`

Copy operations must reject symlinks/nonregular files and existing destinations and verify source/destination SHA-256 equality. `sql-wasm.wasm` is deliberately excluded. No font binary is enumerated: original source declares `Inter({ subsets: ["latin"], variable: "--font-sans" })`, but contains no font payload. No protected generated output will be inspected or copied and no replacement/external font fetched.

## Immediate integration contract/request for lane01

Root owns imports and document insertion. Preserve original root stylesheet order:

1. `@gfazioli/mantine-onboarding-tour/styles.css`
2. `@homarr/notifications/styles.css`
3. `@mantine/lightbox/styles.css`
4. `@homarr/spotlight/styles.css`
5. `@homarr/ui/styles.css`
6. `flag-icons/css/flag-icons.min.css`
7. `mantine-datatable/styles.css`
8. `src/styles/color-scheme.css`
9. `src/styles/scroll-area.css`
10. `src/styles/font.css` (Next font body class/variable replacement)

`@homarr/ui/styles.css` must stay canonical: its five imports and original Homarr overlay z-index variables are reused, not copied/restyled. Do not switch to `styles.layer.css`, flatten CSS, or reorder original global imports. Component CSS still needs the installed `postcss-preset-mantine` pipeline (`rem()`, breakpoint variables, dark/light mixins); lane01 alone configures it.

Admission requests: direct Nitro declarations for existing source-required `@gfazioli/mantine-onboarding-tour`, `@homarr/notifications`, `@mantine/lightbox`, `@homarr/spotlight`, `flag-icons`, `mantine-datatable`, plus installed `postcss-preset-mantine` and `postcss-simple-vars`. This lane publishes the ordered string descriptors and local usable CSS, not undeclared runtime imports. `originalMantineBreakpointVariables` reproduces all five original PostCSS variables exactly.

Exact Inter delivery remains HOLD until an explicitly admitted, original-provenance local font closure is supplied. Preserve variable normal 100–900, swap, Latin preload, original returned subset faces and fallback metrics; do not call a system fallback visual parity. No external font request is introduced.

Read authority: PLAYABLE-WAVE32 lines59–76 Oracle amendments; original FRONTEND-PRESENTATION-LEASES residual document row and canonical CSS rule; A01 document/font presentation handoff; original root layout/theme/manifest/SEO/service worker and installed Mantine/Next font declarations and sources. No mutable peer implementation is consumed.

## Implementation and validation

Ready for lane01 snapshot now: all enumerated implementation files and27 static assets exist. `src/source-ui/document/index.ts` and `src/styles/index.ts` are immediately usable; no peer runtime imports. Every static source/destination pair passed SHA-256 and byte-length equality, with symlink/nonregular/existing-destination refusal. SVGs were parsed as SVG and rejected if scripts, foreignObject or event attributes appeared; `images/kubernetes/secrets.svg` is an original decorative resource icon, not secret data. All original static assets were copied as narrowly enumerated raw-byte assets, including SVGs, to avoid changing bytes. Source code edits use patch.

Frozen mapping is exported by `originalStaticAssets`:27 `{ href, source, destination, bytes, sha256 }` records. Original safe bytes retained at their exact request paths; no `/_next` references, cache artifacts or SQL WASM copied.

### Source mappings and exports

| Original read-only specification                                                                         | Owned implementation                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/nextjs/src/styles/color-scheme.scss`                                                               | `src/styles/color-scheme.css`: identical noncomment CSS declarations/rules; no Sass constructs needed                                                                                         |
| `apps/nextjs/src/styles/scroll-area.scss`                                                                | `src/styles/scroll-area.css`: identical noncomment CSS declarations/rules; no Sass constructs needed                                                                                          |
| Root layout lines4–12 + `apps/nextjs/postcss.config.cjs`                                                 | `originalGlobalStylesheetOrder`, `originalMantineBreakpointVariables`; original shared CSS/z-index stays canonical                                                                            |
| Root layout Inter invocation + installed Next font loader/defaults/PostCSS + `capsize-font-metrics.json` | `originalInterConfiguration`, `src/styles/font.css`, `originalDocumentBodyClassName`, `OriginalFontResources`                                                                                 |
| Root `generateMetadata`, `generateViewport`, HTML/style/body and global custom CSS                       | `OriginalDocumentSnapshot`, `createOriginalDocumentAttributes`, `createOriginalDocumentMetadata`, `OriginalDocumentHead`                                                                      |
| Board `_creator.tsx:196–218`                                                                             | `OriginalDocumentPage` board variant preserves absolute metaTitle, whitespace-aware favicon fallback, Apple/startup overrides                                                                 |
| `components/layout/search-engine-optimization.tsx`                                                       | Snapshot's four `crawling` flags → independent robots/Google lists in original order                                                                                                          |
| `apps/nextjs/src/app/manifest.ts`                                                                        | `createOriginalWebAppManifest(branding)` preserves names/description/URL/display/colors/icon order exactly                                                                                    |
| `components/layout/service-worker-registration.tsx` + `public/sw.js`                                     | `ServiceWorkerRegistration`; exact scope/updateViaCache/error copy, original worker bytes (no fetch/cache/private offline storage)                                                            |
| `components/layout/crowdin-live-translation.tsx`                                                         | `getOriginalCrowdinScripts(locale)` preserves `cr` predicate, script order, source/configuration and Next `afterInteractive` strategy as descriptors; host lifecycle insertion remains lane01 |

### Required insertion

- Import admitted global styles once on the client/server shared entry in the published exact order; these are string descriptors, not implicit dynamic imports. No new UI defaults, reset, layer, spacing, tokens or theme changes.
- Spread `createOriginalDocumentAttributes(snapshot).html` on the sole `<html>` and `.body` on `<body>`. Matching locale/direction are host-supplied; this lane invents no locale/session resolver. Use the same snapshot for first paint and hydration. HTML-only `suppressHydrationWarning: true` preserves the original narrow allowance for Mantine's prehydration documentElement attribute update; no body, subtree or tree-wide suppression is added.
- Insert `OriginalDocumentHead({ snapshot, nonce?, manifestHref? })` exactly once in the root head, after shared global CSS so its `data-homarr-global-custom-css` overrides retain source order. ColorSchemeScript is the real installed Mantine component, emitted before body/paint, not forceColorScheme. Host must not emit duplicate titles/viewport/theme/scripts or reorder custom CSS ahead of global defaults.
- `snapshot.workshopUrls` is optional and must only be populated by lane01 for the source-authenticated case. This lane reads no auth/private settings and never derives identity from cookies.
- Root metadata uses appName + `page` title template and translated `description`/`dashboardTitle` supplied by locale owner. Board metaTitle is absolute and favicon has source fallback semantics. Brand customCss/URLs must be the public authoritative projection; this is not a user-input or arbitrary-script policy boundary.
- Root mounts `ServiceWorkerRegistration` once, only if its preview policy permits service-worker takeover. The byte-preserved original `/sw.js` only claims clients; it does not implement offline caching. No registration was executed in this lane.
- Host serves the factory's request-scoped manifest at its owned chosen route (original Next path `/manifest.webmanifest`), then supplies `manifestHref`. No static invented branding manifest is written.
- `OriginalFontResources({ stylesheetHref, latinPreloadHrefs, nonce? })` emits local stylesheet/preload links for a subsequently admitted original Inter closure. Paths must be origin-local; no fake font URL is supplied. Exact original font bytes remain HOLD, and the descriptor visibly records `awaiting-original-local-font-assets`.

Inter fallback metric provenance: installed Next's `calculateSizeAdjustValues` algorithm applied directly to installed `inter`/`arial` JSON gives ascent90.44%, descent22.52%, lineGap0%, sizeAdjust107.12%. `font.css` retains the Next body font style/variable and metric-adjusted fallback intent; it does not contain a downloaded or substituted Inter face. Mantine's original `Inter, system-ui, -apple-system, sans-serif` body/headings theme remains untouched. Source glyph fallbacks/100–900 normal/swap/Latin preload intent are conserved; absence of the actual Inter faces is not font parity.

### Initial validation summary (raw logs were not retained)

Completed owned implementation is frozen. Eight TypeScript/TSX roots and three CSS files were copied into `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable04-final-55cjvaik`. Consumed React/Mantine/type dependency declarations and manifests were copied, not symlinked; no mutable workspace package, peer source, root route/config graph or `.env` was imported. Tool subprocesses used a clean explicit environment containing only Node24.18.0 PATH and disposable TMPDIR. No install/build/runtime/browser/tests/listener/cache/output/SQL/provider/Git operation ran.

- Installed oxlint1.73.0, frozen root configuration, `--disable-nested-config --deny-warnings`: PASS,0 warnings/errors,8 owned files,197 rules.
- Installed TypeScript7.0.2, explicit owned roots, strict/isolatedModules/noUncheckedIndexedAccess, ES2022+DOM, Bundler/react-jsx, `--noEmit --incremental false`, copied dependency declarations with skipLibCheck: PASS. This proves the owned closure only, not full product joins or dependency internals.
- Original/preserved color-scheme and scrollbar CSS: PASS, exactly equal noncomment/nonwhitespace rule and declaration sequences. Comments were not introduced; declarations, !important, selectors, media query, colors and sizing remain original.
- All11 source hashes remained unchanged across validation. All27 public copies passed regular-file/no-symlink/exclusive-create/source+destination SHA verification at copy time; exact hashes/bytes are the immutable `originalStaticAssets` export.
- Additional oxfmt0.58.0 check:10 files clean; `scroll-area.css` flagged preserved original stylesheet formatting. Its exact original declaration sequence was deliberately retained rather than silently changing the frozen source artifact. Formatting is not claimed clean for that stylesheet.

Source freeze SHA-256:

| Path relative to `apps/nitro/src/`                   | SHA-256                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `styles/color-scheme.css`                            | `f1511a9b398d6257480d11bf18af3a585b7abb8f45fe23cfd51b9929b3220d16` |
| `styles/font.css`                                    | `da90fa16eccbb30cf4928066e9706f25356e7d8335dc3ade368cca4f25bbffc9` |
| `styles/index.ts`                                    | `eec10ba306a42f7faf680796dacf57b6a625534b754dc0b5750f246f305efde9` |
| `styles/scroll-area.css`                             | `55ac09f35f99bfe5d4770e0fc505a8db9d855587b057e494f1337b79e500a9f9` |
| `source-ui/document/assets.ts`                       | `00081d0187f2fe2c8cb67f6870814ef131a2409ca2ee2a4bef0b9e36e0f305ab` |
| `source-ui/document/contracts.ts`                    | `78a7c7aba5fec45fcaf4258b5d11cd17aed6aec0de37091ed8592c31ce42bb65` |
| `source-ui/document/font.tsx`                        | `32c811869310b8ce913ae30525123b497d85bb89c217152b07976a6fa88218c6` |
| `source-ui/document/head.tsx`                        | `69c5235b0324705ab908251b6a36336e2d33da6c28ebde97eec09a15f6527c4c` |
| `source-ui/document/index.ts`                        | `de6fb7d0cb5ca147f745b7cbd3d22cc7c4b2493688417d45e9c119e603a414df` |
| `source-ui/document/manifest.ts`                     | `94ad1a3359cd90cb01b84f0f8857e07d0de1559f7fd012ca39a7c14dc43095da` |
| `source-ui/document/service-worker-registration.tsx` | `1726814b93d4b48074a6ece7fae80639610c507c042c911321aaff45f07ff009` |

Outstanding host-owned joins: global CSS admission/imports + Mantine PostCSS; actual original Inter font payload acquisition explicitly authorized outside this lane; sole head/SSR hydration/root manifest/Crowdin lifecycle insertion; browser first-paint and visual proof. No preview, complete-font parity, installed PWA, native action or production proof is claimed.

## Correction implementation frozen for independent rereview

Only the leased `head.tsx` and this handoff changed. Four exact changes:

1. `createOriginalDocumentAttributes` returns HTML-only `suppressHydrationWarning: true`. Its return type intersects the existing frozen `OriginalDocumentAttributes` with the narrow HTML property, exposing the property to consumers without editing `contracts.ts`. Existing body attributes are unchanged.
2. Board metadata resolves `appleTitle: null` and `appleStatusBarStyle: "default"`; the Apple title tag is conditional and therefore absent for boards. The default status-bar tag remains emitted, matching installed Next's emitter. Root/ordinary-page appName title and dark `black-translucent` behavior remain unchanged. Board icon/startup-image/fallback/title behavior is untouched.
3. Replaced the substituted `apple-mobile-web-app-capable` tag with the original emitted `mobile-web-app-capable=yes` tag.
4. Added `twitter:card=summary`, `twitter:title` from the existing OpenGraph/dashboardTitle value, and `twitter:description` from the existing OpenGraph/description value. No new metadata input, image, scoring, font fetch or title composition was invented.

Current `head.tsx` SHA-256: `69c5235b0324705ab908251b6a36336e2d33da6c28ebde97eec09a15f6527c4c`. Previous reviewed head hash was `3045ca8c3a64c6260ce4d94d3b234a31d9e8435d7c3d75a70014410fbf9bc293`. The source freeze table above now records the corrected current hash; all other10 hashes remain identical. All27 original/destination asset pairs were rechecked for exact length/SHA equality against the existing frozen asset map; no asset was recopied or modified.

### Retained raw correction validation evidence

Immutable copied closure and raw evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable04-correction-kmds20d9`

The directory contains all11 frozen owned files, copied real installed React/Mantine/transitive declaration dependencies (no symlinks, peer imports or stubs), copied root lint config, explicit-root `tsconfig.json`, `owned-hashes.json`, and `validation-results.json`. The latter records exact executable/arguments/CWD/environment/exit codes and log filenames. Clean subprocess environment has only Node24.18.0 PATH and disposable TMPDIR. No installation/build/runtime/test/listener/protected output/credentials/SQL/Git/child-agent action ran.

- `lint.stdout.log`: raw oxlint1.73.0 output,0 warnings/errors,8 files,197 rules. `lint.stderr.log`: empty. `validation-results.json` records lint exit0 for `--disable-nested-config --deny-warnings` with frozen config and all8 explicit owned TypeScript roots.
- `types.stdout.log` and `types.stderr.log`: both empty, as returned by the real installed TypeScript7.0.2 compiler. `validation-results.json` records types exit0 for `--noEmit --incremental false --project <isolated tsconfig>`, retaining strict/isolatedModules/noUncheckedIndexedAccess and copied dependency declarations with skipLibCheck. This is owned-closure type proof only, not a full-product build or dependency-internals check.
- Source hashes were checked unchanged after both commands. All10 nonleased source hashes and all27 asset pairs match the prior frozen mapping.

These retained files are new correction evidence; they do not retroactively constitute raw logs for the initial pass. Independent rereview and root/runtime/browser proof remain outstanding. Exact Inter delivery remains HOLD.

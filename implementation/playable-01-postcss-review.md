# Lane01 PostCSS unknown-handler review

## Decision

**Frozen `-g` correction ACCEPTED for the two previously reported P2s; both resolved.** No new P0-P3 finding in this narrow rereview. The historical findings below concern the removed callback, not the corrected candidate. Neither the candidate nor the existing live preview receives production/runtime acceptance from this review.

## Independent frozen `-g` rereview

Candidate: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-wave32-lane01-20261011-g`. Recorded config SHA256: `924dd4166cf00967297a6973c117bb361f9c85866a260c76cdb5ff86e08d8f12`.

Read the actual copied `source/apps/nitro/postcss.config.cjs`, relevant installed PostCSS/simple-vars/Vite implementation, and retained command/log evidence. No command, build, test, browser, runtime, process, Git or agent action was performed. Only this existing review artifact was updated. Recorded hashes/inventories were read, not independently recomputed.

### Why both P2s are resolved

- The callback and all token/name admission logic are gone. Simple-vars 7.0.1 installs its original throwing `unknown` callback (`index.js:132-136`); no `silent` or `only` override is supplied.
- The wrapper awaits a complete inner PostCSS pass with `mantine()` followed by `simpleVars()` on the same root, preserving all five breakpoint values. Source variables, interpolations, properties, recursive aliases and marker-shaped source strings are processed before URL generation, with the original failure semantics.
- Installed PostCSS 8.5.29 `lib/lazy-result.js:146-184` accepts that root and explicitly supplies `Helpers.postcss`. Its `runAsync:292-306` awaits each plugin's `Once` in order before running outer visitors; awaiting the inner processing includes its visitors and `OnceExit` (`325-346`).
- Installed Vite 8.1.4 still appends `vite-url-rewrite` after configured plugins (`node.js:22558`), with URL generation in its `Once` (`22744`). Thus source processing has completed before generated dollar-bearing references arrive. There is no outer simple-vars visitor left to reinterpret those generated references.

This phase-order correction is sufficient and cleaner than the earlier shielding recommendation: it needs no marker grammar, guessed hash length, occurrence allowlist or source-text provenance exemption.

### Retained evidence inspected

- `evidence/postcss-boundaries-final.command.json` has status 0. Its actual Vite flag-icons build uses `write:false`, captures generated URLs, and its replay uses a replacement callback rather than JS replacement-string dollar expansion.
- `evidence/postcss-boundaries-final.log` records Vite 8.1.4/simple-vars 7.0.1/PostCSS 8.5.29, dollar-free original source, **542** generated references and actual `__VITE_ASSET__L0$LEAet5b27A8y$$nPHHw__`. Generated replay and `48em` preservation pass.
- The same log records default errors for ordinary unknown, same-name/prefix/interpolation/property collisions, recursive alias, quoted marker, quoted URL marker, unproven source literal and source-postfix variable. Original preset/vars mixin/nesting output is byte-identical in the retained comparison. The full real asset build exercises multiple generated references without any admission code.
- Earlier `postcss-boundaries.log` retains the failed replay probe. Its visible command used a replacement string; `$$` is consequently collapsed by JavaScript replacement semantics. The corrected command uses `()=>...`, consistent with the final passing replay. This does not indicate a remaining config defect.
- Full copied `build.command.json` has status 0; raw build log records SSR/client/Nitro completion and unsuppressed chunk warnings. Frontend lint explicitly includes the CJS config and reports **44 files, zero errors/warnings**, status 0. Strict types with `--noUncheckedIndexedAccess` return status 0 and an empty error log; this is supporting closure evidence, not a CJS typecheck.
- `closure-verification.json` records this config hash, unchanged-from-backup-preview-except-config status, evidence/output hashes and unchanged source inventory. These remain recorded verifier claims rather than a fresh hash run by this review.

**Scope:** accept only resolution of the two PostCSS P2 findings for these frozen candidate bytes and installed pipeline. No further correction is required for those findings. `-g` was not launched by this reviewer; live `-f`, product/private/native boundaries and production acceptance remain untouched and outside scope.

## Historical initial review

The initial callback was held for two P2 findings. Original review scope was `apps/nitro/postcss.config.cjs:5-10`; no source, runtime, Git, browser, command, build, test or child-agent action was performed.

## P2 — A token grants declaration-wide permission for its variable-name substrings

Location: `apps/nitro/postcss.config.cjs:7-8`.

`postcss-simple-vars` calls `unknown(node, name, result)` separately for each unresolved reference, without its occurrence offset or the current replacement-pass string. Returning `undefined` preserves that reference; it does not mark just the Vite occurrence as ignored. The handler therefore admits every matching name anywhere in that declaration, because it searches the entire original `node.value` on every callback.

Source-derived counterexamples, **not executed**:

```css
a {
  background: url(__VITE_ASSET__C$$nPHHw__) $nPHHw__;
}
a {
  background: url(__VITE_ASSET__C$$nPHHw__) $nPH;
}
a {
  background: url(__VITE_ASSET__C$$nPHHw__) $(nPHHw__);
}
a {
  $(nPHHw__): url(__VITE_ASSET__C$$nPHHw__);
}
```

The standalone `$nPHHw__`, partial collision `$nPH`, interpolation `$(nPHHw__)`, and property interpolation all return normally instead of throwing. Properties are also processed with the same declaration node, after its value, so `node.type === "decl"` does not isolate declaration-value callbacks. Adding multiple asset URLs does not fix the issue: `some` admits a name found in any one token. A genuinely unrelated name still throws, which is why the retained boundary check passes.

There is an additional constraint on a residual-text-only callback fix: the plugin recursively substitutes temporary strings while `node.value` still holds the original value. A defined alias expanding to an undefined colliding name outside the asset can reach `unknown` without that expanded occurrence being visible in `node.value`. Replacing `includes` with exact-name matching, or merely stripping tokens and checking the original value, is not a complete occurrence-isolation fix.

## P2 — Marker-shaped source text is treated as a generated asset

Location: `apps/nitro/postcss.config.cjs:7`.

The marker regex is not restricted to a complete asset URL value or to generated references. For example:

```css
a {
  content: "__VITE_ASSET__C$$nPHHw__";
}
a {
  content: "url(__VITE_ASSET__C$$nPHHw__)";
}
```

Both contain an unresolved `$nPHHw__` according to the actual plugin and are exempted even though the exception is intended for generated asset occurrences. The regex does not parse CSS strings, enforce URL boundaries, or establish generation provenance. A marker with no closing `__` does fail closed; that alone does not make completed marker-shaped strings safe. An authored string indistinguishable from a generated marker cannot be authenticated by this callback's `(node, name)` inputs.

## Installed-source verification

The retained snapshot root is:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-wave32-lane01-20261011-e`

Its actual `source/apps/nitro/node_modules` resolves Vite **8.1.4**, `postcss-simple-vars` **7.0.1**, and `postcss-preset-mantine` **1.18.0**. The checkout installations also report Vite 8.1.4/simple-vars 7.0.1. The copied config contains the same reviewed handler.

- Vite `dist/node/chunks/node.js:20745` consumes `/__VITE_ASSET__([\w$]+)__(?:\$_(.*?)__)?/g`. Its reference grammar admits ASCII letters, digits, underscore and dollar, including adjacent `$$`; the optional `$_…__` suffix preserves the source URL postfix.
- Lines 20944-20952 obtain the reference from `pluginContext.emitFile` and construct `__VITE_ASSET__${referenceId}__` plus that optional postfix. This is an emitted asset **reference ID**, not Vite's `getHash` helper or the final filename hash.
- Lines 22558-22562 append `vite-url-rewrite`; its `Once` hook at 22744-22765 rewrites declaration values before simple-vars' declaration visitors. Thus the observed error can originate from generated text even though the original stylesheet has no dollars.
- Copied Rolldown 1.1.5's `bindingify-input-options-XPJLJOD0.mjs:1304-1308` delegates reference generation to the native binding. The shipped JS does not expose its internal hash generator. The Vite consumer alphabet and retained `C$$nPHHw` reproducer are verified; a fixed reference length or complete native generator algorithm is **not** asserted. Final filename base64/hash-character documentation is not evidence for the reference alphabet.
- Simple-vars `index.js:12-38` resolves known variables before `unknown`, then preserves the original matched text for a falsy callback return. Lines 52-67 scan both `/(^|[^\w])\$([\w\d-_]+)/g` and `/\$\(\s*([\w\d-_]+)\s*\)/g`; ordinary CSS strings are not exempt. Lines 70-88 perform recursive substitution and separately process declaration properties. Rules, at-rules and special comment interpolation have their own visitors and are correctly rejected by the current declaration-only guard.
- Searches of actual original flag-icons CSS, including the copied minified 7.5.0 input, returned no dollar matches. Its source need not be edited.

## Retained evidence and limits

Read directly, without rerunning:

- `-c/evidence/build.log:9-22`: Vite CSS failure on original flag-icons and `Undefined variable $nPHHw__`, with the real simple-vars stack.
- `-e/evidence/build.command.json`: status 0; raw `build.log` records SSR/client/server completion and retained chunk warnings.
- `-e/evidence/frontend-lint.command.json` explicitly includes `postcss.config.cjs`; raw log reports 31 files, zero errors/warnings, status 0.
- `-e/evidence/frontend-types.command.json`: strict copied typecheck plus `--noUncheckedIndexedAccess`, status 0, empty error log. Its `tsconfig.json` includes source/tests/Vite config, **not this CJS config**; this is not type-level proof of the callback.
- `-e/evidence/postcss-boundary.command.json`/`.log`: checks one token, original `48em` substitution, and `$missing-source-var` in a separate declaration. It does not cover either finding, multiple tokens, property/interpolation collisions, CSS strings or malformed markers.
- `-e/evidence/closure-verification.json`: records 171 unchanged inputs, 58,656 frozen files and 958 internal links; these are retained verifier results, not newly recomputed here.

Canonical manifest/lock declare Vite 8.1.4, simple-vars 7.0.1, Mantine preset 1.18.0 and flag-icons 7.5.0. The independently installed snapshot has PostCSS 8.5.29/Rolldown 1.1.5, whereas canonical lock resolves 8.5.23/1.1.4. The copied build is therefore evidence for that snapshot, not identical full-workspace transitive resolution or production qualification.

## Minimal correction recommendation

Replace the name-based exemption with **occurrence-scoped shielding around the existing simple-vars declaration-value processing**, retaining its default throwing behavior:

1. Identify complete generated asset reference spans in actual asset URL positions, respecting ordinary CSS strings and optional postfix boundaries. Do not exempt dollar references in the postfix. If actual generation provenance is required, obtain it at the URL-generation boundary; marker text alone cannot supply it.
2. Temporarily shield only reference-ID dollars with collision-free placeholders before the unchanged variable processor sees them; restore them afterwards. Do not shield properties, selectors, at-rules, arbitrary strings or malformed markers. Preserve both variable syntaxes and recursive substitution outside the protected spans.
3. Handle every URL independently. Same-name, shorter-name and interpolated references outside protected spans must use the original error path. Do not use `silent`, `only`, whole-declaration skipping, or a per-name allowlist.

This also avoids the callback API's missing occurrence/current-pass context. The wrapper should occupy the existing simple-vars position, not reorder the original Mantine preset/vars pipeline. Retain all five original breakpoints (`36em`, `48em`, `62em`, `75em`, `88em`) and original source CSS unchanged. No source correction is applied by this review; validate any correction only in a new owned immutable copy, not the live `-e` snapshot.

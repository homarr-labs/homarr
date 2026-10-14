# Actual Bun media sanitizer proof — frozen for independent review

## Outcome and boundary

The declared public `isomorphic-dompurify` **3.18.0** import and bounded modern/legacy SVG proof pass on actual **Bun 1.4.2**, using installed **DOMPurify 3.4.11** and **jsdom 29.1.1**. `packages/api/src/media-runtime/sanitizer.ts` exports only `sanitizeMediaSvg: SanitizeSvg = sanitize`, imported from the public package root. This is a thin typed binding to the actual engine, not a sanitizer substitute, Next deep import, new controller, response builder, original-byte fallback or proof token. Only the offline existing media check consumes it. No index/export/manifest/type configuration was changed in the repository.

API's direct `isomorphic-dompurify: catalog:` declaration and root catalog `3.18.0` were verified before coding, as were the installed package version, conditional exports, types, README and engine source. No install or dependency change was performed. Stage A's declaration review remains separate; this proof does not accept a host adapter. Backup sources/tests remain committed and frozen, untouched by this allocation.

`mediaBinaryDisposition.status` remains `held`, and `mediaBinaryDescriptor` still has **no executable handle**. Neither frozen `binary.ts` nor `response.ts` was changed. The descriptor's historical hold text is not rewritten by this proof. Anonymous binary GET mounting/execution, request/resource/response-body host lifetime and current authority require separate adapter/host acceptance. Multipart handling, atomic media/local-icon mutations, whole restore/apply/recovery and #113 are not authorized or completed.

## Actual conditional import and pinned guidance

From the API working directory, the public ESM import resolved to `node_modules/isomorphic-dompurify/dist/index.mjs`: package `exports["."].node.import.default`, not its default/browser entrypoint. Public `isSupported` returned `true`; public `version` returned `3.4.11`. Dependency resolution from that actual module selected `node_modules/dompurify/dist/purify.es.mjs` and `node_modules/jsdom/lib/api.js`.

Context7 was already exhausted. No network/documentation request was retried; the installed version's `isomorphic-dompurify/README.md` documents named `sanitize` imports and the public declarations expose its actual overloads. Installed DOMPurify README lines 242–245 prescribe the exact SVG/filter profile used by the source: `{ USE_PROFILES: { svg: true, svgFilters: true } }`. The wrapper creates `new JSDOM("<!DOCTYPE html>")` without options; installed jsdom guidance confirms scripts/event attributes and subresource loading are not enabled by default. No `runScripts`, resource loader, URL/file fetch, browser, scripts execution or global-window graft was configured. Its Node engines field and Node-focused documentation do not promise general Bun support: the result here is an observed bounded proof on the exact installed Bun/engine versions, not an upstream compatibility guarantee.

## Security and exact response evidence

The existing `packages/api/src/nitro/checks/media.mts` was augmented only with the sanitizer import, a locally generated adversarial SVG and response assertions/evidence. The same fixture covers both `image/svg+xml` and legacy `image/svg` through the unchanged actual `createMediaBinaryResponse` algorithm. No second Response construction algorithm was added.

The SVG contains a script, root `onload`, shape `onclick`, `javascript:` xlink, a `data:text/html` xlink and foreignObject/iframe with a dangerous data payload. Actual engine output is asserted to contain none of those attack markers/links/elements. The legitimate viewBox, named filter and Gaussian blur `stdDeviation`, rectangle geometry/fill/filter reference, circle, path and multibyte `Café ☀` text remain. The complete returned body is compared byte-for-byte with the actual engine output under precisely the source profile; no extra SVG rewriter, normalization, configuration flags or allowlist is introduced.

| Deterministic local SVG evidence                        | Result                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Original input bytes                                    | 666                                                                        |
| Actual sanitized output bytes                           | 421                                                                        |
| Original-byte quoted SHA-256/base64url ETag             | `"E1Tg7n_GhDrf8ntfCPt_x7hbk_eGtmFYoXa5dc_BgSI"`                            |
| Sanitized-byte quoted SHA-256/base64url ETag            | `"8OoRvsxjv0lU_0pwn0GZ0yKYHX0qUwOJ-3vMGFbAdRA"`                            |
| No validator, each SVG MIME                             | 200; exactly sanitized bytes, sanitized ETag, Content-Length 421           |
| Strong/weak original-byte validators, each SVG MIME     | 200; sanitized body/ETag/length, never raw SVG or raw validator acceptance |
| Strong/weak sanitized validators and `*`, each SVG MIME | 304; null body, sanitized ETag, no Content-Length                          |
| Missing sanitizer, each SVG MIME, conditional `*`       | Existing fail-closed `MediaSvgExecutionHeldError` retained                 |

The multibyte text verifies that Content-Length is encoded-byte length, not JavaScript string length. Stored MIME, `private, no-cache`, source sandbox CSP and nosniff remain unchanged. Non-SVG binary bytes including NUL/non-UTF8 are still exact with and without the actual binding supplied; their original SHA-256 ETag and byte length are unchanged. This is bounded security evidence, not universal sanitization coverage, a remote trust guarantee, an authenticated archive/integrity claim or a hosted response-lifetime proof.

An initial preservation assertion used filter ID `blur`. The engine legitimately removed that colliding ID while retaining filter/shape values; its default DOM-clobbering defense rejects IDs/names present on document/form (`purify.es.mjs` line 1624). The fixture now uses non-colliding `homarr-svg-filter` so it also asserts legitimate ID/reference preservation. The engine/profile was not relaxed, overridden or replaced to make the assertion pass.

## Focused checks

All Bun invocations used the absolute installed Bun 1.4.2 executable with `--no-env-file`, under `env -i PATH=/usr/bin:/bin TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`. Commands below show the common Bun prefix abbreviated only for readability:

```text
bun --no-env-file packages/api/src/nitro/checks/media.mts
bun --no-env-file node_modules/typescript/bin/tsc --project /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/media-sanitizer-proof.PGIFqV/tsconfig.json
bun --no-env-file x --no-install oxlint packages/api/src/media-runtime/sanitizer.ts packages/api/src/nitro/checks/media.mts
bun --no-env-file x --no-install oxfmt --check packages/api/src/media-runtime/sanitizer.ts packages/api/src/nitro/checks/media.mts
```

- Existing critical media check: **passed, exit 0**, including old denial/zero-query, ownership/permission, query/projection, exact source intersection failure, upload/deletion helper, non-SVG ETag/bytes, missing-sanitizer hold and binary projection/release checks. It uses only fresh in-memory user/media tables and generated bytes; the SQLite client closes in `finally`. No real database was opened.
- Strict installed TypeScript **7.0.2** focused explicit-root check: **passed, exit 0**. The owned temporary config extends API settings, disables incremental/emission, includes only the actual sanitizer and existing critical check as roots, loads the installed declared Node/Bun types, and anchors the existing base `@homarr/node-unifi` declaration mapping to its installed location. No repository config, DB/Core code, Bun globals, declaration shim, cast or suppression was added. Initial temporary-config errors were missing Bun type inclusion and a config-relative inherited unifi path; they were resolved by using the actual installed declarations in that temporary config. No unresolved evolving Stage G type error remains in this observed graph.
- Scoped oxlint: **passed, 0 errors / 0 warnings**.
- Scoped oxfmt `--check`: **passed**. No formatter writes or broad formatting performed.

Only `sanitizer.ts`, the existing check's sanitizer proof, this handoff and the explicitly owned disposable typecheck config were written. No other media/helper/schema/descriptor/controller or backup source, manifests, package exports, apphost, DB/Core source, journals/catalogs, trackers, environment/credentials, archives, appdata, CA material, installations, network/providers/paid requests, listener, browser/container, Git operation or nested agent was used. No whole-repository or peer proof suite was run.

## Frozen source SHA-256

These identify observed source/engine bytes, not security endorsements or package signatures. Repository paths for frozen pre-existing algorithms were read only.

| Source                                              | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/api/src/media-runtime/sanitizer.ts`       | `f712ca87bcb0d24aecaab4c53231d76479e6c9fc93f16a922d032dc4077d047f` |
| `packages/api/src/nitro/checks/media.mts`           | `7a49a49e4e9b5e2790fab6434e9ff600c9ad08d2e7844668fab54ba338efb717` |
| `packages/api/src/media-runtime/response.ts`        | `180bd612a5bd10ee7b8a57c316749f13b805ae4cd12f30f17c29c4eba44fcb6c` |
| `packages/api/src/media-runtime/binary.ts`          | `6efba52fae1bbfded8a7836a551dfc4b4c1b5977d975d880e4eb14cb731cde4e` |
| `apps/nextjs/src/app/api/user-medias/[id]/route.ts` | `db2e8ca205e1ad016b3b6d3abb21cf7c49c9082b24ed2537602d8e51af5811aa` |
| `node_modules/isomorphic-dompurify/dist/index.mjs`  | `77bfd9927caeccde54db62f50b777ee546a413c4db829af73eb3e56b16c34c09` |
| `node_modules/dompurify/dist/purify.es.mjs`         | `8a40d0a0f66c217879826a4e97bca5ef88f1b751fe813d27cf4195165aa3778f` |
| `node_modules/jsdom/lib/api.js`                     | `22a63aa40bad13ea909a115b0c49fbae3493a291414765221942fc5d4396356f` |
| `node_modules/isomorphic-dompurify/package.json`    | `6a669a4c749543021734f9cb2dd9ef9b20cfd15a2298e468a1333169d2504530` |
| `node_modules/isomorphic-dompurify/README.md`       | `708b29d8f339bca980157139cbf5debed67230d5f9bc12d7bbf5afa0aa5a2aca` |
| `node_modules/dompurify/package.json`               | `c2854e618f3ba2f4253158f605c21c4ea77b558c91e8d16201313e328b53552e` |
| `node_modules/jsdom/package.json`                   | `def961b4c0a5fe3c37f68fb2b35fc80707975a1c0ff4f8d39ff5b7106c387e5c` |

Frozen for independent behavior/standards review. No continuing mutable-source consumption or active host execution is started. Further binding consumption/exports/host execution require a separate handshake.

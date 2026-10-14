# 24: Document assets, PWA and live translation

**What to build:** Deliver safe branding/head/font/static/native-image presentation, supported PWA installation and Crowdin live translation without build mismatches, private offline artifacts or a competing document owner.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Sanitized title/description/favicon/OpenGraph/viewport/lang/dir, logos/background/custom CSS/theme descriptors match root/board/settings snapshots; client previews restore on discard/unmount and never retain another page's document state.
- [ ] Logo, About and Kubernetes known-local image consumers receive bounded native/Mantine adapters preserving dimensions/alt/blank/error behavior. Preserve local Inter/font-variable/fallback, CJK/Hebrew metrics, layering and privacy/offline intent; remote uploads/proxy fetching remain authorized sibling services, not an invented Vite optimizer.
- [ ] Default/custom manifest name/color/logo/favicon and maskable 192/512 fallbacks resolve matching-build public assets without private settings or personalized manifest cache. Saved branding updates those contributions coherently.
- [ ] Service-worker install/activate/claim, approved scope, update/unregister and resource/security headers work on shipping paths. Do not invent offline caching or push; any cached document must reference matching-build assets and cannot retain private board/session content across identity changes.
- [ ] Preserve `cr` marker/live mode: initialize `_jipt` before one JIPT activation, use approved script/CSP/hydration/DOM ownership and cleanup, and coordinate theme/locale/direction before hydration without duplicate handlers or notifications.
- [ ] Focused future font/head/branding/worker-scope/Crowdin observations verify shipped descriptors and real consumers, including unavailable assets and locale transitions; client-only/lazy feature boundaries remain owned by their callers, not mass-edited here.

## Coverage

SHELL-04 plus I18N-06 and OPS-12: head/theme script, local fonts and three known-image adapters, static/public/well-known contributions, manifest/icons/service-worker and Crowdin activation. #05 retains catalog/`cr` identity; #06 owns locale switching; #113/#114 own uploaded/private-image delivery. No new offline/push capability is required.

## Required contracts

#01's sole document/CSP/resource/asset contribution port; #21's matching-build publication contract; #17/#32's safe branding/preview descriptors; #05/#06's locale/catalog/direction snapshot; #113/#114's authorized media handles; #08's notification consumption. Use exact accepted revisions, not complete-peer prerequisites.

## Decision holds

Detailed SSR/cache/first-paint, locale switching/time/direction and Crowdin DOM/hydration ownership remain open. Font substitutions/external requests, CSP/public assets and worker scope/cache policy require explicit approval; architecture selection alone settles none of them.

## Ownership

One local writer owns asset/head/PWA/Crowdin descriptors, activation clients and focused regressions. #01 alone emits root SSR/providers/CSP and central routes/manifests; #21 packages resources. Feature callers own local adaptations under exclusive allocation. Descriptive folder-based route contributions use ignored helpers and proper layout/pathless/non-nested/dynamic semantics; no duplicate document/runtime owner.

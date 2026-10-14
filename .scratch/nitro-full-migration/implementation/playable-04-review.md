# Lane04 independent review

Reviewer: `ses_ed4a2f7ccffeBvNxRrAvPGLbI2`. Coordinator recorded the returned read-only review; the reviewer could not write files. Verdict: bounded document acceptance held; asset and stylesheet preservation checks pass.

## Findings

- P2 — `source-ui/document/head.tsx:12`: retain original narrow HTML-only hydration exception. Mantine ColorSchemeScript adds the color-scheme attribute before hydration; matching snapshots do not eliminate this mismatch. Do not suppress the whole tree.
- P2 — `head.tsx:56–57`: board Apple metadata replaces the root object. Installed Next resolves its omitted title to null and status-bar style to default. Omit the board Apple title and use default; preserve root behavior.
- P2 — `head.tsx:87`: original resolved capability tag is `mobile-web-app-capable=yes`, not the substituted Apple-prefixed tag.
- P2 — `head.tsx:79–82`: preserve Next's original OpenGraph-derived `twitter:card=summary`, Twitter title and description.

## Independent evidence

All eleven frozen source paths and twenty-seven public mappings in `playable-04.md` reviewed against original root/board metadata, SEO, manifest, service worker, Crowdin, styles, PostCSS and installed font/Mantine/Next sources. Read-only checks verified11/11 source hashes/frozen-copy bytes,27/27 original asset hashes/lengths/bytes, regular-file/no-symlink status, SVG safety and both original CSS declaration sequences. CSS order, breakpoint variables, robots flags, title/favicon precedence, custom CSS insertion, manifest factory and worker containment otherwise match.

Retained validation configs/hash evidence were inspected; no raw lint/typecheck logs were found. No tests/build/runtime/Git operation ran. Actual Inter bytes remain HOLD; fallback metrics are not font parity. Original scrollbar formatting is not a correctness finding. Consumer mounting and integrated acceptance remain01-owned.

## Follow-up allocation

Original lane04 session reopened for only `head.tsx` and its handoff to fix these four findings, with real isolated lint/types raw logs and updated freeze hashes. All other assets/style/document files stay frozen. Independent rereview follows.

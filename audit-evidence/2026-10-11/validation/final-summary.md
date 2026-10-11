# Focused checks on the final retained changes

Pinned Node 24.18.0 / Bun 1.4.2. All 437 unique existing tests across 10 exact files pass across the initial run and focused rerun. Initial: 423 pass / 14 fail; loopback EPERM and CI-disabled Redis were environmental failures. Focused rerun: four affected/changed exact files, 68 pass / zero fail, isolated native Redis, outside sandbox, CI unset. Owned Redis stopped and temporary directory removed; no persistence, Docker or user-service changes. Raw logs and both initial/rerun result JSON are preserved.

API, auth, Custom Widgets and Next.js owning package typechecks pass. Final auth typecheck repeats after the LDAP helper change. Changed-source oxlint/oxfmt pass; one unchanged generator no-shadow warning remains. Architecture: 196 modules pass. Catalog parity: 475 descriptors, 479 resolved names, 4,311 binding cases pass. Complete required-prop/global-prop/blocked/safety metadata preserved; authoring/public JSON unchanged.

The first parity invocation used .ts with top-level await under a CommonJS interpretation and failed before execution. Renaming the archive harness to .mts resolves its invocation; the final recorded parity command passes. Original failure logs remain as history.

No new tests or broad suites. Browser and loopback measurement assertions are separate from these existing automated checks. CI and release acceptance remain separate from local validation. Final read-only reviews are under reviews/.

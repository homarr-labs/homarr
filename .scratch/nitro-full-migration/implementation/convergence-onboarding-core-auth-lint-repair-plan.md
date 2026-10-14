# CORE Auth — exact control-character lint repair

Fresh `b_yn51jd` checks: 13 affected types and formatting pass; the full lint output has one error at `sql-persistence.ts:1785` and 12 warning-only diagnostics. Provenance is source-accepted; lifecycle review remains pending.

Prospective sole product path: `packages/auth/nitro/production-sessions/sql-persistence.ts`, only `coreText`.

Keep the existing string/nonempty/well-formed guard, then replace its control-character regex with an allocation-free code-unit scan rejecting <=32 or exactly127 through the same `coreUnavailable()` path. Keep the current length/UTF-8 overflow check afterward and return the same string. In particular, do not move overflow ahead of the character check: an oversized string containing a forbidden character must retain its existing unavailable-before-overflow precedence.

This is equivalent ASCII controls/space/DEL rejection; non-ASCII and surrogate handling, error identities/classes, policy limits, URL parsing, native/currentness/task/capture/credential behavior remain unchanged. No arrays, new helper, suppression, comment, test, cast, dependency or warning cleanup.

Original provenance reviewer approves the exact cut, conditional on lifecycle finding reconciliation. Then one author freezes the sole-file/combined approved repair with protected joins; fresh focused Auth/API/Backend/Nitro types and Auth3 lint/format plus exact-source rereview follow. No Root, configuration, SDK, SSR, enrollment, installer, native/runtime/Bun/data authorization.

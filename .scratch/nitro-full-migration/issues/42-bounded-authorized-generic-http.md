# 42: Bounded authorized generic HTTP

**What to build:** Let an authorized full-access caller select a saved integration, resolve its exact credential mode and execute bounded arbitrary HTTP through the actual tool/Assistant review consumer, returning sanitized upstream results without exposing stored or derived credentials.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Own the complete generic integration request executor, exact-mode credential resolution, authorized descriptor and real tool/Assistant consumer contribution. Shared surface, no additional primary provider kinds. Eligibility covers 87 kinds: all 89 except `ical,truenas`; eligibility is not support for every native credential alternative. `qBittorrent` permits K bearer only, not U/P; Kuma K uses empty-username Basic without private native monitors; Xteve uses body token; UniFi uses isolated cookie/optional CSRF; provider exchanges are reused via their hooks. Exact per-kind mode/redaction ledger is original INTEGRATION-003 and research §§2–3. #104 owns the different Custom JSX executor; #39 owns generic native integration-search orchestration and #52 owns Seerr native/media-request wrappers.

## Required contracts

Start requires accepted immutable URL/credential snapshot, server-only auth-hook and outbound/redaction interfaces from #40; full-before-decrypt policy/crypto from #04; contribution/result/raw-input/tool interfaces from #120/#122 and tool review/continuation from #97. Provider hooks can be contract fixtures without requiring whole provider completion. Real identity, exact saved modes, trusted runtime and an actual authorized tool/Assistant execution are release joins. Custom JSX may consume the resolver through an accepted port but does not acquire this executor's ownership.

## Decision holds

Q11/Q12 apply only to concrete credential repository/conversion paths; Q15 applies to selected session continuity. Exact native URL/trust policy, auth-state lifetime and provider/runtime/library evidence remain qualified holds, not permission to broaden generic HTTP. Existing origin/bounds/full-access restrictions remain obligations; proposed universal SSRF policy is unapproved. Live endpoints/mutation effects require separately approved secure scope.

## Ownership

Exclusively own local generic request service/executor/resolver, descriptor and feature-local consumer contribution. #40 owns common outbound bridges; provider owners own their auth state machines; #97 owns the shared Assistant review engine and #122 hosts curated tools. COMPOSITION alone mounts descriptors and changes central manifests/exports. Record exclusive files before dispatch; do not leave an orphan executor handoff to extended features.

- [ ] Exactly one ID/name/kind selector resolves the deterministic first full-access match for non-ID selection. Every method, including GET, checks full access before decrypt; native board visibility/use/interact is insufficient. Reject unsupported protocols and exact missing/extra/mixed modes, especially qBit U/P.
- [ ] Execute seven HTTP methods with saved-origin/base-prefix scoping, no absolute/protocol-relative escape, redirects, URL credentials/query/hash, unsafe static headers or auth override. Preserve JSON/raw bodies, no GET/HEAD body, DELETE confirmation, no cache/retries, 15-second timeout, 10-KiB body, 16-KiB headers and 1-MiB response limits.
- [ ] Return upstream integration/ok/status/statusText/data semantics without equating HTTP success with application success. Redact stored/derived header/query/body/cookie/basic/session secrets and encoded/JSON/base64 representations from data/errors/logs; timeout after a possible write stays ambiguous and is never automatically retried.
- [ ] Reuse provider-owned exchange hooks and invalidate derived auth/session state on config/trust/delete through revision fencing. Focused exact-mode fixtures cover each eligible kind's optional/empty/alternative sets and auth precedence, not a broadened generic credential matcher.
- [ ] Demonstrate the real authorized tool/Assistant selection, review/confirmation, bounded execution, denial and sanitized result/error consumption, through the owned descriptor. Record synthetic evidence separately from later explicitly approved live mode/endpoints; unknown support is not passed, and Custom JSX's independent executor is not used as completion evidence.

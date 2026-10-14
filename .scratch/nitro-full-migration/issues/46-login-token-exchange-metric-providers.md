# 46: Login/token-exchange metric providers

**What to build:** Configure, test and render four credential-exchange metric providers using bounded provider-specific auth recovery and truthful native errors.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds all have native Stats/checks and generic HTTP eligibility; U/P means username/password.

| Kind | Auth and complete metrics/semantics |
| --- | --- |
| `frigate` | U/P; HTTPS before secret access, login cookie validated frigate_token/JWT bearer plus profile proof; cameras,uptime (seconds),version (text) |
| `homebox` | U/P form login, raw Authorization token; items,locations,labels,itemsWithWarranty,users,totalValue (text); labels/tags alternatives and group currency |
| `plantit` | U/P login nested jwt.value bearer; plants,species,photos,events |
| `xteve` | none or paired U/P; JSON login/status, generic body token; streamsAll,streamsActive,streamsXepg |

Exact auth/native/HTTP evidence: original INTEGRATION-007 and research §2.1; unspecified units are counts.

## Required contracts

Accept #40 trusted request/snapshot/session/auth-hook/context/result interfaces, #41 diagnostics/form, #88 Stats consumption, #04 policy/crypto and #03 invalidation. #42 consumes owned auth hooks without reimplementing exchanges. Whole producer completion is not a start edge; real principal/secrets/state/outbound runtime and all four management/metric joins are required for acceptance.

## Decision holds

Q11/Q12 gate concrete persistence/conversion, Q15 applicable session continuity. Provider-specific encrypted auth lifetime/restart and URL/trust changes remain explicit. Frigate's existing HTTPS-before-secret behavior must remain unless an explicitly approved replacement policy exists; do not impose universal HTTPS on unrelated kinds. Runtime/version/access is unverified.

## Ownership

Own these four local auth state machines, parsers/projections, descriptors and focused fixtures. #40 owns common bridges/session adapter, #42 generic executor, #41 forms, #88 metric UI and COMPOSITION assembly/manifests. Record exclusive files, not parallel auth implementations.

- [ ] Each kind demonstrates configure/test/masked edit/mode/remove/delete and authorized Stats consumption, with every exact credential alternative and reusable server-only hooks for #42.
- [ ] Frigate rejects insecure origin before reading secrets and accepts only one bounded valid token with profile proof; malformed/multiple cookies/auth rejection never become successful metrics. Preserve the table's tokens, currency, pairing, status and stream-default semantics.
- [ ] Empty/invalid/missing token, schema and application-error fixtures produce sanitized diagnostics, never bogus scalars or credential-bearing cookie/query/body output; all table metrics and units remain unchanged.
- [ ] Policy-before-decrypt, pre-abort/deadline, owned resources, bounded exchange recovery and config/trust/delete fencing prevent old-auth results or blanket retries after ambiguity. One native auth implementation supplies both tests and refresh.
- [ ] Collect target form/Stats evidence separately per kind/mode. Later live login/profile/read evidence requires explicit approved deployments/versions/auth/access; unknown compatibility stays unverified and no automatic all-provider live matrix is mandated.

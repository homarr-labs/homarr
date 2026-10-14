# 45: Operational metric providers

**What to build:** Configure/test and display all ten operational native Stats providers through trusted Fetch/Axios execution with exact units and honest unknown/error states.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds all have native Stats/checks and generic HTTP eligibility. K means apiKey; U/P means username/password.

| Kind | Auth and complete metrics/semantics |
| --- | --- |
| `scrutiny` | none; passed,failed,unknown; settings thresholds/missing device status |
| `netalertx` | K bearer; total,connected,newDevices,downAlerts; tuple/numeric-string validation |
| `unmanic` | none; activeWorkers,totalWorkers,recordsTotal; worker filters/pending POST under /unmanic/api/v2/ |
| `syncthingRelay` | none; numActiveSessions,numConnections,bytesProxied (bytes); finite nonnegative totals, not rates |
| `prometheus` | none or U/P Basic; total,up,down; success envelope, unknown health not down |
| `netdata` | none; warnings,criticals; nested alarms, not invented system-resource data |
| `fileflows` | none; queue,processing,processed,time (text); source number/string time transform |
| `healthchecks` | K X-Api-Key; checksUp,checksDown,checksGrace,checksNew; source status meanings |
| `gatus` | none; up,down,unknown,total; array/object/latest history/no-result unknown |
| `caddy` | none; Axios upstreams,requests,requestsFailed; active num_requests/fails sums, not lifetime traffic |

Other metrics are counts. Exact evidence: original INTEGRATION-006 and research §2.1.

## Required contracts

Accept #40 Stats/result/context and trusted Fetch/Axios/redirect/signal interfaces, #41 configure/test forms, #88 metric consumption, #04 policy and #03 refresh/fencing. Accepted narrow revisions gate dispatch without broad producer blockers; release joins require real storage/secrets/policy/runtime and each target metric UI.

## Decision holds

Q11/Q12 apply to concrete persistence/conversion; Q15 only to applicable session paths. Freshness/restart and native URL/trust changes remain scoped holds. Caddy admin-network reachability, selected transport replacements and runtime/provider versions need explicit evidence; no broader upstream rights may be granted just to pass.

## Ownership

Own exactly these ten local provider clients/parsers/descriptors/fixtures. Caddy consumes the single #40 Axios bridge until a replacement is proven; no global defaults or parallel transport adapter. #41/#88 retain forms/widget presentation, #02 physical schema and COMPOSITION central registration/manifests.

- [ ] Each kind completes authorized configure/test/masked edit/optional removal/delete and a metric-card demonstration with exact native/H alternatives, including Prometheus no-auth and Basic.
- [ ] Preserve every table field/unit/source meaning across valid/unknown/empty/partial/malformed/application-error fixtures; no-auth source endpoints still enforce Homarr authorization before network/secret access.
- [ ] Preserve Caddy's agreed Axios trust/redirect/signal path, Unmanic's prefix and read-via-POST, base/external URL distinctions and credential/error redaction; do not turn active requests into lifetime totals.
- [ ] Focused abort/deadline/revision/config/trust/delete cases preserve accepted cache/last-good/fencing and owned-resource cleanup, without ad-hoc provider polling jobs or duplicate unsettled work.
- [ ] All ten target consumers show meaningful error/stale/unknown results. Any later bounded live reads require explicit approved scope, deployed modes/versions and minimum access, especially Caddy's admin API; missing access is unverified, not success, and no automatic broad live matrix is required.

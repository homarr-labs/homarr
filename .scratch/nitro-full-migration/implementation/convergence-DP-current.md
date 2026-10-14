# DP current-boundary correction

`convergence-DP.md` remains immutable (234 lines). This supplement replaces its startup example and current-readiness assumptions, not its scope. AH startup configuration is source-accepted and SD source-frozen per coordinator; DDB runtime is still ACTIVE and its body was not read or approved here. No commands, lint/types/tests, build, runtime/native/SQL, live calls, secrets, data, user browser access or delegation occurred. Only this new report is written.

## Required startup correction

`apps/backend/src/server/startup-configuration.ts:233–324` now **requires** `authentication`; the original heredoc will fail validation. Use the same newly owned paths, with this complete public-only shape (variables are expanded by the original heredoc, not interpreted by JSON):

```json
{
  "version": 1,
  "authentication": { "kind": "public-only" },
  "listener": { "hostname": "127.0.0.1", "port": 3220 },
  "host": {
    "baseUrl": "http://127.0.0.1:3220",
    "basePath": "",
    "persistence": {
      "engine": "sqlite",
      "mode": "fresh",
      "path": "$DB",
      "migrationsFolder": "$ARTIFACT/db/migrations/sqlite",
      "epochInitializationTimeoutMs": 10000
    },
    "localeMutationBodyLimit": 4096
  },
  "culture": { "timeZone": "UTC" }
}
```

The sole input remains exactly one `--homarr-host-config=<normalized absolute JSON path>`. Strict version 1 accepts only matching canonical literal-loopback HTTP origin/listener, empty base path and fresh SQLite; ports 3100/3200 are rejected. Epoch budget is an explicit positive integer at most 2147483647, **not** a total migration/startup/shutdown deadline. `startup-configuration.ts:333–411` requires private UID-owned canonical config/data parents, private regular config ≤1 MiB opened no-follow, absent DB, and canonical existing migration directory outside the DB parent and not overlapping its path. No ambient path/config/secret fallback. The authenticated-read branch additionally requires issuer origin equal to this host origin; this run deliberately does not select it or supply issuer/provider/key fields. `compose.ts:17–57` passes explicit public-only authentication without entering authenticated-read construction. This is a source boundary, not executed proof of no outbound activity.

**D/K schema-asset gate:** the original report's statement that runtime migrations exist is historical and insufficient for the current new credential domain. Before a candidate build/boot, D and K must freeze and review the corresponding schema, complete migration SQL/journal/metadata and seed requirements, and confirm the candidate copies that exact frozen set. `scripts/build-nitro-candidate.sh:38–55` copies SQL/meta and bundles migrators; file existence alone cannot establish schema completeness, and public-only mode does not exempt SQL migrations from applying all journal entries. K has not been established frozen here; DDB remains ACTIVE/unread. Do not claim migration-ready, reuse the old fixed journal count as today's authority, hand-create tables or replay the old DB proof as current coverage. After freeze, compare the stopped synthetic DB against the newly packaged journal and current expected schema, including K's required new-domain structures, without exposing identities or credentials.

## Existing browser harness: smallest required repair

`apps/nitro/tests/public-browser.ts` is unchanged: line 3 hardcodes 3200 and line 41 asserts removed copy. Proposal for its designated writer, **not edits made here**:

1. Replace only the origin constant with one mandatory `--homarr-origin=<origin>` argument parsed before `chromium.launch`. Reject missing/duplicate input; require `new URL(value).origin === value`, HTTP, hostname exactly `127.0.0.1`, explicit numeric port 1–65535 excluding 3100/3200, and no credentials. No default, environment lookup or silent port substitution. A canonical origin equality check also excludes trailing slash/path/query/fragment.
2. Replace line 41's old `Product features are not installed yet.` assertion with exact visible `Disposable display preview`, the current Alert title in `src/app/preview.tsx:31`. Keep the existing SSR/hydration, independent request IDs, navigation, management 401, missing-route 404, console/pageerror and cleanup assertions. `src/routes/(public)/_public/about/runtime.$section.tsx:9–37` still supports foundation, summary/details, request ID and Switch view; no wholesale harness rewrite is needed.

After that repair and the containment gate, invoke the existing file with the explicit new origin under the original clean-environment envelope; no new test file, test dependency or browser download. Browser binary availability has not been observed. A passing harness remains public display/SSR proof, not private functionality or original Inter parity. Native persistence/RPC proof is still separately required.

## Egress: actual controls versus unobserved capability

- **Observed installed browser API only:** `node_modules/playwright-core/types/types.d.ts:9322–9384,23906–23912` documents context-wide request routing and `serviceWorkers: "block"`; existing context construction is at harness line 7. A separate small containment change to that same harness can block service workers, install interception before page creation, abort and record any HTTP(S) request whose origin differs from the fixture, and fail on every attempt rather than fulfilling fake data. Installed context `routeWebSocket` is also declared at line 9467; this public harness should deny unexpected WebSockets. These APIs are available in declarations, **not observed working browser controls**, and do not confine the backend process, browser DNS/background traffic or other protocols. They cannot substitute for runtime isolation.
- **No verified runtime egress mechanism:** the existing candidate script has no network sandbox; the targeted `scripts` search found no documented `unshare`, `bwrap`, `sandbox-exec` or network-none wrapper. Tool availability provides no established per-process deny-egress policy. An already provisioned isolated Linux namespace/sandbox with loopback enabled and no external connectivity is a possible host-provided mechanism only if the coordinator independently establishes its existence, permissions, filesystem access and same-namespace probe path. None was observed here, so there is no ready-to-run containment wrapper to promise. Do not install/configure a firewall, build Docker, resume a paused Darwin contract or alter application fetch/socket/DNS functions to simulate isolation.
- `env -i`, `--no-env-file`, explicit public-only mode, local assets, disabled provider/job enrollment and curl `--disable --noproxy '*'` minimize ambient configuration and intended calls; none denies process egress. Do not forward environment keys, secret-file references, proxy credentials, real browser storage or production paths to a sandbox/browser. If a pre-existing runtime containment mechanism cannot be established within authorization, **boot remains held**; report that blocker instead of describing source-only local requests as enforced offline execution.

## Practical post-clean sequence

1. Wait for DDB/K source freeze and D/K asset acceptance. Then obtain fresh clean focused lint and typechecks for the reached source, including the designated existing-harness repair; no historical count qualifies.
2. Allocate the original private canonical external run with separate config/data/home/tmp/records and absent build root. Run the existing candidate entry with accepted activation, explicit `HOMARR_NITRO_BUILD_ROOT`, synthetic data fence and allowlisted environment; no pre-migrator or CLI invocation. On failure retain that root; a later authorized attempt uses another absent root.
3. Inspect only that fresh artifact for complete frozen SQL/meta/assets, unresolved workspace/source imports, symlink escape, runtime dependencies, and one physical host/config owner across SSR/entry/lifecycle. The forced SSR host externals remain at `apps/nitro/vite.config.ts:126`; a successful intermediate build is not final closure proof.
4. Establish actual runtime containment and owning-process timeout/cleanup before boot. Check literal port **3220 at launch**, in the actual listener namespace; it is not checked/reserved now. Collision fails, never falls back. If another permitted port is selected, align JSON listener, host origin, HTTP/RPC probes and harness argument. Directly boot the fresh generated entry with corrected private config, not default start/dev or legacy wrappers.
5. Binding is not readiness. Send one real initialization/readiness request, then require prepared public-fresh SSR/bootstrap and same-origin assets, anonymous/setup state, genuine `getCulture`/`getBranding` RPC, locale-cookie replay and management denial. Stop on failed initialization; no retries, alternate owner or production values. Run the repaired existing browser harness only if its fresh binary/context and containment prerequisites are actually established; otherwise leave hydration unproven.
6. TERM the retained child, await bounded shutdown and numeric exit, and confirm listener disappearance. Only after complete reap inspect this synthetic DB read-only for actual serialized seeded settings rather than reader fallback, fresh user/onboarding state, initialized epoch and **current frozen** journal/schema completion. No DB precreation, second live owner, rerun migration/seed, restart claim or credential contents. Update the original stopped-DB verifier to K's frozen schema before use; its old count/structures are not an unconditional current acceptance check.

No product patch, new test/dependency, wide audit, cutover or validation success is asserted by this supplement.

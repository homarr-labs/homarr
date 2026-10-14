# SELFHOST — frozen minimal ordinary-hosting plan

## Status and corrected baseline

**Revised plan only, frozen for independent Oracle `ses_ece32b93effedhwzCMim6TCcW2`. No product implementation, activation, native boot, procedure acceptance or production PASS is authorized or asserted.** This revision addresses the four P2 findings by removing guest locale token infrastructure, requiring empty basePath for the first stage, limiting prospective source allocations, and correcting the evidence baseline.

Coordinator-supplied current evidence, not independently rerun by this author:

- The compiler result was **EXIT 0**, not an artifact count of zero. The **third actual artifact exists**; static one-owner contexts are accepted, and Linux headers plus **142 assets** are correct. Do not repeat the previous zero-artifact/no-owner assertion or discard this accepted static evidence.
- The known CLI P1 source-copy correction is **ACCEPTED but not rebuilt**. Existing artifact evidence must not be presented as evidence of that unreconstructed correction.
- **AW3 is mounted in source:** two public leaves, eleven authenticated reads and three configured writes. Earlier dormant/unmounted-writer descriptions are superseded. These source mounts are **not runtime or procedure acceptance** and do not authorize enabling another writer.
- K/D, native opened-identity/fresh-resource provenance, auth credential adoption, private SSR and restore/cutover remain held. Accepted static owner/asset/compiler evidence does not clear those holds. The earlier 91/334 source coverage was supplied historical context, not a new total independently recounted here.
- All main product writers are frozen. The separately owned ephemeral core-fix author is still working; do not duplicate that work. Native watchdog/control repair remains separately owned outside product.

Only this report is revised. No commands, checks, tests, builds, imports, evaluation, native SQL, environment/data/secret access, dependency or product changes, nested agents, GLOSSARY or ADR changes occurred. The evidence above is attributed coordinator context; this revision does not pretend to have re-inspected AW3 or the third artifact.

## First-stage objective and exclusions

Permit one explicitly chosen ordinary HTTP listener, an explicitly captured canonical public HTTP(S) origin, and explicitly chosen absolute SQLite/migration paths. Existing user-operated reverse proxies may terminate HTTPS. Docker, Cloudflare, tunnels, a Mac, a mandatory six-key environment and multiple application listeners are not product requirements.

**First-stage `host.basePath` must be exactly `""`. Reject every nonempty value explicitly; never silently strip/reset it.** Subpath hosting such as `/homarr` is not admitted by this minimum. Router rewrites, static/asset prefix generation, client bootstrap schema changes, service-worker scope and auth subpath work are separate held work, not allocations in this plan. Root deployment must preserve current root routes/assets and existing explicit-locale routing without a prefix rewrite.

No new locale signing secret, token route/cookie, client token roundtrip, auth guard export, environment variable, legacy-env adapter, credential key, random guard or configuration framework is proposed. No broad security rewrite, dependency introduction, migration skip, real-data restore or credential adoption is included. Auth HTTP/HMAC/session machinery remains unchanged.

## Source basis and minimum contract

The source references below were inspected for the original report; later AW3/third-artifact status is corrected above from coordinator evidence. Line numbers identify that inspected source and are not a fresh assertion that intervening source freezes left every line unchanged.

- `apps/backend/src/server/startup-configuration.ts:13–19,275–324,351–411` imposes the current loopback literal, loopback HTTP origin/listener equality, empty basePath, fresh-only startup, reserved port exclusions, private process-owned parents and placement restrictions. It reads one explicit absolute config argument, not a deployment environment adapter.
- `apps/backend/src/server/runtime-composition/contracts.ts:84–90,240–245` already models explicit SQLite paths and fresh/existing modes with a separate host origin/basePath. `configuration.ts:5–56` captures configuration and validates HTTP(S), paths and budgets. Retain that immutable explicit capture rather than replacing it with ambient request/env inference.
- `apps/backend/server/entry.ts:7–25` uses the captured single listener, HTTP, `reusePort:false`, `trustProxy:false`, and Nitro dispatch. `host.ts:8–47,50–64` retains a single initialization/disposal owner. Leave this ownership and lifecycle intact.
- `runtime-composition/public-culture.ts:130–178` explicitly rejects non-loopback guest locale mutation before its exact-origin/cross-site/JSON/body/locale/currentness/anonymous checks. Its SSR synchronization and POST effect paths both serialize a preference cookie.
- `apps/nitro/src/ssr/render.tsx:23–34,64–69` currently derives public bootstrap/document origin from request URL. For an externally HTTPS, internally HTTP deployment, that must be the reviewed canonical public origin, not an unvalidated socket/request origin.
- `apps/nitro/src/client/rpc-link.ts:3–25` and `features/widgets-runtime/transport-link.ts:3–31` already enforce parameterized same-origin browser endpoints and credential/redirect boundaries. They have no production localhost URL to replace. Root locale POST in `app/public-providers.tsx:125–144` already uses bootstrap origin and same-origin credentials; no client change is allocated.

Prospective startup changes, confined to the existing loader:

| Input                          | First-stage meaning                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `listener.hostname`            | Explicit `localhost`, `0.0.0.0`, or valid IPv4/IPv6 literal. Reject empty/URL/ambiguous values; distinguish socket IPv6 spelling from URL brackets. No arbitrary externally resolved bind hostname is needed. `localhost` does not promise multiple sockets. |
| `listener.port`                | Explicit integer 1–65535. Ordinary product hosting need not inherit QA's reserved-port exclusions. Collision/permission failure stops; no alternate listener/port fallback.                                                                                  |
| `host.baseUrl`                 | Explicit canonical HTTP(S) origin, independent of bind host/port. No credentials, query, fragment, path, opaque origin or unspecified/wildcard public address. A `0.0.0.0` bind is never a browser destination.                                              |
| `host.basePath`                | Required literal `""`; reject nonempty input.                                                                                                                                                                                                                |
| `host.persistence`             | Existing SQLite contract; explicit fresh or existing mode, normalized absolute DB path, existing canonical migration folder and explicit budget. No implicit existence-based mode selection, parent creation, copying or restore.                            |
| Authentication/culture/budgets | Existing explicit fields and discriminated authentication selection retained. Auth issuer origin must still match captured host origin. No failed-auth-to-public fallback or default secret.                                                                 |

Do **not** require a new version-2 framework. Start with the smallest justified change to the existing version-1 parser. QA's trusted fixed input and containment do not become product-wide restrictions; retain those assertions in the separately owned QA controls. If Oracle identifies a real parser-isolation need, decide its smallest explicit form within `startup-configuration.ts` before writes. Do not add a general profile/version/validation-bypass system preemptively or use a selector to bypass authority/path checks.

## Exact prospective source allocations

The order is part of the plan. No other source path is allocated by this report. Product writers stay frozen until coordinator/Oracle authorization and the API evidence gate below are satisfied.

### Batch A — exactly three startup/ingress paths

1. **`apps/backend/src/server/startup-configuration.ts`** — narrowly broaden explicit listener/public-origin/fresh-or-existing inputs, keep basePath empty, and refine service/root-owned protected-path compatibility. Retain strict parsing, private bounded config reading, no-follow/canonical checks, one-time immutable capture and explicit cross-field auth-origin checks. Separate public origin from listener address; do not invent env compatibility or secret fields.
2. **`apps/backend/server/entry.ts`** — call the local ingress boundary before Nitro dispatch, including requests Nitro may serve statically. Keep one captured listener, HTTP, `trustProxy:false`, `reusePort:false`, existing startup/close owner and shutdown handling. No new listener, native probe, writer mounting or supervisor repair.
3. **One new local helper: `apps/backend/src/server/public-origin-ingress.ts`** — only the reviewed authority-match/canonical-public-origin request adaptation described below. Its exact implementation must follow pinned API evidence; no shared framework, random token/guard or cross-package helper export.

### Batch B — only the three public-origin/locale paths

1. **`apps/backend/src/server/runtime-composition/public-culture.ts`** — remove only the portable loopback eligibility restriction on the existing anonymous locale POST. Preserve all existing origin/input/currentness/principal controls. Apply captured-HTTPS Secure policy in **both** SSR locale synchronization serialization and POST preference serialization. Provide the captured public origin to prepared SSR input if needed, without exposing DB/auth/secret configuration; the existing inferred prepared-render type can carry this value without editing runtime/host composition.
2. **`apps/backend/src/server/runtime-composition/contracts.ts`** — only the smallest optional `secure?: boolean` cookie serialization typing needed for that overlay, if necessary. Existing factory/cookie shapes can remain otherwise unchanged. No new locale-security configuration, routing schema, writer or session contract.
3. **`apps/nitro/src/ssr/render.tsx`** — use the captured public origin (through the existing prepared input, or the ingress-canonical request with documented provenance) consistently for bootstrap origin and canonical document metadata. Do not touch first-segment routing for a nonempty basePath: that input is rejected. No asset manifest, router, client provider or private-SSR rewrite.

No edits are allocated to `runtime.ts`, `assembly.ts`, `configuration.ts`, `host.ts`, auth packages, DB runtime/driver, Vite/Nitro config, package scripts, bootstrap/client/router/asset consumers or docs. If an implementation genuinely requires another path, return that precise blocker to coordinator/Oracle rather than expanding this allocation.

## Mandatory pinned implementation/API evidence gate

**Before the ingress writer starts**, the coordinator/Oracle must establish implementation evidence for pinned **srvx 1.0.5**, its **Bun request/authority representation**, and **Nitro 3.0.260903-beta** request conversion/static dispatch. Generic Fetch assumptions or latest framework docs are not sufficient. No evidence collection commands or probes are authorized in this report revision.

Required evidence:

- Where srvx/Bun obtain URL authority and Host with `trustProxy:false`, including port/IPv6 representation, and whether the server normalizes either before the application sees it.
- What happens to **missing, duplicate and ambiguous Host** input: whether it is rejected by the HTTP parser, observable raw, combined or normalized into a Fetch `Headers` value. A lone `headers.get('host')` is not evidence that duplicates were absent. Specify fail-closed rejection for any unresolved case; do not infer a missing Host from an already canonicalized URL. If the pinned boundary cannot provide adequate evidence, ingress remains held rather than accepting aliases/ambiguity.
- Which pinned srvx/Nitro API safely adapts request origin while preserving method, original path/query, streamed body, body-use state and abort/cancellation signal. Establish any constructor/stream requirements from that implementation; do not guess a `new Request` recipe or buffering workaround.
- How Nitro converts/uses that request and dispatches static assets, and whether a configured HTTPS public URL on an HTTP socket preserves static behavior. Prove the helper runs before **all** relevant dispatch, not only SSR/fetch-host requests. Do not infer this from accepted current root static asset evidence, which predates the proposed adapter.
- The exact boundary that rejects malformed authority before canonicalization and preserves existing single-owner request lifetime/publication. Identify implementation limitations rather than adding speculative headers or new random guards.

The plan-level policy, subject to that gate:

1. Capture the configured public origin once. Admit only requests whose evidenced authority/Host matches its exact public authority. No wildcard bind authority, unknown internal-host alias, permissive suffix/registrable-domain matching or assumed missing/duplicate-Host acceptance.
2. After authority admission, derive application origin **only from captured configuration**, retaining the original root path/query and request stream/signal. HTTPS external origin reconstruction is explicit deployment configuration, not inferred proof of a TLS socket or an authenticated proxy peer.
3. Ignore spoofable `Forwarded` and X-Forwarded host/protocol/port/prefix values for every origin/authority decision. Remove such metadata downstream if required by the evidenced conversion boundary; never turn on blanket proxy trust. Do not overwrite `Origin` or `Sec-Fetch-Site` to make a mutation pass, infer client identity from these headers, or adopt proxy credentials.
4. Preserve body streaming, abort, response cancellation, lease validity/private publication and single-owner drainage. No buffering, stream implementation, endpoint fallback or second application owner.

The user's existing proxy must preserve exact public Host and root paths, terminate HTTPS when selected, and protect upstream reachability as appropriate. A proxy that rewrites Host to its internal target is not automatically admitted; preserve public Host rather than trusting unknown forwarding metadata. Direct HTTP LAN hosting may advertise a concrete IP/hostname while binding `0.0.0.0` or a chosen IP; HTTPS deployment uses the same HTTP application listener behind its proxy. No vendor/tunnel dependency is added.

## Anonymous locale preference: retain existing CSRF boundary

The operation is the existing **anonymous cookie preference** mutation, not a DB writer, credential operation or session issuance. A mandatory new HMAC secret, token endpoint, signed cookie and client roundtrip would overengineer this scope and are withdrawn.

Retain all of `public-culture.ts`'s current controls:

- POST only; exact configured public `Origin`. **Missing, literal `null` and mismatched Origin are rejected**, including same-site but different-origin callers.
- Reject `Sec-Fetch-Site: cross-site`; do not weaken exact Origin to a same-site/domain check or trust forwarding headers to supply it.
- JSON media type, bounded streamed input, strict sole `{locale}` shape and supported locale.
- Current owner/signal checks and existing anonymous-principal restriction. No change to authenticated behavior or private fallback.
- Existing explicit response/error behavior and same-origin browser credentials/redirect policy.

For portable hosting, remove only the explicit loopback-host eligibility throw. The same exact-origin/Fetch-metadata/JSON/bounds controls then operate at the captured non-loopback public origin, including HTTPS behind a preserved-Host proxy.

Preference cookies remain host-only, SameSite=Lax and `Path=/` for this empty-basePath stage. Overlay `Secure=true` for captured HTTPS and the HTTP policy for captured HTTP, in **both SSR synchronization and POST serialization**. Do not derive Secure from untrusted headers or the upstream HTTP socket. `packages/translation/src/runtime/locale.ts:63–82` already provides the preference/path/Lax semantics; no shared translation changes are needed.

Keep `packages/auth/nitro/production-sessions/origin.ts` and session primitives unchanged: authentication HTTP origin/HMAC checks, secrets, cookie names/scopes, session validity and issuance holds are not weakened, exported or repurposed. No extra public token route or accepted RPC leaf is added.

## Protected paths and previous-install location: plan-only refinement

Refine `startup-configuration.ts`'s QA-shaped parent predicate for an ordinary service/root-managed install. The present requirement that config/DB parents be process-owned 0700 must not become a universal product requirement. This authorizes **planning compatibility**, not opening real data or accepting native identity/provenance.

- Keep an explicit normalized absolute config path and bounded private regular-file/no-follow read. An ordinary protected root-owned parent such as `/etc/homarr` need not be service-owned 0700. Keep secret-file access restricted to the intended service/root trust boundary; do not indiscriminately admit world-readable/writable files or trust arbitrary supplementary groups. A service-owned private config file in a protected root-owned parent is a minimal supported pattern. Any additional root-owned/group-readable secret-file pattern needs an explicit narrowly reviewed permission policy within the same loader, not an automatic ownership bypass.
- DB parents/migration roots must already exist, be physical/canonical and permit the intended service operations without untrusted replacement. Protected service/root-owned layouts and deliberate service-group access are not rejected solely for lacking parent mode 0700. Do not chmod/chown, create roots or use a world-writable ancestor as a safe canonical-root proof.
- Reject symlink data-root/file ambiguity and nonregular existing DB targets. Keep config, DB and migration identities disjoint and migration assets protected against DB/sidecar writes. Replace QA-only broad parent placement restrictions only where a narrower reviewed collision/write-ownership rule supports ordinary protected sibling roots. No journal/schema/content repair or writable migration-asset fallback.
- Select fresh or existing explicitly. **Fresh refuses an existing path; existing refuses a missing path.** Retain exclusive fresh creation, sensitive file permissions, no-create native opening, fresh-only initialization and existing ledger checks. No reseeding, retry in the other mode, directory creation or copying.
- Preserve `packages/core/src/infrastructure/db/drivers/sqlite.ts:18–23`'s accepted explicit readwrite/readonly, `create:false`, `strict:true` correction unchanged. Do not overlap the separate ephemeral core-fix author.
- Canonical preflight/private paths/exclusive create do **not** prove the identity of the subsequently opened native resource, continuous identity across writers or native fresh-resource provenance. Those remain unproven/held; do not replace them with path flags, ownership claims or a synthesized capture witness. `packages/db/runtime.ts:394–397`'s file-backed credential-adoption hold remains unchanged.

The previous documented SQLite location `/appdata/db/db.sqlite` can remain the user's explicit normalized absolute path, or the user can select another protected location. Build isolation's protected `/appdata` exclusion is not a runtime prohibition on that installation path; keep the build/data isolation rule unchanged. Existing-mode syntax is not permission to inspect/open/migrate that old DB and not proof of previous-schema, secret-codec/key, media, auth credential or restore/cutover compatibility. No real-data work is authorized.

## Documented configuration versus this captured startup contract

Retain these distinctions without implementing compatibility machinery:

| Existing documented value/behavior                                                          | Existing source                                                              | What this plan does not claim                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`: optional HTTP(S) origin without path                                            | `apps/docs/docs/advanced/environment-variables/index.mdx:37`, proxy guide:43 | JSON startup does not currently consume it. Its origin semantics match explicit host.baseUrl, but no env reader/adapter or new variable is allocated.                                                                   |
| `DB_URL`: default `/appdata/db/db.sqlite`; SQLite/PostgreSQL driver settings                | environment-variables:99–114                                                 | The main host's explicit engine is SQLite with `bun:sqlite`. Preserve the explicit selected path; do not silently substitute engines or promise PostgreSQL/legacy driver compatibility.                                 |
| Required `SECRET_ENCRYPTION_KEY`; source instructions also require a distinct `AUTH_SECRET` | environment-variables:76–88; `getting-started/installation/source.mdx:41–47` | No new key, secret generation, credential mapping or adoption. Key retention and old encrypted-data acceptance remain independently held. Explicit existing issuer fields are not an automatic mapping from legacy env. |
| Docker `_FILE`, PUID/PGID, Redis and migration-disable behavior                             | environment-variables:19–28,34–35,116–135,153–155                            | These are not automatically JSON-loader features or mandatory native-host requirements. No UID/env/Redis/migration-skip adapter is included.                                                                            |
| Cloudflare certificate example                                                              | `advanced/proxy/index.mdx:60–96`                                             | An example is not a product hosting/tunnel requirement.                                                                                                                                                                 |

Actual startup remains one explicit private JSON argument with listener, host/persistence/budgets, culture and authentication fields. The preview `NITRO_HOST/NITRO_PORT` package script is not authoritative over the custom entry's captured listener. Launcher/docs/env compatibility work is not an allocation here; report a precise blocker if the coordinator requires it. Do not edit current docs to promise accepted native hosting.

## Separate held work and Oracle return gates

- **QA remains fixed:** trusted `http://127.0.0.1:3220`, empty basePath, fresh synthetic path, network-none/private fixture mounts and the approved cleaned six-key environment belong to the separately owned QA containment controls. Do not broaden that run's networking, change its path/mode or remove fixture checks to validate portable hosting. Those controls are not mandatory product configuration.
- **Nonempty basePath remains explicitly rejected:** separate review must eventually cover SSR/router matching, redirects, assets/chunks/CSS/fonts/static dispatch, locale/RPC/SSE URLs, client hydration and auth callbacks/cookie policy together. No such writer or `/homarr` admission is created here.
- **SSE/private/procedure capability stays honest:** authority adaptation must preserve streaming/cancellation for already or subsequently admitted traffic, not mount a stream, add a listener, introduce a localhost transport or claim SSE/private SSR/writer runtime acceptance. AW3's three configured writes stay described as source mounts, not dormant code and not accepted continuous native-writer identity.
- **Artifact/native/data gates remain independent:** the third artifact and accepted static one-owner/Linux-header/142-asset evidence stand; the accepted CLI source-copy correction still needs its separately authorized rebuild. K/D/native provenance, auth adoption/private SSR and restore/cutover holds are unchanged.

Oracle should review this frozen revision against four acceptance points:

1. Existing guest exact-origin/cross-site/JSON/bounds/currentness controls, only loopback eligibility removal plus HTTPS Secure in both serialization paths; no locale HMAC/token/client additions.
2. Explicit required empty basePath, no prefix-related minimum allocations or claims.
3. Batch A's **three exact paths**, then Batch B's **three exact paths** with only necessary optional Secure typing; pinned srvx/Bun/Nitro implementation evidence **before ingress writes**; no new version framework without a demonstrated isolation need.
4. Correct EXIT-0/third-artifact/static acceptance and AW3 source-mount baseline, accepted-but-not-rebuilt CLI correction and unchanged independent native/private/data holds.

Any later synthetic validation requires its own coordinator authorization; no checks/tests/build/probes are run or scheduled by this report. Return precise API/authority/path limitations rather than silently broadening files, accepting ambiguous Host/Forwarded, enabling a fallback or clearing a hold. **Frozen plan returned for Oracle review, not implementation or production PASS.**

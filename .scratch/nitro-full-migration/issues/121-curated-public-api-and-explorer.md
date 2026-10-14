# 121: Curated public API and explorer

**What to build:** An external client discovers and calls deliberately selected public read/write operations, sees safe errors, and inspects accurate documentation through the sole explorer component. Own an admin-guarded standalone reference route and export that same explorer for #12's API-key/tools screen; a publicly readable specification does not make the UI anonymous.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Own curated REST handler, specification generation/normalization/response and the single explorer/reference implementation: source H02 GET/POST/PUT/PATCH/DELETE/OPTIONS and H25 GET, plus the standalone reference capability. [R01–R52](../drafts/transports.md#rest-operation-ledger--52-source-selections) cover apps8, boards15, information1, invitations3, settings2, users19, certificates2 and integration2. They are projections of feature-owned application leaves, not another 52 services. The 78 selected leaves include 26 without public-operation metadata, not 26 extra public operations. Bind every selection to its exact numbered primary owner; R51's generic executor is #42, not #104.

## Required contracts

- #01 supplies contribution/precedence/request effects; #120 supplies accepted Fetch/DTO/error interfaces without requiring its completed delivery. #04/#12 supply public-surface policy and API-key verification; #09 supplies the admin session/guard for the explorer, not ambient REST authorization.
- Selected domain owners supply actual refinements/defaults, selector constraints, safe outputs and public metadata: #35 apps; #26/#28/#29/#31–34 boards; #25 information; #14 invitations; #17 settings; #13/#16 users; #18 certificates; #42/#41 integration request/test.
- #12 consumes the exported explorer component and reference link in its key-management screen; #23 supplies management chrome without becoming an explorer owner. The producer hands off a reviewed interface, not its source files.

## Decision holds

Explicit OpenAPI authority/version, converter/schema-version compatibility, output/body/error/void projections, explorer choice and any scalar normalization remain unapproved. Decide trusted canonical server origin, CORS/preflight/HEAD/method behavior, public-document policy and optional anonymous feature reads. Public API credential authority and scope require approval; source ApiKey-only behavior must receive a disposition, never silently broaden to cookies. Q11–Q15 remain applicable holds on participating services, not automatic protocol-wide blockers.

## Ownership and release joins

The REST owner owns local handler/spec/explorer/reference files only; domain owners retain service, persistence and capability acceptance. COMPOSITION alone owns central registries/root/routes/manifests/exports/lock/build across #01/#21/#125. #12 embeds rather than duplicates the explorer. Real external-client read/write/error and guarded UI joins close the bounded delivery; all52 replacement dispositions and full generated-schema evidence join #125. No old URLs, methods or schema formats are required solely for compatibility.

## Acceptance criteria

- [ ] Runtime invocation is controlled by an explicit curated registry, not documentation hiding or nested default exposure; all52 source selections have concrete replacements/approved alias dispositions and exact feature owners, including the separate #42 generic request.
- [ ] A real external read/write/error path enforces the approved credential/anonymous policy, denies cookie-only authorization unless explicitly approved, and exhibits deliberate CORS/preflight/HEAD/405 and safe body/status/error/void behavior.
- [ ] Actual inputs, defaults, transforms/refinements and redacted results generate usable agreed schemas, including preferences and integration selectors, without empty-schema fallback or invented output DTOs.
- [ ] The single explorer works both in its standalone admin-guarded reference route and as #12's consumed component; direct denied navigation remains guarded even when the schema document is public. Its server URL uses accepted trusted-origin handling.
- [ ] Focused real client/UI/generated-schema evidence records protocol/binary documentation dispositions and chosen normalization only where needed; scoped authorized checks leave unsupported/unverified behavior explicit rather than claim parity from the static census.

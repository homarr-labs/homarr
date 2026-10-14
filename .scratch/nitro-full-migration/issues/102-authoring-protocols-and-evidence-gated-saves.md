# 102 — Authoring protocols and evidence-gated saves

## What to build
Deliver bounded schema/component/resource/prompt/template discovery, validation, read/write/patch and evidence-gated create/update from an authoring client to a visible saved management result.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary CUSTOM-04. customWidget.schema, getAuthoringPrompt, getSkill, getReference, getComponentCatalog, findComponents, getComponent, getComponents, getSharedProps, getExample, validateTemplate, validate, createFromPreview, updateFromPreview, readTemplate, writeTemplate, templatePatch (17). H17 admin-protected resource GET capability. Curated MCP tools/resources/prompts include homarr://custom-widgets/schema, components, skill and references/{schema|runtime|security}; names may change but public authoring capabilities and version agreement remain. Excluded Docs consumes portable browser-safe core/workbench/catalog exports, not Nitro server executors.

## Required contracts
Initially unaccepted: #99 definition persistence/validation; #101 revision/evidence atomic consume/errors; #04 authoring/admin policy; #122 tool/resource/prompt dispatch and #120 typed request/error contributions; #97 authoring-controller consumer; #01 browser/server contribution separation. No completed OAuth/Assistant prerequisite.

## Decision holds
Public schema converter/version coherence and external authoring authority need evidence; OAuth scope/consent/revocation remains held for external authorized clients. Q11/Q12 affect persisted/template conversion. Exact authoring bounds and portability changes require explicit disposition, not invented remote Docs approval.

## Ownership
Own local controllers/descriptors/resource payloads and human save/error feedback; #101 owns preview evidence, #99 direct CRUD, #122 central MCP dispatch and COMPOSITION registration/exports/manifests. Real authorized authoring/save and Assistant/Docs-consumer joins are later production evidence; #125 is final convergence.

## Acceptance criteria
- [ ] Actual HTTP, typed client and curated MCP discovery/authoring consume consistent schema/catalog/shared-props/examples/skill/reference/prompt revisions and safe typed errors; browser/Docs graphs exclude server execution and secrets.
- [ ] Template read/write/patch/discovery/validation is bounded and cancellable; missing components, invalid JSX and stale revisions return actionable domain errors without transport internals or partial persistence.
- [ ] Preview-origin create/update atomically requires successful queries and successful or simulated actions for the final revision; failed/stale/outage evidence cannot save or auto-retry mutation, while direct #99 CRUD remains distinct.
- [ ] Saved output appears in real management clients and placement eligibility only through authorized commands; focused future resource denial, stale patch/evidence and public-client save regressions use disposable data without broad suites.

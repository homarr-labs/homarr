# 122: Curated tools, resources and dispatch

**What to build:** External MCP clients and the Assistant's internal consumer discover and invoke a curated, authorized tool catalog and read the actual admin authoring prompt/resources/templates. Deliver the shared tools dispatcher and MCP protocol host with accurate raw-input schemas, metadata, safe results and server-enforced policy; OpenAPI selection is not permission to expose a tool.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Own local MCP Fetch/SDK host, extraction/schema diagnostics, identity-scoped catalog caching and authorized dispatcher. Source H05 POST/H06 GET/POST/DELETE, D-MCP-STREAM and prompt/resource/template registration get deliberate replacement dispositions. [Exact source candidate names](../drafts/transports.md#primary-procedure-ledger--334-unique-paths) and [candidate reconciliation](../drafts/transports.md#mcp-candidate-reconciliation--exact-names-in-the-primary-ledger) cover 133 static candidates across 29 eager roots: 77 queries/56 mutations. The 204 eager leaves also contain 71 non-candidates; nine annotation-only queries (llama.cpp1/Wazuh8) are outside that selection. Neither 142 annotations nor 100 non-admin static candidates is a proven runtime tools/list count. Preserve each capability's disposition, not identical target names/counts.

Admin authoring includes `homarr-custom-widget-author` with request/documentation URL inputs; schema/components/skill, schema/runtime/security references, actual example resources and components/examples templates. Dynamic examples have no invented finite census. Kubernetes' three wrapper candidates retain their actual admin/input semantics, not duplicate application leaves. Subscriptions are not tools.

## Required contracts

- #01/#120 supply local Fetch/context/errors/effects; #04/#12 supply per-surface policy and API-key authority, and #123 supplies Bearer verification/challenges when joined. API-key catalog construction does not wait for OAuth login completion.
- Every selected feature owner supplies the actual raw-input schema, safe result/error projection, enablement/name/description/annotations/destructive guidance and invocation service with one policy/validation authority. #42 owns generic request execution; #116–118 own operational tools.
- #102 supplies actual authoring content/resources/templates/MIME/errors; #97 supplies Assistant review/approval/continuation consumption. Catalog presence never constitutes approval. Shared dispatcher contracts support both external and internal clients without copying feature services or executing validation/middleware twice.

## Decision holds

Schema converter and dependency-version agreement, raw versus transformed input representation, output/result policy, collisions/diagnostics, catalog freshness/revocation and credential scope need accepted choices. Source ApiKey-then-Bearer/no-cookie and non-admin Custom Widget hiding require explicit authority dispositions, not automatic broadening. Origin/exposure policy and protocol SDK compatibility remain unverified. OAuth token/consent choices affect Bearer acceptance, not every local tool. Redis removal is settled; any replacement catalog state must classify bounds, expiry/invalidation and restart guarantees rather than assume KV provides them.

## Ownership and release joins

The MCP owner writes local protocol/catalog/dispatcher modules; each feature owner keeps metadata/content/service semantics and client UI. COMPOSITION is the one central registry/root/manifests/exports/lock/build writer across #01/#21/#125. Exclusive files and accepted interfaces gate dispatch. Real tool call/resource and Assistant-dispatch joins close this bounded path; #125 reconciles all candidates/non-candidates and measured runtime catalogs. Old transport aliases may disappear, while MCP interoperability remains required.

## Acceptance criteria

- [ ] An explicit enabled, non-subscription catalog accounts for all133 source candidates, 71 non-candidates and nine annotation-only leaves without auto-exposure through OpenAPI or annotations; valid unique names and deterministic collision diagnostics have an approved disposition.
- [ ] Generated schemas accurately describe raw client inputs, including no-input calls, defaults, transforms/refinements and selector constraints; dispatch validates/transforms once and executes the authorized service once, including the Kubernetes wrappers, with meaningful converter failures rather than fabricated schemas.
- [ ] External and internal clients use the complete shared dispatcher with accurate descriptions/annotations/discovery/destructive guidance and safe result/errors. ApiKey/Bearer precedence follows accepted policy, ambient cookies do not grant authority, and listed admin tools still enforce server-side execution permission.
- [ ] Catalogs remain private and identity-scoped, honor approved non-admin authoring visibility and invalidate on authority changes; the Assistant consumer retains independent human review/approval and continuation without hidden duplicate mutations.
- [ ] Real admin prompts/resources/templates retain actual content, arguments, MIME, URI decoding and unknown-resource failures through #102's services, without cross-user/secret leakage or rewriting authoring content in protocol handlers.
- [ ] A real external tools/list/call and resource flow plus internal consumer demonstrates SDK Streamable HTTP framing/status/abort/cleanup separately from application SSE and Assistant UIMessage. Focused authorized evidence records unverified schema/protocol limitations; static133 is not a successful runtime count.

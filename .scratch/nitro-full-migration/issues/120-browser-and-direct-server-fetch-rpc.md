# 120: Browser and direct-server Fetch RPC

**What to build:** A browser and a request-local server loader invoke the same real authorized query/mutation service through direct oRPC, without loopback HTTP, secret-bearing browser imports or the old application runtime. This is a bounded shared expansion with a runnable feature consumer, not ownership of every application procedure.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Own internal Fetch host/client, dispatch, safe error and serializer adapters; source H01 GET/POST/OPTIONS and D-RPC-BATCH-STREAMING receive deliberate replacement dispositions. [The 334-leaf source ledger](../drafts/transports.md#primary-procedure-ledger--334-unique-paths) remains exactly one primary domain owner per leaf; RPC/REST/MCP projections add no domain owners or API-only copies. Counts and source names are not mandated target spellings. All-leaf binding and actual feature closure converge in #125.

## Required contracts

- #01 supplies accepted request-local principal/setup context, response effects/abort, local descriptor contribution and route-precedence interfaces; #04 supplies policy/demo/secret boundaries, #09 the session reader, and #12 API-key verification where used. Accept only the specific revisions needed, not entire producer completion.
- Each participating feature owner supplies its real query/mutation service, client-safe input/output/error contract, identity/query keys, invalidation and browser/server consumer. #25's information query is a possible tracer, not an assigned mutation owner.
- #120 supplies reusable Fetch/DTO/error interfaces to #121/#122. #113/#18 retain multipart parsers, byte limits and feature UI; agree a bounded native Fetch contribution if RPC parsing is unsuitable. #05–08/#22 supply only the locale/navigation contracts needed by the tracer.

## Decision holds

Output DTO/rich-value/serializer choices, ambiguous-write retry policy and per-surface credential precedence require explicit acceptance. Internal source ApiKey-then-cookie and cookie-only SSR behavior must receive deliberate policy dispositions, never leak into REST/MCP. Q11/Q12/Q15 hold only concrete SQL/conversion/session-continuity work that depends on them; Q13 holds editor-dependent command contracts, not ordinary RPC extraction. No stale Redis or replica choice is reopened.

## Ownership and release joins

The RPC owner writes exclusively allocated local adapters. Feature owners keep service semantics, persistence and client adoption. COMPOSITION is the single writer across #01/#21/#125 for central mounts, root SSR/providers, route generation/precedence, exports, manifests, lockfile and builds. Exclusive allocation and accepted revisions gate dispatch; triage status is not authorization. Real identity/service integration gates the tracer's acceptance; #125 joins all 334 feature dispositions without blocking local work on every peer.

## Acceptance criteria

- [ ] One real authorized read and mutation work from both browser and direct server paths, executing the feature service exactly once; anonymous public reads, demo writes and denials follow accepted feature policies rather than fixture identity.
- [ ] Unknown API paths and unsupported methods intentionally return 404/405 instead of SSR fallback; RPC, REST, MCP, auth, stream, binary and static precedence is accepted through the composition contribution.
- [ ] Validation/domain errors preserve safe details and denial-as-not-found where intended, never stacks/secrets; actual outputs, null/undefined, Dates and units survive the chosen serializer and request-local SSR hydration. Durable old-content decoding is not mistaken for old-wire compatibility.
- [ ] The real consumer exercises identity-scoped queries, logout/permission clearing, retry/ambiguous-write recovery and correct invalidation, without global private SSR caches or indefinitely open stream prefetch.
- [ ] Bounded multipart/native Fetch handoff preserves feature byte fidelity and limits; focused transport/policy evidence and scoped target checks are recorded only at authorized implementation gates. No new per-procedure tickets or claimed all334 parity are used to close this tracer.

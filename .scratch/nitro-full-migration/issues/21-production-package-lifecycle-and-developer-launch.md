# 21: Production package, lifecycle and developer launch

**What to build:** Publish one Bun/Nitro container with real readiness, migrations/assets/native resources, durable volumes and bounded stop/restart; preserve application CLI/harness and existing Go developer-tool launch/provenance consumers. This named packaging/composition expansion can begin before full-product completion; #125 remains the final convergence gate.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] The single target artifact orders configure→owned resource open→migration verification→durable readiness→approved cleanup/scheduler readiness→accept, reports slow/failing start honestly and rejects a second active backend per data directory; HTTP/auth/stream/binary/static dispatch precedes SSR.
- [ ] Signal/maintenance rejects new writes/runs, stops schedules, boundedly aborts/drains refresh/upstream/live work, unsubscribes/closes hosts, then disposes every main/trust/proxy/temporary DB connection, HTTP client and timer in ownership order.
- [ ] Resource manifests package both-engine migrations/journals, SQL/WASM/native database/TLS/DNS/sanitizer/editor/terminal resources, fonts/icons/static assets, trust files and executable CLI/harness; configured paths/PUID/PGID/volumes/_FILE secrets/stable encryption key survive approved conversion without secret browser imports or environment echo.
- [ ] Harness/local-harness help/build/run/setup/port/stop lazy dispatch avoids eager production auth/DB/environment initialization; normal domain CLI initializes only owned resources, uses the actual #119 service entry and never reports stale Next artifacts as successful launch.
- [ ] Existing Go local/PR image build/rebuild/source fingerprint/provenance and run/open/logs/data/shell/CI/stop/restart/remove/doctor/TUI consumers work against the new launch/health contract in authorized disposable acceptance, including port 7575/appdata/key assumptions or explicit approved changes; excluded Go runtimes are not rewritten.
- [ ] Future coordinated focused artifact/lazy-help/native-resource/readiness/drain/restart evidence validates real adapters and reports limitations; contract obsolete target Next/RSC/transport and Redis runtime dependencies only after migrated callers are accounted for, with no dual build or fixture-only parity claim.

## Coverage

Merged **CORE-08 packaging/lifecycle + OPS-11**: central production resource graph, health/readiness handlers, environment/secret loading, container/launcher, target-only contraction, lazy harness dispatcher and Go consumer/provenance contract. Evidence: [core CORE-08](../drafts/core.md), [extended OPS-11](../drafts/extended.md), [persistence §§5–6](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md), [graph COMPOSITION/launch transfer](../GRAPH-AUDIT.md). Docs and remote Go/PocketBase Workshop runtimes remain excluded except genuine consuming contracts.

## Required contracts

#01 descriptor/service/SSR assembly; #02 open/migrate/readiness/close/resource assets; #03 refresh drain; #09 session/native resources; #18 trust lifetime; #20 startup/scheduler; #111/#112 archive preparation/maintenance/recovery; #119 CLI entry and #124 selected stream host lifecycle. #24 assets/document and individual feature native-resource descriptors join incrementally. Accept exact used revisions, not all peer tickets complete before packaging starts.

## Decision holds

**Q11** concrete SQL/native stack, **Q12** conversion/recovery, **Q14** long-lived host/listener and **Q15** session continuity affect their actual shipping joins. Per-service retained/cold-start state, cleanup/slow-start readiness, supervisor drain and changed launch assumptions require dispositions. Bun/Nitro sole build, singleton, Redis removal and retained UI are settled; candidate native/runtime compatibility still requires evidence.

## Ownership

**COMPOSITION**, the same sole writer as #01/#125, owns central entry/plugins/providers/routes/exports/manifests/lock/build/container/publication. Feature owners contribute local lifecycle/resource adapters and contract obsolete local callers; #119 owns domain CLI, this ticket harness/package, not Go implementation. Dispatch requires accepted consumed revisions, settled applicable holds and exclusive allocation. Local ticket publication does not build, launch, stop or probe anything; the playable fixture remains unchanged.

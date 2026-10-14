# Map every integration and provider for preservation

Type: research. Claimed by the coordinator for a background research worker. Blocked by: none. Linear publication is blocked by its free issue limit.

## Question

Which integration/provider clients and capabilities can be reused, and what framework, runtime, cache and credential boundaries must change for every registered integration in the Nitro backend?

Produce a complete source-backed provider/capability inventory, request/scheduling dependencies, permission and secret boundaries, runtime assumptions, reusable service modules and adaptation groups. Propose genuinely independent batches and per-provider verification obligations without dropping supported behavior or claiming untested live compatibility. Integration-management UI is a required product seam, not a substitute for provider preservation.

Read `../RESEARCH.md`. Write only `research_notes/Homarr full Nitro migration/integrations.md`. Leave widget UI/options to the widget worker and background scheduling implementation to the persistence/background worker; name their consumed interfaces.

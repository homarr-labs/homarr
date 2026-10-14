# 88: Catalog-driven metric cards

**What to build:** Select actual catalog metrics/sources, save entries/card/table layouts and consume grouped last-good snapshots with honest per-source/native/projection/unsupported capability states.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All six options and typed source/metric entry identities validate/convert/save/reload; cards/table/plain/rows/icons/spacing use catalog units and a real selector rather than a hard-coded provider subset.
- [ ] Preserve the source selection catalog of all integration kinds except `ical` (88 eligible) while explicitly resolving `bindery`/`wazuh` selectable-but-unimplemented mismatch against 86 Stats implementations; unknown/unavailable/native-versus-projection is never fabricated as zero or silently removed.
- [ ] Group snapshots by integration with composite/per-source failures, 60s catalog stale, 30s snapshot stale, 60s component polling and cooldown; bounded refresh/force semantics preserve the source one-hour freshness behavior until explicitly changed, and runtime status reports data/error age rather than mount time.
- [ ] Dynamic entries/source-set actual keys govern edits/removal/cancellation/refresh; use-before-secret, preview authority, forbidden/session clearing and approved request-local hydration/client boundaries prevent cross-source leakage. Future focused catalog mismatch disposition, converted entry units, stale/force limits and dynamic-query evidence runs at scoped target gates.

## Coverage

`stats` — 6: `entries`, `table`, `rows`, `plain`, `showIcon`, `spacing`. Primary `statsEntries` input; consumes `switch`, `select`. Primary leaves `widget.stats.catalog/snapshot/refresh`, including external-only refresh semantics. Provider identities and metric fields are the exact exhaustive [integration provider/Stats ledger](../drafts/integrations.md#exact-once-providermodel-coverage-ledger) and [source native/projection Stats metric ledgers](../../../research_notes/Homarr%20full%20Nitro%20migration/integrations.md#2-exhaustive-provider-ledger); excludes `ical`, keeps explicit held dispositions for `bindery`/`wazuh`, and includes `mock`. These large linked identities remain provider-owned; #89 owns Umami `websites` projection. Exact [Stats widget evidence](../drafts/widgets.md#widget-stats--catalog-driven-metric-cards-and-grouped-snapshots).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); saved-board/item/kind/options/entry validation, declared nullish defaults, stale-versus-forbidden recovery and cleanup apply.

## Required contracts

Initially unaccepted: #40 catalog/scalar snapshot/native-capability/refresh DTO; #03 bounded last-good generation/cooldown/freshness; #04 use/preview; #67 dynamic query/status/host; #68 option service; #07 units; #120 DTO/key/refresh errors. Individual provider metric/result revisions may arrive independently; final actual provider/catalog evidence is required for complete coverage, but no all-89-provider start barrier or fixture-only completion.

## Decision holds

Q11/Q12 entries/snapshot/content conversion, Q13 affected saves; `bindery`/`wazuh` metric mismatch and one-hour freshness/force policy, last-good security/freshness/demo behavior and SSR require explicit dispositions. Q15 applies to session revocation paths.

## Ownership

#88 owns Stats widget/catalog-entry/input/grouped service contributions and runtime actions, not 86 upstream implementations. Provider owners supply declared metrics/DTOs, #03 owns backing primitives, #68 options/#29 placement. COMPOSITION central registry/exports remain sole-writer; exclusive local files precede dispatch.

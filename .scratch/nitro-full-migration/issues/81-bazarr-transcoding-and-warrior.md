# 81: Bazarr, transcoding and Warrior

**What to build:** Save subtitle/provider-health, transcoding queue/view and ArchiveTeam progress presentation and consume their actual authorized source data.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All seven options convert/save/reload under board/item/kind/type and single-compatible-integration checks; Bazarr missing/provider/health toggles, Tdarr view and Warrior broadcast/project/task/work/progress render supported compact/advanced states.
- [ ] Preserve `queuePageSize` durably and obtain explicit layout-derived-versus-option-driven sizing disposition before implementing behavior; default/new/converted options cannot be silently discarded or described as already honored by source.
- [ ] Use-before-secret and one-provider policy yield meaningful suspense/empty/partial/failure/retry/forbidden outcomes; consume #65's trusted Warrior snapshot lifecycle, not a browser permanent socket or HTML-test-only proof.
- [ ] Transcoding no-root-poll, other effective refresh and exact queue/page/view identities survive focus/resize and approved hydration/client splits; cleanup/revocation clears the correct data. Future focused queue-size disposition, source failure, saved conversion and scoped refresh evidence runs at agreed target gates.

## Coverage

`bazarr` (4): `showMissingEpisodes`, `showMissingMovies`, `showProviderIssues`, `showHealthIssues`; `mediaTranscoding` (2): `defaultView`, `queuePageSize`; `archiveTeamWarrior` (1): `showBroadcastMessage`. Inputs consumed `switch`, `select`, `number`. Primary `widget.bazarr.getBadges`, `widget.mediaTranscoding.getDataAsync`, `widget.archiveTeamWarrior.getStatus`. Families `bazarr`, `tdarr`, `archiveTeamWarrior`, each also `mock`, each one integration. Native execution stays #50/#60/#65; conditional distributions were not adopted. Exact [job evidence](../drafts/widgets.md#widget-media-jobs--subtitle-badges-transcoding-queue-and-warrior-progress).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) under [DESIGN](../DESIGN.md), including option refinements/nullish defaults, exact queries, stale-versus-forbidden recovery and future focused checks.

## Required contracts

Initially unaccepted: #50 badges, #60 Tdarr queue/stats, #65 Warrior trusted socket snapshot/progress; #40 execution; #04 view/use/preview; #67 host/error/query; #68 option save; #03 refresh; #07 units/time; #120 DTO/page keys. Final real protocol/provider/queue/widget evidence is separate from these accepted revisions and is not an all-provider start barrier.

## Decision holds

Q11/Q12 option conversion, Q13 affected saves; ignored `queuePageSize` policy is a genuine product hold; selective SSR, freshness/effective polling/demo overrides remain unsettled on these paths.

## Ownership

#81 owns three status/job widget services/UI/options; #50/#60/#65 own native clients and Warrior upstream socket. #68 options/#29 placement and COMPOSITION registration/export/build remain exclusive; allocate local files before dispatch.

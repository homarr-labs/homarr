# 73: RSS and releases

**What to build:** Persist permitted feed URLs and secret-backed repository selections, then show sanitized posts/releases with protected secret management and scoped refresh.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 14 options, feed arrays, repository identities and encrypted secret references convert/save/reload; create/update/clear/configured-kind operations expose authorized metadata only, never token plaintext in client caches/logs/DTOs.
- [ ] RSS server-side saved/supplied URL authorization, feed limits, sanitization/RTL/images/description hiding/clamp and NO_EXTERNAL_CONNECTION behavior preserve empty/partial results and failed-feed counts; all-failed responses remain distinguishable and sanitized.
- [ ] Per-repository exact query arrays support age/highlight/detail/icon/top sorting and advanced views; credentials apply only to saved authorized repositories, including changed/unsaved-preview attempts, not a guessed GitHub IntegrationKind.
- [ ] No-root-poll/manual refresh/recovery isolates added/removed repositories and URLs, cancels registrations and clears forbidden/session/secret-revision data. Approved hydration and image/client splits have no duplicate fetch; future focused secret/URL/partial-feed/conversion evidence runs only at scoped target milestones.

## Coverage

`rssFeed` (7): `feedUrls`, `enableRtl`, `textLinesClamp`, `descriptionMaxLength`, `maximumAmountPosts`, `hideDescription`, `showPosterImage`; `releases` (7): `newReleaseWithin`, `staleReleaseWithin`, `showOnlyHighlighted`, `showDetails`, `showOnlyIcon`, `topReleases`, `repositories`. Primary inputs `multiText`, `multiReleasesRepositories`; consumes `text`, `switch`, `number`. Primary leaves `widget.rssFeed.getFeeds`, `widget.releases.getLatest`, `widget.secrets.setSecret/deleteSecret/getConfiguredKinds`. Exact [feed/release evidence](../drafts/widgets.md#widget-feeds-releases--authorized-feed-aggregation-and-secret-backed-release-cards) and [application ledger](../../../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md#widget--95-leaves--46-registered-subrouters).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) under [DESIGN](../DESIGN.md); placement/kind/types/refinements, current policy-before-secret, exact identities, hydration/client isolation and cleanup are required.

## Required contracts

Initially unaccepted: #04 crypto/repository/URL/preview authority; #02 encrypted reference repository; #112 conversion; #03 bounded provider cache/revision/timeout; #67 query/status/error host; #68 option save/editor; #27/#28 board effects; #07 locale/time; #113/#114 safe images; #120 contribution DTO/errors. Real encrypted persistence and permitted upstream evidence are later joins; no broad integration rollout barrier.

## Decision holds

Q11/Q12 encrypted-content persistence/conversion; Q13 affected saves; precise RSS/repository URL/preview/token rules and SSR/freshness/demo behavior require explicit disposition. No extra provider kind or external-contract compatibility is assumed.

## Ownership

#73 owns feed/release execution/orchestration/renderers and all three widget-secret leaves/editor flow. #04 supplies crypto/policy, #02 physical schema, #68 common options and #29 placement; COMPOSITION mounts local contributions and owns central exports/manifests. Record exclusive local files before dispatch.

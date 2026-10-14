# 115 — Icon sources, synchronization and picker

## What to build
Own all five icon repository fetchers plus local-media query, transactional synchronization/replacement, normalization/ranking/licenses/groups and actual picker/auto-search consumption with durable selected references.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary MEDIA-03, accepting fetchers previously orphaned by the draft. Sources dashboard-icons, selfhst, SimpleIcons, Papirus, homelab-svg-assets and local media. Primary leaf icon.findIcons; normalization, ranking, SVG/local ordering, groups/limits/count and license/repository metadata. Behavior models icons/iconRepositories and medias local mapping; own app auto-search and exported icon/media picker domain consumed by real app/branding/background forms. #20 invokes this synchronization service in iconsUpdater; no new sixth job or provider IntegrationKind is created.

## Required contracts
Initially unaccepted: #02 icon/repository transaction/replacement/reference errors; #113 local-media lookup/deletion/safe binary identity; #35 app and #17/#32 settings selection commands; #40 bounded trusted outbound fetch/redaction; #20 job invoke/cancel/status interface; #04 safe public icon projection and #05–08/#22 form/query ports. Own the fetch implementation, not an unnamed integration handoff.

## Decision holds
Upstream repository response/license/version evidence and external-connection/failure policy; preserve selected URLs/content via explicit conversion under Q11/Q12. Local restricted-management versus public icon projection and detailed locale/search behavior need explicit disposition. No live source success is asserted.

## Ownership
Own all source fetchers, local-media icon query, sync transaction orchestration, ranking/license/picker services and feature clients. #20 alone schedules/owns job registry; #113 owns media mutation; #02 schema and COMPOSITION central exports/dependencies. Real sync→query→form selection→reload and scheduled invocation are production joins; #125 is final convergence.

## Acceptance criteria
- [ ] Each of five named fetchers validates actual bounded upstream results and local media produces selectable icons; typed per-source unavailable/error states preserve the other sources and report honest unverified live outcomes.
- [ ] Transactional sync/repository replacement preserves IDs or explicit reference maps, licenses/groups and valid selected content; failure/cancellation cannot publish partial replacement or clear valid user selections.
- [ ] Public findIcons implements normalized ranking, SVG/local ordering, group limits/counts and license metadata; local-media deletion updates mapping without exposing another user's restricted media-management list or substituting another icon silently.
- [ ] Real app auto-search and app/branding/background picker clients save/reload the selected reference after refresh/conversion; #20 invokes the same cancellable sync service, not a duplicate fetch body.
- [ ] Focused future ranked/grouped/license search, rejected-sync-live-unchanged, local selection/deletion and persisted-picker regressions cover all six families without broad live provider checks.

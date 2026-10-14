# 15: Groups, grants and ordered home defaults

**What to build:** Administrators manage groups, eligible membership, ownership/order, explicit grants and desktop/mobile home defaults transactionally, with provider re-login reconciliation and effective permission/home behavior matching the approved policy.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Group IDs/ownership/order/cumulative memberships and explicit deduplicated grants persist; Viewer/Editor/Admin presets round-trip without granting unrelated app-use or resource authority, and list/search/pagination/selection expose only safe permitted data.
- [ ] Reserved everyone cannot rename/delete/transfer/edit members; reconciliation retains it and maps only existing allowed provider groups without creating arbitrary claims/grants.
- [ ] Approved local/mixed/external target eligibility governs both add and remove; direct services, UI hints and LDAP/OIDC re-login produce the same membership result rather than preserving the source removal asymmetry accidentally.
- [ ] Ownership/reorder/default/grant commands transact safely and validate intended target/public home references while preserving historical desktop/mobile values; ordered device fallback agrees with the authoritative board resolver.
- [ ] Real create/settings/members/permissions/owner-transfer/delete flows show structured loading/failure/retry and invalidate affected current grants/session scope/home routing so removed access cannot linger.
- [ ] Future focused membership denial/re-login/ordered-home/transaction evidence uses real disposable group data and both repository paths where relevant; setup receives a reusable group constructor, not a second initial-group orchestrator.

## Coverage

**ADMIN-03**, identity **I13 + I09/I14 consumers**; `groups/groupMembers/groupPermissions`; `group.getAll/getPaginated/getById/selectable/search/createGroup/updateGroup/savePartialSettings/savePositions/savePermissions/transferOwnership/deleteGroup/addMember/removeMember`. `group.createInitialExternalGroup` primary orchestration transfers to #109 using this constructor. Evidence: [core ADMIN-03](../drafts/core.md), [identity I13/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md), [endpoint group census](../../../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md).

## Required contracts

#01 principal/contribution; #04 grant matrix/resource policy; #02 group/member/grant transactions; #26 authoritative ordered/device home references; #10/#11 provider reconciliation input/effects; #09 current-permission invalidation and #05/#08/#22 forms/list/navigation only as used. Review each consumed revision, not whole providers/boards complete.

## Decision holds

Mixed/external membership symmetry and next-login synchronization, owner/admin management rules, target-home eligibility and ordered mobile/desktop fallback discrepancy require explicit policy. Q11 affects repository implementation; Q15 only session effects consumed. No proposed source bug correction is silently approved by publication.

## Ownership

Exclusive group commands/UI/reconciliation and ordered group-default semantics. #04 evaluates policy, #26 resolves homes, #31 home command orchestration, #16 user defaults, #17 instance defaults; #02 sole physical writer. COMPOSITION mounts contributions; dispatch needs accepted used revisions and exclusive allocation.

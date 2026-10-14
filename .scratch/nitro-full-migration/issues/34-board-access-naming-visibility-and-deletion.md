# 34: Board access, naming, visibility and deletion

**What to build:** Manage board grants/name/publication/deletion with live full-access policy, canonical identity, transactional reference cleanup and correct navigation/cache revocation for affected viewers/editors.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] ACL reads/user/group saves, rename, visibility and deletion enforce live full access, caller-scoped evidence, demo restrictions and existence masking on endpoints; authorized identity selectors never disclose unrestricted catalogs.
- [ ] Rename keeps immutable board/cache identity and content, validates/encodes canonical targets and updates current route/title/catalogs without rebuild; old-name aliases are not required or silently created.
- [ ] Public visibility respects approved instance-home constraints. ACL/visibility changes revoke direct/warm-render/client-catalog/current-editor access according to explicit policy rather than relying on HTML TTL or stale controls.
- [ ] Confirmed delete transactionally cleans dependent items/layouts/ACL/home references and recovers current routes, home/picker/preview and in-flight drafts without dangling identities or silent data loss.
- [ ] Failed/conflicting changes preserve accurate errors/UI, and stale completions cannot resurrect deleted/private data. Focused future foreign-grant, warm-cache revocation and delete/reload recovery scenarios verify actual services and contributed danger controls.

## Coverage

BOARD-09: primary `board.getBoardPermissions`, `renameBoard`, `changeBoardVisibility`, `deleteBoard`, `saveUserBoardPermissions`, `saveGroupBoardPermissions`; #32's ACL/danger panel and #31's card-delete consumer. #26 owns read/cache identity, #13/#15 authorized user/group selection, #28 active draft handling. Physical relation preservation stays #02-owned.

## Required contracts

#04's principal-scoped full/demo/masking policy and revocation semantics; #02's lifecycle transaction/reference cleanup; #26's canonical read/effects; #13/#15's bounded selectable identities; #32/#31's panel/card contribution callbacks; #28's draft revocation and #03/#01's generation/private-artifact invalidation. Require accepted individual interfaces, not whole peer completion.

## Decision holds

Public-home/visibility rules, foreign-grant/source correction dispositions and active-editor revocation latency require explicit approval. Detailed SSR/cache/remote-change policy and Q13 draft consequences remain held; Q12 governs durable conversion/reference cleanup, not authorization to touch real data.

## Ownership

One local writer owns board ACL/lifecycle service/endpoints and local panels/clients/focused regressions, contributing to parent hosts without concurrent edits. #02 alone writes schema; #01 alone owns root SSR/providers/central routing/manifests. Descriptive folder-based routes/ignored helpers respect layout/pathless/non-nested/dynamic semantics. Decisions/contracts/exclusive files gate dispatch separately from ready-for-agent triage.

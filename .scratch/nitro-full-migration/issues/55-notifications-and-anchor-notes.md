# 55: Notifications and Anchor notes

**What to build:** Configure/test and consume the three notification/note providers, safely delete permitted Gotify messages and edit permitted Anchor notes with truthful permissions and opaque images.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Retained separate provider ticket INTEGRATION-016: primary kinds `ntfy,gotify,anchor`, all native checks/H eligibility/projected Stats. Ntfy topic or topic+K bearer preserves polling JSON-lines/events/messages/timestamps/attachments/topic paths; messages is retrieved notifications, no invented publish API. Gotify U/P Basic retains application→message metadata/icon paths and delete; messages is retrieved notifications. Anchor K bearer retains list/options/detail/document/permission/tag/pin/archive/update payload; notes counts retrieved list. Nextcloud contributes notifications from #54, not duplicated native fetches. Exact evidence: original INTEGRATION-016/research §§2.2–2.3.

## Required contracts

Accept #40 native query/action/snapshot/image/result/operation, #114 opaque image handles, #41 managed forms, #77 notification and #71 note consumption, #54 notification contribution and #04 policy. Narrow revisions permit independent provider work; real secrets/identity/storage/images/runtime and all three managed/native UI joins remain acceptance obligations, not mutual widget blockers.

## Decision holds

Q11/Q12 apply to concrete persistence/conversion, Q15 applicable session continuity. Image/session/result restart lifetime and native URL/trust policy remain scoped. Live notification access and disposable message deletion/note edit effects require explicit approval; keeping this provider ticket separate does not settle policy.

## Ownership

Exclusively own the three clients and local notification/note native compositions/descriptors/fixtures. Partition shared notification DTO helpers before dispatch; #54 retains Nextcloud fetches, #77/#71 widget queries/actions/presentation, #114 image backing and #41 reusable forms. COMPOSITION alone mounts registrations/manifests.

- [ ] All three kinds complete configure/test/masked edit/mode/remove/delete and authorized list/detail/Stats consumer demonstration, preserving exact topic/optional-key/Basic/bearer modes and metadata.
- [ ] Fixtures preserve malformed JSON-line handling, event/message times/attachments, nullable/partial Gotify app joins, Anchor document/permission/tag/pin/archive and exact update payloads; no publish or unsupported note methods are invented.
- [ ] Gotify icons use opaque authorized #114 handles with correct source paths, never authenticated private URLs. Config/trust/revision changes invalidate relevant images/results under accepted lifetime rules.
- [ ] Native query checks precede decrypt; message delete/note update requires interact, bypasses caches and invalidates intended consumers. Focused denial/error/abort/ambiguous-write fixtures prove sanitized causes, resource cleanup and no automatic mutation retry.
- [ ] Demonstrate actual notification/note UI success and denial for every kind. Later explicitly approved live scope separates supplied-topic reads, sacrificial Gotify read/image/delete and disposable Anchor edit/revert; inaccessible sources remain unverified and no automatic all-provider matrix is mandated.

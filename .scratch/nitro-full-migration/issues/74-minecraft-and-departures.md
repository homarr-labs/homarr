# 74: Minecraft and departures

**What to build:** Configure/save Java or Bedrock server status and custom-source station departures with dynamic authorized station lookup and safe bounded networking.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All five options validate/convert/save/reload; Minecraft domain/title/Java/Bedrock results preserve no-poll/manual recovery, with network work kept server-side and meaningful connection failures.
- [ ] Dynamic station search depends on query/base URL/preview authority, handles pending/error/empty and retains station identities when options change; malformed or incompatible saved options receive repair feedback.
- [ ] Departures/search and option saves use the same approved custom URL/public-address/DNS-pinning policy; saved-widget view or authorized modifier preview is checked server-side, and undefined IDs never borrow saved placement authority.
- [ ] Station-search 24h and departure 60s backend caches remain distinct from client refresh; exact source/station/query keys, advanced time formatting, forbidden clearing, approved hydration and cancellation isolate instances. Future focused URL/DNS/preview/conversion/query-isolation evidence uses disposable services at scoped target gates.

## Coverage

`minecraftServerStatus` (3): `title`, `domain`, `isBedrockServer`; `timetable` (2): `baseUrl`, `station`. Primary `dynamicSelect` input; consumes `text`, `switch`. Primary leaves `widget.minecraft.getServerStatus`, `widget.timetable.getTimetable/searchStations`. No ordinary integration selection. Exact [standalone lookup evidence](../drafts/widgets.md#widget-standalone-lookups--minecraft-status-and-dns-pinned-departure-lookup).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); persisted membership/kind/types and current preview/read policies apply alongside scoped stale/retry/cleanup/client isolation.

## Required contracts

Initially unaccepted: #04 saved-view/modifier-preview and outbound trust policy; #03 bounded cache/DNS/network deadlines; #67 host/query/error; #68 URL-aware option save/editor; #27/#28 placement effects; #07 clock/time labels; #120 typed inputs/results/errors. Precise revisions permit isolated work; real safe network/persisted lookup evidence is a later join, not all providers complete.

## Decision holds

Q11/Q12 option conversion, Q13 affected saves; custom-source trust/DNS/preview policy and SSR/freshness/time basis require approval where applicable. Singleton/Redis removal/routing are already settled.

## Ownership

#74 owns standalone status/departure services and dynamic station input. #68 invokes its URL validation through the common option wrapper, #29 owns placement; #03 owns reusable backing, COMPOSITION central mount. Allocate exclusive local files before dispatch.

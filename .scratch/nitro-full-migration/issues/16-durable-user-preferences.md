# 16: Durable user preferences

**What to build:** Eligible self/admin changes to appearance, units, search, calendar, header and interaction preferences persist and update actual dashboard consumers without overwriting unrelated values or exposing another user's settings. Host #23's exported tour reset control.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Read/patch enforces self/admin/demo policy, validates all fields before one write, preserves omitted versus null-clear semantics and merges nested header fields/zones while replacing supplied arrays.
- [ ] Colors/theme, byte units, firstDayOfWeek, ping icons, widget right-click, desktop/mobile homes, search/default/new-tab/bangs and header zones/shortcuts retain stored values and deliberate per-dialect defaults across reload.
- [ ] New homes/shortcuts obey the approved target-user visibility policy, with explicit clear/reference behavior; #31's home orchestration consumes one preference writer rather than duplicating it.
- [ ] Actual profile/preferences/Spotlight/header/calendar/search consumers show immediate safe Settings/Query/loader/render effects plus recoverable localized failures; locale/guest theme remain separate cookie capabilities unless deliberately changed.
- [ ] Embed #23's tour status/reset control without duplicating tour commands/state; future focused patch/null/target-user/private-access evidence demonstrates real persistence and consumer invalidation on disposable users.

## Coverage

**ADMIN-04**, identity **I23 excluding transferred tours**; `user.getPreferences/updatePreferences/changeHomeBoards/changeDefaultSearchEngine/changeSearchPreferences/changeColorScheme/changeByteUnitSystem/changeEnableRightClickOnWidgets/changePingIconsEnabled/changeHeaderPreferences/changeDdgBangs/changeFirstDayOfWeek`. Deprecated spellings may be replaced while their preference capabilities persist. Evidence: [core ADMIN-04](../drafts/core.md), [identity I23/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md), [endpoint user census](../../../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md).

## Required contracts

#01 safe snapshot/effects; #04 self/admin/demo; #02 users patch repository; #26 target-home visibility, #31 home command and #36 search reference; #06 cookie/locale boundary; #23 exported tour reset; selected #05/#08/#22 UI/invalidation. Review narrow consumed revisions only.

## Decision holds

Caller-versus-target home eligibility, shortcut/reference clearing, future defaults and deliberate interaction changes need disposition. Locale storage is not silently redesigned; Q11 affects concrete repository only. Tour reset behavior follows #23's accepted contract.

## Ownership

Exclusive preference writer/registry/UI, not shared users schema (#02), profile credentials (#13), tours (#23) or home resolver (#26). COMPOSITION mounts providers/exports. Dispatch needs accepted used revisions, applicable choices and exclusive allocation; publication performs no checks.

# 25: About, versions and application information

**What to build:** Render real About/build/dependency/license/contributor information and safe version/demo/read-only/update/analytics presentation, composing the four response services without duplicating update refresh or analytics jobs.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] About presents actual release/build version and dependency/license provenance, static contributor aliases, localized keyboard/language/help information and usable accessible links; fixture constants or an empty page cannot establish completion.
- [ ] Four bounded services/response contributions deliver GitHub, Crowdin and OpenCollective contributors/sponsors/translators plus dependencies. Their loading/empty/error behavior is independent, sanitized and respects external-connection policy without exposing server credentials.
- [ ] `info.getInfo`, `info.isDemoMode` and `info.isDemoReadOnly` replacement projections are explicit and public-safe under their approved authority; direct requests and browser presentation agree without private bootstrap leakage.
- [ ] Update/header and analytics action/status descriptors consume #03's update refresh/state and #20's analytics service, applying permission/consent/`NO_EXTERNAL_CONNECTION` gates and recoverable unavailable states without duplicate network bodies or sends.
- [ ] Demonstrate real About resources, information projections and downstream presentation in the target shell; focused future packaged-data, restricted-info and disabled update/analytics regressions preserve distinct API-versus-SSR dispatch and safe local image behavior.

## Coverage

SHELL-05 plus About/info/update/analytics-presentation portions of OPS-09: About route; four source response capabilities GitHub contributors, Crowdin contributors, OpenCollective contributors and dependencies; primary three `info` projections. #23 owns `home.getStats`; #03 owns `updateChecker.getAvailableUpdates` refresh/service; #20 owns `analytics.sendAnalytics`/job body; #17 owns consent/settings. Old endpoint URLs are accounting evidence, not required aliases.

## Required contracts

#21's build/dependency/resource provenance; #24's safe image/head descriptors; #04/#17's public/demo/consent projections; #03's bounded update result; #20's analytics command/status result; #22's links and #05's translation types. #01 mounts local response/routes. Exact accepted interfaces suffice without complete producer tickets.

## Decision holds

Approve affected safe information/demo projection, external-connection/consent and update/analytics visibility decisions. Detailed SSR/cache/freshness and locale policy remain held where used; unavailable remote evidence is unverified, not a successful contributor/update/analytics result.

## Ownership

One local writer owns About, its four bounded response services, three info projections and presentation descriptors/focused regressions. No update/analytics network implementation moves here. #01 alone owns root SSR/providers and central routing/manifests; feature routes use descriptive filenames/folders, ignored helpers and proper layout/pathless/non-nested/dynamic semantics. Allocate exclusive files before dispatch.

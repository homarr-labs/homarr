# 17: Instance settings and public-safe bootstrap

**What to build:** Administrators round-trip validated instance settings; guests/users receive only safe effective defaults, with consent, branding/culture and downstream cache invalidation coherent across direct requests and navigation.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All eight families—analytics, crawling, board, user, appearance, branding, culture and search—decode/default/merge and round-trip with server domain validation; preserve legacy branding and serialized values rather than relying on weaker generic-save source behavior or form checks.
- [ ] Analytics consent/state and metadata value-CAS retain concurrent updates with the recorded five-retry behavior; network send/job bodies remain #20-owned and private setup-claim rows remain #109-owned.
- [ ] Public/user/admin snapshots omit private/internal/claim/deployment secrets and use request-local memoization; effective preferences and ordered device homes delegate to #16/#15/#26, not a competing simplified resolver.
- [ ] Branding name/greeting/logos/favicon/colors/lock/background/overlay/auth display/radius/CSS, indexing/status/public-home/Gravatar/theme/defaultLocale/search settings have real authorized forms with structured success/error and persistence/reload.
- [ ] Default/branding/culture/consent changes invalidate the exact public/admin/user/root variants; warm bootstrap cannot retain old privileges or leak private rows, and exported capability predicates support create-only/delegated/log-only/self users without imposing blanket admin navigation.
- [ ] Future focused denied-setting/domain-validation/CAS/private-projection evidence exercises real services and consumers with disposable values; enabled tools contribute their own descriptors instead of duplicated backup/task/key/trust implementations.

## Coverage

**ADMIN-05**, identity **I24/I25 and I26 reachability predicates**; `serverSettings.getCulture/getAll/getBranding/getBoardSettings/updateBoardSettings/saveSettings`, typed settings/default merges and analytics CAS. Evidence: [core ADMIN-05](../drafts/core.md), [identity I24–I26/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md). #23 owns actual management navigation/landing, #25 About/info, #20 analytics execution.

## Required contracts

#01 safe bootstrap/render revisions; #04 admin/public projections; #02 settings/CAS repository; #16 user and #15 group defaults; #26 home validation/resolution; #06 defaultLocale and #24 branding descriptors; #20 consent/analytics metadata input; selected #05/#08 forms. Accept per-consumer revisions, not all tools complete.

## Decision holds

Uniform public/target-home validation, generic-setting validation changes, dialect/future defaults and consent/state semantics require dispositions. Locale switching/first-paint consequences follow #06/#07; Q11 concrete SQL and Q12 legacy conversion only where used. No private claim exposure is implied by admin get-all.

## Ownership

Exclusive settings/default/projection/CAS modules and forms; no tour/nav/root/network job or physical-schema edits. COMPOSITION serializes/mounts safe descriptors. Dispatch waits on applicable decisions, accepted used interfaces and exclusive allocation; no runtime checks during publication.

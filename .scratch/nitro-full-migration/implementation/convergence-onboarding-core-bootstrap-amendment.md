# CORE — anonymous bootstrap admission amendment

Controls the credential-domain requirement in CORE plan lines 24–25. Original K/epoch/resource/clock/target-root checks remain unconditional. Numeric caps, escrow, original COMMIT gate and minimal file scope retain the review's favorable findings; no source or runtime grant follows.

Require the ready credential domain and native credential/key proof only when authorizing presented credential evidence. Revalidate that evidence in the same fixed unit; failed credential admission cannot fall back to claim-only authorization.

Anonymous `currentStep` and environment reads do not require a credential-domain row or initialized native key. For anonymous environment setup access, verify the original stored claim/hash/expiry and actual no-users predicate in the same fixed unit. Missing/invalid claim is a real deny; unavailable/malformed/overflow/clock failure is not successful denial. Public current-step semantics and permitted redaction remain source-equivalent.

No anonymous read initializes/adopts a domain, advances a sequence, changes an epoch, renews/deletes a claim or performs another business write. Native K authentication does not acquire an invented enrolled-domain prerequisite. Existing credential/session/write paths keep their current domain requirements unchanged.

Original native reviewer approves this exact branch correction before any CORE DB3 source release. Auth-owner direction is separately plan-approved; F source/static gates, CORE source checks, document/SSR/enrollment, SQLite/runtime/installer/PostgreSQL/data/transport proof remain separate holds.

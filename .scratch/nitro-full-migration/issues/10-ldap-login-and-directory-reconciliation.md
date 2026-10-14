# 10: LDAP login and directory reconciliation

**What to build:** Enabled LDAP login verifies a directory identity and enters the real shared session flow, reconciling only approved profile/groups across success, failure and re-login using disposable directory data.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Service bind, escaped configured filter/scope/attributes and separate user bind require exactly one result and valid UTF-8 email; provider-scoped email reuse/create and first-valued attributes preserve IDs without generic same-email merging.
- [ ] Missing/ambiguous/invalid/wrong-password and disabled-provider direct requests fail generically; RFC4514 escaping, non-ASCII DNs, AD/lldap mappings and configured group-member attributes work without leaking bind credentials/profile/debug data.
- [ ] Every client closes on success/error/cancellation; TLS/certificate behavior is evidenced independently rather than inferred from OIDC's trusted Fetch.
- [ ] Approved external-group reconciliation retains everyone, uses existing allowed groups, respects local/mixed/external management and does not create arbitrary grants; changed membership and profile effects match re-login policy.
- [ ] A disposable directory demonstrates login, error, group change/re-login and logout through actual persistence/session/browser controls with localized recovery; future focused denial/escaping/cleanup evidence is not fixture authentication or real-credential probing.

## Coverage

**AUTH-02**, identity **I03 + LDAP branch of I09**: bind/search/user-bind, attribute/email/DN conversion, configured groups and server-only deployment adapter. Evidence: [core AUTH-02](../drafts/core.md), [identity I03/I09/§5](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md).

## Required contracts

#01 request/effects/abort; #09 verifier→session and accepted bridge evidence for actual integration; #15 provider reconciliation command/transaction; #13 provider-owned account constructor; #02 user/group repository; #04 policy and #05/#08 login feedback. #18 trust contributes only the exact supported LDAP TLS boundary, not proof that Fetch trust applies. Review each narrow revision without requiring whole peers complete.

## Decision holds

LDAP-only local-login and mixed membership/profile ownership policy, TLS trust and group-change effects need disposition. **Q15** controls shared session continuity; Q11 only concrete SQL use. Core Fetch bridge acceptance remains evidence-dependent; unsafe undecided paths remain unavailable.

## Ownership

Exclusive LDAP verifier/directory adapter and local login contribution; #09 session effects/browser lifecycle, #15 common reconciliation, COMPOSITION registration. Exclusive allocation and accepted used revisions gate dispatch; no directory/runtime checks during publication.

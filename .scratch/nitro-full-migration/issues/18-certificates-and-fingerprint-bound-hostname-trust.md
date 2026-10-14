# 18: Certificates and fingerprint-bound hostname trust

**What to build:** Administrators securely upload/list/inspect/ensure/remove roots and manage hostname+fingerprint exceptions, persist trust and retry authorized integration diagnostics through one complete trust service/UI owner.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All six certificate operations and direct safe certificate/hostname lists enforce admin policy at service and deep link; screens display metadata/expiry/invalid entries and hostname+fingerprint identity without secret diagnostics.
- [ ] Root ensure/upload enforces one bounded 64-KiB CA, safe filename/current validity/self-signing, bounded multipart and no-follow regular-file reads; synced temporary no-overwrite publication preserves explicit concurrent same-content/different-content outcomes without traversal/symlink replacement.
- [ ] SQL hostname exceptions remain certificate-fingerprint-specific and distinct from CA files; upload/trust/removal never disables TLS verification globally or silently changes another fingerprint's authority.
- [ ] Upload/list/remove/trust failures and conflicts are recoverable with localized form/table/date/confirmation feedback; persisted files and hostname records survive the approved restart lifecycle and invalidate relevant trusted clients/readers.
- [ ] #41's authorized integration remediation consumes these commands and retries against refreshed trust; trusted OIDC/provider Fetch and independent LDAP TLS boundaries are evidenced separately.
- [ ] Future focused denied trust/malformed upload/concurrent publication/file-security evidence uses disposable files and real target repository/service/UI, never existing trusted stores; file/connection disposal and packaged volume requirements are explicit.

## Coverage

Merged **ADMIN-06 + OPS-06**, trust branch of identity **I26**; `certificates.getCertificate/ensureRootCertificate/addCertificate/trustHostnameMismatch/removeTrustedHostname/removeCertificate`, direct metadata lists, `trustedCertificateHostnames`, TrustFileStore/CA files and tools/hostname screens. Evidence: [core ADMIN-06](../drafts/core.md), [extended OPS-06](../drafts/extended.md), [persistence §6](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md).

## Required contracts

#01 trust/lifecycle/contribution; #04 admin; #02 hostname repository/connection ownership; #120 multipart/error contribution; #07 dates/#08 confirm/notify; #40/#41 trusted execution and diagnostic retry; #11 trusted Fetch and #21 volume/disposal. Review exact used revisions; trust/auth mutual joins are not native cycles.

## Decision holds

Trusted proxy/origin/CA refresh, mounted-file access/conflict/restart policy and any changed hostname trust behavior need disposition; OIDC success does not settle LDAP TLS. Q11 affects SQL adapter only; upload/crypto policy is not approved by publication.

## Ownership

One local trust storage/service/endpoint/UI writer for all six capabilities; #02 alone edits physical schema and COMPOSITION packaging. #41 owns diagnostic retry caller, not trust store. Dispatch needs accepted revisions, settled applicable decisions and exclusive allocation.

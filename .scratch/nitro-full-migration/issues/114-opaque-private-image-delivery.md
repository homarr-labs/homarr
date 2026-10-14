# 114 — Opaque private-image delivery

## What to build
Own encrypted expiring image registration/deduplication and authorized opaque binary retrieval with trusted upstream requests, safe status/fallback and an explicit already-rendered URL lifetime policy.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary MEDIA-02 plus transferred ImageRegistrationStore. H20 opaque image GET; HMAC-derived dedup keys, encrypted URL/headers, 86,400-second registration TTL, upstream status/502/404 and X-Homarr-Image-Proxy-Error capability, source one-hour public immutable cache. Consumers Immich, Plex, Gotify, Tracearr. This proxy's LAN/trusted-certificate trust model differs from #104's DNS-pinned executor; no universal SSRF policy or new byte-stream optimization is assumed.

## Required contracts
Initially unaccepted: #03 atomic mapping/dedup/TTL/clock/disposal primitives; #04 registration/current retrieval authority and crypto/HMAC references; #40 trusted signal-aware/redacted outbound execution, #18 trust change interface; #51/#55/#62 image-registration consumer DTOs; #24 safe fallback/images and #01 binary response/abort. Narrow current interfaces, not every provider completion, gate start.

## Decision holds
Registration/retrieval/revocation and already-rendered URL lifetime/cache policy require explicit disposition; Redis-free expiry/restart semantics and native HTTP trust evidence. Q12/Q15 retained encrypted mapping and principal/key-change invalidation where needed. Public immutable source caching is evidence, not automatic approval for all private images.

## Ownership
Own ImageRegistrationStore adapter, proxy service/handler and error/lifetime behavior. Providers retain native clients, #03 shared primitives, #04 crypto/policy, COMPOSITION mounts/resources. Real mapping/trust and each named consumer join for production; inaccessible upstreams remain unverified and #125 is final convergence.

## Acceptance criteria
- [ ] Equivalent permitted registrations safely deduplicate encrypted mappings, expire at the approved bound and expose only opaque local references; secret URL/header values never enter browser params, SSR cache or diagnostics.
- [ ] Actual retrieval enforces the approved authority/lifetime/revocation policy and typed safe missing/expired/upstream/error behavior, with bounded response/cancellation/disposal and deliberate cache headers.
- [ ] LAN/trusted-certificate clients still execute through their supported trust model without weakening #104 or imposing an incompatible generic network policy; trust changes invalidate only the appropriate resources.
- [ ] Immich/Plex/Gotify/Tracearr clients each consume opaque images and useful failure fallback; focused future dedup/expiry/key-change/redaction and already-rendered-lifetime regressions use disposable mappings, not real credentials.

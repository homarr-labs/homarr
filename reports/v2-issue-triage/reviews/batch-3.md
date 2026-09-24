# Batch 3 — 27 issue assessments

Reconciled assessment data. See [parent review notes](../PARENT-REVIEW.md) for subsequent corrections.

### #6763 — bug: Unable to add users/group to board access control when using OIDC via Authentik

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6763) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 separates board access permissions from the general board-settings form and submits user/group permissions through dedicated mutations. This removes the nested/unified-form reset path reported with Authentik and Pocket ID.

**Conversation (2 comments read):** The reporter says adding an OIDC user or group to board access control appears to save and then resets without a database change. A second comment reports the same behavior with Pocket ID. The maintainer says it is fixed as part of v2 and points to #6662; the timeline records the fix relationship. The exact PR commit is not the current ancestor, but the current v2 source has the relevant independent access form and mutation structure.

**V2 evidence:**

- reports/v2-issue-triage/source/6763.json:1 — the complete body and both full comments were read, including Authentik/Pocket ID reproduction and the maintainer's v2-fix statement.
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:179-216 — the general settings form closes before BoardAccessSettings is rendered, so board access controls are not nested in the unified save form. — [source L179](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L179)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_board-access.tsx:18-67 — board access uses dedicated saveGroupBoardPermissions and saveUserBoardPermissions mutations. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_board-access.tsx#L18)
- apps/nextjs/src/components/access/access-settings.tsx:89-115 — group and user submissions call their own mutations and invalidate the access query on success. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/access-settings.tsx#L89)
- apps/nextjs/src/components/access/group-access-form.tsx:27-37,61-79 — group access has a standalone form and submission path. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/group-access-form.tsx#L27)
- apps/nextjs/src/components/access/user-access-form.tsx:44-56,83-102 — user access has the corresponding standalone form and save path. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/access/user-access-form.tsx#L44)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2 retains board permissions as an explicit access boundary, consistent with the separated board-access flow. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** No source gap remains for the reported form-reset behavior. If the issue was forgotten open, mention it as fixed with v2; a future report should include provider claim shape or a mutation error if access persistence fails after this separation.

### #6682 — bug: Immich integration stops working after the latest update

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6682) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The reviewed V2 request layer preserves SDK headers, including x-api-key, rather than object-spreading a Headers instance. The conversation also records the 1.76.0 Immich regression as fixed in 1.76.1; current source supports this as a V2 fix candidate.

**Conversation (1 comments read):** The reporter saw an unknown integration error after upgrading to 1.76.0 and said regenerating the API key did not help. The single comment says the problem was fixed in 1.76.1. Current V2 forwards fetch options without replacing caller headers. The separately identified dev fix commit 31e218295 is not an ancestor of this V2 checkout and must not be used as ancestry evidence.

**V2 evidence:**

- reports/v2-issue-triage/source/6682.json:1 — the complete body and one full comment were read, including the 1.76.0 regression and 1.76.1 fix report.
- packages/core/src/infrastructure/http/request.ts:74-101 — current fetchWithTrustedCertificatesAsync forwards caller fetch options and headers without object-spreading a Headers instance into a plain object. — [source L74](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/http/request.ts#L74)
- packages/integrations/src/immich/immich-integration.ts:94-104 — Immich calls the SDK with request options from the shared fetch layer, so the preserved SDK headers reach the API. — [source L94](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L94)
- packages/integrations/src/immich/immich-integration.ts:142-158 — asset proxying supplies the x-api-key explicitly when creating image links. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L142)

**Remaining / follow-up:** No code gap remains for the reported 1.76.0 API-key regression. If the issue remains open, mention it as fixed in v2; a different current Immich error would need a new request payload/version reproduction.

### #6519 — bug: RSS widget poster images don't load for reddit feeds

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6519) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The RSS parser still does not inspect media:thumbnail and its regex fallback truncates image URLs at the file extension, dropping signed query parameters. Reddit poster images can therefore remain absent or return 403 in v2.

**Conversation (0 comments read):** The reporter identifies Reddit's media:thumbnail image field and explains that Homarr's fallback removes query parameters from the signed URL. There are no comments. The current parser only checks enclosure and media:content, then applies the truncating regex, while both compact and advanced RSS displays consume the resulting enclosure.

**V2 evidence:**

- reports/v2-issue-triage/source/6519.json:1 — the complete body and empty full_comments array were read, including the Reddit thumbnail and signed-query explanation.
- packages/request-handler/src/rss-feeds.ts:15-34 — feed extraction stores only the image returned by the custom enclosure helper. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L15)
- packages/request-handler/src/rss-feeds.ts:38-58 — the fallback regex stops at the image extension, so query strings and signed tokens after the extension are lost. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L38)
- packages/request-handler/src/rss-feeds.ts:60-67,77-105 — recognized media paths are only enclosure/@_url and media:content/@_url; media:thumbnail is absent. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/rss-feeds.ts#L60)
- packages/widgets/src/rssFeed/component.tsx:140-150,192-207 — the native RSS widget uses enclosure for advanced images, compact backgrounds, and poster images, so parser omission directly produces the reported missing poster. — [source L140](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/rssFeed/component.tsx#L140)

**Remaining / follow-up:** Support media:thumbnail and preserve the complete validated URL, including query parameters and fragments where safe. Add fixtures for Reddit-style signed URLs and verify both compact and advanced poster rendering.

### #6516 — bug: mysql migration error

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6516) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The original MySQL/MariaDB migration syntax failure is not fixed in place. V2 retires MySQL, removes its migration path, rejects MySQL/MariaDB startup, and offers a separately documented conversion to SQLite. The converter is a migration workaround and does not make the reported broken MySQL migration succeed.

**Conversation (3 comments read):** The reporter's MariaDB startup failed on a migration containing a LEFT JOIN LATERAL syntax error and asked to retain MySQL/PostgreSQL for a swarm deployment. Three comments discuss investigating migrations, recommending SQLite, and the final v2 direction of keeping PostgreSQL while dropping MySQL. The v2 timeline contains the retirement/conversion work, not a repair of the failing MariaDB migration.

**V2 evidence:**

- reports/v2-issue-triage/source/6516.json:1 — the complete body and all three full comments were read, including the exact MariaDB syntax failure and database-support discussion.
- scripts/run.sh:3-13 — v2 rejects MySQL and MariaDB dialect/driver/URL combinations before startup and instructs users to use the converter. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L3)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:24-37 — the release notes say MySQL is dropped and existing users must convert before upgrading. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L24)
- apps/docs/docs/advanced/mysql-to-sqlite.mdx:5-17,19-58,62-66 — the converter is tested against the v1.77.1 schema, leaves MySQL unchanged, and requires a stopped Homarr instance, backups, and the same encryption key. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/mysql-to-sqlite.mdx#L5)
- apps/docs/docs/advanced/environment-variables/index.mdx:89-97 — v2 supports SQLite and PostgreSQL and directs existing MySQL installations to the conversion guide. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/environment-variables/index.mdx#L89)
- git history at HEAD — commit eca985fcf removes the MySQL migration/driver path and adds conversion tooling; it does not correct the MariaDB LEFT JOIN LATERAL statement.

**Remaining / follow-up:** For the original issue, either keep it as a known v1 migration defect or document the tested conversion route as the v2 migration path. Do not claim the MySQL error is fixed: MySQL is retired, and conversion succeeds only for supported v1.77.1-shaped databases.

### #6207 — bug: Unifi integration not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6207) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The UniFi default-port bug is fixed in merged PR #6787, whose ancestor check is true for v2. The integration now tries HTTPS port 443 for bare controller URLs, falls back to 8443 only for connection/detection failures, preserves explicit ports, and leaves authentication failures visible.

**Conversation (1 comments read):** The reporter used a Dream Router URL without a port and received an SSL wrong-version error. The single issue comment is formatting-related; the timeline links #6210 and #6787. PR #6787 is explicitly the current-v2 port that fixes #6207, and its focused tests cover bare http URLs, 443/8443 fallback, explicit ports, unusual ports, and authentication failures.

**V2 evidence:**

- reports/v2-issue-triage/source/6207.json:1 — the complete body and one full comment were read, including the Dream Router URL and TLS error.
- reports/v2-issue-triage/source/linked-prs/6787.json:10-12,34-39 — merged PR #6787 states it fixes #6207 and records merge commit ca7be8f3.
- packages/integrations/src/unifi-controller/unifi-controller-integration.ts:59-105 — v2 resolves absent ports to [443,8443], honors explicit ports, and retries only port-fallback errors. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unifi-controller/unifi-controller-integration.ts#L59)
- packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts:80-140 — focused tests cover the reported bare http address, fallback, explicit ports, unusual ports, and non-retried authentication failure. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts#L80)
- apps/docs/docs/integrations/unifi-controller/index.mdx:31-37 — docs now require local HTTPS semantics, document Dream Router port 443/self-hosted 8443, and explain fallback/local-account requirements. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/unifi-controller/index.mdx#L31)
- git ancestry at HEAD — PR #6787's merge commit is an ancestor of release/v2.

**Remaining / follow-up:** No v2 code gap remains for the reported default-port error. If the issue was forgotten open, mention it as fixed by v2; users still need a local controller account and supported HTTPS endpoint.

### #6153 — feat: re-open: add open webui  #3766

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6153) · **Integration requests** · **Partially addressed** · Confidence: **medium**

**Request:** V2 has no dedicated Open WebUI integration, but its native Assistant and Assistant widget can chat through a configured OpenAI-compatible endpoint. This covers part of the stated goal of chatting with a local LLM from the dashboard; compatibility with the user's Open WebUI endpoint has not been verified.

**Conversation (0 comments read):** The reopened issue points to the earlier Open WebUI request #3766/#2082 and asks for local-LLM chat integration. It has no comments. The timeline contains no merged implementation; an Open WebUI integration commit exists on a feature branch but is not an ancestor of v2.

**V2 evidence:**

- reports/v2-issue-triage/source/6153.json:1 — the complete body and empty full_comments array were read.
- packages/integrations/src/base/creator.ts:9-115 — the current exhaustive integration registry has no Open WebUI integration kind or creator. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-53 — Custom Widgets v2 can call APIs and define actions, but the release article does not add Open WebUI as a native integration. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:87-109 — the Assistant/MCP feature is a separate capability and does not provide the requested Open WebUI service integration. — [source L87](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L87)
- git history at HEAD — commit 005c2e4cd is on a non-ancestor Open WebUI feature branch, so it cannot be credited to v2.
- apps/docs/docs/management/assistant.mdx:24-36 — custom OpenAI-compatible endpoints and the dashboard Assistant widget are documented. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/assistant.mdx#L24)
- apps/nextjs/src/app/api/assistant/chat/route.ts:672-701 — the actual chat route constructs the provider using configuration.baseUrl and streams its model response. — [source L672](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/assistant/chat/route.ts#L672)

**Remaining / follow-up:** Test the intended Open WebUI endpoint, authentication, model discovery, streaming and supported tool behavior with Assistant. Decide whether this satisfies the requester before treating it as fully resolved; a dedicated Open WebUI client remains absent.

### #6050 — bug: background image is absent or cut off with white space

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6050) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 fixes the white-space/cut-off symptom caused by a background covering only content height by giving the AppShell a 100dvh minimum when a background is configured. The separate Firefox report that the image itself was corrupt or truncated cannot be confirmed without the original image URL and browser/network reproduction.

**Conversation (1 comments read):** The reporter says a Docker Compose deployment on Firefox/Linux shows a background image absent or cut off, with a white area after collapsing content; the single comment asks for more information and no exact image is provided. V2 includes a root-cause fix for the viewport-height void, but the background component still relies on the browser's CSS image load and has no explicit corrupt/truncated-image recovery path.

**V2 evidence:**

- reports/v2-issue-triage/source/6050.json:1 — the complete body and one full comment were read; the issue has no reproducible image URL or additional technical detail.
- apps/nextjs/src/components/layout/background.tsx:9-28 — backgrounds use CSS backgroundImage, center positioning, cover sizing, no-repeat, and fixed attachment; there is no decode/error fallback for a corrupt image response. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/background.tsx#L9)
- apps/nextjs/src/components/layout/shell.tsx:28-35 — when a background exists, the AppShell receives mih=100dvh so the image covers the viewport below short or collapsed board content. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/shell.tsx#L28)
- git history at HEAD (7855278ed, ancestor of v2) — the viewport-height fix identifies the white void as an AppShell background-sizing issue and documents the root cause.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-85 — v2's rebuilt board/container layout changes the content geometry but does not itself verify external image decoding. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)

**Remaining / follow-up:** Reproduce in Firefox/Linux using the reporter's image and deployment, capture the image response and decode result, and verify both the viewport-height fix and any remaining CDN/proxy/content-type issue.

### #5716 — bug: OIDC group assignment is not working if user is only in one group

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5716) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** OIDC group synchronization still requires the groups claim to be an array. A provider that returns one group as a scalar string is ignored, so the reported single-group assignment failure remains in v2.

**Conversation (0 comments read):** The body reports JumpCloud sending groups as a string for users in one group while multi-group users receive an array, causing group assignment to fail only for the single-group case. There are no comments. The timeline cross-references #6510 and records a candidate fix commit, but that commit is not an ancestor of the assessed release/v2 branch.

**V2 evidence:**

- reports/v2-issue-triage/source/5716.json:1 — the complete issue body and empty full_comments array were read.
- packages/auth/events.ts:33-39 — OIDC profile groups are synchronized only when Array.isArray(profileGroups) is true; a scalar group claim is discarded. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L33)
- packages/auth/events.ts:41-45 — the LDAP/user group path has the same array-only guard, showing no common scalar normalization exists. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L41)
- apps/docs/docs/advanced/single-sign-on/index.mdx:199-217 — docs configure a groups attribute and promise automatic group placement but do not document scalar-to-array normalization or the single-group provider shape. — [source L199](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L199)
- git history at HEAD — candidate commit 7de2fc04e is not an ancestor of release/v2, and the current source still contains the array-only guard.

**Remaining / follow-up:** Normalize a scalar group claim to a one-element string array after validating its type, preserve array behavior, and test JumpCloud/Auth0/Authentik-like claim shapes including absent, scalar, and mixed-value claims.

### #5538 — bug: No integration data available for unraid disks

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5538) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Unraid integration still reads only primary-array disks. It does not query or normalize array.caches/storage-pool disks, so pool-only Unraid installations remain without disk data. The follow-up #6803 confirms this is an active v2 gap.

**Conversation (10 comments read):** The original v1.59.2 report says CPU and memory work but disk data is absent on Unraid 7.2.4. The ten comments include requests for logs and setup details, reports on Unraid 7.3, a possible unrelated No home board found log, websocket troubleshooting, and a later diagnosis that pool-only setups are unsupported. The timeline cross-references the open follow-up #6803. That follow-up specifies querying array.caches and ignoring null size fields; no implementation is in v2.

**V2 evidence:**

- reports/v2-issue-triage/source/5538.json:1 — the complete body and all ten full comments were read, including the pool-only diagnosis and #6803 follow-up.
- packages/integrations/src/unraid/unraid-integration.ts:36-76 — file-system and SMART data are mapped only from systemInfo.array.disks. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/integrations/src/unraid/unraid-integration.ts:84-145 — the GraphQL query requests array.disks and array.capacity.disks but has no array.caches/storage-pool field. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84)
- packages/integrations/src/unraid/unraid-types.ts:21-40 — the response schema requires array.disks and defines no caches or pool collection. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L21)
- apps/docs/docs/integrations/unraid/index.mdx:22-26 — documentation lists the widgets and CPU averaging but does not claim storage-pool support. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/unraid/index.mdx#L22)
- reports/v2-issue-triage/source/6803.json:10-11,46-70 — the open follow-up is explicitly Add support for Unraid Storage Pools, references #5538, and requests array.caches with null disk fields ignored.
- git history at HEAD — the merged Unraid memory fix addresses metrics semantics, not storage-pool querying or mapping.

**Remaining / follow-up:** Extend the GraphQL query/schema and mapping to include caches and other supported pools, ignore null per-disk fields where Unraid reports aggregate-only values, and validate both array-plus-pool and pool-only hosts.

### #5342 — bug: Homarr generates malformed DNS queries (<host>https) for Tracearr integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5342) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The malformed Tracearr hosthttps URL was fixed in merged PR #5654, whose merge commit is an ancestor of v2. Current Tracearr code passes returned absolute avatar/poster URLs directly to the image proxy rather than rebuilding them against the integration base URL.

**Conversation (5 comments read):** The reporter supplied repeated DNS queries such as tracearr.mydomain.nethttps when Tracearr returned absolute avatar/poster URLs. Five comments discuss DNS caching and reproduction/diagnosis; the linked fix PR explains that proxyImageAsync incorrectly sent absolute URLs through this.url(). Its merge commit is in v2, and the issue can be closed as fixed if it was left open.

**V2 evidence:**

- reports/v2-issue-triage/source/5342.json:1 — the complete body and all five full comments were read, including the malformed DNS symptom, DNS-caching suggestion, and reproduction follow-up.
- reports/v2-issue-triage/source/linked-prs/5654.json:10-12,34-39 — merged PR #5654 identifies the absolute-image-url concatenation and records merge commit 7a1272146.
- packages/integrations/src/tracearr/tracearr-integration.ts:92-109 — returned stream/poster URLs are handed directly to proxyImageAsync instead of being prefixed with the Tracearr integration URL. — [source L92](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/tracearr/tracearr-integration.ts#L92)
- packages/integrations/src/tracearr/tracearr-integration.ts:124-160 — violation and history avatar URLs use the same corrected direct proxy path. — [source L124](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/tracearr/tracearr-integration.ts#L124)
- git ancestry at HEAD — merge commit 7a1272146 is an ancestor of release/v2, so this fix is included in the assessed branch.

**Remaining / follow-up:** No product work remains for the reported malformed URL. If the issue was not closed on GitHub, mention it as fixed by v2; monitor a real Tracearr deployment for unrelated proxy/image failures.

### #5154 — feat: SLO (Single Log-out)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5154) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 supports local sign-out followed by an optional redirect, but it does not implement Authentik/OIDC single logout, a front-channel logout endpoint, or a back-channel session-revocation endpoint.

**Conversation (6 comments read):** The request asks Homarr to participate in SLO so an Authentik logout can clear Homarr sessions, including when users are deleted remotely. Six comments discuss front-channel and back-channel options, the endpoint/auth/user-identifier requirements, and maintainer reluctance because the affected group is small; a volunteer asks for implementation direction but cannot implement it. No timeline event shows a merged SLO feature.

**V2 evidence:**

- reports/v2-issue-triage/source/5154.json:1 — the complete body and all six full comments were read, including front-channel/back-channel alternatives and maintainer/volunteer discussion.
- apps/nextjs/src/app/api/auth/[...nextauth]/route.ts:9-17 — the auth route exposes only Auth.js GET and POST handlers; there is no dedicated front-channel logout route. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/auth/[...nextauth]/route.ts#L9)
- apps/nextjs/src/components/user-avatar-menu.tsx:59-65 — sign-out deletes the local Auth.js session, then redirects to AUTH_LOGOUT_REDIRECT_URL if configured; it does not coordinate session logout with the provider. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/user-avatar-menu.tsx#L59)
- packages/auth/env.ts:26-29 — the only logout-related environment variable is an optional redirect URL. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L26)
- apps/docs/docs/advanced/single-sign-on/index.mdx:20-27,270-284 — SSO docs describe a post-logout redirect example for Authentik, not provider-initiated session revocation or back-channel logout. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2's permissions and Assistant/MCP compatibility notes do not add SLO. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Choose a provider protocol and session model, then implement and secure front-channel and/or back-channel logout with issuer validation, logout-token handling, and local session revocation. Document provider prerequisites and failure behavior.

### #4973 — bug: System Resources Incorrect Total Ram for TrueNAS 25.04

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4973) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 corrects the TrueNAS memory mapping responsible for inflating displayed capacity. Previously physical memory was returned as available and the reporting value as used, so the widget added both. V2 returns available and max(physical minus available, 0), making their sum physical memory for valid available values.

**Conversation (2 comments read):** The reporter says a TrueNAS 25.04 host with 64 GB appears as roughly 74 GB in Homarr, with a follow-up describing a similar VM discrepancy. The maintainer asks about versions without confirming a reproduction. Merged fix #6017 changes the exact erroneous mapping; the independent audit agrees this is a concrete source-level fix for the overcount.

**V2 evidence:**

- packages/integrations/src/truenas/truenas-integration.ts:57-66 — available is reported free memory and used is max(physmem minus available, 0). — [source L57](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L57)
- packages/widgets/src/system-resources/component.tsx:133-149 — capacity is available plus used, now equal to physmem for valid input. — [source L133](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L133)
- git show f69e545d6 — merged #6017 replaces the old available=physmem and used=reporting-value mapping.

**Remaining / follow-up:** Confirm the original TrueNAS 25.04 payload has available memory between zero and physmem, then compare System Resources and Health Monitoring against the host. The arithmetic fix is present; no live TrueNAS validation was performed.

### #4330 — feat(icon-picker): show more than 12 icons per source

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4330) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** The v2 icon picker requests 24 icons per repository instead of the old 12, but it still has no Show more control or pagination to reach the rest. The exact feature was proposed in closed, unmerged PR #6248 and is not present at this HEAD.

**Conversation (2 comments read):** The author explains that repositories such as Nextcloud have more than 12 matching icons and asks for an extended list button. Two comments only correct the issue-template labeling. The timeline cross-references PR #6248, whose body implements 12→48→192→500 pagination and says it closes #4330, but the PR was closed without merging. The current v2 picker has a fixed 24 request and renders that result.

**V2 evidence:**

- reports/v2-issue-triage/source/4330.json:1 — the complete body and both full comments were read, including the more-than-12 and issue-template discussion.
- packages/forms-collection/src/icon-picker/icon-picker.tsx:85-88 — the current picker sends a fixed limitPerGroup of 24 on every search. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L85)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:180-195 — results are rendered directly with no truncation metadata or Show more action. — [source L180](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L180)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:213-219 — the loading state is fixed at 12 skeletons, with no pagination state. — [source L213](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L213)
- packages/api/src/router/icons.ts:17-30,36-50 — the API accepts a 1-500 limit and slices results, so the missing behavior is in the picker UI rather than an inability of the backend to return more. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/icons.ts#L17)
- packages/validation/src/icons.ts:3-6 — the schema permits up to 500 icons per repository while defaulting to 12. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/icons.ts#L3)
- reports/v2-issue-triage/source/linked-prs/6248.json:10-12,34-39 — the unmerged PR explicitly describes the requested Show more steps and has merged_at null.

**Remaining / follow-up:** Add bounded pagination or progressive loading with a visible control and a way to know whether a repository is truncated. Keep search reset and performance behavior explicit; the current 24-result increase only reduces the symptom.

### #4026 — bug: Downloads: number of shown entries per intergration include already hidden entries

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4026) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Downloads widget still applies the per-integration limit before it filters completed/hidden entries. Hidden completed jobs can consume the server/integration limit and prevent active jobs from appearing.

**Conversation (2 comments read):** The report identifies a reproducible configuration where the number of shown entries includes completed entries hidden by widget settings, causing active downloads to disappear; the workaround is to set an unnecessarily high limit. Two comments discuss filtering server-side or fetching a larger set and filtering in JavaScript. The current request path still forwards the configured limit into every download-client integration, then filters completion in the widget.

**V2 evidence:**

- reports/v2-issue-triage/source/4026.json:1 — the complete body and both full comments were read, including the hidden-completed-entry example and proposed server/client filtering approaches.
- packages/api/src/router/widgets/downloads.ts:49-65 — limitPerIntegration defaults to 50 and is passed directly to the integration request handler. — [source L49](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/downloads.ts#L49)
- packages/request-handler/src/downloads.ts:7-17 — the handler forwards the limit to getClientJobsAndStatusAsync without accounting for hidden status filters. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/downloads.ts#L7)
- packages/widgets/src/downloads/component.tsx:319-325 — the widget sends the configured limit unchanged to the query. — [source L319](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L319)
- packages/widgets/src/downloads/component.tsx:379-407 — completion/category/client visibility filters run only after the limited response is received. — [source L379](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L379)
- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:30-42 — qBittorrent applies the requested limit while fetching, exemplifying why later filtering cannot recover hidden rows. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L30)
- packages/integrations/src/download-client/deluge/deluge-integration.ts:33-76 — Deluge also limits the integration result before the widget's visibility predicate. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/deluge/deluge-integration.ts#L33)
- packages/integrations/src/download-client/transmission/transmission-integration.ts:27-63 — Transmission applies the bounded request before UI-level hidden-entry filtering. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/transmission/transmission-integration.ts#L27)

**Remaining / follow-up:** Move filtering before the limit where the integration can support it, or over-fetch with a bounded server-side safety limit and then apply the widget's visibility rules. Preserve a clear performance bound and test each download-client adapter with hidden completed entries.

### #3784 — feat(app-widget): container linking & run toggling

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3784) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Docker container actions and a modal that can create an app from a selected container, but it does not persist an app-to-container link or expose container status/start/stop controls on the native app tile.

**Conversation (0 comments read):** The body asks for a container-linking option in the app widget alongside Simple Ping and New Tab, with run toggling/status shown from the paired Docker container. It has no comments. The timeline marks a duplicate/follow-up relationship to #4085 but provides no merged implementation. Current Docker actions remain confined to the Docker widget and add-app flow.

**V2 evidence:**

- reports/v2-issue-triage/source/3784.json:1 — the complete feature request was read; full_comments is empty.
- packages/widgets/src/docker/component.tsx:242-305 — the Docker widget queries endpoint-scoped containers and handles start, stop, restart, and remove actions there. — [source L242](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L242)
- apps/nextjs/src/components/board/items/item-menu.tsx:59-96 — native app edit values contain app options, integrations, and advanced options, with no Docker endpoint/container identifier. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-menu.tsx#L59)
- packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx:22-65 — the Docker import modal derives a URL and creates an app, but its schema stores only container URLs and has no persistent link or run-toggle setting. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx#L22)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-69 — Custom Widgets/Workshop are extensibility mechanisms and do not constitute this native app-widget pairing. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)

**Remaining / follow-up:** Define a durable endpoint/container reference and permission model, handle deleted or renamed containers, and add native status and lifecycle controls to the app widget. A custom widget or a separate Docker widget action does not satisfy this request.

### #3771 — feat(boards): open all apps

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3771) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports opening all apps within an individual container, including nested containers, but it has no board-wide action in the board header. The exact original request remains partially addressed; the referenced board-wide PR #6125 is closed and unmerged.

**Conversation (1 comments read):** The author asks for the top dropdown to open all apps across all categories, referring back to #1928, and one commenter volunteers to implement it. The timeline later cross-references PR #6125. That PR's body describes the exact board-header action and says it closes #3771, but its metadata says it was closed without merging and its merge commit is not an ancestor of v2. The current v2 code implements only per-container actions.

**V2 evidence:**

- reports/v2-issue-triage/source/3771.json:1 — the complete body and one full comment were read, including the board-wide/top-dropdown request.
- apps/nextjs/src/components/board/sections/container-section.tsx:34-37,131-147 — the current UI places an Open all action on each container section, not in the board header. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L34)
- apps/nextjs/src/components/board/sections/use-open-section-apps.ts:39-75,78-128 — the helper recursively collects app items inside the requested container and opens those URLs. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/use-open-section-apps.ts#L39)
- reports/v2-issue-triage/source/linked-prs/6125.json:10-12,34-39 — PR #6125 explicitly adds the board-wide header action and references #3771, but is closed with merged_at null and is not in the v2 ancestry.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-85 — v2's board editor/container redesign does not claim a board-wide open-all action. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)

**Remaining / follow-up:** Promote the shared app-opening helper to the board header, define how nested/duplicated apps and popup blockers behave, and verify it is available in view mode for read-only users as requested by the unmerged PR.

### #3758 — feat(release-widget): synchronize marked as viewed over multiple devices

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3758) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** Release-widget viewed versions are still stored in browser localStorage under one device's key. There is no per-user persisted state or server mutation, so marking a release viewed does not synchronize across devices.

**Conversation (2 comments read):** The author likes the viewed-release option but asks for it to follow the user across devices. Two comments discuss that the current implementation is localStorage-only and would need per-user widget or account data; the timeline contains no merged implementation.

**V2 evidence:**

- reports/v2-issue-triage/source/3758.json:1 — the complete body and both full comments were read; the request is cross-device synchronization of viewed release state.
- packages/widgets/src/releases/component.tsx:63-66 — viewed releases are initialized from localStorage with key releases-viewed-versions. — [source L63](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L63)
- packages/widgets/src/releases/component.tsx:185-190 — marking a release viewed updates only the local state/localStorage setter and does not call an API mutation. — [source L185](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L185)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-53 — v2's typed Custom Widget settings and encrypted fixed-origin credentials do not describe server-side persistence for native release-widget viewed state. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)

**Remaining / follow-up:** Persist viewed repository/version state per authenticated user, define behavior for multiple boards and repository renames, and migrate or merge existing localStorage values. Cross-device behavior needs an authenticated read/write path.

### #3732 — Release Widget: Icon only

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3732) · **Quality of life** · **Needs verification** · Confidence: **medium**

**Request:** V2 has compact and advanced release layouts and allows the release version text to shrink, while compact icon-only mode hides the repository name. The requested visual behavior for 1x1 versus 2xY dimensions is not explicitly encoded, so source inspection cannot establish that the screenshot request is satisfied.

**Conversation (0 comments read):** The body praises icon-only mode and asks whether the release widget can resemble the attached design: retain the icon-only presentation at 2xY but switch to 1xY, where the version number disappears at 1x1. There are no comments. The current code restores compact v1 surfaces but does not contain a width/height-specific rule for hiding the version.

**V2 evidence:**

- reports/v2-issue-triage/source/3732.json:1 — the complete screenshot-based request was read; full_comments is empty.
- packages/widgets/src/releases/component.tsx:63-68 — viewed releases are localStorage-backed and the column count depends only on advanced display mode and width; there is no 1x1 version-visibility branch. — [source L63](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L63)
- packages/widgets/src/releases/component.tsx:251-275 — compact icon-only mode can hide the repository name, but the latest version text remains rendered with flexShrink and end truncation. — [source L251](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L251)
- packages/widgets/src/releases/component.tsx:278-328 — release-date/status content is kept as a non-shrinking group, which can compete with the version text at narrow widths. — [source L278](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.tsx#L278)
- packages/widgets/src/releases/component.module.scss:9-29 — the header has general width/focus rules but no responsive selector that hides the version for a one-cell widget. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/component.module.scss#L9)

**Remaining / follow-up:** Render the widget at the actual 1x1, 2x1, and 2xY v2 dimensions in compact icon-only mode and compare with the requested design. If the version should disappear at a threshold, encode and document that responsive rule; otherwise record the exact supported behavior.

### #3675 — bug: Stopping the container with SIGTERM fails

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3675) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 consolidates tasks and WebSocket services into the Next.js process and changes the shell shutdown sequence. Redis logging and unbounded waits remain source-level concerns, but source inspection has not established whether the original Docker/Podman SIGTERM hang survives the new process lifecycle.

**Conversation (3 comments read):** The report describes Podman/Docker stop hanging after SIGTERM because websocket/Redis-backed logging processes remain alive; disabling Redis logs was a workaround. The three comments report reproduction on v1.30 and Docker, and say modifying PID waits did not resolve it. The timeline has no verified v2 shutdown fix. V2's process consolidation is relevant progress, but not sufficient evidence that the remaining handles close.

**V2 evidence:**

- reports/v2-issue-triage/source/3675.json:1 — the complete body and all three full comments were read, including Podman/Docker reproduction and the DISABLE_REDIS_LOGS workaround.
- scripts/run.sh:48-59,63-78 — v2 starts nginx and Redis separately, then on SIGTERM kills and waits for Next.js before it terminates the internal Redis process. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L48)
- apps/nextjs/src/instrumentation-node.ts:5-34 — tasks and the websocket service are embedded in the Next.js process and their startup promises are awaited, so their resources share the process shutdown boundary. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/instrumentation-node.ts#L5)
- apps/websocket/src/main.ts:12-14,73-84 — the websocket server listens on port 3001 and SIGTERM calls wss.close() without awaiting its completion or explicitly closing active clients. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/websocket/src/main.ts#L12)
- packages/core/src/infrastructure/logs/transports/index.ts:6-21 — Redis logging is enabled in normal runtime unless DISABLE_REDIS_LOGS or CI is set. — [source L6](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/logs/transports/index.ts#L6)
- packages/core/src/infrastructure/logs/transports/redis-transport.ts:17-55 — the transport lazily creates an ioredis client, catches command failures, and exposes no close/disconnect lifecycle hook. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/logs/transports/redis-transport.ts#L17)
- packages/core/src/infrastructure/redis/client.ts:10-28 — the Redis client is an ioredis instance, which is a live resource capable of keeping a Node process open. — [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/redis/client.ts#L10)
- scripts/run.sh:80-98 — the main server is restarted when it exits unless the shell has observed the shutdown flag, making graceful termination dependent on the unresolved wait sequence. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L80)

**Remaining / follow-up:** Reproduce SIGTERM on V2 with Docker/Podman and Redis logging enabled, checking the embedded services and actual Next.js exit behavior. The potential open handles and wait ordering justify investigation, not a claim that the exact old hang is proven to remain.

### #3266 — feat: Multiple Docker Environments in GUI

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3266) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports multiple named Docker/Podman endpoints, endpoint selection in the Docker widget, and management-page inventory across endpoints. The requested GUI endpoint creation/editing experience is still absent; endpoint configuration remains environment-driven.

**Conversation (7 comments read):** The reporter asks for several Docker instances in the management GUI, like Portainer, and for hostname overrides during imports. The seven comments explain that environment variables already supported multiple hosts, but the reporter found the setup confusing and wanted a GUI to add hosts, see columns, and configure socket and proxy endpoints together. A maintainer agreed a GUI was future work and pointed to #2477; the timeline later marked the issue duplicate without adding endpoint editing.

**V2 evidence:**

- reports/v2-issue-triage/source/3266.json:1 — the complete body and all seven full comments were read, including the environment-variable confusion and GUI request.
- apps/docs/docs/integrations/docker/index.mdx:18,55-63 — Docker endpoints are explicitly configured with environment variables, including multiple host/port pairs. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L18)
- apps/docs/docs/integrations/docker/index.mdx:71-108 — v2 documents named DOCKER_ENDPOINTS descriptors with socket, TCP, TLS, and per-endpoint capabilities. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L71)
- packages/docker/src/endpoint-descriptor.ts:3-25,30-57,60-103 — v2 parses and validates multiple uniquely identified endpoint descriptors and their transports. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/endpoint-descriptor.ts#L3)
- packages/docker/src/singleton.ts:52-99,102-128 — the Docker singleton initializes all configured endpoints, preserves endpoint IDs, and tolerates initialization failures per endpoint. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/singleton.ts#L52)
- packages/widgets/src/docker/index.ts:27-79 — the Docker widget exposes endpoint IDs as a selectable option and uses them to query inventory. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/index.ts#L27)
- apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:15-34 — the management page consumes discovered containers/endpoints; it has no endpoint CRUD form. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx#L15)
- apps/docs/docs/integrations/docker/index.mdx:110-117 — the documented v2 behavior covers multi-endpoint management and widget selection but keeps discovery/configuration outside the GUI. — [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L110)

**Remaining / follow-up:** Build a management UI to add, edit, validate, test, and remove named Docker endpoints, with secure secret/certificate handling and a clear persistence model. The existing environment configuration is a backend capability and does not complete the GUI request.

### #3220 — bug(calendar): Nextcloud integration - not all entries are displayed

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3220) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 contains fixes for Nextcloud DAV subpaths and all-day event date handling, and the current calendar path fetches all configured calendars without a widget-side item cap. The original report's claim that several events/calendars remain missing has no complete fixture or current reproduction, so the disposition is partial pending verification.

**Conversation (8 comments read):** The reporter supplied missing/wrong-date examples. The eight comments include a maintainer retest request and clarification, confirmation that seven entries were still missing, a report that only one of three calendars appeared, a comparison where eight calendars worked in v1.38, and repeated requests to investigate or retest. The timeline later closed and reopened the issue, cross-referenced #4736, and marked it duplicate, but does not identify a merged fix that proves every reported case.

**V2 evidence:**

- reports/v2-issue-triage/source/3220.json:1 — the complete body and all eight full comments were read, including the seven-missing-entry and multi-calendar follow-ups.
- packages/integrations/src/nextcloud/nextcloud.integration.ts:67-83 — the integration fetches all calendars in parallel for the requested time range. — [source L67](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L67)
- packages/integrations/src/nextcloud/nextcloud.integration.ts:85-165 — VEVENT parsing handles recurring events and the all-day date branch, while mapping every returned calendar event rather than truncating to one calendar. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L85)
- packages/integrations/src/nextcloud/nextcloud-url.ts:1-12 — the DAV URL builder preserves an existing integration subpath and appends the remote DAV endpoint correctly. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud-url.ts#L1)
- packages/request-handler/src/calendar.ts:9-28 — the calendar request range includes a six-day buffer around the displayed month, reducing boundary omissions. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/calendar.ts#L9)
- packages/api/src/router/widgets/calendar.ts:29-61 — API results filter Radarr release types but do not impose a generic event-count cap. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/calendar.ts#L29)
- packages/widgets/src/calendar/component.tsx:71-115 — the widget maps the returned event collection into calendar entries; there is no client-side seven-entry or single-calendar truncation. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/calendar/component.tsx#L71)

**Remaining / follow-up:** Retest with the original Nextcloud version, calendar count, recurrence/all-day data, and exact time zone. Add a fixture covering all calendars and recurrence exceptions, then confirm whether unsupported VEVENT forms or server-side DAV responses still omit entries.

### #2911 — bug: Cannot drag apps from dynamic zone

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2911) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 migrates dynamic sections to containers and replaces the drag editor. This changes the affected code path, but there is no direct causal or runtime evidence that repeated child drags can no longer pick up the parent container.

**Conversation (2 comments read):** The body reports that after moving one app from a dynamic zone to a category, subsequent drags grab the whole dynamic zone; a second commenter reproduced the same behavior between zones, and the maintainer acknowledged the difficulty. The current timeline has no direct merged fix for the old issue, but v2's board model and editor replace the affected surface.

**V2 evidence:**

- reports/v2-issue-triage/source/2911.json:1 — the complete issue body and both full comments were read, including the reproduction, cross-zone confirmation, and maintainer response.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-81 — v2 documents the rebuilt dnd-kit board editor and replacement of dynamic sections with Containers. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)
- packages/db/migrations/custom/0004_unify_sections_and_gutters.ts:72-75,97-108 — legacy dynamic sections are converted to durable containers during v2 migration. — [source L72](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/custom/0004_unify_sections_and_gutters.ts#L72)
- packages/validation/src/shared.ts:81-102 — old dynamic-section data is normalized into the container schema. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L81)
- apps/nextjs/src/components/board/sections/grid/grid-editor.tsx:155-179 — current drag editing uses one provider for root and nested container grids, avoiding the old dynamic-zone implementation. — [source L155](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/grid-editor.tsx#L155)

**Remaining / follow-up:** On release/v2, drag multiple apps successively out of a migrated container and between containers. Verify the second and subsequent drags move the selected app rather than the parent, including after save/reload. Keep this issue pending that reproduction.

### #2508 — feat: log source ip for failed login attempts

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2508) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 still does not record the source IP for failed credential logins. It emits a generic failed-login warning and username/password outcome logs, while the available IP logging is on the API-key session path and does not cover the requested web login failures.

**Conversation (3 comments read):** The issue originated in discussion #2308 and asks for failed-login source IPs so operators can build a CrowdSec collection. The three comments explain that the existing logs expose a username-not-found message or Auth.js CredentialsSignin but no source address, warn that forwarded headers need careful handling, and link related #2080. The timeline includes duplicate classification but no implementation.

**V2 evidence:**

- reports/v2-issue-triage/source/2508.json:1 — the complete body and all three full comments were read, including the CrowdSec use case and X-Forwarded-For caution.
- packages/auth/configuration.ts:49-59 — CredentialsSignin failures are collapsed into a generic warning with no request metadata. — [source L49](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/configuration.ts#L49)
- packages/auth/providers/credentials/authorization/basic-authorization.ts:17-31 — username lookup and incorrect-password logs include userName only; the authorization function has no source-IP field. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/basic-authorization.ts#L17)
- packages/auth/events.ts:84 — successful sign-in logging includes user id, username, and timestamp but no source address, and this event does not add the missing failed-attempt address. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L84)
- packages/auth/api-key/get-api-key-session.ts:22-36,58-73 — IP handling exists for API-key authentication, which is a different path and does not resolve failed browser credential login logging. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/api-key/get-api-key-session.ts#L22)

**Remaining / follow-up:** Capture a trustworthy client address at the authentication boundary, define proxy trust and forwarded-header precedence, and include it in failed credential login records/logs suitable for CrowdSec. Add retention and privacy decisions before calling the issue fixed.

### #2294 — feat: Integration with FileFlows

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2294) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no FileFlows integration in the v2 integration registry or source. The referenced draft/feature branch was not merged into release/v2, and the later OIDC-related testing discussion remains unresolved.

**Conversation (4 comments read):** The body requests a native FileFlows integration and links FileFlows API material. A maintainer pointed to draft PR #6144 and asked the reporter to test an image with a backup; an automated cleanup then closed the issue for niche scope and lack of maintainer commitment. The reporter reopened it in September, reported that API/token calls worked in Postman but Homarr failed with a tRPC FORBIDDEN error behind Authentik OIDC, and suggested using an Authorization bearer token. The referenced FileFlows implementation commit is on a feature branch and is not an ancestor of v2.

**V2 evidence:**

- reports/v2-issue-triage/source/2294.json:1 — the complete source snapshot and all four full comments were read, including the reopen, Authentik, bearer-token, and draft-PR discussion.
- packages/integrations/src/base/creator.ts:9-115 — the exhaustive current integration-kind registry contains no FileFlows creator or registration. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-69 — v2's Custom Widgets and Workshop are described as extensibility surfaces; neither supplies a native FileFlows integration. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)
- reports/v2-issue-triage/source/timelines/2294.json:1 — the full issue timeline records the draft/follow-up references and reopen history, with no merged v2 fix event.
- git history at HEAD (commit 5089a2ae6) — the available FileFlows implementation exists on a non-ancestor feature branch, so it cannot be credited to release/v2.

**Remaining / follow-up:** Add and secure a native FileFlows integration, then resolve the Authentik/OIDC request path and define its widget data and credentials. Until that work lands in v2, the issue remains open even if a Custom Widget can call a FileFlows endpoint.

### #2078 — feat: Permission per App / App-Element / Dynamic Group

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2078) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 has global app, integration, and board permission levels plus per-board and per-integration access, but it does not implement per-app, per-item, or per-dynamic-group visibility. The current app access guard explicitly allows any logged-in user to see apps, so the requested OIDC-group-driven hiding is not addressed.

**Conversation (13 comments read):** The original request asks to hide or show apps, app elements, and dynamic groups based on OIDC groups, preferably removing hidden items and reclaiming their space. Across all 13 comments, the author first preferred complete hiding, accepted graying as a fallback, and discussed family users, Dashy-like role visibility, category/widget movement, and separate app or integration lists. Maintainers explained that automatic space filling was difficult, suggested separate boards, said the feature was not a security boundary, and later considered simpler group permissions. The latest comment asks for an update; no implementation or merged fix appears in the assigned timeline.

**V2 evidence:**

- reports/v2-issue-triage/source/2078.json:1 — the complete issue body and all 13 full comments were read; the conversation covers hidden versus disabled behavior, layout space, OIDC groups, and app/integration list visibility.
- packages/definitions/src/permissions.ts:38-71 — v2 defines global group permissions for app, integration, and board capabilities, with inheritance, but no permission key for visibility of an individual app or item. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L38)
- apps/docs/docs/management/users/index.mdx:37-71 — documentation describes global app/integration levels and resource-specific board/integration access; it does not describe per-app or per-item group visibility. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/users/index.mdx#L37)
- packages/api/src/router/app/app-access-control.ts:20-25 — the current guard says any logged-in user can see all apps, demonstrating that app use/access permissions are not item-level visibility filtering. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/app/app-access-control.ts#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2 preserves ordinary board permissions and says Assistant/MCP do not bypass them, but does not claim the requested per-element visibility. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Implement and define the native semantics for group-based visibility of apps, bookmarks, widgets, and nested containers, including layout reflow and whether hidden items are removed or merely disabled. Treat it as presentation/access control with explicit security boundaries; Custom Widgets or a user-created workaround do not satisfy native app and item filtering.

### #962 — bug: item and dynamic section menus overlap

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/962) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces dynamic sections with containers, but that replacement does not establish that nested item/container menu handles no longer overlap. The original screenshots show handle placement, not simply an obsolete dropdown implementation.

**Conversation (0 comments read):** The issue has two screenshots and no comments. They show nested dynamic-section menu handles overlapping; one also shows an item count badge near the overlap. The timeline references unmerged PR #1184. Both historical images were downloaded and inspected, but neither is a V2 runtime capture.

**V2 evidence:**

- reports/v2-issue-triage/source/962.json:1 — the complete issue body and empty full_comments array were read; the request is the screenshot-described old menu overlap.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:71-81 — v2 documents the rebuilt board editor and says Containers replace Groups and dynamic sections. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L71)
- packages/db/migrations/custom/0004_unify_sections_and_gutters.ts:72-75,97-108 — the v2 custom migration converts legacy categories and dynamic sections into durable container records. — [source L72](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/custom/0004_unify_sections_and_gutters.ts#L72)
- packages/validation/src/shared.ts:81-102 — legacy dynamic-section input is transformed into the current container schema, keeping old board data on the new model. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L81)
- apps/nextjs/src/components/board/sections/grid/grid-editor.tsx:155-179 — the current editor coordinates root and nested container grids through one drag-and-drop provider. — [source L155](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/grid-editor.tsx#L155)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:15-26,35-71 — current container actions are rendered through the container menu used by the replacement surface. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L15)
- apps/nextjs/src/components/board/sections/container/container-menu.tsx:24,42-45 — menu offset distinguishes root from nested containers but does not itself prove spacing at every nesting depth. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-menu.tsx#L24)

**Remaining / follow-up:** Recreate the deeply nested arrangement from both historical screenshots on a migrated V2 board and inspect each menu handle in edit mode. The same user-visible failure can persist across a rewrite; do not require a new issue solely because the model changed.

### #125 — Dependency Dashboard

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/125) · **Other / tracking** · **Not addressed** · Confidence: **high**

**Request:** This is Renovate's dependency dashboard, not a product defect. It remains an open maintenance queue at the v2 commit: pending package, action, Go, mise, npm, and nvm updates are still listed, including security-related updates. The v2 release changes database support and product surfaces, but does not resolve or close every dependency-dashboard entry.

**Conversation (0 comments read):** The bot-generated body enumerates detected dependencies and pending approval, blocked, and security update branches. It has no human comments; its timeline records automated maintenance state changes and reopening rather than a product decision. The request therefore represents outstanding repository maintenance, not a feature that v2 implicitly satisfies.

**V2 evidence:**

- reports/v2-issue-triage/source/125.json:1 — the complete source snapshot was read; the body is the Renovate dashboard with pending dependency and security update entries and full_comments is empty.
- .github/renovate.json5:2-3 — Renovate's dashboard configuration is still present, so the dashboard remains an active queue rather than a completed migration artifact. — [source L2](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/.github/renovate.json5#L2)
- .github/renovate.json5:21-23 — automerge rules cover only selected minor and patch updates; pending major or approval-gated entries still require maintenance work. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/.github/renovate.json5#L21)
- packages/ui/package.json:38,47 — crypto-js and its type package remain declared dependencies at the assessed v2 HEAD, corroborating that at least one dependency-related dashboard concern is still represented in the tree. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/ui/package.json#L38)

**Remaining / follow-up:** Keep this as an ongoing Renovate maintenance tracker rather than a V2 closure candidate. Review pending updates individually; completing one snapshot of its queue does not make the recurring dashboard obsolete.


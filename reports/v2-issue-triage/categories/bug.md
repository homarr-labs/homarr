# Bugs

57 issues. See [complete report](../REPORT.md) and [methodology](../README.md).

### #6850 — bug: OIDC logout aborts the end-session request before it completes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6850) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 retains the reported logout sequence: it awaits Auth.js signOut with redirect:false, then navigates the current window to AUTH_LOGOUT_REDIRECT_URL. There is no explicit completion signal for the cross-origin IdP end-session navigation. The source establishes the sequence but cannot establish that Firefox aborts the request or that the sequence causes the provider session to remain active, so this needs a controlled browser/IdP reproduction.

**Conversation (0 comments read):** The issue reports Firefox aborting Authentik's end-session request and leaving the IdP session active after local logout. It has no comments or linked fix. The configured URL is documented as the post-logout redirect target, and the current menu handler performs a full-window assignment as soon as local signOut resolves. This is navigation to the IdP, rather than a return navigation to Homarr; source inspection alone cannot prove whether the provider request is aborted, so runtime tracing is required before calling it an addressed or remaining bug.

**V2 evidence:**

- apps/nextjs/src/components/user-avatar-menu.tsx:59-65 — logout awaits signOut({ redirect: false }) and then immediately calls window.location.assign(redirectUrl). — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/user-avatar-menu.tsx#L59)
- apps/nextjs/src/app/[locale]/layout.tsx:142-145 — AUTH_LOGOUT_REDIRECT_URL is passed into the client auth context as logoutUrl. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/layout.tsx#L142)
- packages/auth/env.ts:26-29 — AUTH_LOGOUT_REDIRECT_URL is an optional configured URL with no completion/timeout contract. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L26)
- apps/docs/docs/advanced/single-sign-on/index.mdx:20-27,275-284 — documentation describes the configured logout redirect but provides no cross-origin end-session completion mechanism. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L20)

**Remaining / follow-up:** Reproduce with Authentik and Firefox while tracing both local signOut and the IdP end-session navigation; if confirmed, use a browser-safe completion strategy (or provider-supported logout flow) before leaving the page and verify the IdP session is invalidated.

### #6849 — bug: I can't switch between the dark and light themes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6849) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** This is a duplicate of #6823 with a separate Ubuntu/Portainer/LDAP report and no comments. The current v2 theme setter wiring exists, but it does not prove the Chromium event failure from the related Citrix report is fixed.

**Conversation (0 comments read):** The reporter says the profile theme control is inert across Edge and Firefox on an Ubuntu/Portainer/LDAP deployment. The timeline has no direct comments; #6823 identifies it as the same incident and later isolates the failure to Citrix VDI pointer events. Treat this issue as the duplicate environment report and keep it pending a controlled reproduction.

**V2 evidence:**

- apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx:13-16 + the profile control is wired to setColorScheme. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx#L13)
- apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx:39-50 + 66-79 + theme changes are persisted through cookie and server mutation wiring, but no VDI/event workaround is present. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx#L39)
- apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx:38-46 + the board provider consumes the manager's color-scheme value. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx#L38)
- reports/v2-issue-triage/source/timelines/6849.json:commented events + the timeline cross-references duplicate #6823 and contains no independent fix or validation.

**Remaining / follow-up:** Reproduce this exact deployment and browser, then compare with the Citrix VDI event trace from #6823. Verify mouseup/click delivery and determine whether a browser/Portainer policy or Mantine event workaround is needed before calling it fixed.

### #6830 — bug: WUD integration fails to load data after upgrading WUD to 9.0.0 (connection test passes, widget doesn't)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6830) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The WUD v9 integration now uses authenticated /api/containers requests and the merged v2 PR #6831 explicitly fixes the connection-test/widget data-path mismatch.

**Conversation (4 comments read):** The reporter showed that WUD v9 Basic Auth connection testing succeeds while the widget data request fails, despite curl returning /api/containers. Another user reproduced it. The maintainer said it was fixed on the v2 beta and would release alongside v2; PR #6831 is merged into release/v2.

**V2 evidence:**

- packages/integrations/src/wud/wud-integration.ts:15-35 + the connection test uses /api/containers, auth headers, and the current response schema. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L15)
- packages/integrations/src/wud/wud-integration.ts:38-50 + widget data fetch uses the same authenticated /api/containers endpoint with bounded timeout. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L38)
- packages/integrations/src/wud/wud-integration.ts:53-63 + Basic Auth is built from the configured WUD credentials. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L53)
- reports/v2-issue-triage/source/linked-prs/6831.json:triage_merge_commit_is_ancestor_of_v2 + true; merged metadata says WUD v9 auth URLs, /api/containers, docs/tests, and #6830 are fixed in v2.

**Remaining / follow-up:** Confirm with a live WUD 9 instance if desired, but the merged v2 implementation addresses the reported mismatch and will be fixed with v2.

### #6823 — bug:

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6823) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The reported dark-mode failure is limited to Citrix VDI in the conversation and is not explained by a confirmed v2 fix. The current combobox calls the theme setter, but Mantine event delivery failure in that environment remains unaddressed.

**Conversation (6 comments read):** The reporter says theme selection has failed across several Homarr versions and browsers for a migrated user. Maintainers could not reproduce it on normal systems. The reporter then isolated it to Citrix virtual desktops and observed pointerdown/mousedown without mouseup/click; the same VDI event issue affects board-user permission changes. #6849 is a duplicate. This points to a browser/event-environment problem rather than proof that the theme state manager is broken.

**V2 evidence:**

- apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx:13-16 + the control receives colorScheme and passes setColorScheme to the current option selection. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/color-scheme/current-color-scheme-combobox.tsx#L13)
- apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx:39-50 + 66-79 + the manager wires the theme setter to cookie persistence and a server mutation, while subscribe/unsubscribe/clear are no-op manager hooks. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/mantine.tsx#L39)
- apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx:13-20 + 38-46 + board theme rendering consumes the provider/manager state. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_theme.tsx#L13)
- reports/v2-issue-triage/source/6823.json:full_comments + the final debug comment records POINTERDOWN/MOUSEDOWN but no MOUSEUP/CLICK inside VDI, and no v2 fix is claimed.

**Remaining / follow-up:** Reproduce on the affected Citrix VDI/browser and inspect Mantine Combobox event handling, pointer capture, and virtualization policies. Test the theme control and board permission controls with the same VDI policies before deciding on a Homarr workaround; the setter wiring alone does not prove the no-op is fixed.

### #6807 — bug: MCP tools/list fails on invite_createInvite z.date() schema

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6807) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 exposes the invite expiration as an ISO string schema and converts it to Date only at persistence, making tools/list JSON-compatible.

**Conversation (0 comments read):** No comments were present. The issue reports MCP tools/list failing while converting invite_createInvite's z.date schema. The merged v2 invitation-schema fix changes the public input to an ISO datetime string and current MCP tests cover timestamp conversion/validation.

**V2 evidence:**

- packages/api/src/router/invite.ts:55-61,70-84 — createInvite accepts z.iso.datetime({ offset: true }), documents an ISO string to MCP, then constructs a Date for the database. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/invite.ts#L55)
- packages/api/src/mcp-tools.ts:99-139 — MCP extraction converts Zod inputs to JSON Schema, forces an object root, validates the schema, and records safe diagnostics. — [source L99](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/mcp-tools.ts#L99)
- apps/nextjs/src/app/api/mcp/_protocol.ts:43-49 — the protocol registers the JSON-Schema-derived input with the MCP server instead of passing the Zod date schema. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L43)
- apps/nextjs/src/app/api/mcp/_protocol.spec.ts:297-320 — tests accept ISO timestamps (including no seconds/offset forms) and reject invalid dates. — [source L297](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.spec.ts#L297)

**Remaining / follow-up:** No remaining gap for the reported tools/list failure. Verify a live MCP tools/list and invite call after deployment if protocol/client versions differ.

### #6764 — aria2 integration: torrents never report 'seeding' state, always 'leeching'

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6764) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2 still maps every active torrent to leeching. Aria2Download exposes totalLength and completedLength, and the integration already calculates progress from those fields, but getTorrentState receives only the status and returns leeching unconditionally for active. It never checks whether completedLength equals totalLength or uses the seeder flag to report seeding.

**Conversation (0 comments read):** The issue identifies the exact mapping defect and proposes comparing completedLength and totalLength for active torrents. There are no comments or linked PRs. Current V2 source retains the same active-to-leeching branch even though the needed lengths are available in the fetched record, so the reported state bug remains.

**V2 evidence:**

- packages/integrations/src/download-client/aria2/aria2-integration.ts:48-68 — totalLength and completedLength are read for progress, but state is delegated to getState with only status and torrent boolean. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L48)
- packages/integrations/src/download-client/aria2/aria2-integration.ts:150-185 — getTorrentState maps active directly to leeching and has no completed-length/seeder comparison. — [source L150](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-integration.ts#L150)
- packages/integrations/src/download-client/aria2/aria2-types.ts:37-49 — Aria2Download includes totalLength, completedLength, and optional seeder data needed for the requested distinction. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/aria2/aria2-types.ts#L37)

**Remaining / follow-up:** Pass completion/seeder information into torrent state mapping, return seeding for fully downloaded active torrents, and add focused regression coverage for active, queued, complete, paused, and incomplete cases.

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

### #6761 — bug: App Management Breaks w/o Modify All Boards Permission

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6761) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 derives app-management page access from app permissions, so a user with app-create or app-modify-all no longer needs the unrelated board-modify-all permission to load /manage/apps.

**Conversation (0 comments read):** The complete body and zero comments were read. The report says users who can create/use/modify apps receive Not Found unless they are also granted Modify All Boards, and the workaround over-scopes access. Current page code calls getAppsSectionAccess and only gates on its returned app access; the helper delegates to app permissions, with app-create or app-modify-all satisfying canAccess. The manage layout uses the same app-specific section access. This source path removes the board permission dependency described by the report. No runtime permission matrix was exercised in this source-only review.

**V2 evidence:**

- reports/v2-issue-triage/source/6761.json:10-88 — complete bug report was read; it describes the Not Found behavior, the app permissions held, and the over-broad board-permission workaround, with no comments.
- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-55 — the app-management page calls getAppsSectionAccess and returns Not Found only when that app-specific access is absent. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/_access.ts:11-12 — the section-access wrapper delegates to the app-management access calculation rather than a board permission check. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/_access.ts#L11)
- packages/definitions/src/permissions.ts:231-236 — getAppManagementAccess makes canAccess true for app-modify-all or app-create, independently of board permissions. — [source L231](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L231)
- apps/nextjs/src/app/[locale]/manage/layout.tsx:70-95 — management navigation applies the same app-specific access model for the section. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/layout.tsx#L70)

**Remaining / follow-up:** Verify release/v2 with users holding each supported app permission combination and no board-modify-all permission, including direct navigation and management navigation visibility. Confirm unrelated app API actions still enforce their own permissions.

### #6745 — bug: Unraid health widget reports RAM in GiB approximately 1024x too small

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6745) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 computes Unraid memory usage from the byte-valued metrics total minus available, matching the correction requested for the roughly 1024x-too-small RAM ring.

**Conversation (0 comments read):** The complete body and zero comments were read. The report compares an Unraid 7.3.2 memory total with Homarr 1.76.1 showing approximately 1024 times less RAM and proposes calculating used memory as total minus available. Current release/v2 uses `systemInfo.metrics.memory.total` and `available`, clamps the subtraction at zero, and returns those byte values to the health widget. The GraphQL query requests the metrics fields directly and the schema validates non-negative numeric values. Merged PR #6781 is recorded as a release/v2 ancestor. This is source evidence for the correction; no live Unraid payload or release image was run during triage.

**V2 evidence:**

- reports/v2-issue-triage/source/6745.json:10-88 — complete bug report was read; it gives the 1024x discrepancy, Unraid version, and total-minus-available proposal, with no comments.
- reports/v2-issue-triage/source/linked-prs/6781.json:12,34-39,419 — merged PR #6781 addresses the Unraid health memory calculation and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/unraid/unraid-integration.ts:36-55 — the returned memory object now sets total from metrics.memory.total and used to `Math.max(total - available, 0)`, preserving byte units. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/integrations/src/unraid/unraid-integration.ts:84-103; packages/integrations/src/unraid/unraid-types.ts:3-20 — the query and validation schema supply and validate the metrics memory total/available fields used by that calculation. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84), [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L3)
- packages/widgets/src/health-monitoring/system-health.tsx:117-119,196-199 — the health display consumes the integration memory total/used values for the RAM ring. — [source L117](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L117)

**Remaining / follow-up:** Feed an actual Unraid 7.3.2 response through a release/v2 deployment and confirm the rendered GiB value. No runtime image or browser check was performed in this source-only review.

### #6728 — feat: Ping health-check timeout is hardcoded and too short for slower endpoints

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6728) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** App health checks still use the shared hardcoded 10-second HTTP timeout without a per-app or global setting, so slow but healthy endpoints remain unable to configure a longer wait.

**Conversation (0 comments read):** The requester reports a Nextcloud AIO endpoint taking 7–8 seconds and being marked down, asks for per-app/global configurability or a longer default, and includes the AbortError. There are no comments or a linked fix. The current call chain confirms the timeout has no exposed override.

**V2 evidence:**

- packages/core/src/infrastructure/http/timeout.ts:4-15 + withTimeoutAsync defaults to 10000ms and accepts no application setting in this helper path. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/core/src/infrastructure/http/timeout.ts#L4)
- packages/ping/src/index.ts:11-33 + sendPingRequestAsync calls withTimeoutAsync without a timeout argument. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/ping/src/index.ts#L11)
- packages/api/src/router/widgets/app.ts:30-43 + app ping uses the shared sendPingRequestAsync path for pingUrl or href. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/app.ts#L30)
- packages/validation/src/app.ts + current app configuration schema contains no ping timeout field exposed to users.

**Remaining / follow-up:** Add a validated per-app or global health-check timeout and document the trade-off, or raise the default after measuring impact. Preserve abort/error reporting and add coverage for endpoints just beyond the default.

### #6712 — bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6712) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 sends HTTP Basic authentication for both WUD connection tests and container data requests.

**Conversation (0 comments read):** No comments were present. The report says WUD protected by username/password fails despite the service working without auth. Merged v2 PR #6831 adds the auth header to both relevant paths and validates the WUD containers response.

**V2 evidence:**

- packages/integrations/src/wud/wud-integration.ts:15-35 — connection testing requests /api/containers with getAuthHeaders and parses the response. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L15)
- packages/integrations/src/wud/wud-integration.ts:38-50 — dashboard data uses the same authenticated /api/containers request with timeout handling. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L38)
- packages/integrations/src/wud/wud-integration.ts:53-63 — username/password secrets are encoded into an Authorization: Basic header. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L53)

**Remaining / follow-up:** Verify against WUD 9 and a reverse proxy that requires Basic auth, including invalid-credential error handling. Source evidence confirms the requested auth path is present.

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

### #6681 — bug: Immich Integration show as working, zero results.

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6681) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The Immich integration now builds authenticated SDK request options for album and asset calls; the issue conversation also records the album 401 as fixed in version 1.76.1, which predates release/v2.

**Conversation (1 comments read):** The reporter gave a reproducible album-list/detail 401 while ping and direct curl with the same API key succeeded, making the album carousel unusable. The only follow-up states that it was fixed with version 1.76.1. Current release/v2 is later and the integration code carries the API key into its SDK request options.

**V2 evidence:**

- packages/integrations/src/immich/immich-integration.ts:69-113 + album listing/detail methods use the integration request path rather than an unauthenticated URL. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L69)
- packages/integrations/src/immich/immich-integration.ts:115-120 + connection testing remains explicit and separate from album methods. — [source L115](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L115)
- packages/integrations/src/immich/immich-integration.ts:122-139 + 167-181 + album assets and the SDK client are initialized with baseUrl /api and the configured apiKey. — [source L122](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/immich/immich-integration.ts#L122)
- reports/v2-issue-triage/source/6681.json:full_comments + the issue's sole follow-up records Fixed with version 1.76.1, before the v2 base.

**Remaining / follow-up:** Run a live Immich album-carousel smoke check against a current Immich server if release confidence is required; no source-level gap remains for the reported unauthenticated album calls.

### #6671 — bug: Weather widget not displaying data

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6671) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 handles the intentional NO_EXTERNAL_CONNECTION case explicitly and includes the merged weather fix for disabled external connections.

**Conversation (3 comments read):** All three comments were read. The maintainer identified NO_EXTERNAL_CONNECTION=true and proposed #6674. The reporter confirmed they had enabled that flag and, after re-adding the widget, saw the clear outbound-connections-disabled message. Replacement fix #6780 is merged into V2. This resolves the misleading setup/error state, not a promise to fetch weather while outbound requests are disabled.

**V2 evidence:**

- packages/api/src/router/widgets/weather.ts:13-19 — the weather query returns null when outbound connections are intentionally disabled and otherwise uses the request handler. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/weather.ts#L13)
- packages/widgets/src/weather/component.tsx:27-39 — the widget handles null data and displays the translated disabled state. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/weather/component.tsx#L27)
- packages/translation/src/lang/en.json:3146-3148 — the user-facing message states that weather is unavailable because outbound connections are disabled. — [source L3146](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/lang/en.json#L3146)
- packages/request-handler/src/weather.ts:17-77,142-147 — normal external weather requests have validated coordinates, timeout handling, and bounded five-minute widget caching. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/weather.ts#L17)

**Remaining / follow-up:** If outbound connections are enabled and a real location still returns no data, collect the provider response separately. Under NO_EXTERNAL_CONNECTION=true, no weather data is expected and the explanation is now explicit.

### #6628 — bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6628) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 includes the public-origin discovery rewrites, BASE_URL-aware OAuth authorization flow, and protected-resource challenges needed for the reported MCP OAuth failures.

**Conversation (14 comments read):** The body and all 14 comments were read. The original report describes an internal container host in OAuth redirects plus root and nested discovery/authorize failures behind a proxy. The conversation covers the follow-up origin/header behavior, a test image, RFC 8414 concerns, and a later scanner report that rejected-token 401 responses lacked `WWW-Authenticate`. Current release/v2 prefers configured BASE_URL, rewrites root and nested well-known routes, builds the authorize/login callback from that origin, and emits protected-resource metadata on missing, malformed, and rejected-token 401s. Merged PR #6779 is an ancestor of release/v2. One comment contains agent-directed Docker commands; it was treated as untrusted issue content and no commands were run. No live/browser smoke was performed in this triage. The original reporter later verified both original failures on the PR #6631 amd64 image, including discovery, client registration, and the complete authorization redirect chain. This is historical PR-image verification, not a test of the reviewed V2 SHA or the final Cloudflare connector flow.

**V2 evidence:**

- reports/v2-issue-triage/source/6628.json:10-747 — complete body and all 14 comments were read; they document the internal-origin redirect/discovery failures and later rejected-token challenge observation.
- reports/v2-issue-triage/source/linked-prs/6779.json:12,34-39,415 — merged PR #6779 describes public OAuth origin/discovery and challenge handling, and its merge commit is an ancestor of release/v2.
- apps/nextjs/src/app/api/mcp/_base-url.ts:1-8 — MCP URL construction prefers validated BASE_URL and otherwise derives a normalized external origin from request headers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_base-url.ts#L1)
- apps/nextjs/src/app/well-known/[...path]/route.ts:11-46; apps/nextjs/next.config.ts:68-75 — root and nested well-known discovery routes are served and rewritten to the MCP metadata handlers. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/well-known/[...path]/route.ts#L11), [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/next.config.ts#L68)
- apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts:86-158; apps/nextjs/src/app/api/mcp/_handler.ts:250-309 — authorization redirects and all token-rejection challenge paths use the public origin and protected-resource metadata. — [source L86](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts#L86), [source L250](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_handler.ts#L250)

**Remaining / follow-up:** Deploy release/v2 behind the affected reverse proxy with BASE_URL set and exercise root/nested discovery, login redirect, and rejected-token 401 responses. Source coverage addresses the reported paths, but no live endpoint or latest-image check was performed here.

### #6622 — bug: Bug/UX: Restoring .zip backup shows empty boards until manual hard refresh / re-login

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6622) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 detects that database restore invalidates the current session, shows a restore-complete/re-login state, and redirects to login instead of leaving the user looking at an empty stale board.

**Conversation (11 comments read):** The report describes successful restore followed by empty boards until hard refresh/re-login. The reporter confirmed that the #6624 test image prompts re-login and requested an earlier warning. They also attempted the V2 image but expressed uncertainty because both instances displayed a V1 version. That is user confirmation of the fix image, not unambiguous runtime validation of this V2 SHA. #6624 itself is open/unmerged, but the equivalent fix commit 28e242417 (#6778) is an ancestor of release/v2.

**V2 evidence:**

- apps/nextjs/src/components/backup/database-restore-flow.tsx:149-165 + the restore flow waits for readiness and assigns a destination after completion. — [source L149](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/database-restore-flow.tsx#L149)
- apps/nextjs/src/components/backup/database-restore-flow.tsx:168-216 + 322-331 + restore responses carry reloginRequired and send the user to /auth/login when the database session was replaced. — [source L168](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/database-restore-flow.tsx#L168)
- apps/nextjs/src/components/backup/restore-progress-panel.tsx:32-88 + the UI reports restore status and presents the re-login/refresh state. — [source L32](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/backup/restore-progress-panel.tsx#L32)
- apps/nextjs/src/app/api/backup/import/route.ts:291-324 + 335-346 + import migrates/replaces the database and returns restart/re-login information. — [source L291](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/backup/import/route.ts#L291)
- git commit 28e242417 + ancestor of HEAD + commit message fix(backup): prompt re-login after restore (#6778), providing v2 placement evidence for the behavior.
- reports/v2-issue-triage/source/linked-prs/6624.json:triage_merge_commit_is_ancestor_of_v2 + false; the open PR is not used as the evidence, only the merged equivalent is.

**Remaining / follow-up:** Add the reporter's suggested warning before accepting the backup file if desired. The reported stale/empty-board core is handled by forced re-login in v2.

### #6620 — bug: Dashboard briefly flashes skeleton placeholders on every refresh since v1.75.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6620) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 uses a different board and widget loading architecture, so the v1.75 skeleton path is not directly present. Board item module loading shows a compact Loader, and widget query helpers preserve cached data during refetches and only treat an undefined first result as initially pending. That is evidence against replacing populated widgets with skeletons on ordinary refetch, but a full page refresh still has an initial loading transition and the exact visual flash requires browser observation.

**Conversation (2 comments read):** The issue reports a reproducible skeleton flash on every dashboard refresh after v1.75, while v1.74 did not show it. The maintainer says the behavior was an intentional optimization while the browser computes layout and that v2 uses a different system. No comment claims a v2 fix or provides a current reproduction. This makes source comparison useful but insufficient to label the browser-visible timing issue resolved.

**V2 evidence:**

- apps/nextjs/src/components/board/items/item-content.tsx:89-120 — V2's board item boundary uses a Loader while a lazy widget module is first loading, not a v1 skeleton placeholder implementation. — [source L89](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-content.tsx#L89)
- packages/widgets/src/common/query-state.ts:12-21 — cached/stale data is retained and initial pending is true only when no first result exists, so ordinary refetch should not blank populated widget data. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/common/query-state.ts#L12)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.tsx:45-71 — V2 board hydration is tracked on a scaled canvas with initial dimensions, reflecting the separate board-loading architecture. — [source L45](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.tsx#L45)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css:1-11 — hydration overflow handling is scoped to the new board viewport rather than the former dashboard skeleton system. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css#L1)

**Remaining / follow-up:** Run a controlled V2 browser refresh test on a populated board, distinguishing initial lazy-module Loader behavior from data refetch; compare screenshots/timing against the reported skeleton flash at the affected viewport sizes.

### #6608 — bug: Integration page accessible without board-modify-all permission

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6608) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 gates the integrations management page with a dedicated integration-management permission and filters the server-provided integration list to what the user may manage.

**Conversation (0 comments read):** The report says users without board-modify-all could open the integration management page. The issue references #6509. Merged PR #6612 introduces getIntegrationManagementAccess, uses it for the page, and explicitly closes #6608; its merge commit is an ancestor of release/v2.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:27-38 + the page obtains session and getIntegrationsSectionAccess before rendering. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L27)
- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:42-55 + server data is filtered to integrations the caller may manage. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/integrations/page.tsx:124-135 + the page explains the scoped access behavior in the UI. — [source L124](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/integrations/page.tsx#L124)
- apps/nextjs/src/app/[locale]/manage/_access.ts:1-35 + the route uses getIntegrationManagementAccess rather than board-modify-all. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/_access.ts#L1)
- packages/definitions/src/permissions.ts:226-254 + access checks include the global integration-full-all rule and delegated integration permissions. — [source L226](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L226)
- reports/v2-issue-triage/source/linked-prs/6612.json:triage_merge_commit_is_ancestor_of_v2 + true; merged metadata explicitly states that the PR closes #6608.

**Remaining / follow-up:** Test the page with each relevant delegated/global permission in a browser, but the route guard and merged v2 fix directly address the report.

### #6593 — bug: Pi-hole v6 / Plex integrations send unauthenticated periodic health-check requests, causing real 401s

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6593) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The Pi-hole integration still performs an unauthenticated v6 capability probe against /api/info/version while the widget uses an authenticated flow. That exact periodic 401 pattern remains in v2; Plex's analogous root-probe path also needs investigation.

**Conversation (0 comments read):** The report observes repeated unauthenticated requests and 401s for Pi-hole v6 and Plex despite working authenticated widgets, asking for the health check to use credentials or stop probing. The issue distinguishes connection tests from widget requests. No comments or linked fix establish that the v2 branch removed these probes.

**V2 evidence:**

- packages/integrations/src/pi-hole/pi-hole-integration-factory.ts:8-23 + the factory calls /api/info/version with fetchWithTrustedCertificatesAsync(url) without credentials and explicitly treats 401 as a Pi-hole v6 signal. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/pi-hole/pi-hole-integration-factory.ts#L8)
- packages/integrations/src/pi-hole/v6/pi-hole-integration-v6.ts:27-34 + 45-52 + 121-142 + 148-176 + the actual v6 integration has a separate authenticated session/request flow, confirming the bare probe is not the widget's authenticated request. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/pi-hole/v6/pi-hole-integration-v6.ts#L27)
- packages/request-handler/src/lib/integration-request-handler.ts:61-94 + request handling invokes integration factories through the cached request-handler path, so a factory probe can recur during periodic widget work. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/integration-request-handler.ts#L61)
- packages/integrations/src/plex/plex-integration.ts:159-167 + 250-259 + media/identity calls use X-Plex-Token, but no evidence in the current source shows a fixed authenticated generic health probe for the issue's Plex symptom. — [source L159](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L159)
- packages/integrations/src/base/creator.ts:14-23 + creator dispatch includes Pi-hole and Plex factories, the entry point for their capability detection. — [source L14](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L14)

**Remaining / follow-up:** Remove unauthenticated capability probes or supply the configured credentials, and use a bounded authenticated health check. Trace the Plex factory/periodic path separately so both reported integrations stop generating expected 401 noise without masking real auth failures.

### #6559 — bug: Releases widget showing "Only the first 1000 results are available" error

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6559) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The release/v2 GitHub path no longer uses repository search, but it still paginates every GitHub release page; the reported 1000-result failure cannot be classified without checking the exact endpoint response.

**Conversation (1 comments read):** The body and sole comment were read. The saved configuration screenshot identifies the GitHub provider, repository `home-assistant/home-assistant`, default `https://api.github.com`, and no filter; the comment says the bug still occurs in 1.76.2. Current release/v2 code obtains releases with Octokit `api.paginate` over `repos.listReleases`, then fetches repository details directly with `repos.get`. The direct details call rules out a current search endpoint in this path, while unbounded release pagination could still encounter a provider-side 1000-result cap. Source inspection therefore shows an improvement but cannot prove the configured repository no longer fails.

**V2 evidence:**

- reports/v2-issue-triage/source/6559.json:10-135 — complete body and one comment were read; the report names the 1000-result error and the comment says it persists in 1.76.2.
- reports/v2-issue-triage/source/attachments/6559-config.png — saved configuration screenshot shows GitHub, `home-assistant/home-assistant`, `https://api.github.com`, and no release filter.
- packages/request-handler/src/release-providers.ts:167-213 — the GitHub release provider calls `api.paginate` for `repos.listReleases` with `per_page: 100` and reduces the returned releases. — [source L167](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L167)
- packages/request-handler/src/release-providers.ts:216-233 — repository details use direct `api.rest.repos.get`; no repository-search request appears in the current details path. — [source L216](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L216)
- packages/definitions/src/release-provider.ts:3-8 — GitHub provider defaults to the public GitHub API URL shown in the report configuration. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L3)

**Remaining / follow-up:** Run release/v2 against the exact repository or a mocked GitHub API that exercises the endpoint beyond 1000 results. If `listReleases` is capped, bound or redesign pagination to obtain the latest releases without traversing the capped history; otherwise capture the actual failing request and payload.

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

### #6438 — bug: OOM with 1.71.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6438) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** Release/v2 contains the relevant Beszel live-stream cleanup, bounded subscription queue, and client buffer trimming, but the reported dashboard-wide OOM under a 1.5 GB cap remains unverified.

**Conversation (4 comments read):** The body and all four comments were read. The report describes Homarr reaching its 1.5 GB limit while a dashboard combines Docker data with Beszel Live data, and later discussion mentions desktop/mobile use and multiple live views. The conversation never isolates a reproducible leak or confirms a post-fix retest. Merged PR #6448 is a release/v2 ancestor and its current source closes the Beszel SSE response/agent on disconnect, bounds pending events, and trims the one-minute client buffer. Those changes address a credible live-subscription growth path, while the broader process OOM and other widgets remain unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6438.json:70-334 — complete issue body and four comments were read; it reports the memory cap/OOM scenario and does not provide a confirmed leak trace or post-fix result.
- reports/v2-issue-triage/source/linked-prs/6448.json:12,34-39,415 — PR #6448 describes the Beszel live memory-growth fix and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/beszel/beszel-integration.ts:407-590 — the live SSE reader uses abort handling, closes response bodies and the undici agent, and bounds retry behavior on disconnect. — [source L407](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L407)
- packages/api/src/router/widgets/beszel.ts:198-293; packages/api/src/router/widgets/bounded-async-queue.ts:8-88 — live subscriptions use abort cleanup and a queue that caps pending events and discards the oldest item when full. — [source L198](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L198), [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-76 — the client keeps a maximum one-minute buffer and trims older live samples, pausing updates when the page is hidden. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)

**Remaining / follow-up:** Reproduce the exact Docker-plus-Beszel dashboard with multiple tabs/views and the 1.5 GB limit on release/v2 while recording process memory. If OOM persists, isolate Docker, app prefetch, or another subscription path separately from the fixed Beszel stream.

### #6300 — bug: Memory leak

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6300) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 bounds several caches and fixes Beszel live-stream retention, but no causal link establishes that those changes resolve this broader retained Next.js memory report.

**Conversation (5 comments read):** All five comments were read. The original reporter lists media, download, calendar, weather, Dashdot iframe and Docker widgets, with retention after repeatedly opening/closing tabs. A later ARM64 report documents a multi-day plateau near 1.9 GB and uses Beszel as the external measurement source; that does not establish use of a Beszel live widget. Neither report isolates a subsystem.

**V2 evidence:**

- packages/api/src/router/widgets/bounded-async-queue.ts:8-15,28-40 — live snapshots use a bounded queue that discards old values when a slow client falls behind. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/api/src/router/widgets/beszel.ts:205-220,254-270 — each Beszel subscription installs an abort-linked bounded queue and closes it on cancellation/error. — [source L205](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L205)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-21,30-72 — the browser keeps only a 60-record sliding buffer, stops hidden-page subscriptions, and clears buffers on key changes. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)
- packages/integrations/src/beszel/beszel-integration.ts:427-438,549-587 — SSE response bodies/readers/agents are cancelled and closed on normal completion, abort, and retry. — [source L427](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L427)
- packages/request-handler/src/lib/request-handler.ts:28-39,113-145,232-269,317-337 — in-memory cache, inflight requests, and upstream work have explicit size/expiry/concurrency bounds. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L28)
- packages/api/src/query-cache.ts:21-35,36-65 — large Beszel system stats are excluded from persisted cache and supporting dashboard query policies are bounded. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/query-cache.ts#L21)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:158-160 — release-level performance claims cover parallel startup, lazy heavy screens, and deduplicated integration work. — [source L158](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L158)

**Remaining / follow-up:** Run a long RSS/heap retention reproduction using the reported widgets and repeated tab open/close lifecycle on the affected architectures. The cited bounded queues/caches are relevant improvements, not proof of even a partial fix for this particular cause.

### #6271 — bug: TrueNAS Integration eating up memory on TrueNAS host

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6271) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2's TrueNAS client now reuses one authenticated WebSocket per integration ID, evicts it on close/failure, bounds requests, and negotiates JSON-RPC with a legacy fallback. The integration still launches four concurrent data queries per refresh, including reporting and network data, so the source demonstrates connection reuse but cannot establish that the TrueNAS host memory leak is fixed. The report targets TrueNAS 25.10.4, while no reproduction or memory profile is available here.

**Conversation (0 comments read):** The reporter says reconnecting Homarr's TrueNAS integration eventually consumes all host memory and that removing the integration plus a host restart restores normal usage. There are no comments, linked fixes, or diagnostic logs identifying whether the cause is socket churn, an API response leak, or server-side reporting. V2 contains a redesigned/reused client and newer API handling, which is relevant mitigation but not issue-specific proof.

**V2 evidence:**

- packages/integrations/src/truenas/truenas-client.ts:26-49,68-95 — client connections are cached per integration, shared by concurrent calls, and evicted/reconnected when a socket fails or closes. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-client.ts#L26)
- packages/integrations/src/truenas/truenas-client.ts:106-139 — V2 negotiates JSON-RPC and falls back to the legacy API, retaining the selected API per integration. — [source L106](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-client.ts#L106)
- packages/integrations/src/truenas/truenas-integration.ts:34-60 — each system-info refresh still runs system, reporting, pool, and network requests concurrently. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L34)
- packages/integrations/src/truenas/truenas-integration.ts:219-246,273-295 — reporting calls request five-minute CPU/memory/temperature and interface netdata windows on each refresh. — [source L219](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L219)

**Remaining / follow-up:** Reproduce against TrueNAS 25.10.4 with sustained widget polling, collect Homarr socket/request counts and TrueNAS memory profiles, and confirm cleanup/backpressure; inspect server-side reporting responses if memory still grows.

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

### #6177 — bug: Homarr red action buttons on Floorp browser ofen spin forver w/o completion

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6177) · **Bugs** · **Needs verification** · Confidence: **low**

**Request:** No Floorp-specific v2 change or reproducible source cause was found. The generic upload action uses normal Mantine loading state, so the reported endless spinner needs a current Floorp reproduction.

**Conversation (1 comments read):** The report says red action buttons in Floorp often spin forever without completing. The maintainer asked whether the same happens in Chrome or Safari, but there is no follow-up answer and no browser/version/network trace establishing whether the issue is Homarr, Floorp, or an environment problem.

**V2 evidence:**

- packages/forms-collection/src/upload-media/upload-media.tsx:17-55 + the upload control is a generic Mantine button/FileButton with a loading prop supplied by the action state. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/upload-media/upload-media.tsx#L17)
- apps/nextjs/src/app/[locale]/manage/medias/_actions/upload-media.tsx:18-19 + the server action boundary is small and has no Floorp-specific branch or retry loop. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/medias/_actions/upload-media.tsx#L18)
- reports/v2-issue-triage/source/timelines/6177.json:commented events + the only maintainer follow-up requests Chrome/Safari comparison, with no confirmed resolution.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:144-160 + V2 preview/performance/permission notes contain no claim about Floorp action-button completion. — [source L144](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L144)

**Remaining / follow-up:** Retest the reported actions on release/v2 with Floorp and a control browser, record the network request and promise completion/error state, and isolate whether the spinner is an action failure or browser rendering/event issue.

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

### #6024 — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6024) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The report's parser exception has no confirmed causal fix in release/v2. V2 normalizes JSON SyntaxErrors from decorated integration methods, but the logged `\uXXXX (1:10901)` shape is consistent with a JavaScript parser and no source identifies that path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter sees a recurring Unicode-escape SyntaxError with low visible impact and suspects an empty Beszel integration, but provides no reproduction or endpoint payload. A later triage PR considered wrapping only Beszel authentication JSON, then removed that narrow change because the report points to collection responses. The current generic integration boundary can normalize JSON parse failures, and Beszel response.json calls run inside it, but that does not establish that the reported parser exception came from JSON.parse or from Beszel. The linked narrow PR is not a release/v2 ancestor, so disposition remains unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6024.json:10-88 — the complete body was read; it reports the recurring malformed Unicode escape, possible empty Beszel data, low impact, and no comments or reproduction steps.
- packages/integrations/src/base/errors/decorator.ts:22-25,90-169 — all Integration methods are wrapped and rejected errors pass through the default JSON parse handler before being rethrown as normalized integration errors. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/decorator.ts#L22)
- packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts:8-21 — SyntaxError values are converted into IntegrationParseError through JsonParseErrorHandler rather than remaining raw exceptions. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts#L8)
- packages/common/src/errors/parse/handlers/json-parse-error-handler.ts:4-17 — the JSON handler recognizes SyntaxError, logs the parse message, and creates a ParseError cause. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/common/src/errors/parse/handlers/json-parse-error-handler.ts#L4)
- packages/integrations/src/beszel/beszel-integration.ts:253-278,598-618 — Beszel collection and auth testing calls still call response.json, but those methods run under the decorated Integration boundary. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L253)
- packages/api/src/router/widgets/beszel.ts:31-63,168-195 — Beszel system and stats routes convert integration failures into public error results instead of propagating a process-level uncaught exception. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L31)
- reports/v2-issue-triage/source/linked-prs/6510.json:34-39,437 — the later PR explicitly removed its narrow Beszel wrapper and records its merge commit as not an ancestor of release/v2; this metadata is context only, while the current source above supplies the disposition evidence.

**Remaining / follow-up:** Capture the complete stack, parser, and malformed payload on release/v2 if the recurring log is still observed. Identify whether the failure is JSON parsing, JavaScript/Acorn parsing, or another upstream path before adding a targeted fix or fixture.

### #6008 — bug: manage/about page fails to load with ECONNREFUSED

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6008) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2's /manage/about page no longer self-fetches its own HTTP API. It imports static contributor data and calls getDependenciesAsync directly on the server, eliminating the HOSTNAME/loopback path that caused ECONNREFUSED in restricted container networking. A manage-level error boundary also catches future management-page failures with a retry surface. The linked fix is merged and its merge commit is an ancestor of V2.

**Conversation (3 comments read):** The issue reports /manage/about failing in v1.66.1 with ECONNREFUSED and digest 3227098399. Comments request full server logs and mention a broader error boundary. Linked PR #6009 explicitly identifies four unnecessary self-fetches, removes them, and adds manage/error.tsx; its metadata records a merge and V2 ancestry. Current source contains the direct calls and boundary, so the reported self-fetch cause is addressed, although deployment-specific failures still need runtime evidence.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/about/page.tsx:42-60 — the page directly imports static data and calls getDependenciesAsync without constructing or fetching a local HTTP URL. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/about/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/error.tsx:9-41 — management pages have a localized retry error boundary that displays a digest when a runtime error occurs. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/error.tsx#L9)
- reports/v2-issue-triage/source/linked-prs/6009.json:34,38-39,365,397 — the linked self-fetch/error-boundary PR is merged, with a merge commit recorded as an ancestor of V2.

**Remaining / follow-up:** Validate /manage/about in the affected source-built/restricted-network deployment and inspect any new digest if direct dependency reading fails; the original loopback ECONNREFUSED path is removed.

### #6002 — bug: Uptime-Kuma, paused has no effect

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6002) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The integration still derives monitor status from the latest public heartbeat and cannot reliably distinguish an intentionally paused monitor from a stale last heartbeat.

**Conversation (1 comments read):** The one comment was read. The reporter says pausing an Uptime Kuma monitor does not change Homarr's paused counter. The maintainer explains Homarr only consumes public status-page and heartbeat APIs, which omit the dashboard monitor active flag; a later v2 fix was reverted because it was ineffective. The public API limitation remains.

**V2 evidence:**

- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:48-61 — v2 fetches only the public status page and heartbeat endpoints. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L48)
- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:64-81 — status is derived from the latest heartbeat, with no active/paused monitor field. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L64)
- packages/integrations/src/uptime-kuma/uptime-kuma-types.ts:3-17,40-43 — the schema maps heartbeat states to up/down/paused and has no monitor active property. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-types.ts#L3)
- packages/widgets/src/uptime-kuma/component.tsx:112-130,218-238 — the widget displays the derived paused count and monitor badges without another source of truth. — [source L112](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/uptime-kuma/component.tsx#L112)

**Remaining / follow-up:** Use an authenticated Uptime Kuma API or an explicit integration option/endpoint that exposes active state, then verify paused monitors, stale heartbeats, and maintenance states separately. Do not call the reverted status mapping a fix.

### #5730 — bug: Administration menu breaks if you click around the options too much

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5730) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** The current logs terminal disposes the CanvasAddon before the terminal, covering the reported xterm cleanup failure, but the reported Scalar API error and WebSocket process crash have no corresponding release/v2 source fix.

**Conversation (7 comments read):** All 7 comments were read. The report combines three failures after rapid administration-menu navigation: repeated WebSocket failures that eventually stop the server, Scalar's `refract is not a function` with broken API dropdowns, and xterm's onShowLinkUnderline error while leaving logs. The reporter traces the WebSocket problem to tRPC's observableToReadableStream and proves local try/catches prevent crashes; they also identify CanvasAddon disposal as the logs race. A maintainer later says it should be fixed but receives no confirmation. Current v2 cleanup clears the fit timer, disposes CanvasAddon, then disposes and clears the terminal ref. The API page still renders @scalar/api-reference-react without a compatibility guard, and the WebSocket entrypoint still delegates to applyWSSHandler without stream-controller protection.

**V2 evidence:**

- reports/v2-issue-triage/source/5730.json:10-92,110-440 — the full report and all seven comments were read; the conversation explicitly splits the WebSocket, Scalar, and xterm errors and has no reporter confirmation after the maintainer's fix claim.
- apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx:174-205 — the logs component clears its delayed fit callback and disposes CanvasAddon before Terminal, then clears both refs, addressing the specific disposal order implicated by the xterm stack. — [source L174](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx#L174)
- apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx:1-35 — the API page still imports and renders ApiReferenceReact directly, with no refract compatibility handling or fallback. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx#L1)
- apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx:51-80 — administration API documentation still mounts the Scalar component as its documentation panel. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx#L51)
- apps/websocket/src/main.ts:34-71 — the WebSocket server still uses applyWSSHandler with keep-alive settings and has no local handling around the readable-stream controller operations described in the issue. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/websocket/src/main.ts#L34)

**Remaining / follow-up:** Verify logs navigation on release/v2, then independently reproduce the Scalar dependency error and tRPC stream shutdown. Upgrade or isolate incompatible Scalar/tRPC behavior and add a server-safe close path if those two failures remain; the xterm source change alone does not close the compound report.

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

### #5085 — bug: Unable to connect to LDAP

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5085) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The initial LLDAP failure was a bind-DN configuration mistake corrected in the thread, while the separate Authentik LDAP Outpost failure remains unresolved and has no release/v2-specific fix or fixture.

**Conversation (8 comments read):** All 8 comments were read. The original Docker Compose example uses cn=admin even though the returned LLDAP entry has uid=admin; the reporter confirms changing the bind DN to that returned DN makes LLDAP login work. They then reproduce a different failure against Authentik, using a correct bind DN, sAMAccountName, subtree search, and an objectClass filter; ldapsearch from the Homarr container returns one user, but Homarr still returns CredentialsSignin. The maintainer questions the search scope, the reporter tests it and reports no change, then supplies base and subtree queries showing the expected Authentik user. Current v2 supports the requested username attribute, search scope, and optional extra filter, but there is no Authentik-specific handling or end-to-end evidence that those settings authorize successfully.

**V2 evidence:**

- reports/v2-issue-triage/source/5085.json:10-112,130-507 — the full report and all eight comments were read; the thread separates the corrected LLDAP bind DN from the still-failing Authentik case and includes the later base/subtree ldapsearch output.
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:17-54 — login binds with AUTH_LDAP_BIND_DN, searches with configured base, username filter, scope, and attributes, and rejects zero or multiple matches. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L17)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:81-95,141-148 — group lookup uses the configured scope and the username filter extra argument is interpolated as a caller-supplied LDAP filter expression. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L81)
- packages/auth/env.ts:55-69 — release/v2 exposes AUTH_LDAP_SEARCH_SCOPE, AUTH_LDAP_USERNAME_ATTRIBUTE, username/group filter extras, and group mapping settings needed for the reported Authentik schema. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L55)
- packages/auth/providers/credentials/ldap-client.ts:18-56 — the client passes the configured URI and ldapts search options through without provider-specific Authentik normalization. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L18)
- apps/docs/docs/advanced/single-sign-on/index.mdx:103-118 — the documented LDAP contract expects a parenthesized extra filter and supports base/one/sub scopes, so malformed filter syntax remains a configuration variable to verify. — [source L103](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L103)

**Remaining / follow-up:** Reproduce the Authentik setup on the release/v2 image with the documented parenthesized extra filter and capture Homarr's search/bind result, then add provider-compatible handling or documentation if the one-entry ldapsearch case still fails. Do not treat the LLDAP configuration correction as resolution of the Authentik failure.

### #4973 — bug: System Resources Incorrect Total Ram for TrueNAS 25.04

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4973) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 corrects the TrueNAS memory mapping responsible for inflating displayed capacity. Previously physical memory was returned as available and the reporting value as used, so the widget added both. V2 returns available and max(physical minus available, 0), making their sum physical memory for valid available values.

**Conversation (2 comments read):** The reporter says a TrueNAS 25.04 host with 64 GB appears as roughly 74 GB in Homarr, with a follow-up describing a similar VM discrepancy. The maintainer asks about versions without confirming a reproduction. Merged fix #6017 changes the exact erroneous mapping; the independent audit agrees this is a concrete source-level fix for the overcount.

**V2 evidence:**

- packages/integrations/src/truenas/truenas-integration.ts:57-66 — available is reported free memory and used is max(physmem minus available, 0). — [source L57](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/truenas/truenas-integration.ts#L57)
- packages/widgets/src/system-resources/component.tsx:133-149 — capacity is available plus used, now equal to physmem for valid input. — [source L133](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L133)
- git show f69e545d6 — merged #6017 replaces the old available=physmem and used=reporting-value mapping.

**Remaining / follow-up:** Confirm the original TrueNAS 25.04 payload has available memory between zero and physmem, then compare System Resources and Health Monitoring against the host. The arithmetic fix is present; no live TrueNAS validation was performed.

### #4965 — bug: LDAP authentication fails for users with non-ASCII characters in Distinguished Name

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4965) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 has explicit DN normalization for LDAP values containing escaped hexadecimal bytes and converts non-string attributes as UTF-8, but it has no issue-specific fix or regression evidence for the reported Active Directory group lookup. The group filter still interpolates the configured user DN directly, with no dedicated LDAP filter escaping/encoding helper. That may work for LDAPv3 servers and may fail for vendor-specific encoding, so source inspection cannot settle the report.

**Conversation (4 comments read):** The reporter says user lookup and password validation succeed, then group retrieval fails only when the CN/DN contains Cyrillic, Polish, Chinese, or other non-ASCII characters; ASCII-only users work. Comments question why a CN is non-ASCII, answer that other LDAP services handle it, and suggest vendor differences between encoded and UTF-8 strings while expecting LDAPv3 UTF-8 to work. The issue remains open, has no linked fix, and the only workaround is using local credentials accounts.

**V2 evidence:**

- packages/auth/providers/credentials/authorization/ldap-authorization.ts:34-54,68-99 — user lookup and password bind succeed before the separate group search, whose filter directly inserts ldapUser[configured member attribute]. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L34)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:141-148 — username filters also interpolate input without a filter escaping helper. — [source L141](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L141)
- packages/auth/providers/credentials/ldap-client.ts:43-66 — LDAP values are converted to strings and buffers as UTF-8. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L43)
- packages/auth/providers/credentials/ldap-client.ts:69-82 — returned DNs with escaped hex bytes are normalized through decodeURIComponent; this predates the issue and does not prove the group filter works with every directory vendor. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L69)
- packages/auth/env.ts:61-68 — group member attribute and search scope are configurable, matching the reporter's distinguishedName setup but offering no encoding mode. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L61)

**Remaining / follow-up:** Reproduce with the reported AD/LDAP configurations and capture the exact generated group filter and server response; then add standards-compliant filter escaping/encoding or a vendor-compatible DN path and regression coverage if confirmed.

### #4797 — feat(releases): support image tags

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4797) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 queries Docker Hub tags and supports prefix/precision/suffix filters, but normalizes away an image tag and cannot express an exact pinned tag or flexible include/exclude regex.

**Conversation (6 comments read):** All 6 comments were read. The reporter says Docker images such as pihole/pihole work without a tag but :latest does not, and asks for a tag option plus include/exclude regex. Follow-ups discuss Docker Hub's tags endpoint and behavior without a filter; the old rework PR was merged but the exact tag/filter contract remains incomplete.

**V2 evidence:**

- packages/definitions/src/release-provider.ts:60-77 — Docker registry identifiers explicitly strip a digest or tag during normalization, so pihole/pihole:latest becomes the repository. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L60)
- packages/widgets/src/releases/index.ts:48-75 — repository options expose only versionFilter with prefix, numeric precision, and suffix; no exact tag or include/exclude mode exists. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/index.ts#L48)
- packages/api/src/router/widgets/releases.ts:18-32,88-102 — the server constructs an anchored precision regex and passes it to the provider request. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/releases.ts#L18)
- packages/request-handler/src/release-providers.ts:415-460 — Docker Hub requests paginated /tags and applies the regex to returned tag names. — [source L415](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L415)
- packages/definitions/src/test/release-provider.spec.ts:21-30 — current tests codify stripping postgres:17 and other image tags from identifiers. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/test/release-provider.spec.ts#L21)

**Remaining / follow-up:** The tag endpoint and latest/no-filter path work for repository discovery, but exact image-tag selection and flexible include/exclude filters are still missing. Verify the reporter's :latest and desired tag semantics against a current Docker Hub repository.

### #4766 — bug: Homarr blocks HTTP/2 WebSocket connections for other sites sharing the same reverse proxy

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4766) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The issue is an environment-specific Chromium/reverse-proxy WebSocket interference report. V2 has a lazy, timed websocket client, but source inspection cannot establish that it prevents cross-site HTTP/2 connection interference.

**Conversation (5 comments read):** The reporter supplied a detailed reverse-proxy and HTTP/2 WebSocket reproduction in which opening Homarr affected another site sharing the proxy. The thread considered an AI-generated diagnosis, which the reporter challenged, and a maintainer could not reproduce and suspected the proxy. Another user reported a similar symptom. There is no controlled reproduction or confirmed root-cause fix in the conversation.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx:98-110 + the current client uses a lazy websocket with a 30-second close window and cleanup. — [source L98](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx#L98)
- apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx:112-140 + the websocket is part of the tRPC transport selection, but no reverse-proxy isolation or HTTP/2 connection policy is encoded here. — [source L112](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/_client-providers/trpc.tsx#L112)
- reports/v2-issue-triage/source/timelines/4766.json:commented events + the maintainer's inability to reproduce and proxy suspicion remain the latest disposition evidence.
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:75-85 + the V2 architecture announcement describes board/layout changes and does not claim a reverse-proxy websocket fix. — [source L75](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L75)

**Remaining / follow-up:** Reproduce on release/v2 with the reported Chromium version and reverse proxy, while tracing HTTP/2 streams and connection ownership for the other site. Test Caddy/Nginx Proxy Manager or the reporter's exact proxy configuration before assigning a source-level fix.

### #4738 — bug: Dashboard Layout - Saving Changes Failure

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4738) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces the layout-save path, but the report affected only one existing board and its cause was not isolated. The new implementation alone does not prove that the specific Board not found failure or migrated board data is repaired.

**Conversation (4 comments read):** All 4 comments were read. The reporter describes v1.46 failing when adding a layout with Board not found in createBoardLayout, provides follow-up logs, removes bad integrations, and says the failure remains. No comment identifies a separate root cause beyond the layout-save path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — layout saves return canonical layouts, reset dirty state, and revalidate the settings page. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:15-22 — layout mutation settlement invalidates the board and home-board queries. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L15)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the board, validates added/removed roles, creates custom layouts, and projects sections/items. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:102-131 — the responsive layout payload has strict Base/Mobile/unique-breakpoint validation. — [source L102](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L102)

**Remaining / follow-up:** No live reproduction or database migration test was run. Verify adding, resizing, and reloading a custom layout on a board upgraded from the affected v1 version.

### #4538 — bug: iCal widget intergration not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4538) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2's iCal adapter still fetches the remote feed on demand, emits raw VEVENT instances, and has no recurrence expansion or durable stale-data fallback for feeds blocked by providers.

**Conversation (1 comments read):** The issue body and its 1 comment were read. The reporter says an iCloud public feed works briefly, is then blocked after too many requests, and omits recurring events. The comment proposes synchronizing and storing calendar data locally. V2's iCal integration fetches the configured URL for each request, parses each VEVENT directly, and returns its DTSTART/DTEND without iterating RRULE occurrences. The calendar request handler has only the generic 10-second cache because no iCal-specific TTL or stale-on-error policy is configured; the calendar router returns an integration error when all sources fail. Thus neither the provider-blocking failure mode nor the recurring-event omission is resolved at source level.

**V2 evidence:**

- reports/v2-issue-triage/source/4538.json:10-79,97-145 - the full iCloud failure/recurrence report and the synchronization comment were read.
- packages/integrations/src/ical/ical-integration.ts:12-38 - each request fetches the configured URL, loops raw VEVENT subcomponents, and emits only each event's start/end; no recurrence iterator or expansion is present. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/ical/ical-integration.ts#L12)
- packages/request-handler/src/calendar.ts:17-29 - calendarMonthRequestHandler sets only cacheNamespace and its request function, with no cacheTtlMs or fallbackToStaleOnError for iCal. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/calendar.ts#L17)
- packages/request-handler/src/lib/request-handler.ts:31-33,240-269,318-349 - the generic cache defaults to 10 seconds and stale-on-error is opt-in, so this path has no durable feed snapshot when an upstream blocks it. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L31)
- packages/api/src/router/widgets/calendar.ts:29-60 - calendar responses fall back to empty events per integration but throw when all integrations fail, leaving a blocked sole iCal feed unusable. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/calendar.ts#L29)
- packages/integrations/src/interfaces/calendar/calendar-integration.ts:3-4 - the calendar interface carries a date range but no recurrence or synchronization contract. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/calendar/calendar-integration.ts#L3)

**Remaining / follow-up:** Implement feed synchronization or a longer, bounded cache with stale fallback/backoff, expand RRULE events within the requested range with timezone handling, and add focused iCal tests for blocked feeds and recurrence.

### #4406 — bug: OIDC not working with Cloudflare Zero Trust / SaaS

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4406) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2's OIDC implementation has configurable scopes, nested groups/name claim paths, and an option to force userinfo, but the provider definition does not explicitly set an authorization response_type or add a Cloudflare-specific callback flow. Auth.js may use the authorization-code default, which is the relevant configuration direction, yet the reported Cloudflare fragment/state failure cannot be proven resolved from these files. The profile parser still requires sub and a usable name claim.

**Conversation (14 comments read):** The report describes Cloudflare Zero Trust OIDC with Entra failing at the callback, initially around the groups scope. Comments clarify that the provider is Cloudflare OIDC, try implicit/hybrid flow, and report persistent failures through several Homarr releases. The later investigation explains that implicit/hybrid responses put state/tokens in a browser fragment unavailable to the server, recommends authorization code, and notes that profile claims may need scope/name/group overrides or userinfo. No linked fix or v2-specific verification is recorded.

**V2 evidence:**

- packages/auth/providers/oidc/oidc-provider.ts:13-31 — OIDC authorization sends the configured scope and redirect URI but does not explicitly set response_type; the source provides no Cloudflare-specific handling. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/oidc-provider.ts#L13)
- packages/auth/providers/oidc/oidc-provider.ts:53-73 — profile processing requires sub and a resolved name, with optional userinfo, so claim shape still affects callback success. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/oidc-provider.ts#L53)
- packages/auth/env.ts:36-52 — V2 exposes scope, groups/name attribute overrides, force-userinfo, and token endpoint auth configuration. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L36)
- apps/docs/docs/advanced/single-sign-on/index.mdx:197-211 — the supported OIDC knobs and nested claim paths are documented, but there is no Cloudflare response-flow fix documented. — [source L197](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L197)

**Remaining / follow-up:** Verify the Cloudflare Zero Trust authorization-code flow end to end against the reported Entra configuration, including callback query state, groups/name claims, and userinfo; add an explicit response-flow/configuration fix if the current Auth.js default is insufficient.

### #4246 — bug: download client sorting only on client side

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4246) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** Download-client sorting still happens after the integration has fetched/limited data, so newest or oldest ordering cannot reliably select records outside the first page and large qBittorrent lists remain expensive.

**Conversation (6 comments read):** The report explains that the widget fetches the first 50 torrents and sorts only those, making newest items missing when they are outside that slice. It also describes a qBittorrent instance with thousands of torrents where raising the limit causes memory trouble. The maintainer agreed that server-side sort/filter and the listtorrents endpoint are needed; no later fix was found.

**V2 evidence:**

- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:30-34 + qBittorrent listTorrents receives a limit before the widget sorts results. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L30)
- packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts:41-64 + the integration maps returned records, including added timestamps, without requesting an upstream added-time order. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/qbittorrent/qbittorrent-integration.ts#L41)
- packages/widgets/src/downloads/component.tsx:319-322 + the widget query applies a fetch limit. — [source L319](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L319)
- packages/widgets/src/downloads/component.tsx:421-429 + sorting is performed on the already returned client-side array. — [source L421](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/downloads/component.tsx#L421)
- packages/integrations/src/download-client/deluge/deluge-integration.ts:33-40 + 54-76 + Deluge has no upstream limit in this path and is sliced after mapping, showing the same absence of a general server-side ordering contract. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/download-client/deluge/deluge-integration.ts#L33)

**Remaining / follow-up:** Add an integration-level sort/filter contract that executes before pagination/limit, or use qBittorrent listtorrents with the requested sort and bounded page. Keep result memory bounded for large installations and cover both qBittorrent and Deluge behavior.

### #4190 — bug: Cannot integrate with OMV, Invalid system information response

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4190) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The OMV response-validation failure needs the actual payload to determine whether it persists in V2. Current code accepts a null CPU model name, but other system fields remain strict and the failing field was not identified.

**Conversation (7 comments read):** The reporter identified OMV 7.7.17-1 on a Raspberry Pi, with a successful connection test but a system-information schema error, and suspected null CPU values. Maintainers requested Discord debugging; another user suggested admin credentials. No failing payload or confirmation of that workaround appears in the seven comments.

**V2 evidence:**

- packages/integrations/src/openmediavault/openmediavault-integration.ts:30-53 — the integration safe-parses system information and returns the exact Invalid system information response error on schema mismatch. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L30)
- packages/integrations/src/openmediavault/openmediavault-types.ts:3-20 — the schema requires version, numeric CPU/load fields, string memory fields, uptime, rebootRequired, and availablePkgUpdates. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L3)
- packages/integrations/src/openmediavault/openmediavault-integration.ts:70-90 — the widget-facing mapping depends on the parsed response and does not normalize alternate OMV versions. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L70)
- packages/integrations/src/openmediavault/openmediavault-types.ts:7 + cpuModelName is already nullable; openmediavault-integration.ts:72 maps null to Unknown CPU. This contradicts a blanket claim that no null CPU response is supported, but does not establish which field failed. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L7)

**Remaining / follow-up:** Retrieve the failing System.getInformation payload and permissions on OMV 7.7.17-1, identify the exact schema mismatch, and compare it against V2. Do not label this fixed or definitely still failing solely from the generic error string.

### #4159 — bug: Tasks page does not load

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4159) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** The V2 Tasks page loads its jobs through the server-side tRPC API in the Next process, and production instrumentation starts the embedded tasks service alongside the embedded WebSocket service. This removes the old source-build assumption that a separately reachable task endpoint must answer the page request, which is the reported ECONNREFUSED path. The page remains admin-only and still depends on startup completing successfully.

**Conversation (1 comments read):** The issue reports v1.39.0 built from source in an LXC, where /manage/Tasks failed with a tRPC fetch ECONNREFUSED. The sole comment says Docker works and the failure is specific to source-only deployment. V2's runtime architecture embeds tasks in production and the page calls api.cronJobs.getJobs directly; this is a direct architectural change addressing that deployment mode. There is no current source-built LXC smoke run in this triage.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/tasks/page.tsx:23-39 — TasksPage awaits api.cronJobs.getJobs server-side and renders the result without a separate HTTP task service. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/tasks/page.tsx#L23)
- packages/api/src/router/cron-jobs.ts:17-23,59-61 — the jobs query is a local JobManager call and is protected by the admin permission. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/cron-jobs.ts#L17)
- apps/nextjs/src/instrumentation-node.ts:5-34 — production instrumentation starts embedded tasks and WebSocket services with startup error handling. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/instrumentation-node.ts#L5)
- apps/nextjs/next.config.ts:18-27,53-57 — only development aliases tasks/websocket to no-op modules; production includes the embedded runtime. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/next.config.ts#L18)

**Remaining / follow-up:** Confirm a source-built or otherwise non-Docker V2 deployment can start the embedded task service and load /manage/tools/tasks; investigate startup failures separately if the embedded service rejects readiness.

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

### #3805 — bug: cache invalidation for board settings not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3805) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 saves board settings and layouts through a unified form, invalidates board/home queries, and rehydrates canonical layout values after saving.

**Conversation (1 comments read):** The one comment was read. The report describes adding/changing layouts that appear not to persist on an ultrawide Firefox board; the maintainer attributes it to stale board details/cache invalidation rather than only the form control. V2's unified settings work directly addresses that save/invalidation path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — settings and layouts save together, canonical returned layouts reset the form, and the settings path is revalidated. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:5-22 — settled partial-settings and layout mutations invalidate getBoardByName and getHomeBoard. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L5)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the full board, detects additions/removals, and inserts projected layouts/placements. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:80-131 — layout validation enforces responsive roles, breakpoints, IDs, gutters, and the save payload. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L80)

**Remaining / follow-up:** The v2 code path is explicit, but no browser reproduction was run here. Verify persistence in the reported Firefox/ultrawide scenario after a reload and across another session.

### #3731 — Release Widget: Docker importable programs

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3731) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 corrects the screenshot's GHCR provider mapping and retains duplicate filtering, but it still treats imagegenius/immich and an existing immich-app/immich repository as different provider/identifier pairs.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter says Immich is offered as importable even though a matching repository is already configured, and that the newly imported entry does not work. The screenshots show an existing GitHub repository immich-app/immich and a Docker candidate imagegenius/immich. V2 maps ghcr.io images to GitHub Container Registry and normalizes the image before comparing it with configured repositories, improving the old provider-path error. However, alreadyImported remains an exact provider plus normalized identifier comparison, so imagegenius/immich is not considered the upstream immich-app/immich repository. That leaves the reported duplicate/identity mismatch only partly addressed; no live fetch or issue-specific regression was run.

**V2 evidence:**

- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:698-732 - Docker images are parsed into provider/identifier pairs and compared with configured repositories to set alreadyImported. — [source L698](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L698)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:744-750 - allImagesImported and anyImagesImported derive the modal's duplicate state from that pairwise comparison. — [source L744](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L744)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:806-843 - selectable results exclude alreadyImported entries, while the imported list is rendered checked and disabled. — [source L806](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L806)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:870-875 - ghcr.io now maps to gitHubContainerRegistry, while docker.io and other registries retain their own provider kinds. — [source L870](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L870)
- packages/definitions/src/release-provider.ts:53-77 - normalization strips registry prefixes and image tags/digests, but does not map imagegenius/immich to the separate immich-app/immich GitHub repository. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L53)
- reports/v2-issue-triage/source/3731.json:10-58,76 - the full report has four screenshots and no comments; the screenshots identify the existing immich-app/immich and candidate imagegenius/immich values.

**Remaining / follow-up:** Decide whether cross-provider image identity should be canonicalized or whether the import UI should clearly explain that imagegenius/immich is a different source. Add a regression case for the screenshot's GHCR image and existing immich-app/immich entry, then verify the imported source actually serves releases.

### #3704 — bug: removed integrations keep coming back

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3704) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The v2 seeding path still inserts a default integration when no row of that kind exists, so deleting the sole default can be undone by a subsequent migration/seed invocation.

**Conversation (0 comments read):** The report says integrations removed since v1.28/v1.29 reappeared after Docker upgrades and asks whether this is deliberate. There are no issue comments. The described trigger is consistent with startup migrations invoking default seeding, and the current source still has that behavior.

**V2 evidence:**

- packages/db/migrations/seed.ts:50-65 + seedDataAsync invokes default integration seeding as part of the seed routine. — [source L50](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L50)
- packages/db/migrations/seed.ts:394-444 + 421-425 + 428-434 + default integrations are checked only by kind and inserted when the count is zero; a deleted sole default can therefore be recreated. — [source L394](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L394)
- packages/db/migrations/sqlite/migrate.ts:11-18 + the SQLite migration path runs seeding during migration. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/sqlite/migrate.ts#L11)
- packages/db/migrations/postgresql/migrate.ts:12-18 + the PostgreSQL migration path also runs seeding; the behavior is not limited to a legacy driver. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/postgresql/migrate.ts#L12)

**Remaining / follow-up:** Make default seeding idempotent with a stable ownership/identity rule that respects an intentional deletion, or persist an explicit opt-out. Confirm the Docker entrypoint's upgrade sequence and test deleting each affected default followed by an upgrade migration.

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

### #3597 — bug: nexcloud integration with subpaths do not work

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3597) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 preserves a configured Nextcloud base path while constructing the DAV calendar endpoint, including trailing slashes and an already supplied DAV path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter shows tsdav resolving https://example.com/nextcloud/.well-known/basic at the host root, so a Nextcloud installation behind a subpath cannot be tested or queried through the integration. The report suggests an upstream fix or proxy workaround and was filed against 1.26.0. V2 contains a focused URL builder wired into the Nextcloud DAV client; the associated release/v2 merge (#6786) adds coverage for root, subpath, trailing-slash, and existing-DAV inputs. The direct implementation addresses the reported path loss without relying on the issue's suggested proxy workaround.

**V2 evidence:**

- packages/integrations/src/nextcloud/nextcloud-url.ts:1-12 - createNextcloudCalendarServerUrl retains the configured pathname, appends /remote.php/dav/, clears query/hash, and avoids duplicating an existing DAV endpoint. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud-url.ts#L1)
- packages/integrations/src/nextcloud/nextcloud.integration.ts:191-205 - the DAVClient receives the path-preserving URL helper result as serverUrl for all calendar operations. — [source L191](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L191)
- packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts:5-28 - focused cases verify root installations, /nextcloud subpaths, trailing slashes, and pre-existing DAV endpoints. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts#L5)
- packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts:34-38 - the integration test asserts the configured subpath is used by the client. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts#L34)
- reports/v2-issue-triage/source/linked-prs/6786.json:12,34-39 - linked PR metadata records the release/v2 merge for the focused Nextcloud subpath fix; disposition is based on the inspected source and tests.

**Remaining / follow-up:** Five direct assertions against the unmodified release/v2 URL helper passed (root, subpath, trailing slash, existing DAV endpoint, query/hash cleanup). A live Nextcloud calendar request, authentication and rendering remain untested; see RUNTIME-VALIDATION.md.

### #3407 — bug: background jittering when scrolling

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3407) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 substantially changed the board/background layout, but the source alone cannot establish that the Safari tab-return and scrolling jitter is fixed. Image backgrounds still use AppShell background attachment settings, while the board now renders through a scaled canvas and video backgrounds use a fixed video element. Those changes could alter the reported behavior, yet no source change is explicitly tied to this issue and no Safari reproduction was run.

**Conversation (7 comments read):** The report describes Safari on v1.24.0 showing a blank delay after returning from another tab and a jumpy background while scrolling. Comments ask for a reproducible board/configuration and a safe upload; the reporter says the board has no custom CSS/extensions besides Bitwarden, and another participant reports a macOS half-screen issue that went away at 90% zoom. The timeline does not document a resolution. These reports leave both browser-specific reproduction and the relationship to board settings uncertain.

**V2 evidence:**

- apps/nextjs/src/components/layout/background.tsx:9-28 — image backgrounds are still passed to AppShell with configurable position, size, repeat, and attachment properties. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/background.tsx#L9)
- apps/nextjs/src/components/layout/shell.tsx:27-35 — V2 changed the shell sizing/background minimum-height behavior to a content-sized board canvas. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/shell.tsx#L27)
- apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx:79-110 — the board now mounts a separate background-video layer and ScaledBoardCanvas/grid architecture. — [source L79](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx#L79)
- apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css:1-11,17-24 — the new viewport clips overflow during hydration and positions the scaled canvas, changing scroll/layout behavior without proving a Safari fix. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css#L1)

**Remaining / follow-up:** Reproduce the original Safari tab-switch and scroll sequence against a V2 board with image backgrounds and each attachment mode, checking blank frames, scroll position, and jitter at multiple viewport sizes.

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

### #3140 — bug: Bookmark and notebook widget not working anymore

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3140) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 has notebook save and bookmark render implementations, but their existence does not establish a causal fix for the reported stale edits, public-board failures, and deployment-specific client errors.

**Conversation (21 comments read):** The Helm report began with edits appearing unusable. Follow-ups expanded it to edits disappearing after navigation or logout, anonymous public boards going blank after reload, client exceptions, chunk-load errors, and severe slowness. Maintainers could not reproduce it; another user observed that a refresh showed the database-saved notebook value even when in-app navigation did not. A minor notebook fix (#3401) made things start working, but the reporter still needed repeated reloads and asked to close for now in August 2026 without testing a newer version. The conversation therefore contains both a core save symptom and environment/deployment symptoms.

**V2 evidence:**

- packages/widgets/src/notebook/notebook.tsx:85-116 + 126-147 + the current notebook holds editable content and invokes the update mutation, with success/error state handling. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L85)
- packages/api/src/router/widgets/notebook.ts:11-40 + the protected mutation validates the board/item and persists serialized notebook options. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/notebook.ts#L11)
- packages/widgets/src/notebook/notebook.tsx:337-370 + the editor is mounted as an actual RichTextEditor in the current code path. — [source L337](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/notebook/notebook.tsx#L337)
- packages/widgets/src/bookmarks/index.tsx:12-16 + 53-100 + packages/widgets/src/bookmarks/bookmarks-widget.tsx:39-69 + 127-206 + bookmark definitions, loading, and rendering are present. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L12), [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/bookmarks-widget.tsx#L39)
- git history around the notebook implementation + no current v2 change establishes that the Helm/public anonymous reload or stale client cache behavior from the conversation was fixed.

**Remaining / follow-up:** Verify on release/v2 with the reported Helm deployment, authenticated edit followed by navigation/logout, and anonymous public-board reload. If the stale in-app value or blank public board still occurs, trace cache invalidation and deployment chunk/version consistency; the current mutation alone does not prove those symptoms are fixed.

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

### #2861 — bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2861) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 replaces the old category/dynamic-section layout with responsive Base, Mobile, and custom layouts plus reset/projection logic, but item membership is still persisted independently per layout and can diverge across breakpoints.

**Conversation (13 comments read):** All 13 comments were read. The original report says apps and dynamic-section contents disappear or reorder at smaller breakpoints and asks why categorization must be repeated per layout. Maintainers initially described independent layouts as expected and discussed generating other sizes from a Base layout. Multiple users argued that functional categories should survive viewport changes and reported dynamic-section membership reverting. The latest screenshots reproduce the behavior on desktop Firefox; the maintainer says v2's dashboard rewrite likely fixes it as a side effect, but no reporter confirms v2. The later discussion also contains a separate request to constrain icon minimum size.

**V2 evidence:**

- packages/api/src/router/board.ts:1458-1506 — v2 provides resetLayout, projecting a non-Base layout from Base and replacing target item/section layout records. — [source L1458](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1458)
- packages/api/src/router/board.ts:2364-2468 — responsive projection remaps lanes and generates new item layouts, including each item's current sectionId, when creating/resizing a layout. — [source L2364](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2364)
- apps/nextjs/src/components/board/sections/use-section-items.ts:7-15,30-54 — rendering selects the current layout and indexes each item by that layout's sectionId, so membership is layout-specific at runtime. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/use-section-items.ts#L7)
- apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts:29-65 — drag/drop commits sectionId only on the layout being edited, leaving other breakpoint memberships untouched. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts#L29)
- packages/boards/src/context.tsx:83-87,138-147 — viewport resize selects a different layout ID, which drives the layout-specific section index. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/boards/src/context.tsx#L83)

**Remaining / follow-up:** Test a migrated v1 board with categories/dynamic sections across every configured breakpoint, including edits followed by resize and refresh. If the requirement is invariant functional membership, v2 needs shared section membership or automatic synchronized updates; Base reset/projection alone does not guarantee it.


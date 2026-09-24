# Integration requests

17 issues. See [complete report](../REPORT.md) and [methodology](../README.md).

### #6847 — feat(plex): media releases widget should list newly added episodes, not seasons

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6847) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The Plex media-releases integration still fetches /library/recentlyAdded, which returns season records and cannot surface new episodes added to an existing season. The proposed episode endpoint PR is open and not in v2.

**Conversation (0 comments read):** The requester demonstrates that Plex episode records have newer addedAt timestamps while Homarr's recentlyAdded response contains older season records. They propose querying the show-library episode endpoint, mapping SxxExx details, and using addedAt instead of originallyAvailableAt for recently-added semantics. Related historical issues are listed. PR #6848 proposes this change but is open/unmerged and has no v2 ancestor.

**V2 evidence:**

- packages/integrations/src/plex/plex-integration.ts:159-170 + getMediaReleasesAsync still requests /library/recentlyAdded. — [source L159](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L159)
- packages/integrations/src/plex/plex-integration.ts:212-229 + the current mapper accepts season/episode records returned by that endpoint but does not enumerate episodes in each show library. — [source L212](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L212)
- packages/integrations/src/plex/plex-integration.ts:306-323 + MediaRelease schema supports generic type/date fields, but no show-episode query or addedAt-specific mapping exists here. — [source L306](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/plex/plex-integration.ts#L306)
- reports/v2-issue-triage/source/linked-prs/6848.json:triage_merge_commit_is_ancestor_of_v2 + false; the proposed /library/sections/{id}/all?type=4&sort=addedAt:desc implementation is not present in release/v2.

**Remaining / follow-up:** Query show-library episodes (or a Plex recently-added episode hub), sort by addedAt, map grandparent/season/episode/title, and cover grouping/fallback behavior. Update tests and preserve token/auth handling.

### #6803 — feat: Add support for Unraid Storage Pools

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6803) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2's Unraid GraphQL query and schema still cover array disks only; they do not request or map array caches/storage pools.

**Conversation (0 comments read):** No comments were present. The request specifies the Unraid GraphQL caches fields (id, name, device, size, status, temp, fsSize, fsFree, fsUsed, type, isSpinning) and asks for array plus pool/pool-only support while tolerating null filesystem fields. Cross-reference #5538 is a related missing-data bug, not evidence of a v2 implementation.

**V2 evidence:**

- packages/integrations/src/unraid/unraid-integration.ts:84-121 — the GraphQL query requests array.state, capacity.disks, and array.disks fields, with no array.caches selection. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84)
- packages/integrations/src/unraid/unraid-types.ts:21-40 — the parsed array schema contains capacity.disks and disks only; there is no caches/pools object. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L21)
- packages/integrations/src/unraid/unraid-integration.ts:36-67 — mapped system information is built from the existing array.disks path and cannot expose pool records. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/widgets/src/health-monitoring/system-health.tsx:210-225 — the health UI formats the existing disk data but has no storage-pool data source. — [source L210](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L210)

**Remaining / follow-up:** Add version-tolerant GraphQL caches/pools query fields and nullable schema/mapping, then render and test array, cache-only, and null filesystem cases. Do not close this from the #5538 reference.

### #6644 — feat: add GPU charts to Beszel System Stats widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6644) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** Beszel data types include GPU metrics and another grid widget shows an aggregate GPU value, but the Beszel System Stats historical chart widget still has no GPU option or GPU panels.

**Conversation (3 comments read):** The request defines initial GPU utilization, used VRAM, power draw, and multi-GPU support, with temperature deferred until a historical field is confirmed. A comment says the initial scope is implemented in #6645, but that PR is still open and not an ancestor of v2. A later comment also requests disk temperature, which remains a follow-up. The current v2 System Stats UI therefore cannot be credited from the unmerged PR.

**V2 evidence:**

- packages/integrations/src/beszel/beszel-types.ts:194-209 + the integration type model contains GPU utilization, memory, temperature, power, and related fields. — [source L194](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-types.ts#L194)
- packages/request-handler/src/beszel.ts:25-39 + the current request mapping reduces the data to an aggregate gpu value for the request handler. — [source L25](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/beszel.ts#L25)
- packages/widgets/src/beszel-system-stats/index.ts:45-72 + System Stats options contain CPU/memory/disk/network/docker choices but no GPU chart option. — [source L45](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel-system-stats/index.ts#L45)
- packages/widgets/src/beszel/_shared/stats-view.tsx:44-53 + 118-176 + 277-370 + visibility, series mapping, panel counts, and rendered panels omit GPU historical charts. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/stats-view.tsx#L44)
- packages/widgets/src/beszel-system-grid/component.tsx:245-257 + aggregate GPU percentage in a different widget is not the requested System Stats chart implementation. — [source L245](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel-system-grid/component.tsx#L245)
- reports/v2-issue-triage/source/linked-prs/6645.json:triage_merge_commit_is_ancestor_of_v2 + false; the initial-scope PR is open/unmerged and cannot establish a v2 fix.

**Remaining / follow-up:** Merge or reimplement the GPU utilization/VRAM/power/multi-GPU historical panels in System Stats, confirm the historical GPU temperature source, and decide separately on disk temperature. Do not treat aggregate grid GPU display or Custom Widgets as native completion.

### #6614 — feat: Add Quven integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6614) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Quven integration, definition, native widget, or registered client. The explicit integration exports and widget registry contain no Quven module. A Custom Widget can call an external API for a particular Quven deployment, as the issue discussion suggests, but that is generic extensibility and does not provide native server status, users, media/library data, authentication, or onboarding.

**Conversation (1 comments read):** The issue requests a Quven self-hosted media-server integration showing server status, users, media, and library information. The sole comment notes that Quven is new and recommends trying V2 Custom Widgets or building an integration. No comment or timeline entry records a native implementation, and no source evidence shows one in the release/v2 tree.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — the native integration export list has no Quven client. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/widgets/src/registry.ts:64-100 — the explicit native widget loader registry has no Quven module or Quven widget. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)
- packages/definitions/src/integration.ts:470-530 — media-library/reverse-proxy definitions are present, but no Quven integration definition or onboarding metadata exists. — [source L470](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L470)

**Remaining / follow-up:** Add a native Quven API/auth integration and matching widgets for the requested server, user, media, and library data, or document a bounded Custom Widget recipe once Quven's API is stable.

### #6254 — feat: aMule

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6254) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native aMule integration definition, client, creator, widget mapping, or documentation.

**Conversation (0 comments read):** The issue body and its zero comments were read. The requester links the aMule project, says its built-in API exposes the data, asks for an integration, and says they will not contribute it. The current v2 registry contains many download clients, but no aMule entry or native implementation. A generic app link or Custom Widget could expose a user-specific endpoint, yet it does not provide the requested selectable native integration and widget behavior.

**V2 evidence:**

- reports/v2-issue-triage/source/6254.json:10-88 — the complete request was read; it identifies aMule, its project URL, API availability, and no comments or contributor implementation.
- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry includes supported download clients but no amule/aMule integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the creator map is exhaustive over IntegrationKind and has no aMule factory or client import. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/integrations/src/index.ts:1-49 — exported native integrations list no aMule implementation for widgets or API consumers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/widgets/src/registry.ts:1-40 — widget registration is tied to concrete widget kinds and integration support, with no aMule widget entry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)

**Remaining / follow-up:** Add an aMule integration kind, authenticated API client and response contract, relevant widget options/rendering, integration mapping, permissions, and documentation. A generic link or Custom Widget remains a workaround rather than native support.

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

### #6152 — feat: re-open: add Wazuh  #3765

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6152) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Wazuh integration, widget, API client, or Wazuh definition. The native integration registry exports many monitoring and security-adjacent services, but neither definitions nor widgets contain Wazuh data types or procedures. A Custom Widget could call an external endpoint for a particular deployment, but it does not provide the requested native dashboard graphs, authentication, or Wazuh-specific data model.

**Conversation (2 comments read):** The issue reopens an earlier request for a Wazuh SIEM widget. Comments ask for a breakdown, and the reporter requests Wazuh statistics, alert summaries, and Docker/vulnerability graphs arranged alongside calendar/system stats. No comment records implementation or a narrowed accepted feature, and no linked PR is present. The current tree confirms the request remains an integration gap.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — the native integration exports include monitoring/security-related clients but no Wazuh integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-530,636-641 — the integration definitions include PeaNUT and Traefik around the relevant categories, with no Wazuh kind or onboarding metadata. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/widgets/src/registry.ts:64-100 — the explicit native widget registry contains no Wazuh module or Wazuh widget loader. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)

**Remaining / follow-up:** Define the Wazuh API/auth contract and native integration, then add configurable alert, agent, vulnerability, and container/statistics widgets with permission and error handling.

### #5387 — feat: Pushover Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5387) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Gotify and ntfy notification integrations but no native Pushover integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter asks for a Pushover notification integration; the maintainer requests details and receives no follow-up implementation specification. The issue was reopened by cleanup history, not fixed.

**V2 evidence:**

- packages/integrations/src/index.ts:22-25 — notification exports include Gotify and NTFY but no Pushover integration. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L22)
- packages/definitions/src/integration.ts:344-360 — the notification integration definitions contain ntfy and gotify only. — [source L344](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L344)
- packages/integrations/test/volumes/usenet/sabnzbd.ini:275-294 — the only Pushover references are Sabnzbd fixture settings, not Homarr integration code. — [source L275](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/test/volumes/usenet/sabnzbd.ini#L275)

**Remaining / follow-up:** Implement a native Pushover integration with token/user secrets, request validation, notification action semantics, and documentation.

### #4563 — feat: Generic Game Server Status Widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4563) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 still provides only a Minecraft-specific server status widget and has no native Gamedig/generic game-server integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter requests a generic Gamedig-backed widget supporting hundreds of games and calls out Valheim, Terraria, and Vintage Story, with status, map, players, version, and configurable icon. The comments reinforce a native generic integration rather than a custom endpoint.

**V2 evidence:**

- packages/definitions/src/widget.ts:20-25 — the widget registry includes minecraftServerStatus but no generic game-server status kind. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget.ts#L20)
- packages/widgets/src/minecraft/server-status/index.ts:7-24 — the only server-status definition accepts title, domain, and isBedrockServer for Minecraft. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/index.ts#L7)
- packages/widgets/src/minecraft/server-status/component.tsx:14-44,65-115 — rendering and API query are Minecraft-specific, including Minecraft icon/player semantics. — [source L14](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/component.tsx#L14)
- packages/integrations/src/index.ts:1-50 — integration exports contain no Gamedig or generic game-server integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)

**Remaining / follow-up:** A native generic game-server protocol/client and widget remain unimplemented. Custom API/Custom Widget extensibility would not satisfy this native integration request.

### #4562 — feat(integrations): support music media type for seerr

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4562) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The native Overseerr/Seerr integration still models only movie and TV request media. Request methods, search discriminated unions, request parsing, and statistics schemas all omit music/Lidarr types. The issue's proposed upstream support was still draft/unfinished in the conversation, and no linked merged PR supplies a V2 implementation. A generic Custom Widget cannot extend the native request schema or make the music filter work.

**Conversation (10 comments read):** The report describes Jellyseerr/Seerr with the preview music feature and Lidarr producing a media-request parsing error because Homarr handles only movie and TV. Comments initially suggest the change should be easy, then note the upstream API is unfinished; the maintainer declines accepting an unknown type until the upstream contract is stable. The final discussion points to upstream PR #2132 still being draft and asks the reporter to retag when it lands.

**V2 evidence:**

- packages/integrations/src/overseerr/overseerr-integration.ts:69-90 — series information and request APIs accept only mediaType movie or tv. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L69)
- packages/integrations/src/overseerr/overseerr-integration.ts:393-423 — search parsing is a discriminated union for tv, movie, and person, with no music result. — [source L393](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L393)
- packages/integrations/src/overseerr/overseerr-integration.ts:425-465 — request and stats schemas enumerate movie/tv and expose movie/tv counts only. — [source L425](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/overseerr/overseerr-integration.ts#L425)
- packages/integrations/src/interfaces/media-requests/media-request-types.ts:27-39 — the shared MediaRequest type remains restricted to movie and tv. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/media-requests/media-request-types.ts#L27)

**Remaining / follow-up:** Wait for a stable Seerr/Jellyseerr music API, then extend integration interfaces, validation, request/search handling, stats, widget labels, and tests without treating unknown upstream types as valid movie/TV data.

### #3786 — feat: automatic service discovery

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3786) · **Integration requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 discovers Docker/Homepage-labeled services and offers assisted reconciliation, but does not automatically maintain a persistent discovered-services section/widget.

**Conversation (1 comments read):** The one comment was read. The request asks Homepage-style Docker labels for name, icon, href, group, description, integrations, and a discovered-services widget/section with filtering. V2 adds label discovery and onboarding/reconciliation workflows, which cover much of the data ingestion but require review/apply steps.

**V2 evidence:**

- packages/docker/src/labels.ts:1-21 — v2 defines homarr.* labels and Homepage-compatible group/name/href/icon/description labels. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/labels.ts#L1)
- packages/docker/src/discovery/parse-container-labels.ts:37-67 — labeled containers become typed discovered services with app, integration, widget, board, grouping, icon, description, and health metadata. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/parse-container-labels.ts#L37)
- packages/docker/src/discovery/list-discovered-containers.ts:17-40,50-67 — discovery enumerates running containers per Docker host and returns services. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/list-discovered-containers.ts#L17)
- packages/api/src/router/docker/docker-reconciliation.ts:18-33,40-127 — reconciliation compares discovered containers with persisted apps/integrations and produces candidates/next actions rather than silently creating dashboard entries. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-reconciliation.ts#L18)
- apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx:69-85,115-228 — the v2 UI exposes an admin review inbox and explicit create/setup/review actions. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx#L69)

**Remaining / follow-up:** The code does not create a continuously populated runtime discovered-services widget/section or the requested automatic filter. Confirm whether onboarding/admin-assisted setup is an accepted replacement; otherwise the persistent discovery presentation remains open.

### #3696 — feat: Integration for Scrutiny

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3696) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no native Scrutiny integration or Scrutiny-backed SMART dashboard in the v2 source. Existing Synology SMART fields and generic/custom widget facilities do not implement this requested integration.

**Conversation (4 comments read):** The requester wanted Scrutiny hard-drive information in a health widget or a native SMART overview because an iframe was not usable. Commenters questioned whether Scrutiny's export API was ready; maintainers applied a decision tag pending API feasibility. A later comment suggested using Beszel when it gained SMART values, but no decision or implementation for Scrutiny followed.

**V2 evidence:**

- packages/definitions/src/integration.ts:46-56 + integration definitions require a concrete native definition and integration kind; no Scrutiny definition exists in the current registry. — [source L46](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L46)
- packages/definitions/src/integration.ts:686-687 + IntegrationKind is derived from the registered definitions, so the absence of Scrutiny here means it cannot be configured as a native integration. — [source L686](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L686)
- packages/definitions/src/integration.ts:689-725 + the current integration category/definition list contains no Scrutiny entry. — [source L689](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L689)
- apps/docs/docs/integrations/synology/index.mdx:35 + the existing SMART documentation is for Synology and does not expose Scrutiny. — [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/synology/index.mdx#L35)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:47-69 + Custom Widgets and Workshop are extensibility mechanisms, not evidence of a built-in Scrutiny integration. — [source L47](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L47)

**Remaining / follow-up:** Decide whether Scrutiny's API is sufficient, then add a native integration and widget/data mapping for the requested SMART values. Beszel or a custom widget can be a separate alternative, but does not close this native integration request.

### #3512 — feat: Add Support for Homey API Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3512) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native Homey integration, Homey widget, or Homey integration kind; its existing Home Assistant support and generic Custom Widgets do not fulfill this native request.

**Conversation (6 comments read):** All 6 comments were read. The requester asks for Homey device/capability status and possibly actions/flows through the bearer-token REST API, and offers to contribute or provide access. Maintainers point to existing Home Assistant support and explain that integrations/widgets rely on entity IDs, while the requester later says Homey's device model is more complex and does not produce a completed PR. The final comment only supplies a sample device payload and asks whether maintainers would develop it. There is no later implementation or maintainer confirmation.

**V2 evidence:**

- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry contains Home Assistant and other supported services but no Homey definition, so Homey cannot be selected/configured as an integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the exhaustive integration creator map has no Homey factory and is checked with satisfies Record<IntegrationKind, ...>. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/widgets/src/registry.ts:1-40 — widgets are registered against concrete widget kinds and integration mappings; no Homey widget is registered in the v2 registry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)
- packages/definitions/src/integration.ts:266-275 — the existing Home Assistant entry demonstrates the separate native smart-home integration the requester was comparing against. — [source L266](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L266)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:111-119 — the release lists supported Assistant service tooling but does not announce Homey support. — [source L111](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L111)

**Remaining / follow-up:** A native Homey integration would need a registered kind, authenticated API client, device/capability and action schemas, widget configuration/rendering, permissions, and documentation. A generic Custom Widget can be a user workaround but is not evidence that this native integration request is addressed.

### #3064 — feat(integrations): store sessions for emby / jellyfin

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3064) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** The requested stored authentication session is not implemented for Emby or Jellyfin. Jellyfin's session polling still calls getApiAsync on every request; with username/password that method constructs a client and authenticates it on each call. Emby still sends its API key on each session request. A reusable encrypted Redis SessionStore exists, but neither integration consumes it and the base Integration class does not attach one.

**Conversation (3 comments read):** The issue asks Homarr to stop querying Emby/Jellyfin authentication repeatedly, reduce user-activity log noise, and invalidate a stored session when credentials change. Comments note that Emby may not support the desired API-key flow and that Jellyfin's SDK behavior could be tricky; the reporter suggests using a Jellyfin API key. That suggestion is a credential workaround, not the requested cached username/password session, and no conversation entry establishes implementation of the store.

**V2 evidence:**

- packages/integrations/src/jellyfin/jellyfin-integration.ts:81-89 — every current-session poll obtains a new API client through getApiAsync. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/jellyfin/jellyfin-integration.ts#L81)
- packages/integrations/src/jellyfin/jellyfin-integration.ts:238-250 — username/password authentication runs inside getApiAsync for every call; only API-key configuration avoids that authenticate call. — [source L238](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/jellyfin/jellyfin-integration.ts#L238)
- packages/integrations/src/emby/emby-integration.ts:115-128 — Emby session polling issues a fresh HTTP request with the API key each time. — [source L115](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L115)
- packages/integrations/src/base/session-store.ts:59-109; packages/integrations/src/base/integration.ts:35-57 — generic encrypted, fingerprinted session storage exists but is not wired into the integrations/base class. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/session-store.ts#L59), [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/integration.ts#L35)

**Remaining / follow-up:** Wire a credential-fingerprinted session into Jellyfin and Emby where their clients support it, clear it when secrets change, and verify polling no longer re-authenticates; document API-key behavior separately.

### #2362 — feat: wake on lan widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2362) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** There is no native Wake-on-LAN widget or integration in the V2 source. The integration export list contains media, networking, storage, and UPS integrations but no WOL or UpSnap client, and the integration definitions likewise have no WOL kind. A generic Custom Widget can make HTTP requests, but that does not supply the requested native discovery, configuration, or LAN wake behavior.

**Conversation (5 comments read):** The issue asks for a widget that sends Wake-on-LAN to remote machines. Discussion considers a command or network configuration, an UpSnap integration, and the difficulty of documenting UpSnap's API; the maintainer prefers a self-hosted WOL application when possible. A later comment observes that visiting a reverse-proxied domain can wake a machine, but that is an incidental proxy behavior and not a Homarr feature. No comment or timeline entry establishes a merged native implementation.

**V2 evidence:**

- packages/integrations/src/index.ts:1-49 — all native integration exports are listed here; there is no Wake-on-LAN, WOL, or UpSnap integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/definitions/src/integration.ts:500-507,524-530 — the relevant categories define PeaNUT and Traefik but no WOL integration kind. — [source L500](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L500)
- packages/integrations/src/index.ts:51-67 — exported native data interfaces do not include a WOL action or machine-wake contract. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L51)

**Remaining / follow-up:** A native integration/widget needs a safe server-side WOL action, target configuration and authorization model, and a reachable network path; an external UpSnap service could be supported separately if its API contract is stable.

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

### #2160 — feat: Two proxmox on one TAB

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2160) · **Integration requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** A single Health Monitoring widget now renders every selected Proxmox integration, addressing the report that choosing two standalone hosts displayed only the first.

**Conversation (2 comments read):** The reporter clarified in two comments that they wanted two separately configured Proxmox hosts in one widget rather than needing two widgets. They did not explicitly require merged totals or one synthesized Proxmox cluster. V2 maps all selected cluster integrations into panels within the same widget.

**V2 evidence:**

- packages/widgets/src/health-monitoring/component.tsx:18-42 — v2 partitions selected integrations and maps every clusterIntegrationId to a ClusterHealthMonitoring panel, including multiple panels in a scroll area. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L18)
- packages/widgets/src/health-monitoring/component.tsx:44-64 — advanced mode can show system health beside the collection of cluster panels and compact mode exposes system/cluster tabs. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L44)
- packages/api/src/router/widgets/health-monitoring.ts:64-77 — the cluster query is still made per integrationId, with no aggregate Proxmox endpoint. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/health-monitoring.ts#L64)
- packages/integrations/src/proxmox/proxmox-integration.ts:25-50 — each Proxmox integration continues to fetch its own resources. — [source L25](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/proxmox/proxmox-integration.ts#L25)

**Remaining / follow-up:** Confirm with the two standalone Proxmox servers. Per-host panels remain separate within the widget; aggregated totals were not an explicit requirement in this conversation.


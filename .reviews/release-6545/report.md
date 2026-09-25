# PR #6545 review

[PR #6545](https://github.com/homarr-labs/homarr/pull/6545), reviewed head `0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52`, base `c92e074a6f5d2f7698c33b6c925a27c21aeb5aae` (`feat/onboarding-rebuild`). Live refs were checked after the delta review; the PR remains open.

**Recommendation: request changes before release.** Ten findings: one P1, seven P2, two P3. This review made no product changes, commits, pushes or merges.

All **2,459 current changed paths** are covered. Eighteen sequential GPT-6 Luna MAX pieces covered the original 2,443-path snapshot at `4843c2c6`; a nineteenth covered the 79-path newer-head delta (16 additional unique paths). Manifest reconciliation found zero missing current paths. Review used the [review-agent skill](/home/habs/.codex/skills/.system/review-agent/SKILL.md) and the requested minimal-code principles; speculative, pre-existing and intentional changes were excluded.

## Findings

### [P1] Keep legacy request data redacted before building the migration prompt

[packages/api/src/router/custom-widget/legacy-migration.ts:105](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/packages/api/src/router/custom-widget/legacy-migration.ts#L105)

The prompt now includes legacy query/body values and displayConfig. Downstream redaction is heuristic: opaque credentials under unrecognized keys (for example `sid`) survive. The admin-only migration query returns this prompt to the calling model through MCP with no API-enforced confirmation, so using migration can disclose a legacy session identifier to the provider. Prior behavior redacted all query/body values and omitted displayConfig.

### [P2] Reject credentials in public branding image URLs

[packages/server-settings/src/index.ts:34](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/packages/server-settings/src/index.ts#L34)

The new URL validator accepts `https://user:password@host/logo.png` by checking only the protocol. Public `serverSettings.getBranding` returns these settings, exposing embedded credentials to unauthenticated callers. Reject non-empty URL username/password fields.

### [P2] Reset source setup values when the imported widget changes

[apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts:45](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts#L45)

When widgets A and B have identical sources, replacing A with B preserves A's edited credentials because setups is memoized only from sources and the reset effect does not run. The file-import page's global paste handler can replace the pending widget while the dialog is still mounted. Importing B then submits/persists A's secrets under B's source IDs, authorizing B using credentials entered for A.

### [P2] Route global creation to a supported page

[packages/spotlight/src/modes/command/global-group.tsx:65](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/packages/spotlight/src/modes/command/global-group.tsx#L65)

“Create something” is exposed to board/app/integration creators on every route, but its handler only sets create=true on the current pathname. Only the boards, user groups and invites pages consume it. On app/integration pages and dashboard routes, selecting the command silently does nothing. Route to a supported creation action or scope the command to supported contexts.

### [P2] Enforce the search budget for the new native provider

[apps/workshop/homarr_provider.go:28](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/apps/workshop/homarr_provider.go#L28)

Changing the default from DeepSeek to GPT-6 Luna selects OpenAI native search under OpenRouter's default auto engine. The sanitizer's max_uses=3 is ignored by non-Anthropic native search, so it no longer enforces the intended per-request search ceiling; the separate top-level budget is not pinned. Multi-search requests can exceed the cap and incur additional charges. Use an engine that honors the limit or enforce the supported server-tool budget and sanitize overrides. This conclusion follows the request payload and [OpenRouter's server-tool contract](https://openrouter.ai/docs/guides/features/server-tools/web-search), independently checked by the parent; no paid provider call was made.

### [P2] Explain the MySQL conversion prerequisite in Docker upgrades

[apps/docs/docs/getting-started/installation/docker.mdx:27](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/apps/docs/docs/getting-started/installation/docker.mdx#L27)

The updated Docker guide says v1-to-v2 migrations run automatically and no separate procedure is needed. MySQL is no longer supported in v2; the new MySQL-to-SQLite guide requires conversion before upgrading. Existing MySQL users following the generic Docker instructions can deploy v2 against an unsupported database. Qualify the claim and link the conversion prerequisite.

### [P2] Verify volume ownership before removing the selected container

[tools/homarr-dev/internal/tui/actions.go:323](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/tools/homarr-dev/internal/tui/actions.go#L323)

The TUI pairs name-discovered containers with `${container.Name}_data` volumes without checking mounts, then force-removes the container before deleting the volume. A manually recreated/bind-mounted `homarr_<name>` container can be paired with a leftover matching volume it does not own; confirming data deletion removes that unrelated container. Reuse the mount/immutable-ID check already used by CLI data deletion.

### [P2] Delete only the API key owned by the browser-check run

[scripts/browser-agent/ux-coherence-happy-paths.sh:240](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/scripts/browser-agent/ux-coherence-happy-paths.sh#L240)

If the browser script fails after setting cleanup pending but before capturing its created key ID, fallback cleanup deletes every key absent from the baseline. Another user's concurrently created key is included and revoked. Preserve only an explicitly identified owned key; do not infer ownership from a list difference during failure cleanup. Root independently verified the pending/create/ID-capture/EXIT-trap flow; the script was not run.

### [P3] Keep keyboard focus aligned after filtering boards

[apps/nextjs/src/components/board/board-switcher.tsx:130](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/apps/nextjs/src/components/board/board-switcher.tsx#L130)

Typing while a board card is focused resets activeIndex to zero but leaves focus on that card. If it still matches the filter, Enter activates it although a different first result is highlighted. Move focus to the search input or active result after filtering.

### [P3] Match Weather's documented defaults to the widget

[apps/docs/docs/widgets/weather/index.tsx:39](https://github.com/homarr-labs/homarr/blob/0ab84fbb3b0a57db4c19fe48d6d6e8ba8bb13e52/apps/docs/docs/widgets/weather/index.tsx#L39)

The metadata adds humidity with default yes and changes city/forecast defaults from no to yes. All three runtime defaults are false. These rendered configuration references misstate fresh-widget behavior; restore the actual defaults.

## Completed prerequisite and current CI

Fumadocs PR #6822 was synchronized with release/v2, its published schema updated, 20 focused tests passed, current CI passed, and it was merged into release/v2 as `4843c2c6796113e271491db9ce0b79a519326655`. The subsequent release review is read-only; PR #6545 itself was not merged.

At the current reviewed head, Fast gate, database gate, CodeQL, amd64/arm64 preview builds, multi-platform publishing and Workshop validation/publishing succeeded. No failing checks were returned. Migration execution and image/container smoke jobs were skipped on this head; they are not newly passed checks. [CI run](https://github.com/homarr-labs/homarr/actions/runs/36084655940), [Workshop run](https://github.com/homarr-labs/homarr/actions/runs/36084655843).

## Verification boundaries

This was a complete source-diff review, not exhaustive runtime acceptance. Generated assets, catalogs, migration fixtures, locale data and lockfiles received structural checks; substantive code and text diffs were read with relevant callers/tests.

Three narrow parent probes supplemented the review:

- The legacy migration prompt retained a dummy opaque `sid` twice, in query/body data. The tested implementation blob matches the reviewed code. No provider call was made.
- A harmless `javascript:` popup probe did not execute under the exact `noopener,noreferrer` sink in Chromium; a control without those features executed. The suspected iframe XSS was rejected. This is not cross-browser proof.
- The exact legacy SQLite CREATE TABLE statement succeeded in in-memory SQLite 3.45.1 and created both foreign keys. The suspected missing-comma failure was rejected.

No broad tests, new builds, live external integration/provider calls, live Carbon/PostHog acceptance, or full database-upgrade run were performed during this review. Earlier prerequisite tests/CI are separate evidence. Routine PR CI no longer gates the removed broad board-interaction E2E scenarios.

## Coverage

| Piece | Area | Paths | Result |
|---|---|---:|---|
| 01 | Database | 81 | No findings |
| 02 | Auth, validation, core | 43 | P2 branding URLs |
| 03 | API and HTTP routes | 196 | P1 migration prompt |
| 04 | Custom Widgets package | 82 | No findings |
| 05 | Board frontend | 87 | P3 keyboard focus |
| 06 | Assistant/Workshop frontend | 60 | P2 import credentials |
| 07 | Application pages | 234 | No findings |
| 08 | Application shell | 65 | No findings |
| 09 | Widgets A | 189 | No findings |
| 10 | Widgets B | 152 | No findings |
| 11 | Integrations/services | 172 | No findings |
| 12 | Shared UI/Spotlight | 132 | P2 create command |
| 13 | Workshop/backend/image | 24 | P2 search budget |
| 14 | Docs application | 165 | No findings |
| 15 | Docs content/build | 445 | P2 MySQL guidance; P3 defaults |
| 16 | CLI/converter | 161 | P2 deletion ownership |
| 17 | Registry/translations | 65 | No findings |
| 18 | CI/deployment/config | 90 | P2 key cleanup |
| 19 | Newer-head delta | 79 | No findings |

The 79 delta paths overlap original coverage; they are not added to the unique-file total. Detailed evidence and per-piece limitations are preserved in [coverage notes](coverage-notes.md).

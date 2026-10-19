# Worker UX rebuild — 19 October 2026

Base `916d609e8`, branch `feat/headless-hono-backend`. This request supersedes the earlier dialog-based worker UI in `architecture-followup.md`.

## Required behavior

- Keep the normal Homarr app and one headless worker. Rebuild the added worker surfaces around inline mobile-friendly forms/actions; no worker-management modal dialogs.
- Each active board-link row has a direct Copy action and feedback. Fetch an existing share token only on explicit owner action, through the encrypted channel; copying never renews or widens access.
- Simplify MCP to explicit Read only / Read and actions modes, automatic eligible current-integration/native-tool scope, duration and one approval action. No per-tool checklist; omit full/arbitrary-HTTP scope from these bundles. Existing approvals remain explicit, bounded and revocable.
- Show the worker address as connection information. Editing it belongs to an intentional connection-change action, not a routine required field. Keep the trusted worker identity pinned and preserve explicit worker replacement.
- Clarify that a worker URL grants no data access. A deliberately created board share is a separate read-only bearer capability for its selected boards. Hosted MCP remains an explicitly approved client that can read approved arguments/results; the relay remains blind.

The user explicitly requested the main agent after compaction or GPT6.1SolMAX. A fresh GPT6.1SolMAX UI agent owns the coherent rebuild from `/tmp/homarr-worker-ux-rebuild-brief-20261019.md`; the lead owns integration, validation and deployment. Backend authorization work uses the previously approved medium agent. Impeccable Operate guidance and incumbent Mantine styling remain applicable; the user's inline requirement takes precedence over prior dialog guidance.

## Approved sharing acceptance completed

The user explicitly approved the previously blocked localhost test. Actual browser proof passed: only the empty `qa-medium-share-20261019` board was shared; a fresh viewer had no editing controls, an unshared-board route was denied, revocation immediately removed the live board, and reopening the revoked link failed. The temporary share was revoked and the board deleted. Existing boards/users were preserved. Evidence `/tmp/homarr-single-worker-public-share-qa-20261019.md`; no token URLs in the report.

The check also found a viewer board-switcher error and irrelevant management entries. Correct their UI without relaxing the management API's authorization or exposing unshared preview/user metadata.

## Worker exposure audit

Read-only source probes returned200 only for health/live and health/ready. Raw API/RPC/access/bootstrap/pairing routes returned404; `/remote/connect` required WebSocket upgrade. Capability admission is followed by the pinned encrypted handshake and current signed claim/invitation/device-grant authorization. Changing a transport URL cannot change the trusted identity. Relevant owners: `apps/worker/src/server.ts`, `transport.ts`, `packages/remote-protocol/src/protocol.ts`, and `packages/worker-client/src/connection.ts`.

New owner-only encrypted GET `/remote/access/shares/:id` returns `{share:{id,token,expiresAt}}`. It validates current owner, share/bearer/viewer kind, signature and live grant ancestry, and returns the original expiry. Nonowner, revoked/expired/ancestor-revoked and nonshare grants fail. Responses are no-store. Three focused cases passed60 assertions across worker-access and the actual encrypted worker fixture; scoped typechecks passed.

## Completed implementation

The normal management app now has one Worker page with Connection, Users, Sharing and MCP tabs. User creation, invitations, password/session controls, board links, revocation, connection changes and replacement confirmations are inline. Connection shows a read-only address with Copy address and an intentional Change connection action; changing transport keeps the worker identity pinned.

Every active board-link row offers on-demand Copy link with feedback and a selectable fallback if clipboard permission fails. The owner-only encrypted endpoint returns the original share token without extending its authority. Viewer headers omit management/worker controls and use a bounded native board selector when more than one board is shared.

MCP offers Read only / Read and actions, duration, one consent and Enable. It selects eligible current integrations/tools automatically, excluding full/arbitrary-HTTP/admin paths; future integrations require updating access. One enabled summary offers Copy link, Change access and Disconnect. Hosted MCP is optional; dashboards and local users continue without a cloud account.

## Access-change recovery

Hosted storage retains encrypted retiring approvals separately from its unique current routing approval. Activation records the exact predecessor, cancels superseded in-flight work, and transactionally requires the original live pending record and unexpired grant after relay verification. A canceled pending approval cannot be recreated by a delayed activation.

Replacement activates and confirms the new grant before retiring old worker permissions. Lost responses reconcile authoritative metadata. Disconnect/rollback first stop current routing while retaining cleanup metadata, then revoke the worker grant, then remove the hosted record. Reload reconstructs unfinished cleanup. Rollback restores only the exact valid predecessor; normal disconnect never falls back to older approvals. Account/worker changes make no cross-context cleanup calls and do not revoke an activation whose commit status is uncertain.

## Acceptance and deployment

- Source browser acceptance passed inline account/invitation/removal, sharing creation/copy after reload, clipboard-denial fallback, read-only viewer isolation, live public-share revocation and360px layouts. Temporary users, links and boards were removed. Evidence: `/tmp/homarr-inline-worker-ui-qa-20261019.md`.
- Actual signed grants and encrypted relay calls passed first Enable, read/actions replacement, precommit failure preserving previous access, committed-response loss recovery, persistent-store restart, interrupted disconnect and cleanup retry after reload. All task service grants and hosted approvals were removed. Evidence: `/tmp/homarr-inline-mcp-qa-20261019.md`.
- Four new focused backend MCP regressions passed78 assertions; scoped frontend/platform/worker typechecks, owned lint/format and both final review axes passed. The owner-only Copy endpoint's three focused cases passed60 assertions.
- Scoped accessibility passed light17 checks/dark19 checks with zero violations. The final Impeccable source detector returned zero findings; its regex coverage supplements rendered/browser checks.
- Rebuilt and deployed frontend, worker and platform. Five existing demo services are healthy at `https://brainzilla.llama-stonecat.ts.net:8445/manage/workers`; data/key volumes preserved. A separate temporary demo owner rendered the normal dashboard and rebuilt pages with no runtime errors, dialogs or360px overflow; its invitation/grant were subsequently revoked and reconnect denied. The base worker URL now returns404 without an incorrect HTTP redirect. Private raw RPC/access/bootstrap requests return404.
- Source QA processes, disposable broker state, root browser profiles and temporary authority were cleaned up. Original boards, accounts, user access and the older8443 demo remain.

Current images (storage bytes, not RAM): frontend `681eb8978b9dece37e57ca7499fe892194f8707d0aa44d4cbe05cfa92a244609`363,427,111; worker `05b2257cae67d8c117c4a89c38232b5eb2c49a6c918bc99ffa6d75d44e278f96`128,817,554; platform `919d99f1ce71bde019170ec8548cc8a952d8da69d6562fd05e4af0d112319ca0`95,404,503.

No live GitHub/OAuth sign-in, homarr.dev deployment, public image publication, external security audit or broad suite was performed for this UX pass. Context7 reached its monthly quota; installed Mantine9.6 declarations and official Mantine documentation were used after reporting that limitation.

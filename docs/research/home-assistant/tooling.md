# Home Assistant: tooling research (skills + libraries)

Date: 2026-11-06. Nothing was installed.

Gotcha: `npx` run from the repo root fails with `npm error Override without name: @ai-sdk/provider-utils>undici` (repo-level npm overrides). Run `skills` / `ctx7` from a neutral directory such as `/tmp`.

## A) Agent skills

Searched with `npx skills find "home assistant" | "homeassistant" | "smart home"`. skills.sh is a client-rendered page, so a webfetch returned no listing; the CLI results are the source of truth. Repo stats from `gh repo view`.

| Skill                                                                   | Source repo (stars, last push)                 | Installs | What it does                                                                                        | Useful for HA API code / dashboard design?                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `home-assistant-best-practices`                                         | homeassistant-ai/skills (948★, 2026-10-29)     | 9K       | Official-org (homeassistant-ai) skill for writing HA config: automations, helpers, scripts, naming. | Mostly user-side YAML/config conventions. Low value for a TypeScript client. Best-reputation candidate. |
| `Home Assistant Automation`                                             | claude-office-skills/skills (566★, 2026-01-31) | 5K       | Generic automation/YAML recipes in an office-skills pack.                                           | No. Stale, generic.                                                                                     |
| `mcp-hass`                                                              | aahl/skills (164★, 2026-09-15)                 | 3.2K     | Controls HA through an MCP server.                                                                  | No. About driving a user's HA, not building an integration.                                             |
| `hass-builder`                                                          | aahl/skills                                    | 1.6K     | Builds HA configuration.                                                                            | Marginal.                                                                                               |
| `home-assistant-dashboards-cards`                                       | bradsjm/hassio-addons (46★, 2026-07-11)        | 731      | Lovelace dashboards and cards.                                                                      | Marginal for Lovelace; Homarr builds its own UI, so we don't need Lovelace card authoring.              |
| `home-assistant-entities-services`                                      | bradsjm/hassio-addons                          | 669      | Entities and services (domains, `call_service` concepts).                                           | Possibly useful as a domain primer, but small and low-star.                                             |
| `home-assistant-automation-scripts`, `-esphome`, `-integrations-addons` | bradsjm/hassio-addons                          | 614–782  | Automations, ESPHome, add-ons.                                                                      | No.                                                                                                     |

Verdict: no skill targets the REST/WebSocket client API or app-side dashboard design for external clients. The only reputable one is `homeassistant-ai/skills@home-assistant-best-practices`, and it covers HA-side configuration. Skip all of them. Context7 (below) plus the primary docs cover what we need.

## B) Library docs (Context7, no quota errors)

Context7 IDs used:

- `/home-assistant/developers.home-assistant` (High reputation, 5697 snippets): API docs
- `/home-assistant/home-assistant-js-websocket` (High reputation, 444 snippets): not queried; README and source were read directly
- Also available: `/home-assistant/core`, `/home-assistant/home-assistant.io`

Three doc queries were used. Query 1 returned only the auth flow, not the compressed state format, so that part comes from the library source (cited below).

### WebSocket auth flow

Source: developers.home-assistant `docs/api/websocket.md`.

1. Connect to `ws(s)://<host>/api/websocket`.
2. Server sends `{"type":"auth_required","ha_version":"..."}`.
3. Client sends `{"type":"auth","access_token":"<long-lived token>"}`.
4. Server replies `auth_ok` (or `auth_invalid` and then disconnects).
5. Command phase: every message must carry an integer `id`. Replies are `{"id", "type":"result", "success", "result"}`.

### `subscribe_entities` compressed format

Source: `lib/states.ts` in home-assistant-js-websocket. The developer docs queried did not describe it, so treat the wire format as semi-internal.

Message is `{"type":"subscribe_entities"}`. Events carry:

- `a` (add, a map of `entity_id` to state): `{ s: state, a: attributes, c: context (string id or object), lc: last_changed (epoch seconds), lu: last_updated (epoch seconds) }`. The first event is a full snapshot of `a`.
- `r` (remove): array of `entity_id`.
- `c` (change, a map of `entity_id` to diff): `{ "+": Partial<{s,a,c,lc,lu}>, "-": { a: string[] } }`. Merge `+` into the existing state and delete the attribute keys listed under `-.a`.
- A change for an unknown entity should be ignored or trigger a resync.
- Timestamps are epoch seconds (multiply by 1000).
- A new subscription after reconnect replaces state; the library does `replace=true` on the first event.

### REST: call service with `return_response`

Source: developers.home-assistant `docs/api/rest.md`.

- `POST /api/services/<domain>/<service>` with an optional JSON body (service data).
- Without `?return_response`, the response is an array of states changed during the call.
- With `?return_response` (bare flag), the response is `{ "changed_states": [...], "service_response": { "<entity_id>": {...} } }`. This works only for services that support responses, for example `weather.get_forecasts`. Others return an error.
- Auth header: `Authorization: Bearer <token>`.

### Registry and listing commands (WebSocket)

Source: developers.home-assistant `docs/frontend/custom-ui/custom-strategy.md` and `docs/api/websocket.md`.

- `config/area_registry/list`, `config/device_registry/list`, `config/entity_registry/list`: each sent as `{id, type}`, with the full list in `result`.
- `get_states`, `get_services`: `{id, type}`, full dumps.
- The registry commands are WebSocket-only; there is no REST equivalent. REST offers `GET /api/states`, `GET /api/services`, `GET /api/config`, and `POST /api/template` (which can read areas via Jinja, for example `area_entities()` or `areas()`).

### Library: `home-assistant-js-websocket` (v9.8.1, last published 2026-10-29)

Source: `npm view` plus the repo README (https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/README.md).

- Official library from the `home-assistant` org (the one the HA frontend uses). Apache-2.0. Context7 reputation: High.
- Zero dependencies, ~207 KB unpacked, ESM (`"type": "module"`, `module: dist/index.js`) plus a UMD build. No `engines` field in the registry output.
- Provides: `createConnection`, `createLongLivedTokenAuth(url, token)`, `subscribeEntityStates` (handles the compressed format above), `subscribeConfig`, `subscribeServices`, `callService(conn, domain, service, data?, target?, returnResponse?)`, `getStates`, `getServices`, `getConfig`, generic `sendMessagePromise`, `subscribeMessage`, `getCollection`.
- Auto-reconnect with resubscribe, `suspend`, `close`, and `ready` / `disconnected` / `reconnect-error` events.
- Errors: `ERR_CANNOT_CONNECT`, `ERR_INVALID_AUTH`, `ERR_CONNECTION_LOST`, and others. Options include `setupRetry` and `connectTimeout`.

Node usage (README "Using this in NodeJS"):

- The README says Node has no built-in WebSocket and recommends polyfilling `ws`: `globalThis.WebSocket = require("ws")` (with `@types/ws` for TypeScript).
- The README text is outdated for current runtimes: Node 22+ ships a global `WebSocket` (this machine runs v24.16.0), so no polyfill is needed there. The built-in `createSocket` relies on `WebSocket` being a global. I did not run an end-to-end connection test.
- Alternative: pass your own `createSocket` (`(options) => Promise<WebSocket>`), which must return an already-authenticated socket. This is only needed for custom TLS (self-signed certificates) or proxy control; `ws` supports `rejectUnauthorized`, the global WebSocket does not. Many HA instances use self-signed or internal CAs, so this matters for Homarr.
- Long-lived tokens: `createLongLivedTokenAuth(hassUrl, token)` then `createConnection({ auth })`.

## Recommendation

1. Use `home-assistant-js-websocket` on the server for live data (state subscription and registries). It is official, dependency-free and tiny. It already handles the awkward parts a hand-rolled client would get wrong: the compressed `subscribe_entities` diff format (which is not formally documented), reconnect and resubscribe, auth failure semantics, and tracking message ids.
2. Pin the exact version, since the compressed-state format is semi-internal and the library is the maintained reference implementation. Wrap it behind a small Homarr integration class so it can be swapped.
3. Use `createSocket` with `ws` only if we need to honor self-signed certificates. Otherwise rely on Node 22+'s global WebSocket. Check the Node version Homarr ships before dropping the polyfill.
4. Keep REST for one-shot calls. `POST /api/services/...?return_response` and `GET /api/states` are enough for polling-style widgets and service calls. Registry data (areas, devices, entities) requires WebSocket; the alternative is `POST /api/template`.
5. Do not write a minimal client ourselves unless connection lifecycle in Homarr's tasks/websocket servers conflicts with the library's collections. That is more code than the 207 KB dependency saves. Do not stay REST-only if we want areas/devices or live updates.
6. Skip all the agent skills listed above.

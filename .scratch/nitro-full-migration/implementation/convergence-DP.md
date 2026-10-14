# Convergence DP — disposable build / public-fresh boot plan

## Decision and scope

The current source supplies a plausible ordinary isolated validation path: candidate build into a new external root, direct generated Bun entry with explicit version-1 configuration, first real request initializing the fresh SQLite owner, public SSR/settings/cookie probes, then TERM and awaited process exit. Nothing below was executed. Clean focused lint/typechecks and final artifact inspection remain prerequisites, not results.

This is **public-fresh validation**, not authenticated application, jobs, restore, restart, CLI, Linux native-binary parity or production acceptance. No Cloudflare account, tunnel, local Mac, Redis, nginx, Docker daemon or external provider is required by this tranche. Use a supported self-hosted POSIX machine with the already-installed declared dependencies and Bun 1.4.2; Node 24.18.0 is needed by existing build tools. Do not install anything to make a failed build pass.

Only this new report is written. Ordinary source/configuration/manifests/migration assets and the requested `evening-D-deployment.md`, `evening-D-implementation.md`, `evening-H-implementation.md` were read. No shell commands, builds, checks, application/native/SQL execution, network services, real data, secrets, dotenv files, protected listeners, generated output, sealed evidence or nested agents were used.

## Current source, not historical assumptions

| Source                                                                           | Finding relevant to this run                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build-nitro-candidate.sh:4–62`                                          | Accepted activation and an absent absolute root are mandatory. Frontend builds first with `--configLoader native`; migration/CLI bundles and SQL/meta assets are then staged under that root. Server entry, public directory, bundles and journals have postconditions. It does not migrate a DB or package repaired startup wrappers.                                                                         |
| `apps/nitro/vite.config.ts:36–115`                                               | Build root is exclusively created 0700 before Nitro preparation; its ancestors must be physical directories. Root is disjoint from checkout, `/appdata` and explicitly supplied data fences. Nitro build/output, Vite cache and router temporary files stay under it. Both dotenv loaders are disabled; production route generation is disabled. Frozen routes and `src/route-tree.gen.ts` must already agree. |
| `apps/backend/nitro.config.ts:5–10`                                              | Bun preset selects the replacement `server/entry.ts`, not a second stock listener. Backend/contracts are requested as bundled dependencies.                                                                                                                                                                                                                                                                    |
| `apps/backend/src/server/startup-configuration.ts:121–251`                       | Exactly one `--homarr-host-config=<absolute JSON path>`; strict version 1, literal loopback, matching canonical HTTP origin, empty base path, SQLite **fresh only**. **`epochInitializationTimeoutMs` is now mandatory**, although the older H example omitted it.                                                                                                                                             |
| `apps/backend/server/entry.ts:7–60`                                              | Config is validated before transport allocation. One manual listener, `reusePort: false`, no proxy trust or built-in signal owner. Bound message explicitly does not assert application readiness. TERM/INT fence transport; the owning flow awaits host close, transport close and Nitro close hooks.                                                                                                         |
| `apps/backend/src/server/host.ts:12–63`, `runtime-composition/runtime.ts:69–150` | First real Fetch retains one initialization; main persistence and epoch are awaited before application publication. Initialization failure is retained, not retried or replaced with foundation-only state.                                                                                                                                                                                                    |
| `apps/nitro/src/entry-server.tsx:3–16`, `src/ssr/render.tsx:11–106`              | SSR uses the host's constructor-derived prepared renderer. Bootstrap includes actual prepared SQL settings, request culture/clock, anonymous principal, setup state and `homarr.public-resource-preparation.v1` revision.                                                                                                                                                                                      |
| `runtime-composition/assembly.ts:86–174`, `public-rpc.ts:8–45`                   | `/api/health` still labels itself `public-foundation`, but now performs main-owner readiness SQL after native epoch initialization. Only `serverSettings.getCulture` and `serverSettings.getBranding` are admitted backend leaves. Health alone is not full-product coverage.                                                                                                                                  |

Manifests pin Nitro `3.0.260903-beta`, Vite `8.1.4`, srvx `1.0.5`; existing dependencies already include all tools used below. Root/package default start/dev still select protected default output/port paths and must not be invoked.

## Fresh schema, seed and epoch: exact ownership/order

Do **not** pre-run `artifact/scripts/migrate-nitro.mjs` for this boot. That wrapper creates/seeds the target, after which the current startup loader refuses its existing path. The public-fresh host itself is the migrator and initializer:

1. `runtime-composition/persistence.ts:36–68` opens the configured unopened runtime, migrates schema, invokes content migration with explicit `seedDataAsync(database, { allowMockIntegration: false, demoMode: false })`, checks genuine readiness SQL, and verifies no user and onboarding `start`.
2. `packages/db/runtime.ts:151–241` reserves the absent DB with exclusive `wx` creation and mode 0600, opens Bun SQLite with `create: false`, applies the explicit Drizzle SQL journal, seeds through scoped admission, and applies the five statically imported custom migrations. Neither DB path nor migrations directory needs an environment fallback.
3. `packages/db/migrations/seed.ts:39–61,287–381` explicitly persists onboarding and all eight known setting keys. Known initial values include culture `en`, appearance `auto`, branding app name `Homarr` and local/null image settings, null global home-board IDs, and source board/user booleans. Seed subsequently sets the search default to the newly seeded Homarr Docs search-engine ID; do not expect that setting to remain null. Demo user creation is disabled.
4. `runtime-composition/native-main-persistence.ts:216–235,271–325` waits for schema/content/readiness before initializing epoch. It combines actual startup and resource-lifetime signals, derives a finite deadline from the explicit timeout, calls `initializeRuntimeStateEpochAsync` on the same native runtime, and publishes ready only after the returned epoch and currentness checks.
5. `packages/db/runtime-state.ts:271–303` uses the real bounded SQLite transaction: metadata id 1 must exist; id 2 must have a null epoch. Sentinel `homarr-runtime:uninitialized:v1` is atomically replaced by a generated UUID with `RETURNING`; a valid already-initialized epoch is adopted rather than regenerated. Missing rows/table, invalid epoch, expired/aborted operation or ambiguous COMMIT fail; there is no DDL fallback.

**The suggested “fresh target missing runtime migrations” blocker is not present in the source reviewed here.** `packages/db/migrations/sqlite/0049_robust_gateway.sql:1–38` creates meta/state/history tables and inserts both required metadata rows; its entry is journal idx 49, timestamp `1791712104288` (50 SQLite entries). PostgreSQL has corresponding `0017_ambitious_roughhouse.sql`, but that does not make this fresh SQLite-only host a PostgreSQL host. Candidate packaging copies these current SQL files and metadata after the frontend build.

Settings readers (`packages/db/proxy-reader.ts:31–53`, API `routers/-settings-setup/settings.ts:23–40`) have source-default fallbacks. Therefore an `en`/`Homarr` HTTP response alone cannot prove persistence. The stopped-DB verification below requires the actual serialized rows and migration/epoch state, with no default substitution. Current config exposes no custom seed-settings option; do not invent one or inject private settings via environment. If nondefault marker settings are required later, that is an explicit fresh-seed contract change, not a prerequisite for this default-seed smoke.

## Gates and minimal fixes, not work performed

- **Clean source gate:** coordinator freezes the reached source and route tree; runs the existing backend/Nitro lint and typecheck entries in a sanitized environment. No old typecheck count is a current clean result. No build while types remain dirty.
- **Artifact closure gate:** SSR still forces `@homarr/backend/host` and backend source paths external in `apps/nitro/vite.config.ts:121–129`. This is a risk, not proof of a final external import: Nitro may bundle the intermediate externals. Before boot, inspect only the newly produced server graph for escaped checkout paths, unresolved workspace imports, dependency symlinks and duplicate host/config singletons. If escaped host imports remain, the minimal compiler proposal is to remove those two forced SSR external entries and ensure the existing final Nitro bundling retains one host/config owner; preserve Bun/native builtins. Rebuild at another absent root, never compensate with a checkout/node_modules symlink or copy of the source tree. Do not claim relocatability before that gate passes.
- **Historical config correction:** add `epochInitializationTimeoutMs: 10000` to the example; no product-source change is needed for that requirement. It bounds the epoch operation only, not the whole migration/startup or shutdown.
- **Packaging/deployment blocker:** `Dockerfile:35–68` does not supply the newly mandatory build root and copies obsolete default output locations. `scripts/run-nitro.sh:53–72` pre-migrates, selects `/app`/`/appdata`, and omits the mandatory config argument. Compose still uses reusable data and legacy environment inputs. They cannot execute this path unchanged. Minimal deployment proposal: builder supplies a new external build root and copies its artifact; direct launcher forwards the explicit host-config argument and lets fresh host own migration once. Existing-data production/restart support requires a separately reviewed loader branch accepting `existing`, validating a private regular DB and preserving migration-history checks; never weaken the fresh absence check or blindly accept any existing file. None of those changes is needed to run the direct disposable fresh artifact below, and none is implemented here.
- **Browser harness blocker:** `apps/nitro/tests/public-browser.ts:3,41` hardcodes protected port 3200 and obsolete foundation-preview copy. Do not run it. If hydration validation is requested, change that existing harness to require an explicit loopback origin rejecting 3100/3200 and assert current disposable-preview/prepared-bootstrap behavior. No new tests/dependencies are required or proposed.
- **Egress gate:** an allowlisted environment is not network isolation. Coordinator must impose deny-external egress on build/runtime and any later browser, allowing only the chosen fixture origin for probes. Do not start without that containment. Default seed persists external links/icons/integration URLs and widget options; `demoMode: false` is not an offline switch. Current assembly does not enroll jobs, integrations, analytics or private media, so keep those slots unmounted and use only public preview routes/local assets. Do not expand this smoke to board widgets, URL proxies, scans, Docker sockets or provider APIs. Any blocked outbound attempt is a reported failure, not silent success.

## Proposed ordinary sequence — execute only after those gates

These are future commands, not executed evidence. Use a dedicated owning Bash session started with `--noprofile --norc` and an allowlisted environment. Coordinator supplies explicit absolute `REPO`, `BUN`, `TOOL_PATH`, and an existing owned **physical/canonical** temporary `PARENT` outside the checkout and `/appdata`. `TOOL_PATH` contains the existing Bun/Node and ordinary shell tools only. Do not use symlinked `/tmp` or `/var` spellings where a physical `/private/...` path is required. Paths inserted into JSON must contain no quotes, backslashes or control characters. No production environment values are needed by this public path.

### 1. Allocate and build

```bash
set -euo pipefail
umask 077
RUN=$(mktemp -d "$PARENT/homarr-dp.XXXXXXXX")
mkdir "$RUN/data" "$RUN/config" "$RUN/home" "$RUN/tmp" "$RUN/records"
BUILD="$RUN/build-work"
ARTIFACT="$BUILD/artifact"
DB="$RUN/data/main.sqlite"
CONFIG="$RUN/config/host.json"
cd "$REPO"
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" NODE_ENV=production HOMARR_NITRO_ACTIVATION=accepted HOMARR_NITRO_BUILD_ROOT="$BUILD" HOMARR_NITRO_DATA_ROOT="$RUN/data" "$BUN" --no-env-file run build:nitro:candidate >"$RUN/records/build.log" 2>&1
```

Root `build:nitro:candidate` invokes the reviewed script. No `DB_URL`, auth key, provider key, proxy, `_FILE`, `SKIP_ENV_VALIDATION`, `CI`, `TEST`, demo flag or dotenv wrapper is supplied. If current imports demand an unexpected environment variable, stop and identify that source dependency; do not inherit production values. A failed build leaves its root intact; a new attempt gets a new root. Require candidate postconditions and the fresh artifact closure gate before continuing. This smoke does not invoke the packaged CLI or migration wrapper.

### 2. Configure and boot once

Immediately before launch, check the host's socket inventory for the selected port. **3220 is merely the example, not checked or reserved here.** If occupied, choose another nonprotected port and update both JSON fields/origin together; no fallback. A precheck cannot eliminate the bind race; `reusePort: false` must make a collision fail. The following commands assume 3220 passed that check.

```bash
ORIGIN=http://127.0.0.1:3220
cat > "$CONFIG" <<JSON
{
  "version": 1,
  "listener": { "hostname": "127.0.0.1", "port": 3220 },
  "host": {
    "baseUrl": "$ORIGIN",
    "basePath": "",
    "persistence": {
      "engine": "sqlite",
      "mode": "fresh",
      "path": "$DB",
      "migrationsFolder": "$ARTIFACT/db/migrations/sqlite",
      "epochInitializationTimeoutMs": 10000
    },
    "localeMutationBodyLimit": 4096
  },
  "culture": { "timeZone": "UTC" }
}
JSON
test ! -e "$DB"
test ! -L "$DB"
cd "$RUN"
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" NODE_ENV=production "$BUN" --no-env-file "$ARTIFACT/server/index.mjs" "--homarr-host-config=$CONFIG" >"$RUN/records/boot.log" 2>&1 &
PID=$!
trap 'if kill -0 "$PID" 2>/dev/null; then kill -TERM "$PID"; wait "$PID"; fi' EXIT
```

Config and parent are private/UID-owned, data parent private/UID-owned, all paths canonical/nonsymlinked. Migration assets are already present outside the data parent. Boot working directory is the disposable run, not checkout; no `NITRO_HOST`/`NITRO_PORT` can override the JSON. Wait at most 10 seconds for the exact bound message in the new boot log while confirming this child remains alive; binding or timeout failure ends the run. Do not interpret that message as readiness. Coordinator's owning supervisor must retain the child and enforce a separate finite whole-run/shutdown budget; entry has no implemented 30-second shutdown deadline.

### 3. Probe actual behavior, not hashes

Send the health request **once** after binding; it triggers native initialization. A failed initialization is terminal for this process. Do not loop failed requests to manufacture readiness.

```bash
probe() {
  env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" curl --disable --noproxy '*' --connect-timeout 2 --max-time 10 "$@"
}
probe --max-time 30 --fail-with-body -sS "$ORIGIN/api/health" -o "$RUN/records/health.json"
probe --fail-with-body -sS -D "$RUN/records/root.headers" "$ORIGIN/" -o "$RUN/records/root.html"
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" DP_ORIGIN="$ORIGIN" DP_RECORDS="$RUN/records" "$BUN" --no-env-file -e '
import { readFileSync } from "node:fs";
const origin = process.env.DP_ORIGIN;
const records = process.env.DP_RECORDS;
const health = JSON.parse(readFileSync(`${records}/health.json`, "utf8"));
if (health.status !== "ready" || health.scope !== "public-foundation") throw new Error("Native readiness failed");
const html = readFileSync(`${records}/root.html`, "utf8");
const match = html.match(/<script\b[^>]*id="homarr-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
if (!match || !html.includes("Disposable display preview")) throw new Error("Prepared SSR missing");
const bootstrap = JSON.parse(match[1]);
if (bootstrap.snapshot.session.kind !== "anonymous" || bootstrap.snapshot.setup.kind !== "required" || bootstrap.snapshot.locale !== "en" || bootstrap.snapshot.renderRevision !== "homarr.public-resource-preparation.v1" || bootstrap.culture.resolved.source !== "configuration" || bootstrap.culture.resolved.defaultLocale !== "en" || bootstrap.culture.translation.timeZone !== "UTC" || bootstrap.colorScheme !== "auto" || bootstrap.routing.origin !== origin || bootstrap.publicSettings.branding.appName !== "Homarr") throw new Error("Unexpected prepared SSR state");
const assets = [...bootstrap.assets.css.map(asset => asset.href), ...bootstrap.assets.js.map(asset => asset.href), "/logo/logo.png"];
if (bootstrap.assets.entry) assets.push(bootstrap.assets.entry);
for (const path of new Set(assets)) {
  const url = new URL(path, origin);
  if (url.origin !== origin || url.username || url.password) throw new Error("Nonfixture asset");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10000) });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !/javascript|text\/css|image\/png/i.test(type)) throw new Error("Missing or misrouted static asset");
  await response.arrayBuffer();
}
console.log("Native readiness, prepared public SSR and local assets passed");
' >"$RUN/records/ssr-assets.log"
```

Require health JSON `status: ready`, `scope: public-foundation`; the label is deliberately not expanded into full-app readiness. Require root HTTP 200, actual rendered disposable collection preview and `homarr-bootstrap`, not merely any HTML. Parse bootstrap and assert anonymous session, setup `required`, locale/default locale `en`, configured culture source on the cookieless request, timeZone `UTC`, color scheme `auto`, correct origin, prepared revision, branding `Homarr`, local logo/favicon selection and source settings. Request each bootstrap CSS/JS/entry URL and logo only after checking it resolves to exactly this origin; require successful non-HTML asset responses and appropriate content types. No CDN/font fetch. Root display items are synthetic UI fixtures, not DB-backed app-feature proof; original Inter parity remains unavailable.

Probe the two actual leaves using the declared client rather than guessed wire JSON. Run from the existing Nitro workspace solely to resolve its installed client dependency; the server remains outside the checkout:

```bash
cd "$REPO/apps/nitro"
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" DP_ORIGIN="$ORIGIN" "$BUN" --no-env-file -e '
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
const origin = process.env.DP_ORIGIN;
const client = createORPCClient(new RPCLink({ url: `${origin}/rpc`, method: "POST", fetch: (request, init) => {
  let target = request;
  if (request instanceof Request) target = request.url;
  if (new URL(target).origin !== origin) throw new Error("Unexpected RPC origin");
  return fetch(request, { ...init, redirect: "error", signal: AbortSignal.timeout(10000) });
} }));
const culture = await client.serverSettings.getCulture();
const branding = await client.serverSettings.getBranding();
if (culture.defaultLocale !== "en" || branding.appName !== "Homarr") throw new Error("Unexpected seeded public settings");
console.log(JSON.stringify({ culture, branding }));
' >"$RUN/records/rpc.json"
```

Locale and denial checks stay on the same listener:

```bash
test "$(probe -sS -c "$RUN/records/locale.cookies" -D "$RUN/records/locale.headers" -o "$RUN/records/locale.body" -w '%{http_code}' -H "Origin: $ORIGIN" -H 'Content-Type: application/json' --data '{"locale":"de"}' "$ORIGIN/api/preferences/locale")" = 204
probe --fail-with-body -sS -b "$RUN/records/locale.cookies" "$ORIGIN/" -o "$RUN/records/de.html"
test "$(probe -sS -o "$RUN/records/manage.html" -w '%{http_code}' "$ORIGIN/manage")" = 401
test "$(probe -sS -o "$RUN/records/locale-denied.body" -w '%{http_code}' -H 'Origin: http://127.0.0.1:1' -H 'Content-Type: application/json' --data '{"locale":"de"}' "$ORIGIN/api/preferences/locale")" = 403
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" DP_RECORDS="$RUN/records" "$BUN" --no-env-file -e '
import { readFileSync } from "node:fs";
const records = process.env.DP_RECORDS;
const headers = readFileSync(`${records}/locale.headers`, "utf8");
if (!/set-cookie: homarr\.locale=de;[^\r\n]*Max-Age=31536000/i.test(headers) || !/Path=\//i.test(headers) || !/SameSite=Lax/i.test(headers)) throw new Error("Locale cookie missing");
const html = readFileSync(`${records}/de.html`, "utf8");
const match = html.match(/<script\b[^>]*id="homarr-bootstrap"[^>]*>([\s\S]*?)<\/script>/);
if (!match) throw new Error("Cookie SSR missing");
const bootstrap = JSON.parse(match[1]);
if (bootstrap.snapshot.locale !== "de" || bootstrap.culture.resolved.source !== "cookie") throw new Error("Cookie replay failed");
if (!readFileSync(`${records}/manage.html`, "utf8").includes("Access denied")) throw new Error("Private denial missing");
console.log("Locale cookie replay and anonymous denial passed");
' >"$RUN/records/cookie-denial.log"
```

`packages/definitions/src/cookie.ts:2` and `packages/translation/src/runtime/locale.ts:63–69` establish `homarr.locale`, Max-Age 31536000, SameSite Lax and path `/`. The commands replay only the returned synthetic cookie jar, not an invented cookie or user browser state. Require unchanged SQL default `en` after this response-only preference mutation. `/manage` must render Access denied, not a successful private page. Unknown/unmounted auth/media/private RPC paths must not succeed; a 404 means unmounted, **not authenticated authorization parity**. Curl proves neither hydration nor browser navigation; leave those unproven until the existing harness is corrected and a fresh offline browser context is used.

### 4. Shutdown, then inspect only this stopped synthetic DB

```bash
kill -TERM "$PID"
set +e
wait "$PID"
BOOT_STATUS=$?
set -e
trap - EXIT
test "$BOOT_STATUS" -eq 0
```

The owning supervisor must cap shutdown at 30 seconds. If it does not settle, record shutdown failure, terminate only this retained child and reap it; do not report graceful shutdown or start a replacement. Successful proof requires numeric zero exit, no cleanup errors and disappearance of this listener in socket inventory. Do not restart `fresh` against the created file, delete it to pretend restart works, or open a second application/migrator alongside it.

Only after the child is fully reaped, a short Bun builtin-only read-only inspection can distinguish persistent seed from HTTP fallback:

```bash
cd "$RUN"
env -i PATH="$TOOL_PATH" HOME="$RUN/home" TMPDIR="$RUN/tmp" DP_DB="$DB" DP_MIGRATIONS="$ARTIFACT/db/migrations/sqlite" "$BUN" --no-env-file -e '
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
const db = new Database(process.env.DP_DB, { readonly: true, create: false, strict: true });
try {
  const rows = db.query("SELECT setting_key, value FROM serverSetting ORDER BY setting_key").all();
  const expectedKeys = ["analytics", "appearance", "board", "branding", "crawlingAndIndexing", "culture", "search", "user"];
  if (JSON.stringify(rows.map(row => row.setting_key)) !== JSON.stringify(expectedKeys)) throw new Error("Missing persisted settings");
  const settings = Object.fromEntries(rows.map(row => [row.setting_key, JSON.parse(row.value).json]));
  if (settings.culture.defaultLocale !== "en" || settings.appearance.defaultColorScheme !== "auto" || settings.branding.appName !== "Homarr" || settings.branding.logoImageUrl !== null || settings.branding.faviconImageUrl !== null || typeof settings.search.defaultSearchEngineId !== "string") throw new Error("Unexpected persisted seed");
  if (db.query("SELECT COUNT(*) AS count FROM user").get().count !== 0) throw new Error("Fresh users unexpectedly present");
  const onboarding = db.query("SELECT step FROM onboarding").all();
  if (onboarding.length !== 1 || onboarding[0].step !== "start") throw new Error("Fresh onboarding changed");
  const meta = db.query("SELECT id, epoch FROM homarr_runtime_meta ORDER BY id").all();
  if (meta.length !== 2 || meta[0].id !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(meta[0].epoch) || meta[1].id !== 2 || meta[1].epoch !== null) throw new Error("Native epoch initialization not persisted");
  const journal = JSON.parse(readFileSync(`${process.env.DP_MIGRATIONS}/meta/_journal.json`, "utf8"));
  const ledger = db.query("SELECT created_at FROM __drizzle_migrations ORDER BY created_at").all();
  if (ledger.length !== journal.entries.length || ledger.some((row, index) => Number(row.created_at) !== journal.entries[index].when)) throw new Error("Incomplete fresh migration history");
  console.log(JSON.stringify({ settingKeys: expectedKeys, defaultLocale: settings.culture.defaultLocale, branding: settings.branding.appName, migrationCount: ledger.length, epochInitialized: true, users: 0, onboarding: "start" }));
} finally {
  db.close(true);
}
' >"$RUN/records/persistence.json"
```

This does not run migration/seed again or load application source. It decodes the stored SuperJSON JSON envelopes directly and requires rows, not reader fallbacks. Extend comparisons to the captured public settings/branding response when reviewing the record; missing/malformed envelopes are failures. The epoch is checked structurally without printing its identity. Fresh schema verification is behavioral journal completion plus the actual metadata query, not ceremony hash capture.

## Report the actual boundary

Retain the new run directory, ordinary build/boot streams, statuses and synthetic probe records; no cleanup/reuse or production cutover is proposed. Report each gate separately: clean types, candidate build, final artifact closure, bind, native/schema/seed/epoch readiness, public SSR/assets, two leaves, locale cookie, private denial, shutdown and stopped persistence. A failure stops promotion; do not mask it with environment defaults, skipped migrations, another owner, retries or old evidence. Public success does not increase private-feature coverage, certify self-hosted packaging, or authorize production data.

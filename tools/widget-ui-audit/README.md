# Homarr widget UI audit capture

`capture.mjs` drives an already running local Homarr instance with the isolated `agent-browser` session supplied by `--session`. It captures each seeded board at 1920×1080, 2560×1440, and 1512×982 CSS pixels (2× device scale for the MacBook profile), then extracts every `[data-grid-item-type="item"]` rectangle from the full-board image.

The seed extension is opt-in. Point `DB_URL` at a dedicated local database, enable `DEMO_MODE=true`, `UNSAFE_ENABLE_MOCK_INTEGRATION=true`, and `SEED_WIDGET_UI_AUDIT=true` in the local environment, then run `pnpm db:seed` after the normal database migrations. Keep the application's required secrets in the ignored local environment. The seed creates 13 public family boards, ten isolated single-instance Assistant boards, and a local Custom Widget definition. It reuses demo fixtures and does not remove existing dashboards.

Run it from the repository root after the demo database and dev server are ready:

```sh
AGENT_BROWSER_BIN=/home/habs/.local/share/pnpm/bin/agent-browser mise exec -- node tools/widget-ui-audit/capture.mjs \
  --base-url http://localhost:3001 \
  --board widget-ui-audit-network \
  --family network \
  --out tools/widget-ui-report/public
```

Repeat `--board` for a family that spans multiple boards. Pass `--no-login` when the named browser session already has an authenticated cookie. The default local demo credentials are `demo` / `demo`; override them with `--username` and `--password` without committing either value.

Output is written to `tools/widget-ui-report/public/screenshots/<family>/<viewport>/` and `manifest-<family>.json`. The manifest is a family fragment for the report merger and includes persisted grid footprints, rendered rectangles, ready/error counts, visible text samples, and same-section overlap diagnostics. `data-homarr-widget-ready` records that the widget wrapper mounted; it does not claim that remote data finished loading.

Widget images are exact rectangular crops of the full-board screenshot, using the recorded rendered bounds and device scale. This keeps individual captures consistent with the board evidence. ImageMagick (`convert`) is required for extraction; no widget pixels or layout are modified.

Use the canonical `http://localhost:3001` origin and board slugs such as `widget-ui-audit-utility`. The capture script signs in normally with the isolated demo account before visiting the boards. It never reads database session tokens. Full-page images are captured after returning to the top so sticky navigation appears in the correct position.

To recapture every family in bounded parallel batches after starting the seeded server:

```sh
AGENT_BROWSER_BIN=/home/habs/.local/share/pnpm/bin/agent-browser mise exec -- node scripts/widget-ui-audit/run-all.mjs http://localhost:3001
```

This regenerates all family fragments, assembles the report, and checks the complete matrix, PNG integrity, rendered dimensions, and blank crops. It does not run application tests.

An already authenticated, corrected family fragment can have one viewport regenerated without repeating the other two:

```sh
AGENT_BROWSER_BIN=/home/habs/.local/share/pnpm/bin/agent-browser mise exec -- node tools/widget-ui-audit/capture.mjs --base-url http://localhost:3001 --board widget-ui-audit-content --family content --viewport macbook-pro
```

The MacBook profile uses Chromium on Linux at 1512×982 CSS pixels with 2× image density; it does not claim native macOS/Safari coverage.

This audit used `agent-browser 0.34.0`. Set `AGENT_BROWSER_BIN` to that executable when multiple installations are present. The Node 24 installation also exposes 0.36.0, which produced incorrectly scaled canvas screenshots in this environment. Viewport emulation and full-board capture share one CDP session; the CLI handles navigation and normal login.

After warming lazy content, readiness polls for up to 30 seconds for the expected widget count, fonts and images, no loading/unavailable states or visible alerts, and stable geometry across three samples. `--settle-ms` adds an optional delay before polling; it does not replace readiness checks. Failed images remain diagnostic evidence. Pass `--expected-count` to enforce a family’s expected item count.

Use separate output directories for the original audit, fresh baseline, and after run. `--viewport` requires an existing family fragment with the same run, source revision, source fingerprint, and fixture revision; it replaces only that viewport and preserves other boards. A mismatch is rejected before screenshots are overwritten. Use a fresh run directory after changing source or fixtures. The complete runner overlays isolated Assistant captures into the canonical 1,800-image matrix and retains all family boards for context. A combined board can legitimately expose Assistant’s single-active-instance restriction; its diagnostic failure does not invalidate a separately captured idle Assistant crop.

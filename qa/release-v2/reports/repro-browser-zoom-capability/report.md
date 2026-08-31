# Browser zoom capability repro

Date: 2026-08-31
Target: `http://127.0.0.1:34401` (rendered login page, `/auth/login`)
Browser: Google Chrome for Testing `152.0.7977.64`
CLI: `agent-browser 0.27.0`

## Result

True browser zoom is repeatable through a disposable Manifest V3 extension
loaded by `agent-browser`. The extension calls `chrome.tabs.setZoom(tabId,
factor)` with `0.8`, `1.25`, or `2.0`.

This satisfies the requested invariant at every factor and viewport tested:

- `visualViewport.scale` stays `1`.
- CSS viewport dimensions change by the inverse zoom factor.
- `devicePixelRatio` tracks the browser zoom factor.
- The rendered `h1` bounds change with the layout.

The agent-browser `press Control+-` path is not native browser zoom. It
dispatches a page key event and left all measured values unchanged. The CLI
reference also has no direct Chrome browser-zoom command. Do not relabel
`Emulation.setPageScaleFactor`, CSS `zoom`, or viewport/device emulation as
browser zoom; those are separate mechanisms.

The provided vault login helper was attempted without reading vault metadata
or credential values. The rendered login page was sufficient for this
browser-level probe, so no product interaction or mutation was required.

## Repeatable method

1. Create a disposable extension with `tabs` permission and host permission
   limited to the candidate app. Set `ZOOM_FACTOR` to the desired value.

   `manifest.json`:

   ```json
   {
     "manifest_version": 3,
     "name": "Disposable native zoom probe",
     "version": "1.0.0",
     "permissions": ["tabs"],
     "host_permissions": ["http://127.0.0.1:34401/*"],
     "background": { "service_worker": "background.js" }
   }
   ```

   `background.js`:

   ```js
   const ZOOM_FACTOR = 1.25; // replace with 0.8, 1.25, or 2.0

   function applyZoom(tab) {
     if (tab?.id == null || !tab.url?.startsWith("http://127.0.0.1:34401")) return;
     chrome.tabs.setZoom(tab.id, ZOOM_FACTOR);
   }

   chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
     if (changeInfo.status === "complete") applyZoom({ ...tab, id: tabId });
   });

   chrome.tabs.query({}, (tabs) => tabs.forEach(applyZoom));
   ```

2. Start a fresh, uniquely named session and disposable profile. On this
   headless host, extensions require explicit `--headless=new`; keep
   `--no-sandbox` in the launch args. The non-extension baseline sessions
   used the exact `--args '--no-sandbox'` form:

   ```bash
   npx -y --package agent-browser agent-browser \
     --session zoom-extension-<factor>-<unique> \
     --profile /tmp/agent-browser-zoom-profile-<factor>-<unique> \
     --extension /tmp/agent-browser-native-zoom-extension-<factor>-<unique> \
     --headed false \
     --args '--no-sandbox,--headless=new' \
     open http://127.0.0.1:34401
   ```

3. Set the exact viewport and measure the same fixed element:

   ```bash
   npx -y --package agent-browser agent-browser \
     --session zoom-extension-<factor>-<unique> set viewport 320 568

   npx -y --package agent-browser agent-browser \
     --session zoom-extension-<factor>-<unique> eval \
     "(()=>{const e=document.querySelector('h1')||document.body;const r=e.getBoundingClientRect();const v=window.visualViewport;return {innerWidth,innerHeight,outerWidth,outerHeight,devicePixelRatio,visualViewport:{width:v?.width,height:v?.height,scale:v?.scale},fixed:{x:r.x,y:r.y,width:r.width,height:r.height}}})()"
   ```

4. Capture the screenshot, then close the session. Use a fresh profile or
   clear the disposable profile before testing another factor:

   ```bash
   npx -y --package agent-browser agent-browser \
     --session zoom-extension-<factor>-<unique> screenshot \
     /absolute/path/.screenshots/release-v2/repro-browser-zoom-capability/native-<factor>-320x568.png
   npx -y --package agent-browser agent-browser \
     --session zoom-extension-<factor>-<unique> close
   ```

The same method was run at `1920 1080`. A native extension zoom session must
be restarted when changing the factor; changing only the viewport is safe.

## Measurements

The fixed probe is the first rendered `h1` (`Log in to your account`). Bounds
are CSS pixels in `x, y, width, height` order. `outer` is the browser window
metric reported by Chromium; it is intentionally included because it stays
at the window size while the CSS viewport changes.

### 320x568 requested viewport

| Zoom | inner (W x H) | outer (W x H) | devicePixelRatio | visualViewport (W x H / scale) | fixed h1 bounds |
| --- | --- | --- | --- | --- | --- |
| 100% baseline | 320 x 568 | 500 x 711 | 1 | 305 x 568 / 1 | 87, 177, 191, 57.59375 |
| 80% native | 400 x 710 | 500 x 711 | 0.800000011920929 | 381.25 x 710 / 1 | 87.2265625, 201.23046875, 266.7578125, 28.7890625 |
| 125% native | 256 x 454 | 500 x 711 | 1.25 | 244 x 454.3999938964844 / 1 | 86.80000305175781, 176.8000030517578, 130.40000915527344, 86.4000015258789 |
| 200% native | 160 x 284 | 500 x 711 | 2 | 152.5 x 284 / 1 | 87, 177, 95.5703125, 86.390625 |

### 1920x1080 requested viewport

| Zoom | inner (W x H) | outer (W x H) | devicePixelRatio | visualViewport (W x H / scale) | fixed h1 bounds |
| --- | --- | --- | --- | --- | --- |
| 100% baseline | 1920 x 1080 | 1920 x 1223 | 1 | 1920 x 1080 / 1 | 765, 418.71875, 340.71875, 28.796875 |
| 80% native | 2400 x 1350 | 1920 x 1223 | 0.800000011920929 | 2400 x 1350 / 1 | 1005.21484375, 562.734375, 340.64453125, 28.7890625 |
| 125% native | 1536 x 864 | 1920 x 1223 | 1.25 | 1536 x 864 / 1 | 572.7999877929688, 320.20001220703125, 340.7250061035156, 28.80000114440918 |
| 200% native | 960 x 540 | 1920 x 1223 | 2 | 952.5 x 540 / 1 | 281.25, 295.3984375, 340.71875, 28.796875 |

## Negative controls

At 320x568, `press Control+-` produced no change from the 100% baseline:
`innerWidth=320`, `innerHeight=568`, `outerWidth=500`, `outerHeight=711`,
`devicePixelRatio=1`, `visualViewport=305x568`, `scale=1`, and the fixed h1
remained `87,177,191,57.59375`. The corresponding capture is
`keyboard-control-noop-320x568.png`.

Pre-seeding a disposable profile with `profile.default_zoom_level`,
`partition.default_zoom_level`, and a localhost `per_host_zoom_levels` entry
also did not alter metrics when launched through agent-browser; it is not a
reliable path here. A first extension launch without `--headless=new` exited
before CDP with a missing X server error.

## Evidence artifacts

All captures are 8-bit PNGs at the requested pixel dimensions under
`.screenshots/release-v2/repro-browser-zoom-capability/`:

- `baseline-320x568-100.png`
- `baseline-1920x1080-100.png`
- `native-80-320x568.png`, `native-80-1920x1080.png`
- `native-125-320x568.png`, `native-125-1920x1080.png`
- `native-200-320x568.png`, `native-200-1920x1080.png`
- `keyboard-control-noop-320x568.png`

No product tests, builds, Docker compilation, or E2E tests were run.

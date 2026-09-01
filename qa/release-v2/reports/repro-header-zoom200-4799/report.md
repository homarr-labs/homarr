# Standalone reproduction report — header at native 200% zoom

## Run metadata

- Candidate: `4799dd0251835d868b8123d004a6cb3ffc2c30cc`
- Main URL: `http://127.0.0.1:38637/`
- Fixture URL: `http://127.0.0.1:33469`
- Flags: `DEMO_MODE=true DEMO_READ_ONLY=false UNSAFE_ENABLE_MOCK_INTEGRATION=true`
- Persona: Avery Admin; auth-vault profile `qa-v2-s3-avery-admin` (credential values were not read or recorded)
- Browser session/namespace: `repro-header-4799-s3` / `release-v2-repro-header-4799`
- Browser profile: `/tmp/homarr-release-v2-qa-profile-repro-header-4799-s3`
- Launch: headed false, `--args '--no-sandbox,--headless=new'`, extension `/tmp/homarr-release-v2-qa-zoom-4799dd02-s3-2-repro`
- Viewport/input: requested outer `320x568`; native 200% zoom; inner CSS `160x284`; `devicePixelRatio=2`; `visualViewport.scale=1`; mouse, keyboard, horizontal wheel/drag
- Timestamp: `2026-09-01T08:20:52+02:00`–`2026-09-01T08:39:30+02:00`

## Conclusion

The original P2 is reproduced for the Account menu: it is initially outside the 160 CSS-pixel viewport, and direct pointer/touch-like horizontal gestures do not move the nested header scroller. Search, Edit board, and Board settings remain initially visible and operable. Keyboard focus and semantic activation auto-scroll the nested zone and make Account operable, so this is a moderate P2/S2 usability/accessibility issue rather than a total header failure.

## Measurements

Initial home state:

- Document: `scrollWidth=152`, `clientWidth=152`, `scrollLeft=0` — there is no document-level horizontal scroll.
- Header: `scrollWidth=153`, `clientWidth=153`, `scrollLeft=0`, `overflow-x=hidden`, box `x=0 y=0 width=152.5 height=60`.
- Rendered right header zone (`[data-zone="right"]`; the literal `.mobileZone[data-zone="right"]` selector is absent in this build): `clientWidth=115`, `scrollWidth=184`, `scrollLeft=0`, box `x=27.3047 y=7.1016 width=115.1953 height=44.7969`.
- Search box: `x=27.3047..61.3047`; Edit board: `x=73.3047..107.3047`; Board settings: `x=117.3047..151.3047`.
- Account box: `x=167.3047..205.3047`, outside the `160px` CSS viewport.

Targeted right-zone measurement, after resetting the zone to zero and setting `scrollLeft=scrollWidth`:

```text
before: clientWidth=115, scrollWidth=184, scrollLeft=0, account x=167.3047..205.3047
after:  clientWidth=115, scrollWidth=184, scrollLeft=69, account x=98.3047..136.3047
maxScrollLeft=69
document: scrollWidth=152, clientWidth=152, scrollLeft=0
header: scrollWidth=153, clientWidth=153, scrollLeft=0
```

The final screenshot shows the revealed end state: [10-right-zone-end.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/10-right-zone-end.png).

## Exact reproduction steps and actual behavior

1. Launch candidate `4799dd0251835d868b8123d004a6cb3ffc2c30cc` with the metadata above, set outer viewport `320x568`, and open `/`.
2. Log in with the named QA vault profile and wait for the seeded `qa-home-avery-admin` dashboard. Baseline: [01-home-initial.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/01-home-initial.png).
3. Mouse activation succeeded for Search (search overlay), Edit board (edit mode), and Board settings (route `/boards/qa-home-avery-admin/settings`).
4. At the initial right-zone position, Account had no mouse hit target in the visible viewport. A pointer-edge click, horizontal wheel (`dy=0, dx=200`), `scroll right 200`, and a pointer drag from `x=120` to `x=40` over the zone left `scrollLeft=0`; Account remained off-screen. Pre-scroll evidence: [05-account-before-scroll.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/05-account-before-scroll.png).
5. Retrying with semantic activation auto-scrolled the nested zone to `scrollLeft=69`, moved Account to `x=98.3047..136.3047`, and opened the account menu: [06-account-semantic-click.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/06-account-semantic-click.png). A direct mouse click then worked at the newly visible position.
6. A clean keyboard sequence focused Logo, Search, Edit board, Board settings, and Account. Focusing Account auto-scrolled the nested zone to `69`; Enter opened the menu: [07-account-keyboard.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/07-account-keyboard.png). Search and Edit board also activated with Enter; Board settings activated with Enter and reached the settings route.
7. Reloading the home page preserved authentication and returned to `/` with the seeded dashboard.

Expected: all four header controls should be visually reachable and operable at the requested viewport/zoom with ordinary pointer, horizontal touch-like scrolling, and keyboard input.

Actual: three controls satisfy that expectation immediately. Account requires the nested right-zone to be moved; ordinary wheel/drag gestures did not move it, while browser focus/semantic activation did. This reproduces the reported P2 condition.

## Non-header control distinction

The Weather `Open advanced view` entry is dashboard content, not a header action. Its DOM/accessibility box was `x=-12.5977 y=136.1641 width=137.5234 height=22` (right `124.9258`, bottom `158.1641`) inside the Weather group at `x=26 y=126.1641`. The header ends at `y=60`. It is therefore not evidence that a header control is missing or clipped; it is the separate advanced-focus trigger rendered by the widget.

## Reload and status-only checks

- Reload/session persistence: passed; remained authenticated at `/`.
- Page errors after final reload: `0`.
- Console entries after final reload: `0`.
- Network status summary after final reload: `153` requests total; `149` status `200`; `4` without response status; no non-2xx status among status-bearing requests.

## Artifacts

- Measurements: [measurements.md](/home/habs/.codex/worktrees/8ba8/homarr/qa/release-v2/reports/repro-header-zoom200-4799/measurements.md)
- Screenshots: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-header-zoom200-4799/` (`00-login.png`, `01-home-initial.png`, `05-account-before-scroll.png`, `06-account-semantic-click.png`, `07-account-keyboard.png`, `10-right-zone-end.png`; additional earlier control checks are present in the same directory)

No product source, harness files, tracked packet report, credentials, cookies, tokens, headers, or response bodies were read or modified. Only this standalone report, measurements, and regular-file screenshot evidence were written.

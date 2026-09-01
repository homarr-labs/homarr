# Standalone reproduction report: header at native 200% zoom

## Scope

- Candidate: `4799dd0251835d868b8123d004a6cb3ffc2c30cc`
- Target: `http://127.0.0.1:38637/` (fixture service `http://127.0.0.1:33469`)
- Flags: `DEMO_MODE=true DEMO_READ_ONLY=false UNSAFE_ENABLE_MOCK_INTEGRATION=true`
- Persona: Avery Admin; auth-vault profile `qa-v2-s3-avery-admin`
- Session: `repro-header-4799-s3` in namespace `release-v2-repro-header-4799`
- Input/viewport: mouse, keyboard, and touch-like horizontal wheel/drag; requested outer viewport `320x568`
- Zoom proof: native 200% extension; `visualViewport.scale=1`, `devicePixelRatio=2`, inner CSS viewport `160x284`
- Timestamp: `2026-09-01T08:20:52+02:00` to `2026-09-01T08:39:30+02:00`

## Result

Reproduced as a focused usability/accessibility issue: at the requested zoom, the Account menu is initially outside the CSS viewport and direct mouse/touch-like horizontal scrolling does not move the actual header right-zone scroller. Keyboard focus and semantic activation auto-scroll the zone and provide a workaround.

Recommended severity: P2 / S2 (moderate). Three of four header controls are visible and mouse/keyboard operable. The account control is not initially mouse/touch reachable, but keyboard navigation remains usable and the control works after the scroller is moved.

## Exact steps and observations

1. Launch the candidate with headed false, `--args '--no-sandbox,--headless=new'`, the supplied zoom extension, the isolated profile, session, and namespace above. Set the outer viewport to `320x568`. The browser reported `visualViewport.scale=1`, `innerWidth=160`, `innerHeight=284`, and `devicePixelRatio=2`.
2. Open `/`, authenticate with the named QA vault profile, and wait for network idle. The browser reached `/` and showed the seeded `qa-home-avery-admin` dashboard. Baseline: [01-home-initial.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/01-home-initial.png).
3. Measure the header and controls. Search was `x=27.3047..61.3047`, Edit board `x=73.3047..107.3047`, and Board settings `x=117.3047..151.3047`; all were within the `160px` CSS viewport. Account menu was `x=167.3047..205.3047`, outside it. The rendered right zone was `clientWidth=115`, `scrollWidth=184`, `scrollLeft=0`.
4. Mouse-test Search, Edit board, and Board settings. Search opened its search overlay ([02-search-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/02-search-mouse.png)); Edit board entered edit mode ([03-edit-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/03-edit-mouse.png)); Board settings navigated to `/boards/qa-home-avery-admin/settings` ([04-board-settings-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/04-board-settings-mouse.png)).
5. Return to `/`, place the pointer at the viewport edge, and attempt to activate the off-screen account control. There is no account hit target in the visible `160px` CSS viewport; the pre-scroll state is captured at [05-account-before-scroll.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/05-account-before-scroll.png).
6. With the pointer over the visible right zone, try a horizontal wheel (`dy=0, dx=200`), `scroll right 200`, and a horizontal drag from `x=120` to `x=40`. The right zone stayed at `scrollLeft=0`; account stayed at `x=167.3047..205.3047`.
7. Retry using semantic mouse activation. The account control auto-scrolled the right zone to `scrollLeft=69`, moved to `x=98.3047..136.3047`, and opened the account menu ([06-account-semantic-click.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/06-account-semantic-click.png)). A direct mouse click at the now-visible account position also opened the menu.
8. Reload to reset the zone and press Tab through Logo, Search, Edit board, Board settings, and Account. Each control received focus. Focusing Account auto-scrolled the right zone to its maximum `69`; pressing Enter opened the menu ([07-account-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/07-account-keyboard.png)). Search and Edit board also activated with Enter ([08-search-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/08-search-keyboard.png), [09-edit-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/09-edit-keyboard.png)); Board settings activated with Enter and reached the same settings route.
9. After a final reload, authentication persisted at `/`, and the seeded home was present. Page errors and console entries were both zero. Status-only network summary: `153` requests, `149` status `200`, `4` without response status, and no non-2xx status among responses with a status.

## Reproducibility and boundaries

The initial account clipping and `scrollLeft=0` state reproduced after clean reloads. Keyboard and semantic activation consistently auto-scrolled to `scrollLeft=69`. The Weather `Open advanced view` control is separate dashboard content at `y=136.1641`, below the header’s `y=60` bottom, and was not counted as a header control.

No product source, harness files, tracked packet report, credentials, cookies, tokens, headers, or response bodies were read or modified.

## Evidence

- Measurements: [measurements.md](measurements.md)
- Screenshots: [00-login.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/00-login.png), [01-home-initial.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/01-home-initial.png), [02-search-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/02-search-mouse.png), [03-edit-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/03-edit-mouse.png), [04-board-settings-mouse.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/04-board-settings-mouse.png), [05-account-before-scroll.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/05-account-before-scroll.png), [06-account-semantic-click.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/06-account-semantic-click.png), [07-account-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/07-account-keyboard.png), [08-search-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/08-search-keyboard.png), [09-edit-keyboard.png](../../../.screenshots/release-v2/repro-header-zoom200-4799/09-edit-keyboard.png)


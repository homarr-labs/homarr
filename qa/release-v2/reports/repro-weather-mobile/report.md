# Black-box reproduction report: `release-v2-mobile-weather-card-top-clipping`

| Field | Value |
|---|---|
| Verdict | **REPRODUCED** at 320×568; also present with less overlap at 375×812; not present at 1920×1080 |
| Date | 2026-08-31 (Europe/Berlin) |
| App | `http://127.0.0.1:34401/` |
| Fixture | `http://127.0.0.1:37273/` (not navigated; no fixture mutation was needed) |
| Build | `f57a660088d6777c86aca22977354fa8b810e2be` |
| Flags | `DEMO_MODE=true`, `DEMO_READ_ONLY=false`, `UNSAFE_ENABLE_MOCK_INTEGRATION=true` |
| Persona | Casey Chaos, seeded home board |
| Browser | Chromium via named `agent-browser` sessions; DPR 1; default 100% zoom; no visualViewport scale or pinch emulation |
| Sessions | `weather-clip-a`, then fresh `weather-clip-b` |

## Summary

At the exact 320×568 viewport, the rendered `19.3°C` current-temperature line box begins above the weather card’s clipped content window. The card has `overflow: hidden` on both axes, so the upper 15.4375 CSS/device pixels of the line box are outside the clip window. The screenshot visibly shows the top of `19.3°C` cut off.

The result reproduced after reload in Session A and again in independent fresh Session B (including Session B reload). Mouse activation and keyboard Enter activation of “Show weather details” both worked; neither changed the clipping geometry or dashboard data.

## Exact reproduction steps

1. Open `http://127.0.0.1:34401/` in a fresh named session with Chrome launch arg `--no-sandbox`.
2. Authenticate with vault profile `qa-v2-main-casey-chaos`. The vault supplied the password without exposing it; the rendered username field required the non-secret profile username `casey-chaos` to be filled before submitting.
3. Confirm the seeded `QA v2 · Home · casey-chaos` board is shown and leave the dashboard unedited.
4. Set the viewport to exactly `320×568` at the default browser zoom. Do not use device emulation, visualViewport scaling, or pinch emulation.
5. Wait for the weather card to show `19.3°C`, `Mainly clear`, `22.9°C`, `17.5°C`, and `Paris`; capture the plain and annotated screenshots below.
6. **Mouse path:** move to the visible “Show weather details” control (around `(60,196)` in the 320×568 viewport), press and release the mouse button, then press `Escape`; the details dialog opens and closes.
7. **Keyboard path:** focus “Show weather details” and press `Enter`; the same details dialog opens. Close it with `Escape`. The clipping remains visible on the card.
8. Reload the page and repeat steps 4–7. Close Session A, start fresh Session B, authenticate with the same vault profile, and repeat the 320×568 capture and input paths. Both fresh-load and reload captures show the same clipping.

## Rendered geometry

All values are viewport CSS pixels with `devicePixelRatio = 1`. “Card bounds” is the outer weather group; “clip window” is the rendered descendant with `overflow: hidden`. “Clipped area” is the rectangle intersection excluded by that clip window (line-box area, not an estimate of opaque glyph ink).

| Viewport | Weather card bounds (x, y, w, h) | Clip window bounds (x, y, w, h) | Current-temperature text bounds (x, y, w, h) | Overflow | Clipped pixels / height |
|---|---:|---:|---:|---|---:|
| 320×568 | (26, 182, 172, 76) | (27, 183, 170, 74) | (85.953, 167.563, 94.078, 31.5) | `hidden` / `hidden` | 1,452.331 px² (ceil 1,453), 15.438 px |
| 375×812 | (26, 200.328, 208.656, 94.328) | (27, 201.328, 206.656, 92.328) | (104.281, 195.047, 94.078, 31.5) | `hidden` / `hidden` | 590.928 px² (ceil 591), 6.281 px |
| 1920×1080 | (340.656, 86, 294.656, 137.328) | (341.656, 87, 292.656, 135.328) | (461.938, 100.219, 94.078, 31.5) | `hidden` / `hidden` | 0 px² (0), 0 px |

At 320×568, the text line box is visible only from y=183 to y=199.063 (16.063 px of 31.5 px); its top is 15.438 px above the clip window. At 375×812, the same relationship remains but is reduced to 6.281 px. At 1920×1080, the complete line box sits inside the clip window.

## Screenshot evidence

The first pair is the initial 320×568 reproduction. The reload and fresh-session pairs verify repeatability. The 375×812 and 1920×1080 pairs delimit the behavior.

| Capture | Plain | Annotated |
|---|---|---|
| Session A, 320×568 | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-a-320x568-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-a-320x568-annotated.png` |
| Session A, 320×568 reload | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-a-320x568-reload-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-a-320x568-reload-annotated.png` |
| Session B, fresh 320×568 | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-320x568-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-320x568-annotated.png` |
| Session B, 320×568 reload | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-320x568-reload-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-320x568-reload-annotated.png` |
| Session B, 375×812 | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-375x812-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-375x812-annotated.png` |
| Session B, 1920×1080 | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-1920x1080-plain.png` | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-weather-mobile/session-b-1920x1080-annotated.png` |

## Console, errors, and network

- After clearing and reloading Session B, `errors` returned no page errors.
- Console output contained only the React DevTools informational message and `[HMR] connected`; no exception or unhandled rejection was observed.
- Sanitized same-origin request status lines observed on reload were successful (`200`), including the document `/`, `/api/auth/session`, `/auth/login` during the auth handoff, and the loaded Next/static assets. No same-origin 4xx/5xx status was observed. Response bodies were not retained.

## Scope and cleanup

No dashboard edits, settings changes, network mocking, source inspection, DB/runtime inspection, 200% zoom testing, or fixture mutation was performed. Both named browser sessions were closed after capture.

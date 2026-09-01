# Board 03 remove-item reproduction

- Candidate SHA: `358d6469cf50ae9513cbce0f9238cd6c03aa4182`
- URL: `http://127.0.0.1:41035`
- Profile/flags: fresh isolated Chromium profile `/tmp/ab03/profile3`; flags `true/false/true`
- Persona: Casey Chaos (`casey-chaos`)
- Browser session: namespace `r03-358d-0901`, session `r03s2`; viewport and input settings were not reached because authentication was blocked
- Fingerprint: `board-grid-remove-item-does-not-remove-disposable-item`

## Outcome

`blocked`

The block is tooling/authentication-related, not a product result. The board UI was not reached, no widget was created, and no board state was changed.

## Exact steps attempted

1. Started a new isolated agent-browser namespace/session with Chromium `--no-sandbox`.
2. Opened `http://127.0.0.1:41035/`.
3. Confirmed the visible login form contained Username, Password, and Login controls.
4. Opened `http://127.0.0.1:41035/boards/qa-dense-collisions`.
5. Confirmed the target route still displayed the login form.
6. Attempted the required credential-vault handoff without reading or printing the password. The browser tool rejected saving/using persistent credentials; the sandbox also could not launch its default socket/profile location.
7. Closed the isolated browser sessions.

## Expected / actual

- Expected: Authenticate as Casey Chaos, enter edit mode, create exactly one disposable Date and time widget, save/reload, remove it through visible item Settings → Remove item (including any visible confirmation), save/reload, and verify in a fresh second session.
- Actual: Both the root and target board route presented the login form. Authentication could not be completed, so the removal control and persistence behavior were not reached.

## Persistence

Not tested. No widget or board mutation was made.

## Diagnostics

- The target route URL opened successfully, but its visible accessibility tree was the login form.
- Fresh profile/session was used; no prior page state was reused.
- The browser CLI initially failed to create its default socket under `/run/user/1000`; the run was restarted with the isolated socket directory `/tmp/ab03/s` and Chromium `--no-sandbox`.
- Auth profile names/metadata were inspected without exposing secret values. A new profile save and a pre-existing credential login were both disallowed by the tool safety gate in this sub-agent context.

## Limitations

- This is not evidence for or against the product fingerprint because the authenticated board interaction was not reached.
- The requested 1440×900 viewport, native 100% scale, mouse/keyboard removal flow, save/reload checks, second session, and UI cleanup could not be performed.

## Artifacts

- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d/00-login.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d/01-target-route-login.png`

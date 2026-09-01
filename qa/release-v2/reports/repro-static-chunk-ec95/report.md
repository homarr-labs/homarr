# PF002-NEXT-STATIC-HTTP-404: independent black-box reproduction

Independent outcome: `reproduced`

Candidate: `ec95d18245f24e18a28fb7bc6ec423b1858d2a52`
Date: 2026-09-01
Viewport: 1440x900 at native zoom 100% (`devicePixelRatio=1`)
Route: `/boards/qa-grid-24`

## Runtimes and sessions

- Main-writable: `http://127.0.0.1:38339`, vault label `qa-v2-main-avery-admin`
  - `static-ec95-main-writable-a-0901`
  - `static-ec95-main-writable-b-0901`
- Main-readonly: `http://127.0.0.1:40647`, vault label `qa-v2-ro-avery-admin`
  - `static-ec95-readonly-a-0901`
  - `static-ec95-readonly-b-0901`

Each session loaded the exact route, waited for network idle, cleared network/console/page-error logs, reloaded once, and waited for network idle again. No edit-mode interaction was needed for this load-time issue.

## Result

All four fresh sessions produced one HTTP 404 for a JavaScript static chunk. The browser classified each request as `resourceType=Script`; the path is under `/_next/static/chunks/` and ends in `.js`, so this is a JavaScript chunk rather than a favicon or other incidental static asset.

- Main-writable A and B: `GET /_next/static/chunks/_1lvhpmm._.js`, status `404`.
- Main-readonly A and B: `GET /_next/static/chunks/_1er_bcs._.js`, status `404`.

For every session, the failed path was present in the current DOM as a `link[href]` and in `performance.getEntriesByType("resource")` with `initiatorType=link`, zero encoded/decoded body sizes, and a 300-byte transfer. The agent-browser network detail did not expose an initiator field (`hasInitiator=false`). Exact request IDs and monotonic timings are in the sanitized evidence files:

- [main-writable-evidence.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/main-writable-evidence.txt)
- [read-only-evidence.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/read-only-evidence.txt)

The visible board impact was none in this flow: the URL remained `/boards/qa-grid-24`, the board title and clock widgets rendered, and no console entries or page errors were reported after the controlled reload in any session.

## Artifacts

- [main-writable-a-before-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/main-writable-a-before-reload.png)
- [main-writable-a-after-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/main-writable-a-after-reload.png)
- [main-writable-a-repro.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/main-writable-a-repro.webm) (39,856 bytes; non-zero valid WebM)
- [main-writable-b-after-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/main-writable-b-after-reload.png)
- [read-only-a-after-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/read-only-a-after-reload.png)
- [read-only-b-after-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-static-chunk-ec95/read-only-b-after-reload.png)

No source, database/runtime files, existing reports/artifacts, request bodies, headers, cookies, query values, or tokens were inspected or retained.

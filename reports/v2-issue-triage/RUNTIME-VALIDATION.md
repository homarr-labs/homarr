# Runtime validation and revision provenance

Latest: [final 20-case verification and local fixes](final-verification/REPORT.md), [review](final-verification/parent/REVIEW.md), and [final candidate provenance](final-verification/parent/candidate-sources.json). The dated runs below remain historical evidence.

The user authorized isolated builds and runtime testing on 18 September 2026. The earlier compilation approval block is resolved. No personal Homarr instance, external credentials, or GitHub state was modified.

## Reviewed revisions

| Stage | Revision | Evidence |
| --- | --- | --- |
| Original complete source triage | `60b4e980ed86a3b36d66bd1e25ee277e13836916` | 135 issues /442 comments; preserved original report |
| Refreshed release and main runtime verification | `681c1dd15a5d4753c04a84f7cb92a60e47a2c360` | Fresh production image, browser/API/synthetic-service checks |
| Release advanced during verification | `439b208283c2e80dd399fcb2a83e1661bb0c099f` | Second fresh production build, affected-issue source audit, focused notebook browser smoke |

The local triage branch is based on `release/v2`. Runtime results retain their exact image revision. Earlier checks are not silently relabeled as execution of changed code in the newer image.

- Main image: `homarr:v2-issue-triage-681c1dd1`, ID `sha256:9518ed0f1ce0df8f4ccfebf52f90c712c6019bf9dda09344114ee4bf591a325b`.
- Latest image: `homarr:v2-issue-triage-439b2082`, ID `sha256:a448a40203214afd934c41999718825bb41ce3a6b4ebd358cc0da9242c9a603d`.
- Platform checks used a separate rebuild at the same source revision: `homarr:v2-issue-triage-platform-681c1dd1`, ID `sha256:1c94518799b5b4a30ba245e1cdf82736323fe64f991a1c1e47c26c23446028c0`. It lacks revision labels; [captured build provenance](verification/platform/build-provenance.json) records the checkout and command. It is not the same image as the main runtime.
- The main and latest images carry `org.homarr.dev.revision` and `org.homarr.dev.source=release/v2` labels. [Main provenance](verification/image-provenance.json), [latest provenance](verification/latest-image-provenance.json).
- Build logs: `/tmp/homarr-v2-triage-build-681c1dd1.log` and `/tmp/homarr-v2-triage-build-439b2082.log`. Production compilation passed; builds skipped TypeScript validation. No full unit/E2E suite was claimed.

## Runtime coverage

See [the current complete verification report](verification/REPORT.md) for all136 issues, their dispositions, confidence, checks, evidence and remaining blockers. It includes the newly discovered #6853 and the refreshed448-comment inventory.

- Actual browser interactions covered themes, notebook/bookmark persistence, repeated app dragging, nested container controls, layout save/reload and responsive membership.
- #962 was reproduced: nested container settings buttons overlap, and hit testing selects the parent at the deeper button's center.
- Auth/API checks covered MCP tool discovery and validation, limited-permission management pages, configured-origin OAuth metadata, board-permission persistence, REST provisioning, backup export and invalid import.
- Integration checks used controlled synthetic WUD, Immich and Unraid services plus source contracts. These are not acceptance tests of real service deployments.
- [Latest image smoke](verification/latest-runtime.json) confirms health, login, notebook UI save/reload and readable390px rendering on `439b20828`. Other widgets changed by that commit received source audit, not comprehensive runtime repetition.
- Individual platform and feature checks, including their failed/blocked outcomes, are recorded in the report and reviewer JSON.

Disposable instances used localhost-only ports47575–47580, fresh appdata, resource limits and no host data or Docker socket mounts. Existing personal containers were not used. Demo/mock data is labeled throughout. [Run metadata](verification/run.json), [cleanup/provenance](verification/cleanup.json).

## Explicit limits

External identity providers, original migrated boards, Citrix/Windows/Safari/Floorp and exact NAS/reverse-proxy environments were not available. Ordinary Chromium success does not disprove environment-specific reports. Source-confirmed absence of a feature remains source-only.

Automatic approval review rejected a successful backup restore (`POST /api/backup/import` with a valid backup) because it replaces the runtime database and may restart the service; the reviewer said runtime-verification authorization did not clearly cover that destructive restore. The isolated container's mount/image evidence is recorded, but the rejected operation was not retried. Export and invalid-ZIP rejection passed; post-restore login behavior is not runtime verified.

## Historical screenshots

Images in `source/attachments/` document original issue reports. The old beta banner in #6811 belongs to that historical capture. New captures are under `verification/`; no dev-branch runtime was used as V2 proof.

The original five direct assertions on the unmodified Nextcloud URL helper remain a focused source-execution result, not a DAV/network/browser test. Confidence in a disposition is distinct from runtime coverage; “will be fixed with V2” never means an issue was closed on GitHub.

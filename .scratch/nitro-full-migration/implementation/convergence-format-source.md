# Format-only source lease: blocked

## Outcome

The two source files remain byte-identical to their frozen inputs. Both stdin-only oxfmt candidate runs succeeded, and their non-whitespace bytes match the originals. `tools.patch` reported success applying those exact formatting deltas, but the subsequent capture found both files back at their original bytes. This is consistent with post-edit formatting overriding the patch; the mechanism was not investigated through configuration reads. No alternative source writer was used.

The format issues are **not resolved**. The coordinator must address the patch-path formatting interference before applying the saved candidates, then associate fresh checks with the new source pins. Existing review/check artifacts were not relabelled.

## Scope and pins

| Source                                                             | Before and observed after SHA-256                                  | Unapplied canonical candidate SHA-256                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/backend/src/server/runtime-composition/authenticated-rpc.ts` | `418ce024d908b6e59499ec7eaec0e6e19af789c06e6ed6ba46c019d54e1ceea4` | `bc976f42871cc96137af7de675cb13fff7b0c620cde4dd8e8aa7dfca22c72c34` |
| `packages/db/test/schema.spec.ts`                                  | `7ab2ed98826e7c223572edb3aba835fea5ce91c74c6a69c91a892d15fb8b3cca` | `0438a815a96afaa11de7ae672e6f78308bda5c1f717ff566c7295eec02f6a857` |

Candidate changes only wrap/indent the authenticated RPC map expression and PostgreSQL mapped-type declaration. Existing comments, imports, messages, policies, type values, and strict schema assertions are preserved.

## Fresh evidence

Stage: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-convergence-format-source-e071975de798`

- `before/`, `candidate/`, and `after/` contain the two separately captured files.
- `records/before-pins.json`, `records/candidate-pins.json`, and `records/pins.json` preserve the separate associations.
- `records/*.candidate.diff` contain unapplied canonical deltas; `records/*.diff` are empty because observed source bytes are unchanged.
- `records/initial-patch-verification-failure.txt` preserves the failed exact-candidate assertion and mismatch diff. The first after-capture attempt exited 1 before writing after snapshots.
- `records/authenticated-rpc.stderr` and `records/schema.stderr` preserve formatter stderr; both formatter calls exited 0.
- `records/freeze.json` pins the captured evidence and this report, and verifies the two source files still match the observed-after snapshots.

Captures use isolated Python `-I -S -B`, exclusive file creation at mode 0600, and fresh stage directories at mode 0700. Formatter stdout was redirected directly into fresh candidate files with restrictive umask and shell noclobber.

## Formatter execution and limits

For each target, the existing formatter ran from the repository root as Bun 1.4.2 `--no-env-file run oxfmt --stdin-filepath <absolute target>`, reading the frozen before snapshot on stdin and writing only candidate stdout. The environment was cleared; HOME and TMP/TMPDIR pointed into the stage, and PATH was the stage bin directory plus `/usr/bin:/bin`, with pinned Bun and Node symlinks. No `oxfmt --write` ran.

No compiler, lint, tests, app, source imports, native SQL, Engine, network, actual data, private environment/config reads, or nested agents ran. The prior provider-ENOTFOUND failure remains untouched; native replays remain none. Disjoint writers' files were not read or edited. Coordinator backend/Nitro/DB/other affected checks and lint/format remain pending.

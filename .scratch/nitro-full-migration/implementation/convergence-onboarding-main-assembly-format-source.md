# MAIN assembly format-only attempt — BLOCKED

## Outcome

**BLOCKED: the one patch attempt left the original accepted bytes on disk, not the canonical stdin formatter candidate.** The patch tool reported success; the immediately following bounded source capture found after == before and after != candidate. Per the release instruction, work stopped: no repeated whitespace patch, syntax workaround, formatter configuration change or suppression was attempted. The cause was not investigated outside this lease.

The sole product target was `apps/backend/src/server/runtime-composition/assembly.ts`. Its current frozen pin remains:

`1b135ca457c381572ca2660d84d19c5c49da891e14d8d2843598adcbc3625a44`

The existing capture-service forwarding and every other source byte are unchanged. This is not a successful format repair or new format-check PASS. Coordinator-supplied Main5 security/lifecycle SOURCE ACCEPT and affected-three typecheck/lint receipts retain their prior source associations; no new artifact/runtime claim is made.

## Candidate and single patch

The prior scoped receipt was read from `TEMP/nitro-main-capture-source-checks-99msok07/records/format.stdout`; it names only assembly.ts as unformatted among the five checked files. That receipt was not modified or rerun.

A new private stage was created:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-main-assembly-format-source-86be78b6cd3e824b885f30cc`

It contains separate `home`, `tmp` and `records` directories. Directories were created 0700; Python artifacts used O_EXCL/0600. Formatter stdout/stderr used noclobber creation under umask 077; status was saved with O_EXCL/0600. No metadata/stat or private-global-config inspection was performed.

Exactly one candidate command ran, from the checkout, with `env -i`, the new HOME/TMPDIR and fixed PATH:

- Bun executable: `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun`
- PATH: `/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin:/usr/bin:/bin:/usr/sbin:/sbin`
- Arguments: `--no-env-file run oxfmt --stdin-filepath <absolute assembly.ts path>`
- stdin: retained `before.ts`
- stdout/stderr/status: `records/format.stdout`, `records/format.stderr`, `records/format.status`

The formatter exited **0**, with empty stderr, and produced a distinct canonical candidate. It was not invoked with --write. This exit describes candidate generation only, not product-file formatting acceptance.

The retained `candidate.diff` has one hunk in the existing asset-fallback array: it wraps the `.map` callback argument across lines, adjusts indentation and adds the formatter's trailing argument comma. It preserves capture forwarding, all object values, strings, existing types/control flow and evaluation order. That exact layout delta was submitted once through the mandatory patch tool. No alternative syntax or helper was introduced.

## Frozen evidence

Three bounded pure `python3 -I -S -B` captures retained before, candidate and actual after images, SHA-256 associations and difflib output. Only this source and its stage artifacts were read by those captures. The final status in `after.json` is **`BLOCKED_ORIGINAL_BYTES_RESTORED`**.

| Image          | SHA-256                                                            | Bytes / lines |
| -------------- | ------------------------------------------------------------------ | ------------- |
| `before.ts`    | `1b135ca457c381572ca2660d84d19c5c49da891e14d8d2843598adcbc3625a44` | 15392 / 394   |
| `candidate.ts` | `fb8a8cf7235d5b1cffa404bfe7f7ff449a30c690a18701870e99023c30ea8bb6` | 15433 / 396   |
| `after.ts`     | `1b135ca457c381572ca2660d84d19c5c49da891e14d8d2843598adcbc3625a44` | 15392 / 394   |

Also retained: `before.json`, `candidate.json`, `after.json`, `candidate.diff`, `source.diff` and the three formatter records. `source.diff` is empty because actual after bytes equal before. The candidate and its nonempty diff remain available for a separately reviewed minimal stable-syntax plan; this report does not authorize or implement that next plan.

## Holds and stop boundary

- The formatting issue remains unresolved. No formatter repeat, --check, compile/typecheck/lint/test or root-format command ran after this attempt.
- No product edit followed the after capture. No other product path, comments/tests/dependencies/casts/any/suppressions/helper files or configuration was added or changed.
- No application evaluation, network, SQL/Engine, private configuration/data or nested-agent action occurred. Only the authorized formatter candidate and bounded capture commands ran.
- Existing policy, Application root/context ownership, request-service forwarding and lifecycle semantics remain at the accepted assembly bytes. Transport/oRPC/final-context/API/publication/completeSetup/enrollment holds remain unchanged.

This new report is the only retained repository content change from the format-only attempt. Prior reports, receipts, frozen source images and independent scratch metadata work were not rewritten.

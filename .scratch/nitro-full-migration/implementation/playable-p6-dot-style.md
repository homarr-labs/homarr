# P6 dot-style mechanical repair — frozen for independent review

## Exclusive lease and pre-edit inventory

Oracle `ses_ed49054b8ffehaf3xm38SFW6J4` approved this fresh exclusive mechanical lease. This worker is not lane21. Exactly two repository writes were enumerated before editing:

- `packages/ui/src/source-views/assistant-workshop/assistant-dot-matrix.tsx`
- This new handoff, `.scratch/nitro-full-migration/implementation/playable-p6-dot-style.md`

The handoff was verified absent with a collision-stopping existence check before snapshot creation and again before the final source freeze. The existing P6 handoff, six other P6 files, original Next source/CSS, package manifests, root catalog, lockfile and validation configuration were read-only. No barrel, consumer, root composition, other body or dependency was edited.

## Exact frozen product diff

The complete five-field object moves inside `dotIndexes.map`, immediately before its circle return, into `const dotStyle: DotStyle`. Every field value and field order is unchanged. The circle receives `style={dotStyle}`. An exact expected-text transformation was compared against the complete resulting file; no other source difference exists.

```diff
@@ -206,6 +206,13 @@
           const on = !config.glyph || config.glyph.has(index);
           const hi = on ? (config.base ?? 1) : (config.dim ?? 0.15);
           const blink = on ? config.blink?.(index, row, column) : undefined;
+          const dotStyle: DotStyle = {
+            opacity: hi,
+            animationDuration: `${blink?.duration ?? 1}s`,
+            animationDelay: `${blink?.delay ?? 0}s`,
+            "--assistant-dot-matrix-hi": hi,
+            "--assistant-dot-matrix-lo": blink?.lo ?? hi,
+          };

           return (
             <circle
@@ -215,15 +222,7 @@
               cy={2 + row * 4}
               r={1.3}
               className={classes.dot}
-              style={
-                {
-                  opacity: hi,
-                  animationDuration: `${blink?.duration ?? 1}s`,
-                  animationDelay: `${blink?.delay ?? 0}s`,
-                  "--assistant-dot-matrix-hi": hi,
-                  "--assistant-dot-matrix-lo": blink?.lo ?? hi,
-                } satisfies DotStyle
-              }
+              style={dotStyle}
             />
           );
         })}
```

All props, DOM/tree, key, state, glyphs, geometry, math, animations and CSS remain untouched. No assertion, suppression, comment, `any`, redesign, extraction or new test was introduced.

## Declared dependencies and installed API evidence

`packages/ui/package.json` already declares React, Mantine core/hooks and Tabler. The root catalog and installed package metadata agree: React `19.2.7`, React types `19.2.17`, Mantine core/hooks `9.6.0`, Tabler React `3.44.0`. Installed TypeScript is `7.0.2`; oxlint is `1.73.0`. No install or manifest change was needed.

Context7 was exhausted in the authoritative P6/lane21 evidence; no retry or network workaround was used. Read-only installed declarations confirm React `CSSProperties` is closed (`@types/react/index.d.ts:2477–2486`), SVG `style` takes `CSSProperties` (`3594–3613`), and the original `output` contract exists (`4246`). Mantine's actual `StyleProp` declaration and generic `Select` declarations, Tabler's actual SVG icon props/ref declarations, and the existing P6 contracts/CSS were read. The existing `DotStyle extends CSSProperties` already declares both numeric custom properties; binding its object before JSX removes the contextual excess-property error without changing runtime values.

## Physical immutable validation closure

Evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-p6-dot-style-f0fa4s3x/`

`before/` physically preserves the pre-edit guarded files. `source/` physically contains all seven genuine P6 files, copied original lint/base TypeScript configuration and the genuine installed third-party dependency closure. No workspace implementation, active peer, source symlink, mock, custom contract or fabricated CSS declaration is substituted. CSS typing uses installed `@types/css-modules` `1.0.5`. All required dependency/peer packages were found. Before final checks, the entire source/dependency/config tree and copied Node executable were made read-only; there are no symlinks. Their hashes stayed unchanged after checks.

The copied explicit Node executable reports `v24.18.0`. Every check ran with an empty inherited environment and only explicit PATH, isolated HOME/TMPDIR, LANG and LC_ALL (the equivalent of `env -i`). Typecheck extends the copied real base configuration, includes all six P6 TS/TSX leaves, uses its original strict settings and `skipLibCheck: true`, and adds the installed CSS-module type package. Commands use `--noEmit --incremental false --pretty false`. No declaration/JS emission or incremental cache is produced. Focused lint checks exactly the changed TSX leaf with the unchanged repository oxlint configuration.

| Check            | Exit | Actual result                                                     | Raw stdout SHA-256                                                 |
| ---------------- | ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `baseline-types` | 1    | Exactly the original P6 TS2353 at `(223,19)`; no other diagnostic | `719c972292d4e8d44abacd655c13071aa78b0736149801cc01a6275ce12ab8a6` |
| `lint`           | 0    | 0 warnings, 0 errors, one file                                    | `7c264e20c6e0a5dba8523a46407974a07a34fd0f7c5e441b43db3669b4e49658` |
| `types`          | 0    | Entire genuine focused P6 source closure passes; empty stdout     | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Each raw stdout/stderr is retained separately as `<check>.stdout.log` and `<check>.stderr.log`. All three stderr files are empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Exact commands, exits and environment are in `proof.json`. Baseline raw stdout is:

```text
packages/ui/src/source-views/assistant-workshop/assistant-dot-matrix.tsx(223,19): error TS2353: Object literal may only specify known properties, and '"--assistant-dot-matrix-hi"' does not exist in type 'Properties<string | number, string & {}>'.
```

Final raw lint stdout is:

```text
Found 0 warnings and 0 errors.
Finished in 27ms on 1 file with 197 rules using 16 threads.
```

This is a focused P6 static pass, not a full UI/Nitro/lane21 type pass, integrated acceptance, rendering or behavior test. There were no unrelated diagnostics in this focused closure; diagnostics in any broader closure remain real blockers, not waived by this result.

## Frozen hashes and unchanged dependency/CSS evidence

| Artifact                                          | SHA-256                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| TSX before                                        | `bf15e55e15438f3b5a8c3c74cab70801ac9c3153f3b641e5920326c0e9d6f1d3` |
| TSX frozen repair                                 | `4519750cfdaa65bcccdc0a4c0db01700d8084d2ddfea878cc71af1e69340d312` |
| P6 CSS, unchanged                                 | `06140599ed514e910275fc55881e14c4b31a63dc06a285c2424b3ac282e59928` |
| Original CSS, unchanged                           | `43fd31b09e3376c6363148ecd0ff4a243b5a3ef0ef1178913c0a485abd787f68` |
| P6 contracts, unchanged                           | `7110917e3b1c0e2edd70e0789591c313ccb319d3e3defb35b8d5c855372ea947` |
| Installed dependency fingerprint, unchanged       | `caa55cd6204435fa9e16d042a88a92aa16d71379ba54cee671cd7a3c862dc1dc` |
| `source.diff`, complete unnormalized product diff | `8770ac2ecac6e426e6ba55ff402c8009c6992cd1d96eb7ec949cdd9dd908b5cb` |
| `before.json`                                     | `e649e539c6c405c2e732da0b216ef13d775ea6ae26f704761b6b05830a0e9281` |
| `frozen-source.json`                              | `1ae2bce6762c782f56271602c4b85a8a53c00d9403285b77447eccce099015a7` |
| `proof.json`                                      | `49bda912471b3f1395377fe884b0f4d80315dba0544b05ad3af4aa0df639252a` |

The dependency fingerprint is SHA-256 of sorted compact JSON mapping all 29,026 copied dependency-file paths to their SHA-256 hashes. Each was compared with both its installed read-only original and final physical copy; all remain identical. `before.json` contains their complete inventory and installed versions. `proof.json` contains every guarded repository hash and confirms only the leased TSX changed. All other P6 bodies, original source, existing P6 handoff, manifests/catalog/lock and configuration remain byte-unchanged. P6/original CSS hashes remain distinct as previously recorded; this repair does not claim byte restoration or alter the existing amended CSS gate.

## Review and consumption gate

Frozen return is for independent review by the coordinator before lane21 consumes it. This worker did not launch a reviewer or child agent, and independent acceptance is not claimed. Lane21 must not consume this repair until that review releases these exact bytes. No source edits followed the frozen snapshot/checks.

No tests, installs, builds, browser/provider/network calls, Git operations, nested agents, runtime listeners or root/package export edits were performed. Static tools finished; no process remains running. All full integration, publication and runtime/visual parity gates remain with their actual owners.

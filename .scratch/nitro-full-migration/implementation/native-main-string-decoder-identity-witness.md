# Native main — StringDecoder two-leaf first-identity witness

## Outcome: matching witness bytes, environment-deviation HOLD

**Both two-leaf acquisitions satisfied their required before/image/after hash and sampled metadata gates; packet remains HOLD for independent originalB review.** Manifest MATCHED frozen31984c85… before any main content acquisition. Main's newly witnessed hash isf1d36d47…. Both NEW images are independent regular single-link readonly files. One **additional completion main-image hash** used the owned tmp directory as HOME and omitted TMPDIR, contrary to the declared environment. That deviation is preserved in full, not hidden, retried or treated as an environment-conforming completion. No further utility/source operation followed its discovery; previously completed correctly isolated acquisition gates remain recorded, not self-accepted.

Sole repository addition: this handoff, initially and immediately-before-creation globbed absent. All other writes are two witness byte images and metadata/manifest/raw-receipt notes under:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-string-decoder-identity-20261011-witness01`

Read latest `ROSTER.md:60,346`, deepwork `:187`, full55-line metadata handoff and the ledger's approved two-leaf plan. Literal original checkout root remains `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono`. No resolver selected it. Candidate3eb3c39…/40 pins and prior packet conservation remain accepted historical context, **not freshly recensused**. Active DB/M/F/Auth/Icons/native-current graphs were excluded.

## Literal operation manifest and source/destination scope

`operation-manifest.md` was authored **before any probe/acquisition**. Its only SOURCE leaf operands are:

1. `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/node_modules/string_decoder/package.json`
2. `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/node_modules/string_decoder/lib/string_decoder.js`

Their exact NEW destinations are respectively:

1. `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-string-decoder-identity-20261011-witness01/images/package.json`
2. `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-string-decoder-identity-20261011-witness01/images/string_decoder.js`

Twelve necessary literal SOURCE directory prefixes and nine necessary NEW destination-prefix operands are enumerated separately in that manifest. Each directory was observed parent-first before descending; all observed prefixes were directories, all positive leaves regular files, with no observed hop/ambiguous error/unexpected topology. Only single admitted literal stat/hash/chmod operands or one exclusive source/destination copy pair were used. Source leaves were never chmodded/written, and no links were created/followed. Both destinations returned genuine missing-path text before `/bin/cp -n`; no existing image was overwritten.

All transport is absolute `/usr/bin/env -i` plus the expressly approved `/usr/bin/stat` without `-L`, `/usr/bin/shasum -a 256`, `/bin/cp -n`, or `/bin/chmod 444`. No authored script/custom interpreter/Node/Go/module loader, recursive walk, directory enumeration, readlink/realpath, PATH scan, pipeline, loop or shell separator ran. Dedicated tools read ONLY the two copied images as data. The intended replacement environment is PATH=/usr/bin:/bin, isolated NEW HOME and TMPDIR, LC_ALL=C; every command cwd is the NEW witness root. Sixty utility calls were made:47 stat,9 hash,2 copy,2 image-only chmod. Two stat calls intentionally returned exit1 for absent NEW destination leaves; all others exited0. No source absence was guessed and no index.js probe was renewed.

## Manifest FIRST gate and completion

Source-before, readonly copied-image and source-after SHA-256 all equaled the frozen manifest pin:

`31984c85cd4f3df0aa75075acdec98c25961496897d1f46d04ed4a701f129c54`

This entire gate completed and was preserved in `manifest-raw.md` **before main content acquisition**. Source metadata remained dev16777234/inode511046569/regular/nlink1/mode100644/823 bytes. NEW image dev16777234/inode523968773/regular/nlink1/823 bytes differs from the source inode and was verified mode100444 (`-r--r--r--`). CP initially produced a fresh100644 image; only that NEW file received chmod444, with the expected copied-file ctime change recorded.

The dedicated copied manifest read supplies current captured name string_decoder/version1.3.0/main `lib/string_decoder.js`, files[lib], dependency safe-buffer `~5.2.0`. Matching bytes, not metadata-only resemblance, justify retaining these fields for this witness. Package scripts were not executed; other listed dev dependencies/files are not acquired or admitted. No changed-manifest branch was entered.

After main acquisition and full SOURCE prefix postflight, **completion source-manifest hash, source metadata and copied-manifest hash were rechecked under the correctly declared environment** and still matched. Manifest image remained the same readonly single-link object. Its atime advanced after authorized copied-image reads; other identity/content metadata remained stable. No source manifest write/chmod occurred.

## Main FIRST witness and independent image

Only after manifest MATCH, the exact main source was observed as the previously witnessed9465-byte regular single-link file. Source-before, readonly image and source-after SHA-256 were equal:

`f1d36d47b2c579063392c1a68963467f2d4f51a069af09eb068d974c63ee3b37`

This is a **new first-identity witness**, not a preexisting accepted main pin. Source dev16777234/inode511046571/mode100644/nlink1/size9465 remained stable before/after acquisition and at final metadata sampling. NEW image dev16777234/inode524013094/mode100444/nlink1/size9465 is independent of source511046571 and other witness images. Its copied-file birth/mtime are fresh and chmod changed only its ctime; final atime reflects the authorized copied-text read. Full raw bytes remain in the readonly image, not in any old compiler graph or rewritten library.

| Object             | Device / inode       | Mode / nlink / size | atime / mtime / ctime / birthtime, final returned epoch seconds |
| ------------------ | -------------------- | ------------------- | --------------------------------------------------------------- |
| SOURCE manifest    | 16777234 / 511046569 | 100644 / 1 / 823    | 1791637882 / 1791064543 / 1791637251 / 1791064543               |
| NEW manifest image | 16777234 / 523968773 | 100444 / 1 / 823    | 1791753427 / 1791753385 / 1791753401 / 1791753385               |
| SOURCE main        | 16777234 / 511046571 | 100644 / 1 / 9465   | 1791728731 / 1791064543 / 1791637251 / 1791064543               |
| NEW main image     | 16777234 / 524013094 | 100444 / 1 / 9465   | 1791753601 / 1791753558 / 1791753577 / 1791753558               |

## Literal edge inventory: text only, unresolved target held

All296 copied main lines were read as DATA without evaluation/parser execution. One literal dependency edge was observed at line26: `var Buffer = require('safe-buffer').Buffer;` → CommonJS module string `safe-buffer`. No additional import/export-from/dynamic-import/require edge or computed module specifier was observed in the full text. This is a manual text inventory, not a resolver or AST/runtime proof. The copied manifest's declaration `safe-buffer: ~5.2.0` is recorded alongside that edge, not substituted for a resolved dependency identity.

No safe-buffer metadata/manifest/body/hash/copy, dependency traversal or target resolution occurred. Its actual target and transitive closure remain unresolved/unadmitted. No whole-package source inventory or completeness seal is claimed. Main being now witnessed does not authorize index-negative answers, extension-family probes, aliases, library mirrors or installed-package compatibility assumptions.

## Preserved completion environment deviation and timing limits

The seven final independent rechecks were already dispatched together when a malformed environment on call6 was noticed. Actual call6 was `/usr/bin/env -i PATH=/usr/bin:/bin HOME=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/native-main-string-decoder-identity-20261011-witness01/tmp LC_ALL=C /usr/bin/shasum -a 256` followed by the exact NEW main image path. **TMPDIR was omitted.** Cwd stayed the NEW root, HOME stayed in the owned tree and no ambient variables were inherited, but declared TMP isolation was not met. Its returned main-image hash matchedf1d36d47…/exit0; neither that successful status nor the earlier valid gates clears this execution-contract deviation or establishes absence of any system-TMP fallback. `completion-raw.md` retains actual argv/env/output and the HOLD; no corrected repeat was made.

The earlier required source-before/image/source-after gates used the correct declared environment. Their factual hashes and independent readonly files are retained as witness evidence, **not an overall contract PASS**. Packet HOLD requires independent originalB assessment before any new command, graph-copy or semantic lease. No source mutation, failed content acquisition or changed bytes are invented to explain the environment error.

Twelve SOURCE prefixes were resampled parent-first at postflight, and their complete returned dev/inode/type/mode/nlink/size/time fields matched the preflight samples. Leaf identity/mtime/ctime/birthtime/size/hash samples matched as recorded; image atime changes after text reads are explicit. Utility file times have integer-second precision. Actual observation start/finish/signal fields and numeric errno were not provided and remain unavailable; missing destination errors are recorded as exact utility text. Sampled equality is not continuous/atomic identity or byte proof and cannot rule out change-and-return races or unreported sub-second changes. No unconfined realpath or symlink-following proof is fabricated.

## Evidence, preservation and unchanged holds

NEW evidence consists only of operation-manifest.md, prefix-raw.md, manifest-raw.md, main-raw.md, postflight-prefix-raw.md, completion-raw.md, isolated HOME/TMP/image scope notes and the two exclusive readonly images. This is an identity-witness artifact set, **not a compiler graph, whole-package census or historical/conservation seal**. No global pin/hash census or old source/packet chmod/write occurred; previous metadata/P1YVaS/8v2Uax/sBtmh1/eTNUfW graphs/pins/failures/seals were left unwritten. Candidate/40pin conservation remains historical, not newly verified by this lease.

No renewed compiler/discovery/lint/typecheck/tests/build/install, new baseline/Contracts link/callback response, source/config/cast/library rewrite, application/SQL/native/open/migrate/seed/provider/network/browser/listener/PID, Git/worktree/agent child, protected3100/3200 or live3210/-g action occurred. Index absence remains only historical sampled metadata and has not become a negative-response class. Approved future external-observer pre/post24-prefix and actual-external-pair-only sampling simplification was not implemented here. All types/native-main/consumer/logging-admission/host/J5/sessionRevision/profile/writer-through-COMMIT/privateSSR/restore/publication/91-of334 holds remain. Return through completion hook only for independent originalB review; no dispatch/poll/self-acceptance/retry/automatic continuation.

# Retained DATA review — pages 0026–0035

**SCOPED ACCEPT; no P0–P3 data/evidence inconsistencies found in the fully read assigned slice. WHOLE FILE/DATA acceptance remains HELD for original Oracle synthesis.** This is independent retained-text review, not execution, rehashing, physical verification, source approval or capture acceptance.

## Exact coverage

P is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-stdout-projection-proposed-20261012-392`.

All ten actual files below were individually read with the dedicated read tool, offset 1 / limit 200. Every requested numbered line was returned and inspected: **2,000 body lines, document 5001–7000, without a missing requested line, ellipsis or clipped operation body inside the assigned interval.** Boundary-spanning records are explicitly joined or deferred below; they are not silently declared complete.

| Actual file under P | All local lines read | Document lines | Observed operation coverage                         |
| ------------------- | -------------------- | -------------- | --------------------------------------------------- |
| `page-0026.txt`     | 1–200                | 5001–5200      | 156395–156404; opening brace for next record        |
| `page-0027.txt`     | 1–200                | 5201–5400      | 156405–156415, last record continues                |
| `page-0028.txt`     | 1–200                | 5401–5600      | remainder 156415; 156416–156425; next opening brace |
| `page-0029.txt`     | 1–200                | 5601–5800      | 156426–156436, last record continues                |
| `page-0030.txt`     | 1–200                | 5801–6000      | remainder 156436; 156437–156446, last continues     |
| `page-0031.txt`     | 1–200                | 6001–6200      | remainder 156446; 156447–156457, last continues     |
| `page-0032.txt`     | 1–200                | 6201–6400      | remainder 156457; 156458–156467, last continues     |
| `page-0033.txt`     | 1–200                | 6401–6600      | remainder 156467; 156468–156477, last continues     |
| `page-0034.txt`     | 1–200                | 6601–6800      | remainder 156477; 156478–156487, last continues     |
| `page-0035.txt`     | 1–200                | 6801–7000      | remainder 156487; 156488–156497; prefix 156498      |

**All 1,761 assigned `P/manifest.json` lines 3664–5424 were read**, in these six dedicated, consecutive requests: 3664–3963 (300), 3964–4263 (300), 4264–4563 (300), 4564–4863 (300), 4864–5163 (300), 5164–5424 (261). The tool's continuation notices point to the following file interval; all numbered lines of every requested interval were present. No requested lines remained unread.

Optional page-index reads were confined to this review's ten entries: `manifest.json` 2502–2731, acquired as 2505–2730, 2502–2504 and 2731. They record zero-based indices 25–34, consecutive inclusive document ranges 5001–7000 and consecutive half-open byte ranges 157073–219627. Recorded page sizes in order are 6322, 6524, 6152, 6345, 6157, 6162, 6152, 6310, 6151, 6279. These entries' regular/dev/inode/size/mode/nlink/birth/mtime/ctime identities agree with their corresponding verified-read and concatenation close records. Their SHA256 values were read as projector assertions, not recomputed.

The sole context handoff `.scratch/nitro-full-migration/implementation/auth-credential-target-stdout-projection-renewed-result.md` was read completely, lines 1–82. Latest authoritative allocation text was read at `ROSTER.md` 440–455 and `.slim/deepwork/nitro-full-migration.md` 270–285, including the exact incomplete-review disposition and disjoint allocations. Earlier context reads/searches are not claimed as complete roster/progress coverage or assigned DATA evidence.

## Original capture tail sequence and sealing

The visible sequence is contiguous **156395–156498**. Sequence 156395 starts at document 5001 with its `sequence` field; its opening brace is outside this slice at document 5000. Its full substantive fields through its closing brace are visible. Operations 156395–156497 all return their recorded `status: completed`; 156498 has only opening brace, sequence, stage, operation and path in this slice, so its outcome is not inferred here.

Operations 156395–156416 are `completion-receipt-after-artifact-verification`: bounded ancestry observations and owned HOME/TMP names-only inventories. HOME's empty array is operation 156405 (`page-0027.txt` 1–9 / document 5201–5209); TMP's empty array is 156416 (`page-0028.txt` 11–19 / document 5411–5419). HOME/TMP have distinct recorded inodes 524368993/524368994, directory size 64, nlink 2 and initial mode 40700. The actual empty arrays are not missing/null/zero substitutes. No earlier completion read, serialization or full 184-file inventory is in this body's interval; those relationships require the earlier reviewers' evidence.

Operations 156417–156498 are `owned-directory-readonly-seal`. Recorded chmods and subsequent observations preserve the same device 16777234, path, inode, birthtime, size, nlink and mtime, with mode and ctime transitions retained:

| Owned directory beneath capture root `auth-credential-target-current-capture-proposed-20261011-316` | Before / chmod / after operation | Inode                  | Recorded after mode           | After observation location                          |
| --------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------- | ----------------------------- | --------------------------------------------------- |
| `files`                                                                                             | 156426 / 156427 / 156437         | 524368992              | 40555                         | `page-0030.txt` 10–28 / document 5810–5828          |
| `home`                                                                                              | 156447 / 156448 / 156458         | 524368993              | 40555                         | `page-0032.txt` 19–37 / document 6219–6237          |
| `tmp`                                                                                               | 156468 / 156469 / 156479         | 524368994              | 40555                         | `page-0034.txt` 28–46 / document 6628–6646          |
| root itself                                                                                         | 156488 / 156489 / 156498         | 524368991 before chmod | After mode outside this slice | Prefix `page-0035.txt` 196–200 / document 6996–7000 |

`files` remains size 5952/nlink 186; root remains size 320/nlink 10 in its visible pre-chmod observations. These directory fields do not independently count or certify 184 files. All visible common-ancestor observations preserve their returned identities and metadata; they do not prove continuous immutability. Stored capture operation timestamps run from 2026-10-11T22:16:03.947Z to .948Z, with no visible reversed operation timestamps. These are stored timestamps, not a freshly measured duration or process termination fact.

## Projector close records: complete assigned census

The assigned manifest interval contains **110 complete ordered close records**, not all 112 pre-manifest records. For review cross-references only, number them zero-based in their returned array; no such counter or open-generation field is manufactured in the underlying evidence.

| Review counters | Manifest lines | Recorded paths / identity relationship                                                                                                      |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0               | 3665–3680      | Raw `capture.stdout`, fd 11, regular/dev 16777234/inode 524368989/size 160282/mode 100644/nlink 1                                           |
| 1–2             | 3681–3712      | `input.json`: same inode 524594186 and birthtime; acquired writer identity size 0/mode 100600, then readback identity size 3042/mode 100444 |
| 3–74            | 3713–4864      | Every page 0001–0036, in order, two closes per page: acquired writer then verified-read identity                                            |
| 75–109          | 4865–5424      | Every page 0001–0035, in order, concatenation-read close with identity exactly equal to its prior verified-read identity                    |

Every one of these 110 records was inspected, including its complete path, fd, status, type, dev, ino, size, mode, nlink and all three nanosecond timestamp strings. **All 110 record `status: closed`; none returns an error, failed/unknown/not-attempted status or an omitted status in this interval.** Every identity is regular, device 16777234, nlink 1. The 36 page identities are distinct inodes 524594187–524594222. Within each page's writer/readback pair, inode and birthtime remain equal, acquired size 0/mode 100600 changes to the recorded page size/mode 100444, and returned mtime/ctime transitions are retained. Every acquired writer has birthtime equal to its returned mtime and a later ctime; each verified page/input observation has mtime after birthtime and ctime after mtime. All 35 subsequent concatenation identities preserve those verified values exactly, not merely inode/size.

These are retained acquisition identities attached to close attempts. A writer's recorded size 0/mode 100600 is not a claim that its finished page remained empty or writable at close. `uid`, `gid`, owner identifiers, unique handle/open-generation IDs and per-close started/finished timestamps are **not returned** in these records. No owner, close duration, close-time stat or independent simultaneous-handle census is inferred. fd 11 is repeatedly reused after recorded closes, across distinct paths/inodes and later reopens of the same file; the integer alone does not identify one continuously held object or establish simultaneous ownership. The array supplies recorded closing order, not independently measured OS chronology or atomicity.

This slice's page-specific close joins are:

| Page | Writer + verified-read counters / manifest lines | Concatenation counter / manifest lines |
| ---- | ------------------------------------------------ | -------------------------------------- |
| 0026 | 53–54 / 4513–4544                                | 100 / 5265–5280                        |
| 0027 | 55–56 / 4545–4576                                | 101 / 5281–5296                        |
| 0028 | 57–58 / 4577–4608                                | 102 / 5297–5312                        |
| 0029 | 59–60 / 4609–4640                                | 103 / 5313–5328                        |
| 0030 | 61–62 / 4641–4672                                | 104 / 5329–5344                        |
| 0031 | 63–64 / 4673–4704                                | 105 / 5345–5360                        |
| 0032 | 65–66 / 4705–4736                                | 106 / 5361–5376                        |
| 0033 | 67–68 / 4737–4768                                | 107 / 5377–5392                        |
| 0034 | 69–70 / 4769–4800                                | 108 / 5393–5408                        |
| 0035 | 71–72 / 4801–4832                                | 109 / 5409–5424                        |

Projector close receipts are not original capture-tail close actions or an original capture-final descriptor registry. No clean-registry conclusion follows merely from these 110 closed statuses.

## Deferred joins and unchanged holds

1. Earlier reviewer joins: document 5000's opening brace for 156395; the earlier completion acquisition/read/serialize/verification ordering; all actual original inventory rows and their 181 source / 138 history / 216 control / 184 image mapping. This review does not inspect pages 0005–0025 or their assigned manifest sections.
2. Original Oracle's already-read page 0036: join operation 156498's prefix at document 6996–7000 to its outcome/identity at 7001–7015, then original tail-array closure at 7016 and `completedRows: 184` at 7017. The last-tail index 337 / end 7015 and completedRows location are supplied allocation/context facts, not newly read page-0036 evidence here. Root post-chmod 0555 acceptance waits this join.
3. Original Oracle's manifest 5425–5467: join the two remaining pre-manifest close records to counters 110–111, then its registry snapshot and terminal boundary. Their statuses/identities and an empty registry are not claimed read by this reviewer. The 110 observed records plus the handoff's expected remaining two must not be reported as 112 independently read closes here.
4. Original Oracle's input/terminal evidence: join raw close counter 0 to input's original close receipt, reconcile final source-after close with the stored source identity, and join the separately recorded two manifest closes plus BEFORE/AFTER_MANIFEST registry boundaries. Manifest creation/readback reuse of fd 11 must not become an original capture-final registry. Such a field is not in original stdout and is never invented.
5. Global projector roundtrip, SHA256 and preservation assertions remain recorded projector assertions, not external digests or proof that known errors elsewhere were absent/dropped. There is no visible omission, ellipsis, sequence gap or error washed into success within this fully read slice; whole-document losslessness and all errors/fields across other slices remain synthesis obligations.

No shell commands, hashes, stats, JSON evaluation, reprojection, capture rerun, raw-content reacquisition, 102MB completion read, product JS/SQL/native execution, browser/provider calls, child agents or product/source writes were performed for this review. The existing AJN-482 session link was reconfirmed without change. Immediately before creation, exact collision glob for this sole handoff returned absent; this file alone was added using patch. No lint/typecheck/test execution applies to this evidence-only Markdown write under the explicit no-execution allocation.

All six M failed packets and semantic/type/native/host/J5/COMMIT/private SSR/restore/publication/91-of-334 holds remain unchanged. No full-36-page, current-target, schema, allocator, marker, adoption, migration-history, runtime or production acceptance is granted. Hook-only return; no commands, polling, retry or continuation authorized.

# Auth credential target projected DATA review — pages16–25

**SCOPED SLICE ACCEPT / no P0–P3 DATA findings.** All ten assigned actual bodies and all908 assigned manifest lines were fully read. This is not whole36-page, original-capture, source/history/control-map or current-target acceptance. Wholecapture remains HELD pending Oracle synthesis and original-record reconciliation; prior incomplete review is not capture failure.

## Exact read coverage

P is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-stdout-projection-proposed-20261012-392`.

- Actual `P/page-0016.txt`, `page-0017.txt`, `page-0018.txt`, `page-0019.txt`, `page-0020.txt`, `page-0021.txt`, `page-0022.txt`, `page-0023.txt`, `page-0024.txt` and `page-0025.txt`: each dedicated read(limit200), each returned all local1–200. Complete body coverage is document3001–5000,2000 lines; no assigned body line remains unread.
- Actual `P/manifest.json`2756–3663 inclusive: three dedicated reads2756–3055(limit300),3056–3355(limit300),3356–3663(limit308), all908 lines returned and read. Continuation notices point outside each requested interval, not to missing lines inside these intervals.
- Only needed page-index rows additionally read: `P/manifest.json`2272–2501,230 lines, complete zero-based indices15–24. No other page body or other tail-index section was read.
- Sole82-line `implementation/auth-credential-target-stdout-projection-renewed-result.md`1–82 fully read. Current context includes ROSTER450–454 and progress283–285; earlier oversized context reads had continuation notices and are not claimed as complete-file coverage.
- Destination collision glob absent initially and again immediately before this sole new patch creation. No commands, hashing/stat utilities, JSON evaluation, reprojection, rerun, network/browser, product/source writes or childagents occurred.

## Page/index/materialization reconciliation

Each observed body contains200 complete returned lines. The index has consecutive inclusive document ranges, adjoining half-open byte ranges, exact literal P paths and matching recorded byte lengths. All ten index identities, including every timestamp, agree with their corresponding `artifactsBeforeManifest` identities and SHA256 strings at manifest3013–3172. These are recorded projector results, not independently measured byte counts, permissions, inode identities or hashes.

| Actual file   | Document lines | Half-open bytes | Recorded bytes | Recorded inode | Page-index manifest lines | Artifact manifest lines |
| ------------- | -------------- | --------------- | -------------: | -------------- | ------------------------- | ----------------------- |
| page-0016.txt | 3001–3200      | 94743–101219    |           6476 | 524594202      | 2272–2294                 | 3013–3028               |
| page-0017.txt | 3201–3400      | 101219–107558   |           6339 | 524594203      | 2295–2317                 | 3029–3044               |
| page-0018.txt | 3401–3600      | 107558–114092   |           6534 | 524594204      | 2318–2340                 | 3045–3060               |
| page-0019.txt | 3601–3800      | 114092–120522   |           6430 | 524594205      | 2341–2363                 | 3061–3076               |
| page-0020.txt | 3801–4000      | 120522–127025   |           6503 | 524594206      | 2364–2386                 | 3077–3092               |
| page-0021.txt | 4001–4200      | 127025–133364   |           6339 | 524594207      | 2387–2409                 | 3093–3108               |
| page-0022.txt | 4201–4400      | 133364–139712   |           6348 | 524594208      | 2410–2432                 | 3109–3124               |
| page-0023.txt | 4401–4600      | 139712–146185   |           6473 | 524594209      | 2433–2455                 | 3125–3140               |
| page-0024.txt | 4601–4800      | 146185–152464   |           6279 | 524594210      | 2456–2478                 | 3141–3156               |
| page-0025.txt | 4801–5000      | 152464–157073   |           4609 | 524594211      | 2479–2501                 | 3157–3172               |

All ten recorded identities are regular/dev16777234/mode100444/nlink1 and state verified-readonly; SHA256 fields are present and identical in both recorded sections. Each recorded size is below32768. Body text has no visible omission marker, truncation replacement or synthetic status/result field; this observation is not an external raw-byte roundtrip verification. The report's1800-byte/code-unit line limits and roundtrip assertions remain recorded assertions, not newly measured maxima or rehashes.

## Actual body operations and boundaries

The entire slice is within `finalOperationTail`. Complete objects have consecutive actual sequence IDs156303–156394,92 objects, each stage `completion-receipt-after-artifact-verification` and recorded status `completed`. Literal paths refer to original capture root `.../auth-credential-target-current-capture-proposed-20261011-316`, its `completion.json`, `files`, or their actual parent prefixes—not P's page paths. Capture operation timestamps are2026-10-11, distinct from the later projector directory/artifact observations; those different intervals are not a drift finding.

- Incoming boundary: document3001/page0016:1 is the `ino` value492360100 inside a directory result whose object header is in the previous slice. Its visible remainder closes at document3009. Its sequence ID/path/header are not independently visible here and are not guessed. First complete object is156303, document3010–3029, `/private/var/folders/kx` lstat.
- Pages0016–0017 join a split directory result at document3200/3201; pages0017–0018 join another at3400/3401; pages0018–0019 join156332's result at3600/3601. All visible delimiters/fields join without a missing line.
  -156330, document3550–3562/page0018:150–162, records `read-fd-bytes`,102476106 bytes, SHA256 `243ca79de30876787300bc749d276ea5e1d1e0c886ec5c4a4fd05b0829c8478b`.156341, document3763–3776/page0019:163–176, records `read-fd-bounded-bytes`, offset0/requested102476106/bytesRead102476106. These are preserved DATA about the old completion read, not an actual completion-body read by this reviewer.
- Completion regular-file observations, including156309 fstat-before-read and156352 fstat-after-read, agree on dev16777234/inode524369190/size102476106/mode100444/nlink1 and all supplied birth/mtime/ctime fields. The bounded-read record's earlier finish time than the enclosing hash-read record is retained as returned; no fabricated duration or execution ordering is imposed.
  -156343 crosses3797–3816/pages0019–0020;156353 crosses3997–4016/pages0020–0021;156363 crosses4197–4216/pages0021–0022. Headers and continuations remain present.
  -156373, document4397–4405/pages0022:197–200 and0023:1–5, records `close-owned-fd` for original `completion.json`, completed, with no `result` or numeric descriptor field. Absence is preserved, not converted into an invented FD or registry-clearance claim.
  -156383, document4586–4604/pages0023:186–200 and0024:1–4, records complete original-root names: completion.json, files, histories.json, home, operations.json, records.json, seal.json, tmp.156393's `files` directory result crosses4785–4804/pages0024–0025, dev16777234/inode524368992/size5952/mode40700/nlink186, with its final timestamps retained.
- Last complete object156394 is document4805–4999/page0025:5–199. Its names-only result at4814–4997 lists exactly ordered0001.image–0184.image, without a gap, duplicate or extra visible name. This verifies the returned names list only, not the184 image contents or original control associations.
- Outgoing boundary: document5000/page0025:200 is the opening brace of the next object. Its header/ID and later result belong to pages0026 onward and were not read here. No capture-final descriptor-registry field appears in this slice or is manufactured.

## Assigned manifest section and cross-slice dependencies

The actual manifest2756–3663 is NOT a write/read/cappedwrite operation ledger. It contains `artifactsBeforeManifest`2756–3349 and `directorySamples`3350–3663. This difference from the anticipated section description is not a DATA inconsistency: fields absent from this actual structure remain absent.

- Artifact section fully contains input.json plus all36 page artifact records, exact P leaf paths, verified-readonly states, SHA256 and complete regular single-link identities. Input is inode524594186/3042 bytes; pages use distinct inodes524594187–524594222 and recorded sizes matching the reported ordered size list, with page0036 size470. Reading these metadata records does not claim reading other page bodies.
- All12 directory sample objects were read, including every first/last identity and checks count. Eight common ancestors have227 checks each; RAW receipt parent has4; P has223; P/home and P/tmp each1. P/home inode524594184 and P/tmp inode524594185 remain distinct0700 directories; P inode524594183 remains0700. Shared opencode sample changes size19744→19776/nlink617→618/timestamps while retaining resolution identity. P sample changes size64→1312/nlink2→41/timestamps while retaining identity. These retained membership changes are not falsely classified as inode/path drift or given an invented cause.
- Recorded parent-resolution samples are available here; explicit parentLease/cappedwrite/readback-operation/FD fields are not. The artifact identities are not substituted for unseen per-operation receipts. Descriptor reuse cannot be independently ordered from this section alone.
- Close/registry crossrefs are preserved from the fully read82-line result report74: manifest3664–5457 contains112 pre-manifest close records;5458–5459 is the BEFORE_MANIFEST_ATTEMPT registry snapshot. Later terminal evidence reportedly adds two manifest fd11 closes, creation versus verified-readback identities, followed by AFTER_MANIFEST_ATTEMPT_BEFORE_FINAL_STDOUT registry. Those close/terminal bodies are outside this lease and were not independently read here; reviewer26–35 and original Oracle must reconcile them. This review grants no descriptor-reuse or final-registry clearance by report summary.
- Original tail-index rows are owned by reviewer05–15. This reviewer independently recorded the actual body IDs/document spans above and checked its own page-index rows, but did not read that other manifest section. Oracle must join its complete tail-index review to these body boundaries, particularly the incoming unidentified partial result and outgoing opening brace.

## Disposition and limits

No assigned line is unread and no scoped P0–P3 DATA/evidence inconsistency was found. Accept only this actual ten-body/908-line manifest slice and its230 needed page-index lines. All hash/read-only/byte-conservation properties remain recorded projector results, not external measurement or hostile-filesystem/runtime proof. Original capture has no returned final descriptor field; outer projector process exit status, separated streams, timing, signal and termination remain unavailable, not0/null. No builtin/runtime/source approval, all181/138/216 map/history reconciliation, schema/current-target/native/host/J5/COMMIT/privateSSR/restore/publication release or91-of334 advance follows. Hook-only handoff; no further execution or polling.

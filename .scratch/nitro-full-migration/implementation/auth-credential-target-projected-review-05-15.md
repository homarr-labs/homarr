# Auth credential target — projected DATA review 05–15

**BOUNDED SLICE ACCEPT; no scoped P0–P3 findings. WHOLEOUTPUT/FILE-DATA capture acceptance remains HELD.** All eleven allocated actual page bodies and all 1685 allocated manifest lines were read completely with dedicated reads, without evaluation or execution. This accepts the inspected representation and joins only, not the remaining bodies, original control mapping or historical/native authenticity.

## Exact coverage and retained coordinates

P is literally `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-stdout-projection-proposed-20261012-392`.

Each exact page filename below was read at local offset1/limit200, returning every local line1–200. Document line = page startLine + local line − 1. Byte ranges, bytes, SHA256 and identities below are the already actually read manifest1926–2755 observations, retained and reconciled with these newly read bodies; no external hash/stat/byte measurement was performed. All eleven recorded identities are regular/dev16777234/mode100444/nlink1, with inode524594191 through524594201 respectively and recorded size equal to listed bytes.

| Actual file under P | Document lines | Recorded half-open bytes | Bytes | Recorded SHA256                                                  |
| ------------------- | -------------- | ------------------------ | ----: | ---------------------------------------------------------------- |
| page-0005.txt       | 801–1000       | [24053,30408)            |  6355 | bc7e94d7644b1d2d6ce9de19c9fa35679d666a47f6d071159dc44025d1a794dc |
| page-0006.txt       | 1001–1200      | [30408,36739)            |  6331 | d0c3b4cb7e12abb16b0e03e5a8f45486465468b5ace7063e1e285e53104a60fe |
| page-0007.txt       | 1201–1400      | [36739,43183)            |  6444 | 1a92e853a19dab22dedcb214406df6ea4ac20e7bcf31f9b8395de98f95c085e8 |
| page-0008.txt       | 1401–1600      | [43183,49522)            |  6339 | 09f95b61e63e4a3454b2135674f21fa04a1e250e106b855c52c1945313407d56 |
| page-0009.txt       | 1601–1800      | [49522,56022)            |  6500 | 7e288761f6556ef82bd425bdc9c91c5030c5c4dd389e7e407b36c9f5cb5fffde |
| page-0010.txt       | 1801–2000      | [56022,62465)            |  6443 | 7a7543e0e2b9dc8aaead9da877ad9c9bc79e51600bcedd7ddf23dbad69f00df3 |
| page-0011.txt       | 2001–2200      | [62465,68979)            |  6514 | 8156e8758749a0a6cb78e9f52d9ff69b86f91405379165859a7d1ffb407da206 |
| page-0012.txt       | 2201–2400      | [68979,75431)            |  6452 | f8f64b04fcf13833e984630ed625991349c698a279a8b9e4ac30665bf6265ce8 |
| page-0013.txt       | 2401–2600      | [75431,81863)            |  6432 | 8017a6577a5c0554b3422f22eb08f7f7217865ea640dae0638b558560794765c |
| page-0014.txt       | 2601–2800      | [81863,88202)            |  6339 | e021e2ea5f0102eadd0afa4301724144c2010e2d4eee284a0fd08611313c4894 |
| page-0015.txt       | 2801–3000      | [88202,94743)            |  6541 | b7945dedfa070013f85a0395fd1980541ed230359006043e5da1111197a7b7b6 |

The block is exactly2200 visible document lines; recorded byte endpoints conserve70690 bytes with no index gap/overlap. Each recorded page is200 lines and below32768 bytes. No independently measured maximum line length is asserted.

`P/manifest.json` was newly read in four disjoint exact requests: offset219/limit500 →219–718; offset719/limit500 →719–1218; offset1219/limit500 →1219–1718; offset1719/limit185 →1719–1903. Every requested line was visible. The tool's continuation notices name the next unrequested file line, not an omitted portion of these requested ranges. Unread/truncated lines within this allocation: **NONE**.

Necessary context only: complete82-line `.scratch/nitro-full-migration/implementation/auth-credential-target-stdout-projection-renewed-result.md`; latest scoped ROSTER454/status60 and progress285 matches. Prior actual page-index/9-field/338-tail/conservation/terminal evidence is retained, not reacquired or upgraded. No preflight/input/terminal/pages1–4/36 rereads occurred.

## Span map and actual body reconciliation

Manifest219–1903 contains all337 complete span records for zero-based indices0–336, strictly increasing by one, with inclusive document intervals contiguous from251 through6995: each next start equals previous end+1. Variable widths are retained, including short action/error spans and index233's4805–4999 span; no fixed20-line assumption was used. The previously actually read manifest1904–1908 index337 interval6996–7015 joins the new final index336 interval6976–6995. Index337 and its closing array were not newly read here. Bodies outside801–3000 are not certified by this map review.

The allocated bodies intersect indices28–141: incoming operation156189 spans795–814, complete interior operations156190–156301 cover815–2989, outgoing operation156302 spans2990–3009. The112 complete interior objects carry every consecutive operation ID once and match their individual manifest spans; no observed omitted/reordered object, filtered field, chunk replacement or ellipsis. Every intersecting operation's visible status is `completed`, not an outer process exit status. All visible stages remain `completion-receipt-after-artifact-verification`.

| Page | Incoming operation/fragment             | Outgoing operation/fragment                            |
| ---- | --------------------------------------- | ------------------------------------------------------ |
| 0005 | 156189, finishedAt/result continuation  | 156199, through startedAt                              |
| 0006 | 156199, finishedAt/result continuation  | 156209, through startedAt                              |
| 0007 | 156209, finishedAt/result continuation  | 156219, through result.mtimeNs                         |
| 0008 | 156219, result.ctimeNs and object close | 156229, through result.mtimeNs                         |
| 0009 | 156229, result.ctimeNs and object close | 156240, through status                                 |
| 0010 | 156240, result continuation             | 156250, result closes; outer object close is next page |
| 0011 | 156250, outer object close              | 156261, through result.type                            |
| 0012 | 156261, result.dev onward               | 156271, through result.type                            |
| 0013 | 156271, result.dev onward               | 156282, opening brace at document2600                  |
| 0014 | 156282, sequence at document2601        | 156292, opening brace at document2800                  |
| 0015 | 156292, sequence at document2801        | 156302, through result.dev at document3000             |

For synthesis, the incoming795–800 portion belongs to prior page0004 evidence; outgoing3001–3009 belongs to page0016 local1–9 and must join this final `"dev": "16777234"` with the same operation156302. These fragments are intentional page cuts, not standalone JSON documents. No JSON.parse or guessed repair was used.

The literal completion artifact path throughout these bodies is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-current-capture-proposed-20261011-316/completion.json`. Recorded actions preserve this order:

| Operation ID | Inclusive document span | Recorded action                             |
| ------------ | ----------------------- | ------------------------------------------- |
| 156191       | 835–854                 | fstat-created-output                        |
| 156212       | 1255–1263               | write-fd-bytes                              |
| 156233       | 1664–1672               | fsync-output-fd                             |
| 156244       | 1873–1881               | fchmod-owned-output-0444                    |
| 156255       | 2082–2090               | fsync-readonly-output-fd                    |
| 156266       | 2291–2310               | fstat-readonly-output                       |
| 156277       | 2511–2519               | close-owned-fd                              |
| 156298       | 2920–2929               | open-read-O_NOFOLLOW, returned descriptor11 |

The retained completion identity is dev16777234/inode524369190/nlink1/birthtimeNs1791756963777859303. Early lstat/fstat observations retain size0/mode100600; operation156222 records size102476106/mode100600 after write; operation156254 records mode100444 with mtimeNs1791756963824059924/ctimeNs1791756963832016924 after chmod. Operation156266's FD observation and subsequent path observations through156297 match the readonly size/link/identity/timestamps. These are inspected historical DATA, not new artifact reads or independent filesystem probes. Sampled ancestor/root identities and metadata remain as returned; no continuous-access/atomicity claim follows.

## Deferred gates and authority

No in-scope data defect or missing requested line remains. Full36 actual bodies, entire5467-line manifest including artifact/close receipts, joins to other reviewers, complete181-source/138-history/216-control/184-image original mappings, inventories and0555 final-directory tail still require final Oracle synthesis; this slice does not certify them. No capture-final registry field is manufactured, and pending original boundary labels remain unchanged.

The terminal remains a labeled manual transcription, not raw byte-signed transport. Pretty/assembled/raw/source-after equalities are previously recorded projector observations, not external hashes. Unavailable outer exit/stream/timing/signal/termination fields remain unavailable. No source/history/current-target reconciliation plan or schema admission is approved.

The sole handoff path was collision-glob absent initially and again immediately before this exclusive creation. No commands, JSON evaluation, hash/stat, raw-content acquisition,102MB completion read, reprojection, capture rerun, current product/source/history reads, delegation, network, polling or other writes occurred. Other reviewers/M binding/B preparation remain disjoint. Native/type/host/J5/through-COMMIT/privateSSR/restore/publication/91of334 holds are unchanged. **Hook-only return; no further action authorized.**

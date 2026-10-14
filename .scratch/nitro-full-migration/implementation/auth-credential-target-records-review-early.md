# Auth credential target — early records/seal DATA review

**SCOPED EARLY MAP ACCEPT / no P0–P3 DATA findings.** All assigned records1–2998 and seal1–995 were fully read and all62 complete image-backed rows reconciled individually. This accepts returned DATA identities/equalities only, not whole184/216/history/current-target/source/runtime/native acceptance.

## Exact coverage and authority

O = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-current-capture-proposed-20261011-316`.

A = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-author-20261011-316/allowlist.json`.

- `O/records.json`: dedicated reads1–300,301–600,601–900,901–1200,1201–1500,1501–1800,1801–2100,2101–2400,2401–2700,2701–2998; limits300 for firstnine and298 for last. All2998 requested lines visibly returned and read, including every field, not just positive statuses. No assigned line remains unread.
- `O/seal.json`: dedicated reads1–300,301–600,601–900,901–995; limits300/300/300/95. All995 requested lines visibly returned and read. Continuation notices concern the next unrequested interval, not missing requested lines.
- A was fully read as DATA in two sections1–300 and301–320. No listed physical source path grants or received an actual file read, metadata operation or image-body read. Full216 literal control-content reconciliation is NOT performed by reading A's strings.
- Context only: complete74-line capture-renewed-result and82-line projection-renewed-result; ROSTER446–470, especially460–466; progress279–293, especially289. Prior accepted page16–25 bodies were not reread.
- Sole destination collision glob absent initially and rechecked absent immediately before this new patch. No commands/stat/hash/JSON evaluation/rerun/reprojection/102MB completion/new raw artifact/current product body/native SQL/network/browser/childagents. This handoff is the sole write.

## Comparisons performed for every complete row

Each row's literal source and absolute path agree: checkout-relative sources resolve by the literal A checkoutRoot; Node, own tool/manifest and historical control sources are already literal absolute paths. Selected rows' role, stage, receipt and expected64-character SHA256 match the actual corresponding A group/file entries. Every expectedSha256 equals observedSha256, records.image.sha256 and matching seal.sourceImages.sha256. These are pin-value comparisons, not external measurement or rehash.

For each of the62 rows, sourceBefore equals sourceAfter on all nine actual fields: type/dev/ino/size/mode/nlink/birthtimeNs/mtimeNs/ctimeNs. Each image agrees with its seal entry on exact path/state/hash and all nine identity fields, including every nanosecond timestamp. Image type/dev/nlink/size agree with its source while image inode differs; source/image timestamps and permission modes are not incorrectly required to equal one another. All images are regular/dev16777234/mode100444/nlink1, verified-readonly. All source observations are regular/dev16777234/nlink1; source mode is100644 except Node100755. Node0007.image is actually100444, with distinct source413349213/image524369009 inodes and matching120965360 bytes; no executable100555 image is invented.

All62 recorded image identities have distinct inodes, and no record names a duplicate image. No fully read row lacks an image. OWN_TOOL_SOURCE/OWN_LITERAL_MANIFEST/OLD_216_CONTROL are three image-backed evidence/control rows, not product authority. No control-only-without-image row occurs in this assigned early interval; that is not a claim about later records.

## Per-row source ↔ pin ↔ image ↔ seal joins

The table follows actual array order, not filename order or assumed fixed-width rows. `R` and `S` are observed opening-object line numbers in records.json and seal.json. Each row outcome **EQ** means the complete comparisons above passed; all64 hash characters were compared, not just prefixes.

Source abbreviations expand literally: `DB/` = `packages/db/`; `D/` = `node_modules/drizzle-orm/`; `T/` = `tooling/typescript/`; `TOOL/` = A's absolute toolRoot plus `/`; `P2/` = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/stage-p2-catalog-EBJvL2/`; `NODE` = `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`. Image IDs denote exact `O/files/<ID>.image`. A references are literal group/file pin lines; role/stage group headers were also checked. C24/C25 refer to the fully read capture-renewed-result lines24/25.

| Image |    R |   S | Role                 | Literal source (prefixes above)                                                  | Pin reference                               | Equal full SHA256                                                | Outcome |
| ----- | ---: | --: | -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- | ------- |
| 0182  |   23 |   4 | OWN_TOOL_SOURCE      | TOOL/capture.mjs                                                                 | C24; records29                              | dc7668c2062631cd4979b31db198902790628b00c942c343cfa528cb313dc264 | EQ      |
| 0183  |   71 |  20 | OWN_LITERAL_MANIFEST | TOOL/allowlist.json                                                              | C25; records77                              | 0faa947af942e68a8e9396515ec3de320c72dbef624ef13cc033aab22b40df2f | EQ      |
| 0184  |  119 |  36 | OLD_216_CONTROL      | P2/preservation-before.json                                                      | A19–26 path/control purpose; records125 pin | af4be87bbd51d5ea3848177d2a2eadbbdcc7e8bb56c4eeddf2a30c792e0cc1d5 | EQ      |
| 0044  |  167 |  52 | SQLITE_JOURNAL       | DB/migrations/sqlite/meta/_journal.json                                          | A169–171                                    | bb9edfcef60d7dc7973231db6162cc609a91abaa2c0f3cdef3450daea1eef199 | EQ      |
| 0145  |  215 |  68 | POSTGRESQL_JOURNAL   | DB/migrations/postgresql/meta/_journal.json                                      | A276–278                                    | 4ba3535ad15b1eafced43a066e2de1809031a75e7b4b68a8a1e29294e5427fd1 | EQ      |
| 0008  |  263 |  84 | BOOTSTRAP            | D/package.json                                                                   | A124                                        | 9fd30ce718965c19178ac6936462b77017f1fffe56865124d0cfe55850de09ff | EQ      |
| 0035  |  311 | 100 | CUSTOMPRESERVATION   | DB/migrations/custom/index.ts                                                    | A157                                        | 047aa65dbfc097bd4e77cadf0f0e06a1357ae62bec95816700206ed12e231fee | EQ      |
| 0001  |  359 | 116 | BOOTSTRAP            | package.json                                                                     | A117                                        | ef098f9f1f319d573bc3fdea75955a9ad03b717765df076f1850ee00248b0298 | EQ      |
| 0002  |  407 | 132 | BOOTSTRAP            | bun.lock                                                                         | A118; A88 current stage                     | 01e0b188910079fc351f02c7fef6463a8d4e2a7a4c37f0b9d3c78cba403c4554 | EQ      |
| 0003  |  455 | 148 | BOOTSTRAP            | DB/package.json                                                                  | A119; A89 current stage                     | 82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b | EQ      |
| 0004  |  503 | 164 | BOOTSTRAP            | packages/core/package.json                                                       | A120                                        | 462b125f015888c06a0178a6cf9bb6ff2355147331657d5c547000f30d1041db | EQ      |
| 0005  |  551 | 180 | BOOTSTRAP            | T/package.json                                                                   | A121                                        | 7014f12629f10d670608771f1f4a26205b812057735a8d7d43ba5682cb9900d1 | EQ      |
| 0006  |  599 | 196 | BOOTSTRAP            | T/base.json                                                                      | A122                                        | f5f418afbc1023ad2cfe7ab9e526b4b898babba78684831786cec144b19dc2ff | EQ      |
| 0007  |  647 | 212 | BOOTSTRAP            | NODE                                                                             | A123                                        | ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a | EQ      |
| 0009  |  695 | 228 | BOOTSTRAP            | D/migrator.js                                                                    | A125                                        | 8c5e22b76a6a239e426b659ba999f69b4b312a052e74f533758f876795f6377c | EQ      |
| 0010  |  743 | 244 | BOOTSTRAP            | D/migrator.d.ts                                                                  | A126                                        | bb0519ff5ef245bbf829d51ad1f90002de702b536691f25334136864be259ec5 | EQ      |
| 0011  |  791 | 260 | BOOTSTRAP            | D/bun-sqlite/migrator.js                                                         | A127                                        | 41bdcf4db85fe2280792b67515b29bc7b784ab1f7cbd6a0ccb8a4f03c31da9e6 | EQ      |
| 0012  |  839 | 276 | BOOTSTRAP            | D/bun-sqlite/migrator.d.ts                                                       | A128                                        | 4a61134c82960a29bcf8fdd800f60592a9f0a85e60292ad68d8cc6ef872835c7 | EQ      |
| 0013  |  887 | 292 | BOOTSTRAP            | D/node-postgres/migrator.js                                                      | A129                                        | b7f6bf40b94d906ea3b53276d3dd80fc8144f64c3b03ae3cbf91f34cbaaf94df | EQ      |
| 0014  |  935 | 308 | BOOTSTRAP            | D/node-postgres/migrator.d.ts                                                    | A130                                        | 8924eaa6d3993fc7fa22f8cde44849b933f7853c69ffd9669522ef98d317644b | EQ      |
| 0015  |  983 | 324 | BOOTSTRAP            | D/sqlite-core/dialect.js                                                         | A131                                        | bdfdc50408b0b175b413692fcc49c13f9ebcffc41805b7159a9022328aee281f | EQ      |
| 0016  | 1031 | 340 | BOOTSTRAP            | D/sqlite-core/dialect.d.ts                                                       | A132                                        | 418ec48301149dd2c0db1dbd83305ae61fb8517accebdd4b02e72d66b27b6cc7 | EQ      |
| 0017  | 1079 | 356 | BOOTSTRAP            | D/pg-core/dialect.js                                                             | A133                                        | a7d7921c939b228a3f1295be5f024a8c264169e368f591c2d29072ffe079b14e | EQ      |
| 0018  | 1127 | 372 | BOOTSTRAP            | D/pg-core/dialect.d.ts                                                           | A134                                        | 6801ebe0b7ab3b24832bc352e939302f481496b5d90b3bc128c00823990d7c7d | EQ      |
| 0019  | 1175 | 388 | BOOTSTRAP            | D/bun-sqlite/session.js                                                          | A135                                        | d1fa0b6c512936b4a0fe8aea2f481beaa744db35477346a3f92434acbeffa52a | EQ      |
| 0020  | 1223 | 404 | BOOTSTRAP            | D/bun-sqlite/session.d.ts                                                        | A136                                        | 91a3a761ef4ca95fa023b15f71c31f1015c5d3f665ed2bec2244d9ba1d5bf4f5 | EQ      |
| 0021  | 1271 | 420 | BOOTSTRAP            | D/node-postgres/session.js                                                       | A137                                        | cfcc5e8c5a4a8c02603905e8fad619981af13a42e3221b58e2878be0a4058855 | EQ      |
| 0022  | 1319 | 436 | BOOTSTRAP            | D/node-postgres/session.d.ts                                                     | A138                                        | 45a7a6658917b9178eaf4288b8a22757dba3bc24676e166f28a3c2a4e858c4e0 | EQ      |
| 0023  | 1367 | 452 | CATALOGCOPY          | DB/runtime-catalog.ts                                                            | A141                                        | 7fb9b289a79c8e03117791726ad0492a09a49baeb034081eaeb8b37499533189 | EQ      |
| 0024  | 1415 | 468 | CATALOGCOPY          | DB/copied-runtime-catalog.ts                                                     | A142                                        | a10bff35360c5efe3cee7f0ea3ce313fd945c5787ad0620a0acb401e8eb0ba02 | EQ      |
| 0025  | 1463 | 484 | CATALOGCOPY          | DB/copied-sqlite.ts                                                              | A143                                        | 463eed48c6bbcd0b0d0b1c6981c382a1418372247ea8f5cb2f0d21a1c18d92c9 | EQ      |
| 0026  | 1511 | 500 | CATALOGCOPY          | DB/driver.ts                                                                     | A144                                        | df58ae6e03a2c874958432809543d5647351726de74135288bf79baebcc4c5b0 | EQ      |
| 0027  | 1559 | 516 | CATALOGCOPY          | DB/migrations/compatibility.ts                                                   | A145                                        | 36235681a3b51fb9203f5e5126c4e00163a9f75e0121446db134de7c6735b977 | EQ      |
| 0028  | 1607 | 532 | SCHEMACONFIG         | DB/schema/index.ts                                                               | A148                                        | aceb4d7d2cb1a9ab4e41798e2d02d787c25ef19681870b149218cf66aea5ef19 | EQ      |
| 0029  | 1655 | 548 | SCHEMACONFIG         | DB/schema/sqlite.ts                                                              | A149                                        | 5d4cd3295f4154e27e981f9f9c749cf90a770143fb267f2d5a04a598d434b5dd | EQ      |
| 0030  | 1703 | 564 | SCHEMACONFIG         | DB/schema/postgresql.ts                                                          | A150                                        | d936a9c1d397d6b4c65c2bfd848d46b0c54ff6f081390ccc3e124e13a45b9119 | EQ      |
| 0031  | 1751 | 580 | SCHEMACONFIG         | DB/schema/runtime/sqlite.ts                                                      | A151                                        | 6a771a2a4ee7b7d130ee79939055123ef6295bfb884cc9bd2e410fc78e3aee67 | EQ      |
| 0032  | 1799 | 596 | SCHEMACONFIG         | DB/schema/runtime/postgresql.ts                                                  | A152                                        | c855bfff2ae9cc86e4d965ff90555899746a9cbeec8ad820a9257a82ab572e6b | EQ      |
| 0033  | 1847 | 612 | SCHEMACONFIG         | DB/configs/runtime-sqlite.config.ts                                              | A153                                        | 8545a5d85f29ede88c89e7e91bb9fad9196b6302bd3aeba133e269b3f712e8b4 | EQ      |
| 0034  | 1895 | 628 | SCHEMACONFIG         | DB/configs/runtime-postgresql.config.ts                                          | A154                                        | 2e8c6725940a672591d69e59054b05c912a108e16f9342214adac9faa823cbd8 | EQ      |
| 0036  | 1943 | 644 | CUSTOMPRESERVATION   | DB/migrations/custom/0000_release_widget_provider_to_options.ts                  | A158                                        | 69c82d2c1b3a48f8aacdaf568bb80c50cfa6a5b6baed22bb0430a372c5a80133 | EQ      |
| 0037  | 1991 | 660 | CUSTOMPRESERVATION   | DB/migrations/custom/0001_opnsense_credentials.ts                                | A159                                        | 738233c3712b3a052c726f5d969a0c5a8df3197363b6d3af26a5ce50bb7198d5 | EQ      |
| 0038  | 2039 | 676 | CUSTOMPRESERVATION   | DB/migrations/custom/0002_app_widget_show_description_tooltip_to_display_mode.ts | A160                                        | ce17d26d70e3a1f5093b6c3a5472dfe6314869e4132b81e450ad47a6154f08df | EQ      |
| 0039  | 2087 | 692 | CUSTOMPRESERVATION   | DB/migrations/custom/0003_remove_widget_only_integrations.ts                     | A161                                        | 6a9a02f73ab9e5373681be2306dccee4399845ec3aec8e0b3f1ff64b255e36bc | EQ      |
| 0040  | 2135 | 708 | CUSTOMPRESERVATION   | DB/migrations/custom/0004_unify_sections_and_gutters.ts                          | A162                                        | b934fbb1ac1fe5765e39e7d9831f5dd9b28f984eadfe8cbdaea21ff35881cf23 | EQ      |
| 0041  | 2183 | 724 | PROFILE_PROVENANCE   | DB/tsconfig.json                                                                 | A165                                        | 5bbe0265a8cba264eaf68c5cfab620c823cb7f2fbbdc8d30374d1708595da580 | EQ      |
| 0042  | 2231 | 740 | PROFILE_PROVENANCE   | DB/tsconfig.persistence.json                                                     | A166                                        | b7a8735f9dcb2f85dbd8d7c0aad03336f3bc4e941e4476c195a63728f7b59f85 | EQ      |
| 0043  | 2279 | 756 | PROFILE_PROVENANCE   | DB/tsconfig.resources.json                                                       | A167                                        | 624f4132e93efda4bcec724838df266b62d046c20dca957353df200926e729c8 | EQ      |
| 0045  | 2327 | 772 | SQLITE_SQL           | DB/migrations/sqlite/0000_talented_ben_parker.sql                                | A173                                        | c6fd51d50bbe0a63eaab178e83dc81b202a9b6eb5fe714abfb8a1c19a45b7a44 | EQ      |
| 0046  | 2375 | 788 | SQLITE_SQL           | DB/migrations/sqlite/0001_mixed_titanium_man.sql                                 | A174                                        | 058465bfa0947ad8894abf2a20dcf4976b896978e7a74faa805e06055d852fc2 | EQ      |
| 0047  | 2423 | 804 | SQLITE_SQL           | DB/migrations/sqlite/0002_cooing_sumo.sql                                        | A175                                        | 70cc9f161df3df995279ac89f3df957669047afa59f55cb2a0e6723f3bee4c3d | EQ      |
| 0048  | 2471 | 820 | SQLITE_SQL           | DB/migrations/sqlite/0003_adorable_raider.sql                                    | A176                                        | 10ccb5e8f52c0aa600c653d002e7d22090dd3e0ea70d13285c0aacb8ca655bfb | EQ      |
| 0049  | 2519 | 836 | SQLITE_SQL           | DB/migrations/sqlite/0004_peaceful_red_ghost.sql                                 | A177                                        | a380540721b601bee0317d30272a23cf8d4a8955413d4d8ec6232ca516097e05 | EQ      |
| 0050  | 2567 | 852 | SQLITE_SQL           | DB/migrations/sqlite/0005_lean_random.sql                                        | A178                                        | f459640296a99c99f9d62f971e66e7a81804257140f7d0414b54deac5acd1deb | EQ      |
| 0051  | 2615 | 868 | SQLITE_SQL           | DB/migrations/sqlite/0006_windy_doctor_faustus.sql                               | A179                                        | cbf3736bed4b6966aa0cf04ef56f879f22dba6305fabfde94224ab5432ee413c | EQ      |
| 0052  | 2663 | 884 | SQLITE_SQL           | DB/migrations/sqlite/0007_known_ultragirl.sql                                    | A180                                        | 721592bdc44fdff9efa3234f8d7172ca1a61d3aff5ff3fc5725b0c6df23839c6 | EQ      |
| 0053  | 2711 | 900 | SQLITE_SQL           | DB/migrations/sqlite/0008_third_thor.sql                                         | A181                                        | 6de721f09f78dad924abb9f5f4328dae76a316914f9b5f04570033acbd86ad54 | EQ      |
| 0054  | 2759 | 916 | SQLITE_SQL           | DB/migrations/sqlite/0009_stale_roulette.sql                                     | A182                                        | 3688327ce98d497d7684bca6de72ecf2df6a91d4400a6559674cb4d9ec60e2ef | EQ      |
| 0055  | 2807 | 932 | SQLITE_SQL           | DB/migrations/sqlite/0010_gorgeous_stingray.sql                                  | A183                                        | 1375278b167980e9cfab9252e7e509add547d8465875b8f7f2d814e68b98dea1 | EQ      |
| 0056  | 2855 | 948 | SQLITE_SQL           | DB/migrations/sqlite/0011_classy_angel.sql                                       | A184                                        | db7cd838e954be9cf9853187d77a83920663589094399ff00f05f29393c80058 | EQ      |
| 0057  | 2903 | 964 | SQLITE_SQL           | DB/migrations/sqlite/0012_ambiguous_black_panther.sql                            | A185                                        | ba5ea9ed055770015302e46411b36104060e227117a6e09625494e75e3e62836 | EQ      |
| 0058  | 2951 | 980 | SQLITE_SQL           | DB/migrations/sqlite/0013_faithful_hex.sql                                       | A186                                        | 28a87e76d5726e3e6c32c85e2ab8f345b47878c35c7d70f8353f19607c049adb | EQ      |

## Actual scoped counts and stage separation

Counts below come from the enumerated complete objects above, not a fixed48-line heuristic or filename-based physical sequence. There are62 fully read records and62 seal members/unique source paths/unique image names: selected0001–0058 **plus0145**, and own controls0182–0184. The early scope therefore contains59 selected leaves plus3 own/control images, not only58+3. Array order begins own controls→both journals→bootstrap0008→custom0035 before0001; filename order is not creation-order evidence.

| Actual role          | Fully read rows |
| -------------------- | --------------: |
| OWN_TOOL_SOURCE      |               1 |
| OWN_LITERAL_MANIFEST |               1 |
| OLD_216_CONTROL      |               1 |
| BOOTSTRAP            |              22 |
| CATALOGCOPY          |               5 |
| SCHEMACONFIG         |               7 |
| CUSTOMPRESERVATION   |               6 |
| PROFILE_PROVENANCE   |               3 |
| SQLITE_JOURNAL       |               1 |
| POSTGRESQL_JOURNAL   |               1 |
| SQLITE_SQL           |              14 |

BOOTSTRAP rows retain literal Oracle316 current metadata/text stage, never code/native closure. In A88–89, current bun.lock `01e0b188910079fc351f02c7fef6463a8d4e2a7a4c37f0b9d3c78cba403c4554` and DB/package.json `82df209657cec3d675ef36286a93a75683ed65b19a9b147838cfe79567f3d50b` are distinct from historical P2 `1d3c33501df0be6dfdf60ff1dcf0f8b536d9e53fa0dfd5d6db18a823132ca80f` and `a92b850d2bc0ceecc63e754fbd69f91154e8d516cee44363df8972e566602230`. Records412/460 explicitly preserve those differences. No false P2 pin mismatch is reported.

CATALOGCOPY stages preserve P1/P2/P3 source scope;0024 receipt explicitly says not initial216 map member,0025 explicitly supersedes P2 copy image only. SCHEMACONFIG/CUSTOMPRESERVATION/PROFILE_PROVENANCE and both journal/SQLite SQL stages match their literal A group headers/receipts without promoting bytes to semantics, evaluation or new Auth target assets.

Own source/manifest pins match the separately recorded capture-renewed-result24–25. A does not embed a separate digest pin for its own file, capture.mjs or historical control file. OLD_216_CONTROL expected hash is the actual records125 value and equals observed/image/seal; A19–26 confirms its literal path/full216 DATA purpose, not an independent earlier external digest or216-map equality. That full control-content reconciliation remains originalOracle's exclusive scope; no expected hash is manufactured from recordedFrozenAggregate.

## Boundaries, header and retained limits

- Records1–21 fully preserves startedAt/observedAt, actual argv4 members (Node/tool/allowlist/O), cwd `/`, six literal environment keys PATH/HOME/TMPDIR/NO_COLOR/LC_ALL/__CF_USER_TEXT_ENCODING and nodeVersion24.18.0/platformdarwin/archarm64. Capture-renewed-result34's literal launch agrees with those returned operands/environment; neither the prose-reference33 nor a guessed5/7-key count replaces actual data.
- Records22 opens rows; first complete member23–70 is own source0182. Seal1–3 preserves `CAPTURE_SEAL_MANIFEST_PENDING_FINAL_CHECKS` and opens sourceImages; first member4–19 is0182. No initial object fragment is missing.
- Last complete record2951–2998 is0058, source SQLite0013_faithful_hex.sql; last complete seal member980–995 is0058, including all identity timestamps. Both assigned intervals end at complete member `},` boundaries. Records2999 onward and seal996 onward belong to the middle reviewer and were not read. Matching future0059/overlap completeness is deferred, not guessed from constant row width.
- Full184 image map/full181 source pins/full138 histories/full216 control-map equality and terminal close/registry/0555 conservation synthesis remain originalOracle and other partitions' work. No whole-record-file terminal counts or late control-only result structure are inferred from this early shape.
- Recorded before/after endpoints, read-only identity/hash assertions and pin agreement are retained results, not continuous immutability, historical authenticity, physical current-file confirmation or independent rehash. Capture's recorded exit0/empty dedicated stderr is distinct from unavailable outer projector exit/status/streams/timing/signal/termination; no unknown field is set0/null.
- No current-target/runtime/schema/generated assets/allocator/marker/adoption/private-maintenance/native SQL/host/types/J5/COMMIT/privateSSR/restore/publication/91-of334 clearance. Source-path strings and tool/control receipts are DATA, not permission or product authority. Hook-only handoff; no further dispatch/execution/polling.

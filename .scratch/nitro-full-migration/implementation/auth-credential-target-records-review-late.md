# Auth credential target — retained late records/seal review

## Scoped disposition

**ACCEPT / no scoped P0–P3 findings.** This accepts the retained DATA-only late mapping, not the full capture or any product/native gate. Reviewer model: `openai/gpt-6.1-sol`; requested high-reasoning allocation. AJN-482 session link retained.

O = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-current-capture-proposed-20261011-316`.

W = `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono`.

A = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-author-20261011-316/allowlist.json`.

## Fully visible dedicated-read coverage

- `O/records.json`: 5975–6224, 6225–6524, 6525–6824, 6825–7124, 7125–7424, 7425–7724, 7725–8024, 8025–8324, 8325–8624, 8625–8869. All assigned **2895 lines** were returned and read; no skipped fields or filtered-grep substitute.
- `O/seal.json`: 1988–2287, 2288–2587, 2588–2887, 2888–3004. All assigned **1017 lines** were returned and read.
- Literal relevant role groups/pins: `A:224–320`, dedicated read. A preceding grep located those groups only; it was not equality proof.
- Context: complete 74-line capture-renewed-result and 82-line projection-renewed-result; current ROSTER through its authoritative reconciliation at460–466 and progress through289. Older checkpoint prose is historical, not new authority.
- No commands, stat/hash operations, JSON evaluation, projection, rerun, current product bodies, SQL/snapshot/image bodies, operations body, completion body, network/browser, child agents or source writes. Sole new write is this handoff; exact destination glob immediately before creation returned absent.

## Actual counts and boundaries

The actual fully read rows yield **60 distinct sources and 60 distinct image paths**, not a filename-range-derived61:24 `SQLITE_SNAPSHOT` (0026–0049),18 `POSTGRESQL_SQL` (0000–0017),18 `POSTGRESQL_SNAPSHOT` (0000–0017). Corresponding seal rows also number60. Explicit image membership is0121–0144 and0146–0181. **0145.image occurs in neither assigned slice**; no missing-file or missing-capture finding follows. Its `POSTGRESQL_JOURNAL` allowlist pin is recorded at A276–278, but its original record/seal join belongs outside this slice and remains for the independent other-slice/Oracle synthesis. Do not attribute a journal row to this late review.

Records5975 and seal1988 both start complete objects for0121; records8854 closes the final0181 row,8855 the array; seal2947 closes0181,2948 the array. No incomplete object fragment crosses either assigned start/end. Tool-read section boundaries within objects were joined explicitly by the consecutive returned ranges.

All60 source paths equal `W/` plus their literal source strings. All image paths equal `O/files/` plus their actual image basename. Role/stage/receipt/pin matches were checked against the literal A groups, including the nonnumerical record/image order and runtime-anchor receipt suffixes:

| Group               | Literal stage                                      | Receipt binding                                                           | Literal A rows    |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- | ----------------- |
| SQLITE_SNAPSHOT     | Accepted P1/P2 complete50 snapshot byte identities | p2:line156 through p2:line179; final receipt `p2:line179; runtime anchor` | 251–274, group224 |
| POSTGRESQL_SQL      | Accepted P1/P2 complete18 SQL byte identities      | p2:line39 through p2:line56; final receipt `p2:line56; runtime anchor`    | 280–297, group279 |
| POSTGRESQL_SNAPSHOT | Accepted P1/P2 complete18 snapshot byte identities | p2:line57 through p2:line74; final receipt `p2:line74; runtime anchor`    | 300–317, group299 |

## Per-image joins

In the table, S = `packages/db/migrations/sqlite/meta/`, Q = `packages/db/migrations/postgresql/`, P = `packages/db/migrations/postgresql/meta/`. R/Z identify the actual opening-object lines in records/seal, not an assumed row-width formula. Every row's full displayed hash satisfies **literal allowlist expected = record expectedSha256 = observedSha256 = image.sha256 = seal.sha256**. Every `=` in I means all recorded sourceBefore/sourceAfter fields equal, and all record-image/seal identity fields equal: `type, dev, ino, size, mode, nlink, birthtimeNs, mtimeNs, ctimeNs`.

All60 source identities are regular/dev16777234/mode100644/nlink1; all60 record and seal images are regular/dev16777234/mode100444/nlink1/state verified-readonly. Each image size equals its source size. All60 image inodes are pairwise distinct and distinct from every source inode in this slice; the explicit inode pairs below were checked, not inferred from filenames. Source state is verified in every row.

| Image | Literal source                                | R/Z       | Source ino → image ino | Bytes | Expected=observed=image=seal SHA256                              | I   |
| ----- | --------------------------------------------- | --------- | ---------------------- | ----: | ---------------------------------------------------------------- | --- |
| 0121  | S0026_snapshot.json                           | 5975/1988 | 510811257→524369123    | 47999 | 3dd55043159d6884d38820a1b791b2d452f7f13e53aa1876919475738fa07f82 | =   |
| 0122  | S0027_snapshot.json                           | 6023/2004 | 510811258→524369124    | 48184 | e7af36d72232a2ee9e268fe5fe9604b50955a3f31aa654e091e9300e090501d3 | =   |
| 0123  | S0028_snapshot.json                           | 6071/2020 | 510811259→524369125    | 48365 | e02944c9d01a190c8aae8261b703e393df8b35069dd36ab51db59bfa6af9942a | =   |
| 0124  | S0029_snapshot.json                           | 6119/2036 | 510811260→524369126    | 53343 | 5d657b0c5c594834fa7a0dd8298227f98b09f928deeb815a862f012ec4b2e8af | =   |
| 0125  | S0030_snapshot.json                           | 6167/2052 | 510811261→524369127    | 53343 | 42267f940cd3b2c1b81da89756ac2166386a5b58f0baa99ea86e99673054ecd0 | =   |
| 0126  | S0031_snapshot.json                           | 6215/2068 | 510811262→524369128    | 53563 | e263f7299348efe3f12a53f3c9cb9ba023bcde1d5b7abe88720cf666a107d1d0 | =   |
| 0127  | S0032_snapshot.json                           | 6263/2084 | 510811263→524369129    | 54574 | c18f0d4ca900dd4fd5c7a9918df9cb6f5569e9bc80a812ebc46bc2c2e8256ee7 | =   |
| 0128  | S0033_snapshot.json                           | 6311/2100 | 510811264→524369130    | 55399 | d8d7ffe515330b62c42f059d389c6efd492363838611e0142cbba27fa6427188 | =   |
| 0129  | S0034_snapshot.json                           | 6359/2116 | 510811265→524369131    | 55887 | 46da0c3c26c904190483c701220a3613835e24c9d29c932a58c59db301db0261 | =   |
| 0130  | S0035_snapshot.json                           | 6407/2132 | 510811266→524369132    | 55542 | 4a4b96a51063ea8fde2fdcadc0494e60c17adc4e63613c898461e429f14b888d | =   |
| 0131  | S0036_snapshot.json                           | 6455/2148 | 510811267→524369133    | 55739 | 4919812d9b1980ac0201e3aca7a1bd9bbdcecaa17c9e1e4a4e67b0f53b886f02 | =   |
| 0132  | S0037_snapshot.json                           | 6503/2164 | 510811268→524369134    | 56211 | 2638b08646bc113646a43a52ada42002979514b1a884ce368eca7dd1ab224c38 | =   |
| 0133  | S0038_snapshot.json                           | 6551/2180 | 510811269→524369135    | 61367 | 681ef3e62899a72ab56c9a6f004f37655913b3d6800b44bfc9d22a55d1338ff4 | =   |
| 0134  | S0039_snapshot.json                           | 6599/2196 | 510811270→524369136    | 61385 | 079cb58eb5b9474813ab8d22be19bcb15f942d094e7271d08c4f342a26d9fdb0 | =   |
| 0135  | S0040_snapshot.json                           | 6647/2212 | 510811271→524369137    | 62798 | 5f056b151874791f0d13cae770f7b5b3456f6d961f9c10a3b0804f4c09fcdbe9 | =   |
| 0136  | S0041_snapshot.json                           | 6695/2228 | 510811272→524369138    | 63050 | bff19068da2998a41ae28b6431370854d9346c37ddbda8a8c1fca247f760eba6 | =   |
| 0137  | S0042_snapshot.json                           | 6743/2244 | 510811273→524369139    | 67719 | aaf19c9230924e7a1f7c9d57c2a87926d951093ed5de38ebf6bbb6472c1d29e8 | =   |
| 0138  | S0043_snapshot.json                           | 6791/2260 | 510811274→524369140    | 68199 | f627e33cd55ec2e0b280e3155cf6befd068f155a53161d2c798dd152f1c1468f | =   |
| 0139  | S0044_snapshot.json                           | 6839/2276 | 510811275→524369141    | 68404 | c808f46538442196356be2b2a6a8af06fbfe0ae863984da6f1c5ec7dc6042972 | =   |
| 0140  | S0045_snapshot.json                           | 6887/2292 | 510811276→524369142    | 74689 | edfd54d065350967858e073dedac99dd9d5a060be3e1cc235963e2eae8278d84 | =   |
| 0141  | S0046_snapshot.json                           | 6935/2308 | 510811277→524369143    | 75267 | a2c3aed27833d7c7ec4b8e88e5d9a8f04210741a433310b6071c23cb8658853f | =   |
| 0142  | S0047_snapshot.json                           | 6983/2324 | 510811278→524369144    | 75497 | 2680e81ecc3929f601627b77bc785326c06e051207316dd918f6c661d6025176 | =   |
| 0143  | S0048_snapshot.json                           | 7031/2340 | 510811279→524369145    | 75688 | ce623c2ded5c046ba25852914665c030d6cb31458e2b27e1a70ba5f8edc2abde | =   |
| 0144  | S0049_snapshot.json                           | 7079/2356 | 515405838→524369146    | 85007 | c34fa23c8b1caa400ce0e2082d715cffefba05a5078e4b904512ed0835bd17f1 | =   |
| 0146  | Q0000_initial.sql                             | 7127/2372 | 510811137→524369147    | 17549 | 3fca8d153f6284501dcca0b43f631b72d19bdb36ffd0e00c2bf51084ce2a334d | =   |
| 0147  | Q0001_increase-secret-kind-length.sql         | 7175/2388 | 510811138→524369148    |    78 | a5670dd7e9e8282107afeaa99d44b808f6bb688c3e9a298cc2b413bd1ab62ef5 | =   |
| 0148  | Q0002_add_app_reference_to_integration.sql    | 7223/2404 | 510811139→524369149    |   250 | 3869efc8422c8ec2e0ce3342e15c198568755aaf9b658d1f5a522e0c78548743 | =   |
| 0149  | Q0003_remove_salt.sql                         | 7271/2420 | 510811140→524369150    |   103 | 5ce370e709dcd453a4286bef2e46ab54a5a5f41f1fa5994b2a6f52e182da99ec | =   |
| 0150  | Q0004_add_user_ddg_bangs.sql                  | 7319/2436 | 510811141→524369151    |    72 | e26c91732dff01e88a2042825cd340b1d34171a90f1a0a699135e7f35214b27f | =   |
| 0151  | Q0005_add_user_onboarding_tour_status.sql     | 7367/2452 | 510811142→524369152    |   194 | c471ea6ef9168718c749c20a9660b530835dfcdf5b8ee7249dcd40ff194c0672 | =   |
| 0152  | Q0006_last_callisto.sql                       | 7415/2468 | 510811143→524369153    |  1371 | 7e40914aede7574363a760b74977c31545cf186c46dab166f2e0557c52662086 | =   |
| 0153  | Q0007_merge_custom_widget_url.sql             | 7463/2484 | 510811144→524369154    |   543 | 9522abe3200df00391f513d1cc969cd55ddb5b23aee8867bce4e3a58c00ef605 | =   |
| 0154  | Q0008_add_widget_secret.sql                   | 7511/2500 | 510811145→524369155    |   428 | 5b4a43d7e9a1116956a2988241ee7e1684c49d1de064c511915b59849605d390 | =   |
| 0155  | Q0009_add_right_click_preference.sql          | 7559/2516 | 510811146→524369157    |    92 | 6436c15d107091f34996cbc4b16723c7c53da47c5667c0db2e48b957db04f342 | =   |
| 0156  | Q0010_custom_widget_v2_tables.sql             | 7607/2532 | 510811147→524369158    |  1396 | 4ddc30354acd6d59426fdd184b2f9c64d93f425f32ed1dae360fbf06c44d35fc | =   |
| 0157  | Q0011_add_layout_gutters.sql                  | 7655/2548 | 510811148→524369159    |   200 | 9a8f30d6a51a9b231284e76df2e0afda6fd0d17fafdc1fd3dc8cc1516b96948d | =   |
| 0158  | Q0012_add_layout_role.sql                     | 7703/2564 | 510811149→524369160    |    77 | 603dfa12bf723f43c9f01b44c693c2afdf6705e6014a37143b2c4fcce0f5e4a8 | =   |
| 0159  | Q0013_add_assistant_tables.sql                | 7751/2580 | 510811150→524369161    |  1806 | 39190a4a229717c32333d1333c798bff003263df43f0f69b8fc66a8ff004d142 | =   |
| 0160  | Q0014_add_header_preferences_and_branding.sql | 7799/2596 | 510811151→524369162    |   829 | d191cae5327e33dc5c49256bd6dff8482dfa390f7850beeed20c1060c40d3209 | =   |
| 0161  | Q0015_add_byte_unit_system.sql                | 7847/2612 | 510811152→524369163    |    88 | 67fe7ecf901fea1137b7bbf4cace936db0676f197ee4cf425277c662f9e56558 | =   |
| 0162  | Q0016_add_layout_resize_source.sql            | 7895/2628 | 510811153→524369164    |    54 | 3fd1430379cd159678f0322e4373c14f1714d47b4c8ddf83378609161c29f8da | =   |
| 0163  | Q0017_ambitious_roughhouse.sql                | 7943/2644 | 515405839→524369165    |  2108 | 5ca45b95e8d355064a2cd0317c7c5f56b2aab2cc4868fdb2ca32564b5ee81529 | =   |
| 0164  | P0000_snapshot.json                           | 7991/2660 | 510811155→524369166    | 54178 | 91817fa25f6d1d636d0f794379721dc0851a45bbacf12963eb9c02fd6c8cb87b | =   |
| 0165  | P0001_snapshot.json                           | 8039/2676 | 510811156→524369167    | 54178 | d1a464c5b17b54a79d12a31ad963ba0868cbc8a848720431b3812a0b2552b3a8 | =   |
| 0166  | P0002_snapshot.json                           | 8087/2692 | 510811157→524369168    | 54640 | d945b86a1475a5e93bf38fc81e8dcca272e03c64fca4d10161cd743a5d40d2bd | =   |
| 0167  | P0003_snapshot.json                           | 8135/2708 | 510811158→524369169    | 54363 | d0078f1a209aeda5420c5f717016ef9a3f6bdfbd9a56b061559fdfaa2c229048 | =   |
| 0168  | P0004_snapshot.json                           | 8183/2724 | 510811159→524369170    | 54522 | fb6ab5ec78d18b7bca4ae32f3270f5dd5b5a998cbd3aca70fd14f014e6cc4926 | =   |
| 0169  | P0005_snapshot.json                           | 8231/2740 | 510811160→524369171    | 54926 | 6281d4a1ca7f5dae33db7ccf366107823d07ac091e6cb2247519599ec98dcd85 | =   |
| 0170  | P0006_snapshot.json                           | 8279/2756 | 510811161→524369172    | 59651 | 1c397d9449bdd82e45fe3d73200e905d5f29dd0edb028f71864e3eb8942759cf | =   |
| 0171  | P0007_snapshot.json                           | 8327/2772 | 510811162→524369173    | 59669 | f2d9810e4a8d431470c1c1eb3add5d1406163be6b9be8222ba03719fa5161770 | =   |
| 0172  | P0008_snapshot.json                           | 8375/2788 | 510811166→524369174    | 61027 | d21b45f080bc9109d877ad1ec746b590b3e5aa4f586454f9ca4c33b83000f90b | =   |
| 0173  | P0009_snapshot.json                           | 8423/2804 | 510811167→524369175    | 61258 | e972a495f0d73ff6286d199131f5bf75b3506efa7b4414390bb2973adb42e988 | =   |
| 0174  | P0010_snapshot.json                           | 8471/2820 | 510811168→524369176    | 65538 | de7e9b0e10df7b530ca6aff420e748834ee90a4e4dd43e2a3fce09f3f6ec894d | =   |
| 0175  | P0011_snapshot.json                           | 8519/2836 | 510811169→524369177    | 65952 | 287aeaeff111c4704ead73f22322aeb1f420fad6433c6000196180d70642c6da | =   |
| 0176  | P0012_snapshot.json                           | 8567/2852 | 510811170→524369178    | 66130 | 103f74f23c2e9bc52fe4dc118fa03ec7f183d22f0499f79bf5f6e180571dad21 | =   |
| 0177  | P0013_snapshot.json                           | 8615/2868 | 510811171→524369179    | 72772 | 453ca0c000523880b341d2f057c7c91d92f46f88b76232768cb0d71a48018b85 | =   |
| 0178  | P0014_snapshot.json                           | 8663/2884 | 510811172→524369181    | 73316 | f4645103138557752f2909a9017db5a6059158d9080620bdd11d53a27ab40e69 | =   |
| 0179  | P0015_snapshot.json                           | 8711/2900 | 510811173→524369182    | 73518 | 4343d6a3dc5f43642ed5edc3493a54462aad9061f6c3c8867ccb5a76eacc6deb | =   |
| 0180  | P0016_snapshot.json                           | 8759/2916 | 510811174→524369183    | 73675 | 993501220347415d4e21f2f22a07f70786efc8f663fa627dacf4986d8ae2d877 | =   |
| 0181  | P0017_snapshot.json                           | 8807/2932 | 515405840→524369184    | 83106 | 402debe006db3382d23f1077727396d1c13050633d6f247c5d92f6d491ccf81f | =   |

## Terminal receipt rows and provenance

All three literal receipt paths are `O/` plus the names below. These are actual **seal-recorded** metadata/digests, not freshly measured filesystem properties. Each row is state verified-readonly/type regular/dev16777234/mode100444/nlink1. The separate receipt-file digest/stat observations in the full capture tail are for originalOracle cross-join; this reviewer did not read the operations body or independently hash any receipt. No absent metadata field is supplied as zero.

| Receipt         | Opening seal line | Inode     |     Size | SHA256                                                           | birthtimeNs / mtimeNs / ctimeNs                               |
| --------------- | ----------------: | --------- | -------: | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| histories.json  |              2950 | 524369185 |    40608 | 01f81c616a12b2bb9e4abd28ce99730ede43e5cef4542da9039b5e6b67e094ac | 1791756963118591055 /1791756963118898849 /1791756963123634582 |
| records.json    |              2966 | 524369186 |   347226 | 32b6f39332cd45599d12aa290287a77dec3726793dacf6274f5b603809441ca1 | 1791756963129315279 /1791756963129506613 /1791756963134220638 |
| operations.json |              2982 | 524369188 | 89843237 | c5223be3c24634154f782be2008e29c81db25a87021a7f672edb96ce5164b3bf | 1791756963291464014 /1791756963327620956 /1791756963336278586 |

Seal2999–3003 preserves toolSha256 `dc7668c2062631cd4979b31db198902790628b00c942c343cfa528cb313dc264`, allowlistSha256 `0faa947af942e68a8e9396515ec3de320c72dbef624ef13cc033aab22b40df2f`, historyCount138, checkedAt `2026-10-11T22:16:03.433Z`, authority `NO_NATIVE_PRODUCT_ADOPTION_OR_HOST_CLEARANCE`. Pins match the accepted source/allowlist context recorded in the complete capture-renewed-result; no new tool/body comparison or execution occurred. The seal's **CAPTURE_SEAL_MANIFEST_PENDING_FINAL_CHECKS** status, explicitly retained by that context, is not changed to complete by this review. Its status field itself precedes this assigned seal range.

Records8856–8858 explicitly returns actualSourceLeafCount181/actualHistoryLeafCount138/metadataControlCount216. Those are **global producer-recorded count provenance**, not this review's independent181/138/216 enumeration. Records8859 hostileFilesystemAtomicity is NOT_CLAIMED;8860 oldPacketWrites is[];8861–8868 exclusions are exactly:

1. packages/db/runtime.ts
2. packages/db/transaction-gate.ts
3. packages/core/src/infrastructure/db/env.ts
4. current F/M/Auth/Icons/native candidate/Contracts verification graphs
5. all unlisted body imports/dependencies/SQL/snapshots
6. env/appdata/credentials/fixtures/protected outputs

## Limits and synthesis handoff

Recorded hashes were compared as DATA, never recomputed. Endpoint metadata equality, distinct image inodes and sampled read-only/single-link observations do not establish hostile-filesystem atomicity, continuous immutability or external authenticity. All returned identity fields were compared; unreturned fields remain absent.

Full216 controls/historicalStages/old preservation map,138 histories/model conservation and ALL36 projection-page/field/span/112+2-close synthesis remain exclusively originalOracle's scope. The actual later0555 directory observations are not in this assigned seal slice; no cross-join to those observations or receipt-tail metadata is claimed here. Cross-slice journal0145 and global184-image uniqueness must be reconciled by that synthesis, not guessed from filename ranges.

No full184/181/138/216/current-target/runtime catalog/native DDL/schema/assets/marker/adoption/private host/J5/types/through-COMMIT/SSR/restore/publication or91-of334 release follows. Hook-only return; no further execution authorized.

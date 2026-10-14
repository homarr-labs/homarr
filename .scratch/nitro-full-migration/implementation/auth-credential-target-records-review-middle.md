# Retained records/seal review — middle

**SCOPED MAP ACCEPT; no P0–P3 data/evidence inconsistencies found.** All assigned lines were read and all 62 literal records matched to their corresponding literal seal entries and accepted allowlist pins. Full capture and downstream acceptance remain HELD for original Oracle synthesis; this is retained DATA review, not execution or external measurement.

## Exact read coverage

O is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-current-capture-proposed-20261011-316`.

- **`O/records.json` 2999–5974: all 2,976 lines.** Dedicated read intervals: 2999–3248 (250); 3249–3548, 3549–3848, 3849–4148, 4149–4448, 4449–4748, 4749–5048, 5049–5348, 5349–5648, 5649–5948 (300 each); 5949–5974 (26).
- **`O/seal.json` 996–1987: all 992 lines.** Dedicated read intervals: 996–1295, 1296–1595, 1596–1895 (300 each); 1896–1987 (92).
- Every requested numbered line was returned and inspected. Continuation notices indicate the next unrequested file interval, not missing lines inside a requested interval. No requested line is unread; no grep-only status census, JSON evaluation, row-width extrapolation or truncated-body substitution was used.
- Accepted author DATA A is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/auth-credential-target-capture-tool-author-20261011-316/allowlist.json`. Relevant literal reads only: 172 (SQL group definition), 187–222 (36 applicable SQL pins), 224–250 (snapshot group definition and 26 applicable pins). A targeted role search located these groups; the actual relevant entries were then fully read.
- Context read in full: `.scratch/nitro-full-migration/implementation/auth-credential-target-current-capture-renewed-result.md` 1–74 and `auth-credential-target-stdout-projection-renewed-result.md` 1–82. Latest allocation context read at `ROSTER.md` 456–465 and `.slim/deepwork/nitro-full-migration.md` 287–289. Previously accepted pages 0026–0035 were not reread.

## Literal row census and comparison

The actual complete row objects are **62 records and 62 corresponding seal entries**, with 62 unique source strings, absolute source paths and image paths: `0059.image` through `0120.image`, each exactly once in each assigned map. Count comes from the inspected literal row objects listed below, not division by an assumed serialization width or filename arithmetic. There are no partial records at either assigned boundary.

- **36 `SQLITE_SQL` records:** `0014_colorful_cargill.sql` through `0049_robust_gateway.sql`. Exact stage `Accepted P1/P2 complete50 SQL byte identities`; receipts `p2:line94` through `p2:line129; runtime anchor`, preserving the final suffix.
- **26 `SQLITE_SNAPSHOT` records:** `meta/0000_snapshot.json` through `meta/0025_snapshot.json`. Exact stage `Accepted P1/P2 complete50 snapshot byte identities`; receipts `p2:line130` through `p2:line155`.
- These are portions of the two retained complete50 P1/P2 byte-pin groups, not independently reviewed complete50 groups. No PostgreSQL, journal, current-lock, bootstrap or own-control record is inside this slice. The role and stage are read from the actual objects, not inferred from filenames.

For **every** row, source, role, stage, receipt and full expected SHA256 match A's applicable group/entry. Its absolute `path` is the unchanged worktree root `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/` plus the exact `source`. Record `state` is `verified`; A pin = `expectedSha256` = `observedSha256` = record image `sha256` = seal entry `sha256`. These are complete recorded SHA256 string comparisons, not independently computed digests.

All nine returned source identity fields match exactly between `sourceBefore` and `sourceAfter`: `type`, `dev`, `ino`, `size`, `mode`, `nlink`, `birthtimeNs`, `mtimeNs`, `ctimeNs`. Every source is regular/dev 16777234/mode 100644/nlink 1. Every record image and corresponding seal entry have equal complete paths, `verified-readonly` states, hashes and all nine identity fields; every image is regular/dev 16777234/mode 100444/nlink 1, with size equal to its source. New image inode and timestamps are not equated to source inode and timestamps. All 62 source inodes are distinct, all 62 image inodes are distinct, and the sets are disjoint within this slice. Every returned source birthtime precedes its equal mtime/ctime, and every image birthtime precedes its mtime, which precedes its ctime; all three image timestamps agree exactly across records and seal.

Literal exceptions to any guessed inode sequence are retained: `0066.image` has inode 524369066 (not 524369065), `0116.image` has 524369117 and `0120.image` has 524369122. No image/path is missing because inode integers have gaps. `0049_robust_gateway.sql` has source inode **515405837**, birthtime 1791712268946570446 and mtime=ctime 1791712433097179031, identically before/after; its independent image inode is 524369094. This is not replaced with a guessed 510811230 or a prior-source identity.

## Compact per-image joins

R and S below are actual opening-object lines in `records.json` and `seal.json`. Source names are relative to `packages/db/migrations/sqlite/`. `A / receipt` gives the allowlist line and exact record receipt suffix; prefix is `p2:`. **P/M = yes/yes** means the full pin/path/role/stage/receipt/hash comparison above passed, and all source before/after plus image/seal metadata comparisons above passed. It does not assert source metadata equals new image metadata. Each entry below was inspected, not generated from a fixed-width rule.

| Image | R    | Exact source suffix                             | S    | A / receipt                   | P/M     |
| ----- | ---- | ----------------------------------------------- | ---- | ----------------------------- | ------- |
| 0059  | 2999 | `0014_colorful_cargill.sql`                     | 996  | 187 / line94                  | yes/yes |
| 0060  | 3047 | `0015_superb_psylocke.sql`                      | 1012 | 188 / line95                  | yes/yes |
| 0061  | 3095 | `0016_change_all_to_snake_case.sql`             | 1028 | 189 / line96                  | yes/yes |
| 0062  | 3143 | `0017_small_rumiko_fujikawa.sql`                | 1044 | 190 / line97                  | yes/yes |
| 0063  | 3191 | `0018_cheerful_tattoo.sql`                      | 1060 | 191 / line98                  | yes/yes |
| 0064  | 3239 | `0019_steady_darkhawk.sql`                      | 1076 | 192 / line99                  | yes/yes |
| 0065  | 3287 | `0020_empty_hellfire_club.sql`                  | 1092 | 193 / line100                 | yes/yes |
| 0066  | 3335 | `0021_famous_bruce_banner.sql`                  | 1108 | 194 / line101                 | yes/yes |
| 0067  | 3383 | `0022_modern_sunfire.sql`                       | 1124 | 195 / line102                 | yes/yes |
| 0068  | 3431 | `0023_fix_on_delete_actions.sql`                | 1140 | 196 / line103                 | yes/yes |
| 0069  | 3479 | `0024_bitter_scrambler.sql`                     | 1156 | 197 / line104                 | yes/yes |
| 0070  | 3527 | `0025_add-group-home-board-settings.sql`        | 1172 | 198 / line105                 | yes/yes |
| 0071  | 3575 | `0026_add-border-radius.sql`                    | 1188 | 199 / line106                 | yes/yes |
| 0072  | 3623 | `0027_wooden_blizzard.sql`                      | 1204 | 200 / line107                 | yes/yes |
| 0073  | 3671 | `0028_add_app_ping_url.sql`                     | 1220 | 201 / line108                 | yes/yes |
| 0074  | 3719 | `0029_add_layouts.sql`                          | 1236 | 202 / line109                 | yes/yes |
| 0075  | 3767 | `0030_migrate_item_and_section_for_layouts.sql` | 1252 | 203 / line110                 | yes/yes |
| 0076  | 3815 | `0031_add_dynamic_section_options.sql`          | 1268 | 204 / line111                 | yes/yes |
| 0077  | 3863 | `0032_add_trusted_certificate_hostnames.sql`    | 1284 | 205 / line112                 | yes/yes |
| 0078  | 3911 | `0033_add_cron_job_configuration.sql`           | 1300 | 206 / line113                 | yes/yes |
| 0079  | 3959 | `0034_add_app_reference_to_integration.sql`     | 1316 | 207 / line114                 | yes/yes |
| 0080  | 4007 | `0035_remove_salt.sql`                          | 1332 | 208 / line115                 | yes/yes |
| 0081  | 4055 | `0036_add_user_ddg_bangs.sql`                   | 1348 | 209 / line116                 | yes/yes |
| 0082  | 4103 | `0037_add_user_onboarding_tour_status.sql`      | 1364 | 210 / line117                 | yes/yes |
| 0083  | 4151 | `0038_crazy_hobgoblin.sql`                      | 1380 | 211 / line118                 | yes/yes |
| 0084  | 4199 | `0039_merge_custom_widget_url.sql`              | 1396 | 212 / line119                 | yes/yes |
| 0085  | 4247 | `0040_add_widget_secret.sql`                    | 1412 | 213 / line120                 | yes/yes |
| 0086  | 4295 | `0041_add_right_click_preference.sql`           | 1428 | 214 / line121                 | yes/yes |
| 0087  | 4343 | `0042_custom_widget_v2_tables.sql`              | 1444 | 215 / line122                 | yes/yes |
| 0088  | 4391 | `0043_add_layout_gutters.sql`                   | 1460 | 216 / line123                 | yes/yes |
| 0089  | 4439 | `0044_add_layout_role.sql`                      | 1476 | 217 / line124                 | yes/yes |
| 0090  | 4487 | `0045_add_assistant_tables.sql`                 | 1492 | 218 / line125                 | yes/yes |
| 0091  | 4535 | `0046_add_header_preferences_and_branding.sql`  | 1508 | 219 / line126                 | yes/yes |
| 0092  | 4583 | `0047_add_byte_unit_system.sql`                 | 1524 | 220 / line127                 | yes/yes |
| 0093  | 4631 | `0048_add_layout_resize_source.sql`             | 1540 | 221 / line128                 | yes/yes |
| 0094  | 4679 | `0049_robust_gateway.sql`                       | 1556 | 222 / line129; runtime anchor | yes/yes |
| 0095  | 4727 | `meta/0000_snapshot.json`                       | 1572 | 225 / line130                 | yes/yes |
| 0096  | 4775 | `meta/0001_snapshot.json`                       | 1588 | 226 / line131                 | yes/yes |
| 0097  | 4823 | `meta/0002_snapshot.json`                       | 1604 | 227 / line132                 | yes/yes |
| 0098  | 4871 | `meta/0003_snapshot.json`                       | 1620 | 228 / line133                 | yes/yes |
| 0099  | 4919 | `meta/0004_snapshot.json`                       | 1636 | 229 / line134                 | yes/yes |
| 0100  | 4967 | `meta/0005_snapshot.json`                       | 1652 | 230 / line135                 | yes/yes |
| 0101  | 5015 | `meta/0006_snapshot.json`                       | 1668 | 231 / line136                 | yes/yes |
| 0102  | 5063 | `meta/0007_snapshot.json`                       | 1684 | 232 / line137                 | yes/yes |
| 0103  | 5111 | `meta/0008_snapshot.json`                       | 1700 | 233 / line138                 | yes/yes |
| 0104  | 5159 | `meta/0009_snapshot.json`                       | 1716 | 234 / line139                 | yes/yes |
| 0105  | 5207 | `meta/0010_snapshot.json`                       | 1732 | 235 / line140                 | yes/yes |
| 0106  | 5255 | `meta/0011_snapshot.json`                       | 1748 | 236 / line141                 | yes/yes |
| 0107  | 5303 | `meta/0012_snapshot.json`                       | 1764 | 237 / line142                 | yes/yes |
| 0108  | 5351 | `meta/0013_snapshot.json`                       | 1780 | 238 / line143                 | yes/yes |
| 0109  | 5399 | `meta/0014_snapshot.json`                       | 1796 | 239 / line144                 | yes/yes |
| 0110  | 5447 | `meta/0015_snapshot.json`                       | 1812 | 240 / line145                 | yes/yes |
| 0111  | 5495 | `meta/0016_snapshot.json`                       | 1828 | 241 / line146                 | yes/yes |
| 0112  | 5543 | `meta/0017_snapshot.json`                       | 1844 | 242 / line147                 | yes/yes |
| 0113  | 5591 | `meta/0018_snapshot.json`                       | 1860 | 243 / line148                 | yes/yes |
| 0114  | 5639 | `meta/0019_snapshot.json`                       | 1876 | 244 / line149                 | yes/yes |
| 0115  | 5687 | `meta/0020_snapshot.json`                       | 1892 | 245 / line150                 | yes/yes |
| 0116  | 5735 | `meta/0021_snapshot.json`                       | 1908 | 246 / line151                 | yes/yes |
| 0117  | 5783 | `meta/0022_snapshot.json`                       | 1924 | 247 / line152                 | yes/yes |
| 0118  | 5831 | `meta/0023_snapshot.json`                       | 1940 | 248 / line153                 | yes/yes |
| 0119  | 5879 | `meta/0024_snapshot.json`                       | 1956 | 249 / line154                 | yes/yes |
| 0120  | 5927 | `meta/0025_snapshot.json`                       | 1972 | 250 / line155                 | yes/yes |

## Boundaries, limitations and deferred synthesis

- First full record opens at R2999 and closes at R3046; first full seal entry opens at S996 and closes at S1011. Last full record opens at R5927 and closes at R5974; last full seal entry opens at S1972 and closes at S1987. Both final delimiters retain their commas for the following entries. No adjacent reviewer record was acquired or counted.
- The internal role transition is explicit: `0094.image` closes at R4726/S1571, then `0095.image` opens at R4727/S1572 with the snapshot role/stage. That transition does not imply any new runtime asset or derive schema semantics from a filename.
- Early reviewer joins remain R2998→2999 and S995→996 (through 0058 then 0059); late reviewer joins remain R5974→5975 and S1987→1988 (0120 then 0121). Adjacent rows are coordinator allocation facts, not independently read adjacent evidence here. Global path/inode uniqueness across those slices must be reconciled by Oracle, not asserted from this slice's unique sets.
- Original Oracle owns full 216 literal old-control/history mapping and original final stdout/112+2 close/registry synthesis. These 62 records retain P1/P2 expected byte provenance and actual captured worktree source endpoints separately; they are not all 216 historical control rows, not old/current lock-stage equivalence and not current-target compatibility. SQL/snapshot semantic bodies, journals, complete histories and image contents were not acquired merely because their metadata hashes matched.
- No dedicated `imageBefore`/`imageAfter`, owner/uid/gid, per-row execution timing, close outcome or continuous immutability/authenticity fields occur in these row objects. Image comparison uses the actual record image and actual seal entry, not synthesized endpoint fields. Hashes and identity observations are recorded capture results; no external hash/stat or physical readback was performed. Equal endpoint metadata does not prove continuous nonmutation, OS atomicity, historical authenticity or hostile-filesystem safety.
- There are no missing fields within the returned compared structures, mismatched hashes/identities, duplicate/omitted applicable row mappings, error-to-success washing or clipped objects in this assigned slice. This does not establish absence of errors or omitted fields elsewhere, and unavailable fields remain absent rather than zero.

Exact handoff collision glob returned absent immediately before this file was added with patch. This is the sole new file. No commands, stat/hash utilities, JSON evaluation, reprojection/capture rerun, 102MB completion/raw-content reacquisition, referenced product/JS/SQL/snapshot/image-body read, network/browser/provider call, child agent, code/source execution or product/source write occurred. No lint/typecheck/test was run under this explicit evidence-only no-execution allocation.

**No full 181/138/216/184 capture, current-target, semantic/type/native/schema/adoption/host/J5/COMMIT/private SSR/restore/publication or 91-of-334 release.** M142 witness, B preparation and the other record/Oracle reviews remain disjoint. Hook-only return; no polling, retry or continuation authorized.

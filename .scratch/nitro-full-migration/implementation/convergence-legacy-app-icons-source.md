# Legacy app icons: one-file source return

## Delivered scope

Implemented the independently approved app-first section of `convergence-legacy-icons-plan.md:32–70` in **`packages/api/src/router/app.ts` only**. Source is frozen for independent review and coordinator-owned fresh lint/typechecks. No validation or native/application result is claimed.

The source diff contains exactly two hunks: existing public import adjustments and the `createMany` mutation body. The stale root `getIconForName(...).sync()` call is replaced with a typed sequential construction of `InferInsertModel<typeof apps>[]` and one later bulk insert.

- Each input receives its ID before its optional awaited lookup; input and ordinary ID generation order are retained.
- A supplied icon URL bypasses every icon/repository/media read. Only nullish input enters lookup.
- Lookup projects only `icons.url`, inner-joins the actual repository table, preserves `%name%` LIKE and unordered `LIMIT 1`, and excludes local rows without matching media through a correlated `EXISTS`.
- The exact local URL prefix comes from public `createLocalImageUrl("")`; the local slug comes from public `LOCAL_ICON_REPOSITORY_SLUG`. The prefix remains a Drizzle-bound value with SQL concatenation against `medias.id`, not a raw executor or dialect guess.
- Only a genuinely missing lookup result uses the unchanged `defaultIcon`. Query errors reject before insertion; no error-to-default or URL-condition fallback was added.
- Bulk insertion retains name, description, href and icon URL, omits ping fields as before, and executes once after all lookups.
- Permission/demo/authentication gates, schema, output, metadata, default URL and all other route bodies remain outside the diff.

Imports use the already declared `@homarr/db`, its public `/schema` entrypoint and `@homarr/icons/local`; no dependency, export or manifest change. There is no cast, `any`, new comment, adapter, helper entrypoint, native resource stub, callback authority boolean or implicit native/global import.

## Captured source evidence

New capture directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-legacy-app-icons-source-89c42342b90b`

| Image         | Bytes | SHA-256                                                            |
| ------------- | ----: | ------------------------------------------------------------------ |
| Before        | 11376 | `125ac4b2a08bd466badf9ab97c053709c56785f311d690d87205b4df44ca226f` |
| After, frozen | 12397 | `06c66b684e511d382a9ff02072feb41f07b2db423cd24b665d2813bf7dec0233` |

`app.before.ts`, `source-before.json`, `app.after.ts`, `app.diff` (2744 bytes), `source-after.json` and `capture-index.json` retain the actual source images, unified diff and pins. The index also binds `after-capture-initial-failure.json`. The before image still matches its original size/hash at final capture. Capture creation used an exclusive new 0700 directory and O_EXCL 0600 files. Product and report edits used `functions.patch`.

An initial after-capture command exited 1 while reading the saved before image, before any after/diff/index outputs were written: `RuntimeError: Capture input changed during read`. Its guard compared complete `lstat` records, including read-sensitive access time. No differing field was recorded, so that failure alone does not establish which metadata field changed or source-content drift. The failure is preserved, not relabeled zero. The corrected capture compares device/inode/mode/size/mtime/ctime, excludes access time, authenticates the original before pin, and completed with exit 0. No source edit was repeated and no previous evidence file was overwritten.

Only bounded Python `-I -S -B` standard-library file I/O, hashing and `difflib` capture commands ran. No program/library/configuration import or evaluation, compiler, lint, tests, network, SQL, native driver, Engine/container, real configuration/data/secrets, Git or nested agent operation occurred.

## Remaining holds

Cron is unchanged: its stale zero-argument fetch call and conditional provider/lifecycle/limits plan remain separate. No native icon source, service/admission, schema, owner factory, compiler configuration, helper file, test or manifest was changed. Other writers' files were neither modified nor captured; no whole-worktree conservation claim is made.

Existing legacy database admission binding and late credential/currentness through insertion remain unknown and unfixed by this patch. Existing database types were not narrowed; both-driver assignability is a coordinator check requirement, not proven here. This source return supplies no native credential authority, through-COMMIT proof, default application boot, production readiness or increase to recorded 91/334 acceptance. Independent source review and fresh coordinator-owned lint/typechecks are next.

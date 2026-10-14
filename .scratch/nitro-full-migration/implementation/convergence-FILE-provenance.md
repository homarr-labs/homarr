# FILE provenance — Bun 1.4.2 `fileControl` lead

## Decision

**Unsupported gap for file-backed freshness/adoption under the stated constraints.** The API lead is genuine: public, typed `Database.fileControl` can query `SQLITE_FCNTL_HAS_MOVED` on the retained native connection without FFI, a new dependency, `native.any`, or interpreting `Database.handle`. It produces a native move diagnostic, not proof that SQLite opened the exact exclusively created file, not historical freshness, and not continuous writer closure. No bounded private opener evidence producer satisfying all those requirements was established. This is research for Oracle, not a hold release or implementation proposal to bypass D.

The repaired fresh `:memory:` ownership remains unchanged and accepted only in its existing scope. It is not a durability substitute. File-backed first adoption, pre-append/existing/restart provenance, credentials and protected publication remain held.

## Evidence and version boundary

Read `convergence-D-repair.md`, `packages/db/runtime.ts`, the exact native opener `packages/core/src/infrastructure/db/drivers/sqlite.ts`, and the relevant installed `node_modules/bun-types/sqlite.d.ts` declarations. K writer's four files were not inspected or changed.

Context7 was already exhausted per coordinator; current official Bun/SQLite web documentation was used instead. Bun source was pinned to the resolved `bun-v1.4.2` commit **`744846f844374847c902b5e7fd59b4342a51ef99`**, rather than assuming current documentation describes that release. Its checked-in SQLite amalgamation declares **3.53.2**. This establishes source behavior, not verification of the installed executable, selected VFS, filesystem, or deployment. Bun documents its own statically linked SQLite on Linux/Windows and system SQLite on macOS; no Darwin-specific inference is used. [B3, B5–B6]

## What the new API actually permits

- Installed declarations at lines 560/565 and Bun's official reference expose `fileControl(op, arg?)` and `fileControl(zDbName, op, arg?)`, returning a number. The installed constant at line 1154 and pinned Bun JS source expose `SQLITE_FCNTL_HAS_MOVED = 20`. `"main"` selects the main database, not a filesystem pathname. SQLite routes the call to that connection's actual database-file `xFileControl`. [B1, B3, S1]
- The pinned Bun native binding obtains the SQLite connection via its handle registry, passes the supplied typed-array storage to `sqlite3_file_control`, and returns the **SQLite status code**, not the output boolean. **A typed-array view must be at least eight bytes**, even though this SQLite opcode writes one C `int`. A single-element `Int32Array` would be rejected. A numeric argument points to an internal temporary; its overwritten value is not returned to JS. A closed connection can return `undefined` despite the declared numeric return type. `SQLITE_ERROR` throws; other unsuccessful statuses must also be rejected. [B4]
- An exact prospective **diagnostic-only**, nonexecuted call shape is: privately allocate `new Int32Array([-1, -1])`; synchronously invoke `retainedDatabase.fileControl("main", constants.SQLITE_FCNTL_HAS_MOVED, output)`; require status exactly `SQLITE_OK` (0) and an overwritten first element exactly 0 or 1. Throws, `undefined`, `SQLITE_NOTFOUND`, any other status, or an untouched/unexpected output mean unavailable evidence, never “fresh.” Output 1 is adverse evidence; output 0 is only the reported native diagnostic. No arbitrary pointer, fabricated struct, shared buffer, caller-supplied boolean or ownership marker is needed or permitted. [B4, S1–S3]

This is a genuine opened-object-related signal, stronger than inspecting only an application pathname. Its authority must not be expanded beyond its implementation.

## Why `HAS_MOVED = 0` does not close D's gap

SQLite documents the opcode as writing whether the file has been renamed, moved or deleted since opening. The exact Unix implementation bundled in Bun 1.4.2 has a narrower observable mechanism: `findInodeInfo` obtains the native descriptor's `fstat` identity internally, but `fileHasMoved` tests `pInode != 0` and compares **a current `stat(zPath).st_ino`** with that stored native inode. It does not return that inode, compare it with the Node-created descriptor, compare `st_dev` in this predicate, maintain a sticky movement history, or report file contents/emptiness. If `pInode` is absent, this predicate also evaluates false. The file-control handler writes this predicate and returns `SQLITE_OK`. [B5]

Consequences, inferred from that source rather than claimed runtime observations:

1. A different existing file substituted **before native opening** can report 0 while still occupying its own opened pathname. D's exclusive Node creation did not create that native-opened object.
2. Bracketing the call with application pathname `stat` does not make the separate observations atomic with native opening or with each other. A pathname can alternate between the freshly created object at application checks and a different object at native opening/native checks. Repeated checks do not exclude that ABA schedule. No inode-recycling assumption is needed for this counterexample.
3. Renaming away and back between checks can restore equality. The predicate is not a historical nonmovement certificate. Inode-only equality is also not a universal cross-device identity guarantee.
4. Writes to the same inode, including another connection's committed credential changes, do not inherently make the file “moved.” A native empty-schema check establishes a current content observation, not the connection's exclusive-creation history or future writer exclusion.
5. The opcode checks the main file, not a complete journal/WAL/SHM provenance chain. SQLite explicitly warns about pathname replacement and mismatched hot journals; main-file equality cannot authorize ignoring sidecar state. [S4]

Keeping the Node `wx` handle open could retain that created resource, but would not pass it into Bun's native opener or turn these sequential checks into exact identity attestation. If such retention were investigated separately, cleanup must also respect SQLite's warning that closing another descriptor for the same database in the process can cancel POSIX advisory locks; it cannot be casually closed during native use. No such change was made. [S4 §2.2]

## Exact current opener and lifetime boundaries

`runtime.ts:223–237` creates a file with `open(path, "wx", 0o600)`, verifies that handle is regular/empty, closes it, then calls `createSqliteDb` by pathname. The native opener uses `new Database(path, { readonly, create: false, strict: true })`, configures foreign keys, and wraps that connection in Drizzle. **Pinned Bun source resets zero open flags to `READWRITE | CREATE` when strict options are present**; for the normal writable branch (`readonly` absent/false), this exact option combination therefore does not supply exclusive creation or even a no-create guarantee. SQLite additionally documents `SQLITE_OPEN_EXCLUSIVE` as a no-op for `sqlite3_open_v2`, not an `O_EXCL` replacement. Changing flags alone would not establish identity. [B3, S5]

The same connection is retained through schema migration (`runtime.ts:263–303`), optional scoped fresh initialization and custom migrations (`305–326`), ordinary ready-state callbacks, and adoption. Adoption explicitly rejects file paths before creating the adoption owner (`394–400`); its maintenance admission/drain and per-unit checks (`405–440`) are runtime-local controls. They do not enumerate or exclude independent filesystem writers or other SQLite connections. Likewise, generic maintenance (`610–632`) can supply a scoped database callback. A private directory/file policy cannot be substituted for proof that every enabled writer stays within the permitted closure through migrations, callbacks, maintenance, adoption batches and publication.

SQLite transactions serialize cooperating database writers while the relevant write transaction is held; they do not certify creation history or stop direct filesystem overwrites/renames. `BEGIN EXCLUSIVE` is equivalent to `BEGIN IMMEDIATE` in WAL mode. A batch's transaction does not by itself cover inter-batch commits or all lifetime boundaries. Filesystem permissions/private-directory policies can narrow a deployment threat model, but are not universal writer closure for portable self-hosted Linux, including same-identity processes, retained descriptors and maintenance routes. [S4, S6]

## Other exposed controls do not supply the missing producer

- `SQLITE_FCNTL_FILE_POINTER`/`VFS_POINTER` return opaque C object pointers, not public JS descriptors or inode attestations. Extracting an internal Unix fd would require the prohibited pointer/ABI route. `Database.handle` is expressly a **registry-array index, not an fd or native pointer**. [B2, S1–S2]
- `SQLITE_FCNTL_WIN32_GET_HANDLE` is Windows-specific, not portable Linux evidence. `SQLITE_FCNTL_FILESTAT` in current SQLite is conditional diagnostic functionality taking an initialized **`sqlite3_str *`**, not a JSON output byte buffer. Bun's documented typed-array/number API does not construct that native object. Passing invented struct bytes or a numeric pointer is not a safe supported solution; no availability of this build option was established. [B4–B5, S2]
- `DATA_VERSION` is a change counter, not a resource identity or exclusive-creation proof; it cannot certify the pre-open period or authoritatively classify every intervening write. `NOFOLLOW` rejects symlink filenames but supplies neither exclusive creation nor retained-fd identity. [S2, S5]
- Raw SQLite's empty filename creates an automatically deleted private temporary disk database, but Bun 1.4.2 maps its anonymous empty filename to `:memory:`. Neither supplies the required durable file-backed/restart authority. [B3, S5]

No path/hash, schema marker, caller fresh flag, custom-schema authority, new dependency, FFI, native-layout access or Darwin key was proposed as a replacement.

## Prospective Oracle scope, not authorization

Oracle can review the bounded `HAS_MOVED` diagnostic above as a **negative/rejection check only**. If separately authorized for investigation, its output buffer/status must be reinitialized/revalidated on the exact retained connection after opening, around schema/content migrations, after callback/drain boundaries, before each adoption unit, and before publication; no prior zero survives a boundary as ownership authority. Even zeros at all those points leave the intervening intervals and exclusive-created-file binding unproved. This report does not authorize implementing or running those checks.

A positive file-backed producer still needs a supported, safe mechanism that atomically creates/retains the native file or directly binds the native-opened object to the exact exclusive-created resource, plus independently justified writer/sidecar closure across the entire migration-to-publication lifetime. No such mechanism was established in the reviewed public Bun 1.4.2/SQLite APIs under the restrictions. The outcome is therefore **unsupported gap**, not a minimal fresh-file adoption candidate. Restart and existing/pre-append proof would additionally require their own authority; new-file evidence would not release them.

Only this new report was written. No commands, native/SQL execution, tests, lint/type checks, actual database-path metadata, data/environment/secret reads, rekey, resubmission, adoption, restore, product writes, installations or nested agents were used. Report-only work leaves coordinator validation ownership unchanged.

## Primary sources

- **B1:** [Bun public `Database.fileControl` reference](https://bun.com/reference/bun/sqlite/Database/fileControl).
- **B2:** [Bun public `Database.handle` reference](https://bun.com/reference/bun/sqlite/Database/handle).
- **B3:** [Pinned Bun 1.4.2 JS driver](https://github.com/oven-sh/bun/blob/744846f844374847c902b5e7fd59b4342a51ef99/src/js/bun/sqlite.ts), especially lines 74, 381–427 and 489–496.
- **B4:** [Pinned Bun 1.4.2 native binding](https://github.com/oven-sh/bun/blob/744846f844374847c902b5e7fd59b4342a51ef99/src/jsc/bindings/sqlite/JSSQLStatement.cpp#L1897-L1985), also native opening/registry at 1790–1815.
- **B5:** [Pinned Bun SQLite amalgamation](https://github.com/oven-sh/bun/blob/744846f844374847c902b5e7fd59b4342a51ef99/src/jsc/bindings/sqlite/sqlite3.c), version at 472–474, native `fstat` at 41716–41788, movement predicate at 41812–41820, opcode at 44392–44394, conditional FILESTAT at 44469–44527, and core routing at 191371–191418.
- **B6:** [Current official Bun SQLite documentation](https://bun.com/docs/runtime/sqlite), including platform linkage, file control and close semantics; floating documentation is not a substitute for the pinned source.
- **S1:** [SQLite `sqlite3_file_control`](https://www.sqlite.org/c3ref/file_control.html).
- **S2:** [SQLite standard file-control opcodes](https://www.sqlite.org/c3ref/c_fcntl_begin_atomic_write.html), especially HAS_MOVED, FILESTAT, FILE_POINTER and DATA_VERSION.
- **S3:** [SQLite OS file-method interface](https://www.sqlite.org/c3ref/io_methods.html), including unsupported-opcode `SQLITE_NOTFOUND` behavior.
- **S4:** [SQLite corruption/closure caveats](https://www.sqlite.org/howtocorrupt.html), especially §§1, 1.4, 2.2, 2.5 and 2.6.
- **S5:** [SQLite opening API](https://www.sqlite.org/c3ref/open.html), especially EXCLUSIVE, NOFOLLOW, flags and anonymous temporary databases.
- **S6:** [SQLite transaction semantics](https://www.sqlite.org/lang_transaction.html), especially write concurrency and WAL EXCLUSIVE behavior.

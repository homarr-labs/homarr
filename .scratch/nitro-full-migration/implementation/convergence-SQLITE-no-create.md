# SQLite no-create correction — narrow approval

## Decision

**APPROVE** the coordinator's bounded synthetic Bun 1.4.2 capability probe and the single core-source amendment below. This corrects native opening flags only. It grants no file provenance, exclusive native creation, writer closure, adoption, credentials, restart, restore, publication or deployment authority. All existing holds remain unchanged; the separately mutating K copied engine is excluded.

Only this report was written. The source amendment is approved for the coordinator, not applied here. No commands, tests, native/SQL execution, product writes, actual database-path metadata, environment/data/secrets, installations or nested agents were used.

## Exact source justification

`packages/core/src/infrastructure/db/drivers/sqlite.ts:18` currently passes `{ readonly: options.readonly, create: false, strict: true }`. Installed `node_modules/bun-types/sqlite.d.ts:30–84` declares `readonly`, `create`, `readwrite` and `strict` as optional booleans; its constructor accepts that options object at line 124. Current official [Bun DatabaseOptions documentation](https://bun.com/reference/bun/sqlite/DatabaseOptions) defines readonly as `SQLITE_OPEN_READONLY` (no writes/no create), readwrite as `SQLITE_OPEN_READWRITE`, and create as permission to create.

Pinned [Bun 1.4.2 JS source](https://github.com/oven-sh/bun/blob/744846f844374847c902b5e7fd59b4342a51ef99/src/js/bun/sqlite.ts#L381-L427) is decisive: options-object processing starts with flags 0, sets READONLY only for truthy `readonly`, adds READWRITE only for truthy `readwrite`, and resets flags 0 to READWRITE | CREATE when `strict` or `safeIntegers` is present. `create: false` is not an independent veto on that fallback. The [native binding](https://github.com/oven-sh/bun/blob/744846f844374847c902b5e7fd59b4342a51ef99/src/jsc/bindings/sqlite/JSSQLStatement.cpp#L1774-L1794) forwards the flags to `sqlite3_open_v2` and throws on failure.

| `options.readonly`   | Current effective flags | With `readwrite: !options.readonly` |
| -------------------- | ----------------------- | ----------------------------------- |
| absent / `undefined` | READWRITE + CREATE      | READWRITE only                      |
| `false`              | READWRITE + CREATE      | READWRITE only                      |
| `true`               | READONLY only           | READONLY only                       |

Here “+” means bitwise OR of the two flags. With the amendment every typed branch has a nonzero access flag before the fallback. `strict: true` is retained. Readonly and readwrite are never enabled together. [SQLite opening documentation](https://www.sqlite.org/c3ref/open.html) requires the file to exist with READWRITE alone or READONLY; READWRITE combined with CREATE permits creation. SQLite notes READWRITE may fall back to readonly on permission failure, so this change must not be described as guaranteed effective writability for arbitrary existing files.

## Exact approved amendment

In **`packages/core/src/infrastructure/db/drivers/sqlite.ts` only**, add **`readwrite: !options.readonly`** to the existing constructor options:

```ts
const connection = new Database(options.path, {
  readonly: options.readonly,
  readwrite: !options.readonly,
  create: false,
  strict: true,
});
```

Formatting may expand the same statement. No other body, casts, interfaces, caller behavior, migration logic, K files, Auth/runtime code or test framework is authorized by this review. The existing fresh-resource flow already separately creates the disk file before the core opener; this change does not move creation into the native opener. Bun's `:memory:` behavior is not repurposed as disk durability.

## Approved coordinator probe envelope

- Use the already cached Bun 1.4.2 image; do not pull, install or use the network. Record the image identity already available to the coordinator and builtin `Bun.version`; reject a version mismatch rather than treating another version as this probe.
- Network disabled, root filesystem read-only, numeric nonroot identity, all capabilities dropped, no-new-privileges, bounded process/memory/time resources. A fresh bounded `/tmp` tmpfs is the only writable storage for probe artifacts. No host/product/data/credential mounts, privileged mode, Docker socket, devices or deployment access. Supply the script without mounting the product checkout; use `/tmp` as its working directory.
- Import builtin `bun:sqlite` directly plus only builtin filesystem APIs needed for synthetic creation/absence checks. Do not import `createSqliteDb`, product runtime, K, Auth, Drizzle, migrations or any application module. Use distinct literal synthetic filenames wholly inside the new tmpfs; no configured path or environment-derived input.
- No SQL, schema/credential contents, migrations, table creation, SQL writes, file-control provenance checks, ABI access or write-rejection experiment is needed. The explicitly permitted file creation is only an empty synthetic file via the File API, not application data.

### Minimal observations and expected outcomes

1. **Current options, known-absent path A:** check absence specifically as ENOENT; call `new Database(A, { readonly: false, create: false, strict: true })`; record whether construction succeeds and A is created. Expected: success and creation. Close the actual returned `Database` with `close(true)` in `finally`, even if an observation fails. An additional separate absent path with `readonly: undefined` is permitted if the coordinator wants both affected branches observed; source analysis already covers it.
2. **Explicit writable options, separate known-absent path B:** call `new Database(B, { readwrite: true, readonly: false, create: false, strict: true })`; record the thrown error and verify B still reports ENOENT. Expected: constructor failure and no file. Unexpected success must also be closed in `finally` and fails the probe. Do not treat any unrelated permission/I/O error as an absence check. A throwing constructor returns no JS database to close; do not attempt native-pointer cleanup or retry it.
3. **Existing empty synthetic file C:** create C exclusively with the builtin File API (`open(C, "wx", 0o600)`), then close that File API handle **before** any native database opening. Open with explicit writable options; record constructor success; close the returned resource in `finally`. No SQL or contents are required.
4. **Same existing C, readonly branch:** after the writable connection is closed, open with `{ readonly: true, readwrite: false, create: false, strict: true }`; record constructor success and close that resource in `finally`. Pinned source establishes READONLY-only flags. Do not pass `readwrite: true` here.

Record only version/image identity, case labels, construction outcome, synthetic existence outcome, returned error details and resource-close outcome. No successful probe is asserted by this approval. Any mismatch or cleanup failure must be reported, not hidden with retries, changed flags or a different image. Destroy the isolated container/tmpfs at the end; never perform cleanup on host paths.

**Evidence limit:** Cases 3–4 observe opening under writable/readonly options, not empirical write permissions. The readonly preservation claim is grounded in the exact flags/source and SQLite's documented contract. Bun's public Database API does not expose `sqlite3_db_readonly`; no invented `db.readonly`, handle-to-fd inference or `PRAGMA query_only` proxy should be used. A direct readonly write-rejection test would exceed this no-SQL-write probe and is not approved. Existing empty-file open success alone must not be labeled measured writable enforcement either.

## Retained boundary

The approved one-property amendment removes unintended CREATE from the writable branch. It does **not** identify the SQLite-opened object with a separately created descriptor, certify freshness, exclude pathname replacement or establish closure through migrations/maintenance. The prior FILE-provenance unsupported gap remains. Coordinator owns the permitted probe and any separately authorized focused validation; no new unit/CI tests, framework, public proof or Mac/cloud deployment requirement is introduced.

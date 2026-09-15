# MySQL to SQLite

One-off converter tested against the Homarr **v1.77.1 database schema**. It creates a v1.77.1 SQLite database; Homarr v2 applies its normal SQLite migrations when started with the output.

See the [migration guide](../../apps/docs/docs/advanced/mysql-to-sqlite.mdx) for backup, Docker commands, cutover, encryption-key preservation, and rollback.

## Run locally

Requires Node 24.18+ (24.x).

```sh
npm ci
# Supply MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.
# MYSQL_SSL_CA optionally points to a PEM CA file for TLS.
node src/cli.mjs --output /new/path/db.sqlite --homarr-stopped
```

Stop **all** Homarr processes using the source database first. A SELECT-only database account is sufficient. The converter checks the migration journal and table/column types before copying. Different schemas and incomplete migrations are rejected. The application binary version is not detected; older releases with identical schemas are compatible. Upgrade to the latest stable v1 release before conversion.

The source is read in one read-only snapshot. Every transferred value and table count is verified, followed by SQLite foreign-key and integrity checks. Only a successful copy is published to the requested path. Existing destinations are never overwritten. Interruptions leave the source unchanged; a forced kill may leave an unverified `.partial-*` file, which must not be used.

The converter does not read, rotate, or decrypt encryption keys. Keep the original `SECRET_ENCRYPTION_KEY` and appdata when starting v2. It does not copy filesystem assets or convert to PostgreSQL.

## Verification

```sh
npm test
```

Requires Docker on Linux. Tests initialize disposable MySQL 8.4.6 using the published Homarr v1.77.1 image migrator pinned by digest, then populate every legacy application table, convert with a SELECT-only account, verify preserved data and cancellation/failure behavior, and run the packaged Docker entrypoint. No existing service is contacted. `e2e/mysql-conversion.spec.ts` separately boots the current Homarr image twice with the converted file and verifies authentication, board rendering, media, and decrypted secrets.

## Frozen compatibility data

`legacy/v1.77.1` contains the unmodified MySQL and SQLite SQL migrations and journals from Homarr tag `v1.77.1`, commit `7859faaa1d9bc0bb883e6f2d09770daf44750ed1` (Apache-2.0, see the repository [license](../../LICENSE)). `schema.json` records the table/column mapping from that revision's final snapshots, with explicit SQLite timestamp units taken from its schema definitions.

Do not regenerate these files from v2 or format the SQL: migration hashes are checked against the source journal. Supporting a different source schema requires identified compatibility data and a real conversion fixture.

import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { createDatabase } from "db0";
import bunConnector from "db0/connectors/bun-sqlite";
import pgConnector from "db0/connectors/postgresql";
import { sql } from "drizzle-orm";
import { drizzle as sqliteDrizzle } from "drizzle-orm/bun-sqlite";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

type Observation =
  | { kind: "verified" | "hazard"; name: string; evidence: unknown }
  | { kind: "unverified"; name: string; reason: string };

const directory = fileURLToPath(new URL("./", import.meta.url));
const runId = `sql-spike-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const observations: Observation[] = [];
const commands: { command: string[]; exitCode: number; stdout: string; stderr: string }[] = [];
const resources: { kind: string; identity: string; cleaned: boolean; details?: unknown }[] = [];
const image = "postgres@sha256:2cd82735a36356842d5eb1ef80db3ae8f1154172f0f653db48fde079b2a0b7f7";
const injection = "O'Hara'); DROP TABLE probe; -- ? $1 雪";
const schema = "CREATE TABLE probe (id INTEGER PRIMARY KEY, value INTEGER NOT NULL, note TEXT, payload BLOB)";

function record(kind: "verified" | "hazard", name: string, evidence: unknown) {
  observations.push({ kind, name, evidence });
  console.log(JSON.stringify({ kind, name, evidence }));
}

function errorInfo(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, code: "code" in error ? error.code : undefined }
    : { message: String(error) };
}

function gate() {
  const { promise, resolve } = Promise.withResolvers<void>();
  return { promise, release: resolve };
}

async function saveEvidence() {
  await writeFile(
    `${directory}results.json`,
    JSON.stringify(
      {
        runId,
        runtime: { bun: Bun.version, platform: process.platform, arch: process.arch },
        commands,
        resources,
        observations,
      },
      null,
      2,
    ),
  );
}

function docker(args: string[]) {
  const result = Bun.spawnSync(["docker", ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20000,
  });
  const entry = {
    command: ["docker", ...args],
    exitCode: result.exitCode,
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim(),
  };
  commands.push(entry);
  return entry;
}

async function directSqlite() {
  const native = new Database(":memory:", { strict: true });
  const db = sqliteDrizzle(native);
  try {
    db.run(sql.raw(schema));
    const payload = Buffer.from([0, 255, 17]);
    db.run(sql`INSERT INTO probe VALUES (${1}, ${7}, ${injection}, ${payload})`);
    const bound = db.all<{ value: number; note: string; payload: Uint8Array }>(
      sql`SELECT value, note, payload FROM probe WHERE id = ${1}`,
    )[0];
    assert.equal(bound.note, injection);
    assert.equal(bound.value, 7);
    assert.deepEqual([...bound.payload], [...payload]);
    record("verified", "direct SQLite binding", {
      note: bound.note,
      value: bound.value,
      bytes: [...bound.payload],
      sqlite: native.query("SELECT sqlite_version() AS version").get(),
    });
    assert.throws(() =>
      db.transaction(
        (tx) => {
          tx.run(sql`UPDATE probe SET value = ${99} WHERE id = ${1}`);
          tx.run(sql`INSERT INTO probe (id, value) VALUES (${2}, ${1})`);
          tx.run(sql`INSERT INTO probe (id, value) VALUES (${1}, ${1})`);
        },
        { behavior: "immediate" },
      ),
    );
    assert.deepEqual(db.all(sql`SELECT id, value FROM probe`), [{ id: 1, value: 7 }]);
    db.transaction((tx) => {
      tx.run(sql`UPDATE probe SET value = ${8} WHERE id = ${1}`);
      assert.throws(() =>
        tx.transaction((nested) => {
          nested.run(sql`INSERT INTO probe (id, value) VALUES (${2}, ${1})`);
          nested.rollback();
        }),
      );
      tx.run(sql`INSERT INTO probe (id, value) VALUES (${3}, ${1})`);
    });
    assert.deepEqual(db.all(sql`SELECT id, value FROM probe ORDER BY id`), [
      { id: 1, value: 8 },
      { id: 3, value: 1 },
    ]);
    record("verified", "direct SQLite rollback and savepoint", {
      durableRows: db.all(sql`SELECT id, value FROM probe ORDER BY id`),
    });
    const pending = gate();
    const continuation = db.transaction(async (tx) => {
      tx.run(sql`UPDATE probe SET value = ${20} WHERE id = ${1}`);
      await pending.promise;
      tx.run(sql`UPDATE probe SET value = ${21} WHERE id = ${1}`);
      throw new Error("synthetic late failure");
    });
    const beforeResume = db.all(sql`SELECT value FROM probe WHERE id = ${1}`);
    assert.equal(native.inTransaction, false);
    pending.release();
    await assert.rejects(continuation, /synthetic late failure/);
    assert.deepEqual(db.all(sql`SELECT value FROM probe WHERE id = ${1}`), [{ value: 21 }]);
    record("hazard", "direct SQLite async callback commits before await", {
      beforeResume,
      afterFailure: db.all(sql`SELECT value FROM probe WHERE id = ${1}`),
      inTransaction: native.inTransaction,
      awaited: "synthetic promise only; no network",
    });
    const prepared = native.prepare("SELECT value FROM probe WHERE id = ?");
    native.close(false);
    assert.deepEqual(prepared.get(1), { value: 21 });
    native.close(true);
    assert.throws(() => prepared.get(1));
    record("verified", "direct SQLite force-close finalizes retained prepare", {
      closeFalseRetainedStatementWorks: true,
      closeTrueRejects: true,
    });
  } finally {
    native.close(true);
  }

  const path = `${directory}fixtures/${runId}.sqlite`;
  await mkdir(`${directory}fixtures`, { recursive: true });
  const resource = { kind: "sqlite", identity: path, cleaned: false };
  resources.push(resource);
  await saveEvidence();
  const first = new Database(path, { create: true });
  const second = new Database(path);
  const firstDb = sqliteDrizzle(first);
  const secondDb = sqliteDrizzle(second);
  try {
    first.exec(schema);
    first.exec("INSERT INTO probe (id, value) VALUES (1, 7)");
    first.exec("PRAGMA busy_timeout = 0");
    second.exec("PRAGMA busy_timeout = 0");
    let busy: unknown;
    firstDb.transaction(
      (tx) => {
        tx.run(sql`UPDATE probe SET value = ${9} WHERE id = ${1}`);
        assert.deepEqual(secondDb.all(sql`SELECT value FROM probe`), [{ value: 7 }]);
        try {
          secondDb.transaction((other) => other.run(sql`UPDATE probe SET value = ${10} WHERE id = ${1}`), {
            behavior: "immediate",
          });
          assert.fail("second writer acquired immediate lock");
        } catch (error) {
          assert.match(String(error), /locked/);
          busy = errorInfo(error);
        }
      },
      { behavior: "immediate" },
    );
    secondDb.transaction((tx) => tx.run(sql`UPDATE probe SET value = ${10} WHERE id = ${1}`), {
      behavior: "immediate",
    });
    record("verified", "SQLite immediate exclusion across two owned connections", {
      busy,
      committedValue: secondDb.all(sql`SELECT value FROM probe`),
      journal: first.query("PRAGMA journal_mode").get(),
      busyTimeout: "0 in probe only; not a proposed product default",
    });
  } finally {
    second.close(true);
    first.close(true);
    for (const suffix of ["", "-journal", "-wal", "-shm"]) await rm(`${path}${suffix}`, { force: true });
    resource.cleaned = true;
  }
}

async function db0Sqlite() {
  const connector = bunConnector({ name: ":memory:" });
  const db = createDatabase(connector);
  const native = await db.getInstance();
  try {
    await db.exec(schema);
    await db.sql`INSERT INTO probe (id, value, note) VALUES (${1}, ${7}, ${injection})`;
    assert.deepEqual(await db.prepare("SELECT value, note FROM probe WHERE id = ?").bind(1).all(), [
      { value: 7, note: injection },
    ]);
    record("verified", "db0 SQLite binding and pinned capability flags", {
      capabilities: db.capabilities,
      transactionCallbackAPI: "transaction" in db,
    });
    await db.exec("BEGIN IMMEDIATE");
    await db.sql`UPDATE probe SET value = ${9} WHERE id = ${1}`;
    await db.exec("ROLLBACK");
    assert.deepEqual(await db.prepare("SELECT value FROM probe").all(), [{ value: 7 }]);
    await db.exec("BEGIN IMMEDIATE");
    await db.sql`UPDATE probe SET value = ${8} WHERE id = ${1}`;
    await db.exec("SAVEPOINT owned");
    await db.sql`INSERT INTO probe (id, value) VALUES (${2}, ${1})`;
    await db.exec("ROLLBACK TO SAVEPOINT owned");
    await db.exec("RELEASE SAVEPOINT owned");
    await db.exec("COMMIT");
    assert.deepEqual(await db.prepare("SELECT id, value FROM probe").all(), [{ id: 1, value: 8 }]);
    record("verified", "db0 SQLite sequential raw rollback/savepoint", {
      rows: await db.prepare("SELECT id, value FROM probe").all(),
    });
    await db.exec("BEGIN");
    await db.sql`UPDATE probe SET value = ${9} WHERE id = ${1}`;
    const concurrentQuery = db.sql`INSERT INTO probe (id, value) VALUES (${3}, ${1})`;
    await concurrentQuery;
    await assert.rejects(async () => db.exec("BEGIN"), /within a transaction/);
    await db.exec("ROLLBACK");
    assert.deepEqual(await db.prepare("SELECT id FROM probe WHERE id = ?").bind(3).all(), []);
    record("hazard", "db0 SQLite unrelated query joins shared transaction", {
      unrelatedInsertAcknowledgedThenRolledBack: true,
      overlappingBeginRejected: true,
    });
    const prepared = db.prepare("SELECT value FROM probe WHERE id = ?").bind(1);
    await db.dispose();
    await db.dispose();
    await assert.rejects(db.sql`SELECT 1`, /disposed/);
    const retained = await prepared.get();
    assert.deepEqual(retained, { value: 8 });
    native.close(true);
    await assert.rejects(async () => prepared.get(), /closed/);
    record("hazard", "db0 SQLite dispose guard excludes retained statements", {
      disposed: db.disposed,
      topLevelRejected: true,
      retainedStatementAfterDispose: retained,
      explicitNativeForceCloseRequired: true,
    });
  } finally {
    await db.dispose();
    native.close(true);
  }
  const integrationPath: string = "db0/integrations/drizzle";
  try {
    await import(integrationPath);
    assert.fail("unexpectedly imported v1 integration against Drizzle 0.45.2");
  } catch (error) {
    assert.ok(error instanceof SyntaxError);
    record("hazard", "db0 Drizzle integration incompatible with installed 0.45.2", errorInfo(error));
  }
}

async function postgres(config: pg.PoolConfig) {
  const pool = new pg.Pool({ ...config, max: 4, connectionTimeoutMillis: 3000, idleTimeoutMillis: 1000 });
  const db = pgDrizzle(pool);
  try {
    await db.execute(sql.raw(schema.replace("BLOB", "BYTEA")));
    const payload = Buffer.from([0, 255, 17]);
    await db.execute(sql`INSERT INTO probe VALUES (${1}, ${7}, ${injection}, ${payload})`);
    const bound = (
      await pool.query<{ value: number; note: string; payload: Buffer }>(
        "SELECT value, note, payload FROM probe WHERE id = $1",
        [1],
      )
    ).rows[0];
    assert.equal(bound.note, injection);
    assert.deepEqual(bound.payload, payload);
    record("verified", "direct PostgreSQL binding", {
      note: bound.note,
      value: bound.value,
      bytes: [...bound.payload],
      server: (await pool.query("SHOW server_version")).rows,
    });
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.execute(sql`UPDATE probe SET value = ${99} WHERE id = ${1}`);
        await tx.execute(sql`INSERT INTO probe (id, value) VALUES (${2}, ${1})`);
        await tx.execute(sql`INSERT INTO probe (id, value) VALUES (${1}, ${1})`);
      }),
    );
    assert.deepEqual((await pool.query("SELECT id, value FROM probe")).rows, [{ id: 1, value: 7 }]);
    await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE probe SET value = ${8} WHERE id = ${1}`);
      await assert.rejects(
        tx.transaction(async (nested) => {
          await nested.execute(sql`INSERT INTO probe (id, value) VALUES (${2}, ${1})`);
          nested.rollback();
        }),
      );
      await tx.execute(sql`INSERT INTO probe (id, value) VALUES (${3}, ${1})`);
    });
    assert.deepEqual((await pool.query("SELECT id, value FROM probe ORDER BY id")).rows, [
      { id: 1, value: 8 },
      { id: 3, value: 1 },
    ]);
    record("verified", "direct PostgreSQL rollback/savepoint", {
      rows: (await pool.query("SELECT id, value FROM probe ORDER BY id")).rows,
    });
    const entered = gate();
    const resume = gate();
    const pids: number[] = [];
    const transaction = db.transaction(async (tx) => {
      pids.push(Number((await tx.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid));
      await tx.execute(sql`SELECT id FROM probe WHERE id = ${1} FOR UPDATE`);
      await tx.execute(sql`UPDATE probe SET value = ${9} WHERE id = ${1}`);
      entered.release();
      await resume.promise;
      pids.push(Number((await tx.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid));
      await tx.execute(sql`UPDATE probe SET value = ${10} WHERE id = ${1}`);
    });
    try {
      await entered.promise;
      const observer = await pool.connect();
      try {
        const observerPid = Number((await observer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
        assert.notEqual(observerPid, pids[0]);
        assert.deepEqual((await observer.query("SELECT value FROM probe WHERE id = $1", [1])).rows, [{ value: 8 }]);
        await observer.query("SET lock_timeout = '150ms'");
        let lockError: unknown;
        try {
          await observer.query("UPDATE probe SET value = $1 WHERE id = $2", [90, 1]);
          assert.fail("row lock failed to exclude observer");
        } catch (error) {
          assert.equal(error instanceof Error && "code" in error ? error.code : undefined, "55P03");
          lockError = errorInfo(error);
        }
        await observer.query("INSERT INTO probe (id, value) VALUES ($1, $2)", [4, 1]);
        record("verified", "direct PostgreSQL async transaction isolation/row exclusion", {
          txPid: pids[0],
          observerPid,
          observerCommittedUnrelatedRow: true,
          lockError,
        });
      } finally {
        observer.release();
      }
    } finally {
      resume.release();
      await transaction;
    }
    assert.equal(pids[0], pids[1]);
    assert.deepEqual((await pool.query("SELECT value FROM probe WHERE id = 1")).rows, [{ value: 10 }]);
    assert.equal(pool.waitingCount, 0);
    assert.equal(pool.totalCount, pool.idleCount);
    record("verified", "direct PostgreSQL same checked-out session across await", {
      pids,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
    });
  } finally {
    await pool.end();
  }
  await assert.rejects(pool.query("SELECT 1"), /end/);
  record("verified", "direct PostgreSQL pool lifecycle", {
    totalAfterEnd: pool.totalCount,
    queryAfterEndRejected: true,
  });

  const connector = pgConnector({ ...config, application_name: runId, statement_timeout: 3000 });
  const raw = createDatabase(connector);
  try {
    await raw.sql`INSERT INTO probe (id, value, note) VALUES (${5}, ${7}, ${injection})`;
    assert.deepEqual(await raw.prepare("SELECT value, note FROM probe WHERE id = ?").bind(5).all(), [
      { value: 7, note: injection },
    ]);
    record("verified", "db0 PostgreSQL binding and pinned capabilities", {
      capabilities: raw.capabilities,
      transactionCallbackAPI: "transaction" in raw,
      driver: (await raw.getInstance()).constructor.name,
    });
    await raw.exec("BEGIN");
    await raw.sql`UPDATE probe SET value = ${90} WHERE id = ${5}`;
    await raw.exec("ROLLBACK");
    assert.deepEqual(await raw.prepare("SELECT value FROM probe WHERE id = ?").bind(5).all(), [{ value: 7 }]);
    await raw.exec("BEGIN");
    await raw.sql`UPDATE probe SET value = ${8} WHERE id = ${5}`;
    await raw.exec("SAVEPOINT owned");
    await raw.sql`INSERT INTO probe (id, value) VALUES (${6}, ${1})`;
    await raw.exec("ROLLBACK TO SAVEPOINT owned");
    await raw.exec("RELEASE SAVEPOINT owned");
    await raw.exec("COMMIT");
    assert.deepEqual(await raw.prepare("SELECT id, value FROM probe WHERE id >= ? ORDER BY id").bind(5).all(), [
      { id: 5, value: 8 },
    ]);
    record("verified", "db0 PostgreSQL sequential raw rollback/savepoint", {
      rows: await raw.prepare("SELECT id, value FROM probe WHERE id >= ? ORDER BY id").bind(5).all(),
    });
    await raw.exec("BEGIN");
    const transactionPid = await raw.prepare("SELECT pg_backend_pid() AS pid").get();
    await raw.sql`UPDATE probe SET value = ${9} WHERE id = ${5}`;
    const unrelatedQuery = raw.sql`INSERT INTO probe (id, value) VALUES (${6}, ${1})`;
    await unrelatedQuery;
    const unrelatedPid = await raw.prepare("SELECT pg_backend_pid() AS pid").get();
    await raw.exec("ROLLBACK");
    assert.deepEqual(transactionPid, unrelatedPid);
    assert.deepEqual(await raw.prepare("SELECT id FROM probe WHERE id = ?").bind(6).all(), []);
    record("hazard", "db0 PostgreSQL unrelated query joins shared session transaction", {
      transactionPid,
      unrelatedPid,
      acknowledgedUnrelatedInsertLostOnRollback: true,
    });
    await raw.exec("BEGIN");
    await raw.sql`INSERT INTO probe (id, value) VALUES (${7}, ${1})`;
    await raw.exec("BEGIN");
    await raw.sql`INSERT INTO probe (id, value) VALUES (${8}, ${1})`;
    await raw.exec("COMMIT");
    await raw.exec("ROLLBACK");
    assert.deepEqual(await raw.prepare("SELECT id FROM probe WHERE id >= ? ORDER BY id").bind(7).all(), [
      { id: 7 },
      { id: 8 },
    ]);
    record("hazard", "db0 PostgreSQL overlapping raw transactions commit each other's work", {
      bothRowsSurviveFirstOwnerRollback: true,
      note: "manual shared-session BEGIN schedule; not db0 v1 Drizzle integration",
    });
    const prepared = raw.prepare("SELECT pg_backend_pid() AS pid");
    const oldPid = await prepared.get();
    await raw.dispose();
    await raw.dispose();
    await assert.rejects(raw.sql`SELECT 1`, /disposed/);
    const reopenedPid = await prepared.get();
    assert.notDeepEqual(oldPid, reopenedPid);
    record("hazard", "db0 PostgreSQL retained statement reconnects after dispose", {
      oldPid,
      reopenedPid,
      topLevelRejected: true,
      disposed: raw.disposed,
      cleanup: "explicit original connector.dispose closes recreated client",
    });
  } finally {
    await raw.dispose();
    await connector.dispose?.();
  }
}

async function disposablePostgres() {
  const availability = docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  if (availability.exitCode !== 0) {
    observations.push({ kind: "unverified", name: "PostgreSQL", reason: availability.stderr });
    return;
  }
  const created = docker([
    "create",
    "--pull=never",
    "--name",
    runId,
    "--label",
    "homarr.sql-spike=true",
    "--publish",
    "127.0.0.1::5432",
    "--tmpfs",
    "/var/lib/postgresql/data:rw",
    "--env",
    "PGDATA=/var/lib/postgresql/data/owned",
    "--env",
    "POSTGRES_USER=sql_spike_only",
    "--env",
    "POSTGRES_PASSWORD=disposable_sql_spike_only",
    "--env",
    "POSTGRES_DB=sql_spike_only",
    image,
  ]);
  if (created.exitCode !== 0) {
    observations.push({ kind: "unverified", name: "PostgreSQL", reason: created.stderr });
    return;
  }
  const containerId = created.stdout;
  assert.match(containerId, /^[a-f0-9]{64}$/);
  const resource = {
    kind: "postgres-container",
    identity: containerId,
    cleaned: false,
    details: { name: runId, image },
  };
  resources.push(resource);
  await saveEvidence();
  try {
    const started = docker(["start", containerId]);
    if (started.exitCode !== 0) throw new Error(started.stderr);
    const inspected = docker([
      "inspect",
      containerId,
      "--format",
      "{{json .NetworkSettings.Ports}} {{json .HostConfig.Tmpfs}} {{json .Mounts}}",
    ]);
    assert.equal(inspected.exitCode, 0);
    const portInfo = docker(["port", containerId, "5432/tcp"]);
    assert.equal(portInfo.exitCode, 0);
    const match = /^127\.0\.0\.1:(\d+)$/.exec(portInfo.stdout);
    assert.ok(match);
    const port = Number(match[1]);
    assert.notEqual(port, 5432);
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const check = docker(["exec", containerId, "pg_isready", "-U", "sql_spike_only", "-d", "sql_spike_only"]);
      if (check.exitCode === 0) {
        ready = true;
        break;
      }
      await Bun.sleep(200);
    }
    if (!ready) throw new Error("owned PostgreSQL container never became ready");
    record("verified", "owned PostgreSQL resource isolation", {
      containerId,
      image,
      loopbackPort: portInfo.stdout,
      inspect: inspected.stdout,
    });
    await postgres({
      host: "127.0.0.1",
      port,
      user: "sql_spike_only",
      password: "disposable_sql_spike_only",
      database: "sql_spike_only",
      ssl: false,
    });
  } finally {
    const removed = docker(["rm", "--force", containerId]);
    resource.cleaned = removed.exitCode === 0;
    assert.equal(removed.exitCode, 0, removed.stderr);
    const absent = docker(["inspect", containerId, "--format", "{{.Id}}"]);
    assert.notEqual(absent.exitCode, 0);
  }
}

try {
  assert.equal(Bun.version, "1.4.2");
  for (const [name, version] of [
    ["drizzle-orm", "0.45.2"],
    ["pg", "8.22.0"],
    ["db0", "0.4.1"],
    ["nitro", "3.0.260903-beta"],
  ]) {
    const resolved = import.meta.resolve(`${name}/package.json`);
    const metadata: unknown = await Bun.file(fileURLToPath(resolved)).json();
    assert.ok(typeof metadata === "object" && metadata !== null && "version" in metadata);
    assert.equal(metadata.version, version);
    record("verified", "installed pin", { name, version, resolved });
  }
  await directSqlite();
  await db0Sqlite();
  await disposablePostgres();
} catch (error) {
  observations.push({ kind: "unverified", name: "probe stopped", reason: JSON.stringify(errorInfo(error)) });
  console.error(error);
  process.exitCode = 1;
} finally {
  await saveEvidence();
}

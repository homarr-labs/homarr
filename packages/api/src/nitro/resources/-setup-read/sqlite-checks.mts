import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function removeOwnedFile(file: string) {
  try {
    await fs.unlink(file);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}

export async function runOwnedSetupReadSqliteChecksAsync(migrationsFolder: string): Promise<void> {
  if (!path.isAbsolute(migrationsFolder)) throw new Error("Explicit absolute SQLite migration assets are required");
  const [
    { createPersistenceRuntime },
    { eq, sql },
    { createSetupReadResources, createSetupBackedContext, SetupReadAdmissionError },
  ] = await Promise.all([import("@homarr/db/runtime"), import("drizzle-orm"), import("./context")]);
  const directory = await fs.mkdtemp(path.join(fileURLToPath(new URL("./", import.meta.url)), ".sqlite-fixture-"));
  const databasePath = path.join(directory, "fixture.sqlite");
  const runtime = createPersistenceRuntime({ engine: "sqlite", path: databasePath, mode: "fresh", migrationsFolder });
  const token = "owned SQLite setup-read fixture";
  const hash = createHash("sha256").update(token).digest("hex");
  let checkReleasedAdmission: (() => Promise<void>) | undefined;
  try {
    await runtime.openAsync();
    await runtime.migrateAsync();
    assert.equal((await runtime.checkReadinessAsync()).ready, true);
    await runtime.withDatabaseAsync(async (handle) => {
      if (handle.engine !== "sqlite") throw new Error("SQLite fixture required");
      const { database: db, schema } = handle;
      assert.equal(await db.query.users.findFirst(), undefined);
      assert.equal(await db.query.onboarding.findFirst(), undefined);
      const controller = new AbortController();
      let active = true;
      let fences = 0;
      let now = 100;
      let clockCalls = 0;
      let afterSample: (() => void) | undefined;
      const admission = {
        database: db,
        schema,
        signal: controller.signal,
        assertCurrent() {
          fences++;
          if (!active) throw new Error("Fixture admission expired");
          afterSample?.();
        },
      };
      const resources = {
        operators: { eq },
        now() {
          clockCalls++;
          return now;
        },
      };
      const setup = createSetupReadResources(admission, resources);
      assert.equal(await setup.currentStep(db), "start");
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, undefined), false);
      await db
        .insert(schema.serverSettings)
        .values({ settingKey: "__onboarding_claim", value: JSON.stringify({ hash, expiresAt: 101 }) });
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), true);
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, "wrong"), false);
      now = 101;
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), false);
      now = 100;
      const clocksBefore = clockCalls;
      afterSample = () => {
        if (clockCalls > clocksBefore) now = 1000;
      };
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), true);
      assert.equal(clockCalls, clocksBefore + 1);
      afterSample = undefined;
      now = 100;
      await db
        .update(schema.serverSettings)
        .set({ value: "malformed" })
        .where(eq(schema.serverSettings.settingKey, "__onboarding_claim"));
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), false);
      await db
        .update(schema.serverSettings)
        .set({ value: JSON.stringify({ hash, expiresAt: 101 }) })
        .where(eq(schema.serverSettings.settingKey, "__onboarding_claim"));
      await db.insert(schema.users).values({ id: "setup-read-fixture-user" });
      await db.run(sql`ALTER TABLE serverSetting RENAME TO setup_read_held_setting`);
      try {
        assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), false);
      } finally {
        await db.run(sql`ALTER TABLE setup_read_held_setting RENAME TO serverSetting`);
      }
      await db.delete(schema.users).where(eq(schema.users.id, "setup-read-fixture-user"));
      await db.insert(schema.onboarding).values({ id: "setup-read-fixture-step", step: "finish" });
      assert.equal(await setup.currentStep(db), "finish");
      assert.equal(await setup.isClaimOnlyAccessAllowed(db, token), true);
      await db.run(
        sql`UPDATE onboarding SET step = 'integrations', previousStep = 'settings' WHERE id = 'setup-read-fixture-step'`,
      );
      assert.equal(await setup.currentStep(db), "setup");
      const disposed: (() => void | Promise<void>)[] = [];
      const effects: unknown[] = [];
      const context = createSetupBackedContext(
        {
          request: new Request("https://fixture.invalid/rpc", {
            headers: { cookie: "homarr-onboarding-claim=fixture%3Dtoken" },
          }),
          signal: controller.signal,
          principal: { kind: "anonymous" },
          deviceType: undefined,
          baseUrl: "https://fixture.invalid",
          demo: { enabled: false, readOnly: false },
          effect(effect) {
            effects.push(effect);
          },
          onDispose(dispose) {
            disposed.push(dispose);
          },
        },
        admission,
        resources,
      );
      assert.equal(context.db, db);
      assert.equal(context.onboardingClaimToken, "fixture=token");
      assert.equal(context.deviceType, undefined);
      assert.equal(Object.isFrozen(context), true);
      assert.equal(effects.length, 0);
      assert.equal(disposed.length, 0);
      await runtime.withDatabaseAsync(async (other) => {
        if (other.engine !== "sqlite") throw new Error("SQLite fixture required");
        await assert.rejects(
          setup.currentStep(other.database),
          (error: unknown) => error instanceof SetupReadAdmissionError && error.reason === "foreign-database",
        );
      });
      const previousFences = fences;
      afterSample = () => {
        if (fences >= previousFences + 3) active = false;
      };
      await assert.rejects(
        setup.currentStep(db),
        (error: unknown) => error instanceof SetupReadAdmissionError && error.reason === "inactive",
      );
      active = true;
      afterSample = undefined;
      await db.run(sql`ALTER TABLE serverSetting RENAME TO setup_read_held_setting`);
      try {
        await assert.rejects(
          setup.isClaimOnlyAccessAllowed(db, token),
          (error: unknown) => error instanceof Error && !(error instanceof SetupReadAdmissionError),
        );
      } finally {
        await db.run(sql`ALTER TABLE setup_read_held_setting RENAME TO serverSetting`);
      }
      controller.abort();
      await assert.rejects(
        setup.currentStep(db),
        (error: unknown) => error instanceof SetupReadAdmissionError && error.reason === "cancelled",
      );
      checkReleasedAdmission = async () => {
        await assert.rejects(setup.currentStep(db), SetupReadAdmissionError);
        assert.throws(
          () => context.effect({ kind: "header", name: "x-fixture", value: "held", mode: "set" }),
          SetupReadAdmissionError,
        );
      };
      active = false;
    });
    if (!checkReleasedAdmission) throw new Error("Released-admission fixture was not prepared");
    await checkReleasedAdmission();
  } finally {
    await runtime.closeAsync();
    for (const file of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) await removeOwnedFile(file);
    await fs.rmdir(directory);
  }
}

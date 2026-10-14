import type { Database } from "db0";
import { useDatabase } from "nitro/database";

import type { FixtureRepository } from "./repository";
import { createFixtureRepository, initializeFixtures } from "./repository";

let database: Database | undefined;
let repository: FixtureRepository | undefined;
let readiness: Promise<void> | undefined;
let closing = false;

export function initializeDatabase(): Promise<void> {
  if (closing) return Promise.reject(new Error("Fixture database is closing"));
  return (readiness ??= (async () => {
    database = useDatabase("fixture");
    await initializeFixtures(database);
    repository = createFixtureRepository(database);
  })());
}

export async function getFixtureRepository(): Promise<FixtureRepository> {
  await initializeDatabase();
  if (closing || !repository) throw new Error("Fixture database unavailable");
  return repository;
}

export async function closeDatabase(): Promise<void> {
  closing = true;
  await readiness?.catch(() => undefined);
  repository = undefined;
  await database?.dispose();
}

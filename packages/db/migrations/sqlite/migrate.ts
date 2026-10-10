import { createPersistenceRuntime } from "../../runtime";
import type { PersistenceConfig } from "../../runtime";
import { seedDataAsync } from "../seed";
import type { SeedOptions } from "../seed";

export const migrateSqliteAsync = async (
  config: Extract<PersistenceConfig, { engine: "sqlite" }>,
  freshSeedOptions?: SeedOptions,
) => {
  const runtime = createPersistenceRuntime(config);
  try {
    await runtime.openAsync();
    await runtime.migrateAsync({
      initializeFreshAsync: freshSeedOptions ? (database) => seedDataAsync(database, freshSeedOptions) : undefined,
    });
  } finally {
    await runtime.closeAsync();
  }
};

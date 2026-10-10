import { createPersistenceRuntime } from "../../runtime";
import type { PersistenceConfig } from "../../runtime";

export const migratePostgresqlAsync = async (config: Extract<PersistenceConfig, { engine: "postgresql" }>) => {
  const runtime = createPersistenceRuntime(config);
  try {
    await runtime.openAsync();
    await runtime.migrateAsync();
  } finally {
    await runtime.closeAsync();
  }
};

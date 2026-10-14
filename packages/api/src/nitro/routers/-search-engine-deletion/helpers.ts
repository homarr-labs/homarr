import type { Database } from "@homarr/db";

import type { SearchEngineDeletionResources } from "./resources";

export async function removeSearchEngineWithDefaultsAsync(
  resources: SearchEngineDeletionResources,
  db: Database,
  engineId: string,
) {
  const { eq } = resources.operators;
  const binding = resources.nativeDatabase(db);
  if (binding.kind === "postgresql") {
    const { users, searchEngines } = binding.schema;
    await binding.db.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ defaultSearchEngineId: null })
        .where(eq(users.defaultSearchEngineId, engineId));
      await transaction.delete(searchEngines).where(eq(searchEngines.id, engineId));
    });
    return;
  }
  const { users, searchEngines } = binding.schema;
  binding.db.transaction((transaction) => {
    transaction
      .update(users)
      .set({ defaultSearchEngineId: null })
      .where(eq(users.defaultSearchEngineId, engineId))
      .run();
    transaction.delete(searchEngines).where(eq(searchEngines.id, engineId)).run();
  });
}

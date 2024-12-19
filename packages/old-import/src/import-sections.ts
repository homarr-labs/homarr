import { createId } from "@homarr/db";
import type { Database } from "@homarr/db";
import { sections } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import type { OldmarrConfig } from "@homarr/old-schema";

export const insertSectionsAsync = async (
  db: Database,
  categories: OldmarrConfig["categories"],
  wrappers: OldmarrConfig["wrappers"],
  boardId: string,
) => {
  logger.info(
    `Importing old homarr sections boardId=${boardId} categories=${categories.length} wrappers=${wrappers.length}`,
  );

  const wrapperIds = wrappers.map((section) => section.id);
  const categoryIds = categories.map((section) => section.id);
  const idMaps = new Map<string, string>([...wrapperIds, ...categoryIds].map((id) => [id, createId()]));

  const wrappersToInsert = wrappers.map((section) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: idMaps.get(section.id)!,
    boardId,
    xOffset: 0,
    yOffset: section.position,
    kind: "empty" as const,
  }));

  const categoriesToInsert = categories.map((section) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: idMaps.get(section.id)!,
    boardId,
    xOffset: 0,
    yOffset: section.position,
    kind: "category" as const,
    name: section.name,
  }));

  if (wrappersToInsert.length > 0) {
    await db.insert(sections).values(wrappersToInsert);
  }

  if (categoriesToInsert.length > 0) {
    await db.insert(sections).values(categoriesToInsert);
  }

  logger.info(`Imported sections count=${wrappersToInsert.length + categoriesToInsert.length}`);

  return idMaps;
};

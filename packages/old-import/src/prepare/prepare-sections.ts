import type { InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db/client";
import type { sections } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";

export const prepareSections = (
  categories: OldmarrConfig["categories"],
  wrappers: OldmarrConfig["wrappers"],
  boardId: string,
) => {
  const wrapperIds = wrappers.map((section) => section.id);
  const categoryIds = categories.map((section) => section.id);
  const idMap = new Map<string, string>([...wrapperIds, ...categoryIds].map((id) => [id, createId()]));

  const sectionsToCreate: InferInsertModel<typeof sections>[] = [];
  sectionsToCreate.concat(
    wrappers.map((section) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: idMap.get(section.id)!,
      boardId,
      xOffset: 0,
      yOffset: section.position,
      kind: "empty",
    })),
  );

  sectionsToCreate.concat(
    categories.map((section) => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: idMap.get(section.id)!,
      boardId,
      xOffset: 0,
      yOffset: section.position,
      kind: "category",
      name: section.name,
    })),
  );

  return {
    map: idMap,
    sectionsToCreate,
  };
};

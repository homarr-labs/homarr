import { stringify } from "superjson";

import { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import type { sections } from "@homarr/db/schema";
import { emptySuperJSON, rootSectionOffsets } from "@homarr/definitions";
import type { OldmarrCategorySection } from "@homarr/old-schema";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

export const mapLegacyCategoryContainer = (
  boardId: string,
  category: OldmarrCategorySection,
): InferInsertModel<typeof sections> => ({
  id: createId(),
  boardId,
  kind: "container",
  xOffset: null,
  yOffset: null,
  name: null,
  options: stringify(
    containerSectionOptionsSchema.parse({
      title: category.name.slice(0, 64),
      showLabel: true,
      collapsible: true,
      showOpenAll: true,
    }),
  ),
});

export const mapMainRootSection = (boardId: string): InferInsertModel<typeof sections> => ({
  id: createId(),
  boardId,
  kind: "empty",
  xOffset: rootSectionOffsets.main,
  yOffset: 0,
  name: null,
  options: emptySuperJSON,
});

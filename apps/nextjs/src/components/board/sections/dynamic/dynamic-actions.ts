import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";
import type { EmptySuperJSON } from "@homarr/definitions";

import { addDynamicSectionCallback } from "./actions/add-dynamic-section";
import type { RemoveDynamicSectionInput } from "./actions/remove-dynamic-section";
import { removeDynamicSectionCallback } from "./actions/remove-dynamic-section";

interface UpdateDynamicOptions {
  newOptions: EmptySuperJSON;
}

export const useDynamicSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const addDynamicSection = useCallback(() => {
    updateBoard(addDynamicSectionCallback());
  }, [updateBoard]);

  const updateDynamicSection = useCallback(
    ({ itemId, newOptions }: UpdateDynamicOptions) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((item) => (item.id !== itemId ? item : { ...item, options: newOptions })),
      }));
    },
    [updateBoard],
  );

  const removeDynamicSection = useCallback(
    (input: RemoveDynamicSectionInput) => {
      updateBoard(removeDynamicSectionCallback(input));
    },
    [updateBoard],
  );

  return {
    addDynamicSection,
    updateDynamicSection,
    removeDynamicSection,
  };
};

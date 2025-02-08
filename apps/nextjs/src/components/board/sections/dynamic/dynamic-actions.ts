import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";

import { addDynamicSectionCallback } from "./actions/add-dynamic-section";
import type { RemoveDynamicSectionInput } from "./actions/remove-dynamic-section";
import { removeDynamicSectionCallback } from "./actions/remove-dynamic-section";

export const useDynamicSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const addDynamicSection = useCallback(() => {
    updateBoard(addDynamicSectionCallback());
  }, [updateBoard]);

  const removeDynamicSection = useCallback(
    (input: RemoveDynamicSectionInput) => {
      updateBoard(removeDynamicSectionCallback(input));
    },
    [updateBoard],
  );

  return {
    addDynamicSection,
    removeDynamicSection,
  };
};

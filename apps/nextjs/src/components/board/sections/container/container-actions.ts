import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";
import type { ContainerSectionOptions } from "@homarr/validation/shared";

import { addContainerCallback } from "./actions/add-container";
import type { RemoveContainerInput } from "./actions/remove-container";
import { removeContainerCallback } from "./actions/remove-container";

interface UpdateContainerOptions {
  containerId: string;
  newOptions: ContainerSectionOptions;
}

export const useContainerActions = () => {
  const { updateBoard } = useUpdateBoard();

  const addContainer = useCallback(() => {
    updateBoard(addContainerCallback());
  }, [updateBoard]);

  const updateContainer = useCallback(
    ({ containerId, newOptions }: UpdateContainerOptions) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((item) =>
          item.id !== containerId || item.kind !== "container" ? item : { ...item, options: newOptions },
        ),
      }));
    },
    [updateBoard],
  );

  const removeContainer = useCallback(
    (input: RemoveContainerInput) => {
      updateBoard(removeContainerCallback(input));
    },
    [updateBoard],
  );

  return { addContainer, updateContainer, removeContainer };
};

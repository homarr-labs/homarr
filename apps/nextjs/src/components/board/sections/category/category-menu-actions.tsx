import { useCallback } from "react";

import { createId } from "@homarr/db/client";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { modalEvents } from "~/app/[locale]/modals";
import { useCategoryActions } from "./category-actions";

export const useCategoryMenuActions = (category: CategorySection) => {
  const { addCategory, moveCategory, removeCategory, renameCategory } =
    useCategoryActions();

  const createCategoryAtPosition = useCallback(
    (position: number) => {
      modalEvents.openManagedModal({
        modal: "categoryEditModal",
        innerProps: {
          category: {
            id: createId(),
            name: "New category",
          },
          onSuccess: (category) => {
            addCategory({
              name: category.name,
              position,
            });
          },
          submitLabel: "Add category",
        },
      });
    },
    [addCategory],
  );

  // creates a new category above the current
  const addCategoryAbove = useCallback(() => {
    const abovePosition = category.position;
    createCategoryAtPosition(abovePosition);
  }, [category.position, createCategoryAtPosition]);

  // creates a new category below the current
  const addCategoryBelow = useCallback(() => {
    const belowPosition = category.position + 2;
    createCategoryAtPosition(belowPosition);
  }, [category.position, createCategoryAtPosition]);

  const moveCategoryUp = useCallback(() => {
    moveCategory({
      id: category.id,
      direction: "up",
    });
  }, [category.id, moveCategory]);

  const moveCategoryDown = useCallback(() => {
    moveCategory({
      id: category.id,
      direction: "down",
    });
  }, [category.id, moveCategory]);

  // Removes the current category
  const remove = useCallback(() => {
    // TODO: contained apps are currently just deleted
    // TODO: Add a confirmation modal
    removeCategory({
      id: category.id,
    });
  }, [category.id, removeCategory]);

  const edit = () => {
    modalEvents.openManagedModal({
      modal: "categoryEditModal",
      title: "Rename category",
      innerProps: {
        category,
        submitLabel: "Rename category",
        onSuccess: (category) => {
          renameCategory({
            id: category.id,
            name: category.name,
          });
        },
      },
    });
  };

  return {
    addCategoryAbove,
    addCategoryBelow,
    moveCategoryUp,
    moveCategoryDown,
    remove,
    edit,
  };
};

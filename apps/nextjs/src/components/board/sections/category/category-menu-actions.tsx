import { useCallback } from "react";

import { createId } from "@homarr/db/client";
import { useI18n } from "@homarr/translation/client";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { modalEvents } from "~/app/[locale]/modals";
import { useCategoryActions } from "./category-actions";

export const useCategoryMenuActions = (category: CategorySection) => {
  const { addCategory, moveCategory, removeCategory, renameCategory } =
    useCategoryActions();
  const t = useI18n();

  const createCategoryAtPosition = useCallback(
    (position: number) => {
      modalEvents.openManagedModal({
        title: t("section.category.create.title"),
        modal: "categoryEditModal",
        innerProps: {
          category: {
            id: createId(),
            name: t("section.category.create.title"),
          },
          onSuccess: (category) => {
            addCategory({
              name: category.name,
              position,
            });
          },
          submitLabel: t("section.category.create.submit"),
        },
      });
    },
    [addCategory, t],
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
    modalEvents.openConfirmModal({
      title: t("section.category.remove.title"),
      children: t("section.category.remove.message", {
        name: category.name,
      }),
      onConfirm: () => {
        removeCategory({
          id: category.id,
        });
      },
      confirmProps: {
        color: "red",
      },
    });
  }, [category.id, category.name, removeCategory, t]);

  const edit = () => {
    modalEvents.openManagedModal({
      modal: "categoryEditModal",
      title: t("section.category.edit.title"),
      innerProps: {
        category,
        submitLabel: t("section.category.edit.submit"),
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

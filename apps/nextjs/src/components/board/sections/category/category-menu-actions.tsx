import { useCallback } from "react";

import { createId } from "@homarr/db/client";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { useCategoryActions } from "./category-actions";
import { CategoryEditModal } from "./category-edit-modal";

export const useCategoryMenuActions = (category: CategorySection) => {
  const { openModal } = useModalAction(CategoryEditModal);
  const { openConfirmModal } = useConfirmModal();
  const { addCategory, moveCategory, removeCategory, renameCategory } = useCategoryActions();
  const t = useI18n();

  const createCategoryAtYOffset = useCallback(
    (position: number) => {
      openModal(
        {
          category: {
            id: createId(),
            name: t("section.category.create.title"),
          },
          onSuccess: (category) => {
            addCategory({
              name: category.name,
              yOffset: position,
            });
          },
          submitLabel: t("section.category.create.submit"),
        },
        {
          title: (t) => t("section.category.create.title"),
        },
      );
    },
    [addCategory, t, openModal],
  );

  // creates a new category above the current
  const addCategoryAbove = useCallback(() => {
    const aboveYOffset = category.yOffset;
    createCategoryAtYOffset(aboveYOffset);
  }, [category.yOffset, createCategoryAtYOffset]);

  // creates a new category below the current
  const addCategoryBelow = useCallback(() => {
    const belowYOffset = category.yOffset + 2;
    createCategoryAtYOffset(belowYOffset);
  }, [category.yOffset, createCategoryAtYOffset]);

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
    openConfirmModal({
      title: t("section.category.remove.title"),
      children: t("section.category.remove.message", {
        name: category.name,
      }),
      onConfirm: () => {
        removeCategory({
          id: category.id,
        });
      },
    });
  }, [category.id, category.name, removeCategory, t, openConfirmModal]);

  const edit = useCallback(() => {
    openModal(
      {
        category,
        submitLabel: t("section.category.edit.submit"),
        onSuccess: (category) => {
          renameCategory({
            id: category.id,
            name: category.name,
          });
        },
      },
      {
        title: (t) => t("section.category.edit.title"),
      },
    );
  }, [category, openModal, renameCategory, t]);

  return {
    addCategoryAbove,
    addCategoryBelow,
    moveCategoryUp,
    moveCategoryDown,
    remove,
    edit,
  };
};

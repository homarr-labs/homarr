import { useCallback } from "react";

import { createId } from "@homarr/db/client";

import { useUpdateBoard } from "~/app/[locale]/boards/_client";
import type {
  CategorySection,
  EmptySection,
  Section,
} from "~/app/[locale]/boards/_types";

interface AddCategory {
  name: string;
  position: number;
}

interface RenameCategory {
  id: string;
  name: string;
}

interface MoveCategory {
  id: string;
  direction: "up" | "down";
}

interface RemoveCategory {
  id: string;
}

export const useCategoryActions = () => {
  const { updateBoard } = useUpdateBoard();

  const addCategory = useCallback(
    ({ name, position }: AddCategory) => {
      if (position <= -1) {
        return;
      }
      updateBoard((prev) => ({
        ...prev,
        sections: [
          // Ignore sidebar sections
          ...prev.sections.filter((section) => section.kind === "sidebar"),
          // Place sections before the new category
          ...prev.sections.filter(
            (section) =>
              (section.kind === "category" || section.kind === "empty") &&
              section.position < position,
          ),
          {
            id: createId(),
            name,
            kind: "category",
            position,
            items: [],
          },
          {
            id: createId(),
            kind: "empty",
            position: position + 1,
            items: [],
          },
          // Place sections after the new category
          ...prev.sections
            .filter(
              (section): section is CategorySection | EmptySection =>
                (section.kind === "category" || section.kind === "empty") &&
                section.position >= position,
            )
            .map((section) => ({
              ...section,
              position: section.position + 2,
            })),
        ],
      }));
    },
    [updateBoard],
  );

  const addCategoryToEnd = useCallback(
    ({ name }: { name: string }) => {
      updateBoard((prev) => {
        const lastSection = prev.sections
          .filter(
            (x): x is CategorySection | EmptySection =>
              x.kind === "empty" || x.kind === "category",
          )
          .sort((a, b) => b.position - a.position)
          .at(0);

        if (!lastSection) return prev;
        const lastPosition = lastSection.position;

        return {
          ...prev,
          sections: [
            ...prev.sections,
            {
              id: createId(),
              name,
              kind: "category",
              position: lastPosition + 1,
              items: [],
            },
            {
              id: createId(),
              kind: "empty",
              position: lastPosition + 2,
              items: [],
            },
          ],
        };
      });
    },
    [updateBoard],
  );

  const renameCategory = useCallback(
    ({ id: categoryId, name }: RenameCategory) => {
      updateBoard((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.kind !== "category") return section;
          if (section.id !== categoryId) return section;
          return {
            ...section,
            name,
          };
        }),
      }));
    },
    [updateBoard],
  );

  const moveCategory = useCallback(
    ({ id, direction }: MoveCategory) => {
      updateBoard((prev) => {
        const currentCategory = prev.sections.find(
          (section): section is CategorySection =>
            section.kind === "category" && section.id === id,
        );
        if (!currentCategory) return prev;
        if (currentCategory?.position === 1 && direction === "up") return prev;
        if (
          currentCategory?.position === prev.sections.length - 2 &&
          direction === "down"
        )
          return prev;

        return {
          ...prev,
          sections: prev.sections.map((section) => {
            if (section.kind !== "category" && section.kind !== "empty")
              return section;
            const offset = direction === "up" ? -2 : 2;
            // Move category and empty section
            if (
              section.position === currentCategory.position ||
              section.position - 1 === currentCategory.position
            ) {
              return {
                ...section,
                position: section.position + offset,
              };
            }

            if (
              direction === "up" &&
              (section.position === currentCategory.position - 2 ||
                section.position === currentCategory.position - 1)
            ) {
              return {
                ...section,
                position: section.position + 2,
              };
            }

            if (
              direction === "down" &&
              (section.position === currentCategory.position + 2 ||
                section.position === currentCategory.position + 3)
            ) {
              return {
                ...section,
                position: section.position - 2,
              };
            }

            return section;
          }),
        };
      });
    },
    [updateBoard],
  );

  const removeCategory = useCallback(
    ({ id: categoryId }: RemoveCategory) => {
      updateBoard((prev) => {
        const currentCategory = prev.sections.find(
          (section): section is CategorySection =>
            section.kind === "category" && section.id === categoryId,
        );
        if (!currentCategory) return prev;

        const aboveWrapper = prev.sections.find(
          (section): section is EmptySection =>
            section.kind === "empty" &&
            section.position === currentCategory.position - 1,
        );

        const removedWrapper = prev.sections.find(
          (section): section is EmptySection =>
            section.kind === "empty" &&
            section.position === currentCategory.position + 1,
        );

        if (!aboveWrapper || !removedWrapper) return prev;

        // Calculate the yOffset for the items in the currentCategory and removedWrapper to add them with the same offset to the aboveWrapper
        const aboveYOffset = calculateYHeightWithOffset(aboveWrapper);
        const categoryYOffset = calculateYHeightWithOffset(currentCategory);

        const previousCategoryItems = currentCategory.items.map((item) => ({
          ...item,
          yOffset: item.yOffset + aboveYOffset,
        }));
        const previousBelowWrapperItems = removedWrapper.items.map((item) => ({
          ...item,
          yOffset: item.yOffset + aboveYOffset + categoryYOffset,
        }));

        return {
          ...prev,
          sections: [
            ...prev.sections.filter((section) => section.kind === "sidebar"),
            ...prev.sections.filter(
              (section) =>
                (section.kind === "category" || section.kind === "empty") &&
                section.position < currentCategory.position - 1,
            ),
            {
              ...aboveWrapper,
              items: [
                ...aboveWrapper.items,
                ...previousCategoryItems,
                ...previousBelowWrapperItems,
              ],
            },
            ...prev.sections
              .filter(
                (section): section is CategorySection | EmptySection =>
                  (section.kind === "category" || section.kind === "empty") &&
                  section.position >= currentCategory.position + 2,
              )
              .map((section) => ({
                ...section,
                position: section.position - 2,
              })),
          ],
        };
      });
    },
    [updateBoard],
  );

  return {
    addCategory,
    addCategoryToEnd,
    renameCategory,
    moveCategory,
    removeCategory,
  };
};

const calculateYHeightWithOffset = (section: Section) =>
  section.items.reduce((acc, item) => {
    const yHeightWithOffset = item.yOffset + item.height;
    if (yHeightWithOffset > acc) return yHeightWithOffset;
    return acc;
  }, 0);

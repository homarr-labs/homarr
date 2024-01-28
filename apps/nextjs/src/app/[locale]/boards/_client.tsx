"use client";

import { useCallback, useRef } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { Stack } from "@homarr/ui";

import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { useRequiredBoard } from "./_context";
import type { CategorySection, EmptySection } from "./_types";

type UpdateCallback = (
  prev: RouterOutputs["board"]["default"],
) => RouterOutputs["board"]["default"];

export const useUpdateBoard = () => {
  const utils = clientApi.useUtils();

  const updateBoard = useCallback(
    (updaterWithoutUndefined: UpdateCallback) => {
      utils.board.default.setData(undefined, (prev) =>
        prev ? updaterWithoutUndefined(prev) : prev,
      );
    },
    [utils],
  );

  return {
    updateBoard,
  };
};

export const ClientBoard = () => {
  const board = useRequiredBoard();

  const sectionsWithoutSidebars = board.sections
    .filter(
      (section): section is CategorySection | EmptySection =>
        section.kind !== "sidebar",
    )
    .sort((a, b) => a.position - b.position);

  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <Stack ref={ref}>
        {sectionsWithoutSidebars.map((section) =>
          section.kind === "empty" ? (
            <BoardEmptySection
              key={section.id}
              section={section}
              mainRef={ref}
            />
          ) : (
            <BoardCategorySection
              key={section.id}
              section={section}
              mainRef={ref}
            />
          ),
        )}
      </Stack>
    </>
  );
};

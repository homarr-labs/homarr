"use client";

import { useCallback, useRef } from "react";
import { useSetAtom } from "jotai";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { Button, Stack } from "@homarr/ui";

import { editModeAtom } from "~/components/board/editMode";
import { BoardCategorySection } from "~/components/board/sections/category-section";
import { BoardEmptySection } from "~/components/board/sections/empty-section";
import { useRequiredBoard } from "./_context";
import { CategorySection, EmptySection } from "./_types";

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
  const setEditMode = useSetAtom(editModeAtom);
  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
  };

  const sectionsWithoutSidebars = board.sections.filter(
    (section): section is CategorySection | EmptySection =>
      section.kind !== "sidebar",
  );

  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <Stack ref={ref}>
        <Button onClick={toggleEditMode}>Toggle edit mode</Button>
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

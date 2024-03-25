"use client";

import type { MouseEvent, PropsWithChildren } from "react";
import React, { createContext, useCallback } from "react";
import { useClickOutside, useElementSize, useMergedRef } from "@mantine/hooks";
import combineClasses from "clsx";
import { useAtom, useAtomValue } from "jotai";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { SectionKind, WidgetKind } from "@homarr/definitions";
import type { BoxProps } from "@homarr/ui";
import { Box, Card, LoadingOverlay } from "@homarr/ui";

import { editModeAtom } from "~/components/board/editMode";
import { BoardItem } from "~/components/board/sections/content";
import type { UseGridstackRefs } from "~/components/board/sections/gridstack/use-gridstack";
import {
  selectedItemAtom,
  useGridstack,
} from "~/components/board/sections/gridstack/use-gridstack";
import classes from "~/components/board/sections/item.module.css";
import { BoardBackgroundVideo } from "~/components/layout/background";
import { useIsBoardReady, useRequiredBoard } from "./_context";
import type { Section } from "./_types";

let boardName: string | null = null;

export const updateBoardName = (name: string | null) => {
  boardName = name;
};

type UpdateCallback = (
  prev: RouterOutputs["board"]["default"],
) => RouterOutputs["board"]["default"];

export const useUpdateBoard = () => {
  const utils = clientApi.useUtils();

  const updateBoard = useCallback(
    (updaterWithoutUndefined: UpdateCallback) => {
      if (!boardName) {
        throw new Error("Board name is not set");
      }
      utils.board.byName.setData({ name: boardName }, (previous) =>
        previous ? updaterWithoutUndefined(previous) : previous,
      );
    },
    [utils],
  );

  return {
    updateBoard,
  };
};

interface SectionContextProps {
  section: Section;
  innerSections: Section[];
  refs: UseGridstackRefs;
}

const SectionContext = createContext<SectionContextProps | null>(null);

const useSectionContext = () => {
  const context = React.useContext(SectionContext);
  if (!context) {
    throw new Error("useSectionContext must be used within a SectionContext");
  }
  return context;
};

interface GridStackProps extends BoxProps {
  section: Section;
}

const GridStack = ({
  section,
  children,
  ...props
}: PropsWithChildren<GridStackProps>) => {
  const board = useRequiredBoard();
  const innerSections = board.sections.filter(
    (innerSection) => innerSection.parentSectionId === section.id,
  );

  const { refs } = useGridstack({
    section,
    items: section.items
      .map((item) => ({ id: item.id }))
      .concat(innerSections.map((section) => ({ id: section.id }))),
  });

  return (
    <SectionContext.Provider value={{ section, innerSections, refs }}>
      <Box
        {...props}
        data-kind={section.kind}
        data-section-id={section.id}
        className={combineClasses(
          `grid-stack grid-stack-${section.kind}`,
          props.className,
        )}
        ref={refs.wrapper}
      >
        {children}
      </Box>
    </SectionContext.Provider>
  );
};

export const ClientBoard = () => {
  const board = useRequiredBoard();
  const isReady = useIsBoardReady();

  const rootSection = board.sections.find((section) => section.kind === "root");

  if (!rootSection) {
    throw new Error("Root section not found");
  }

  return (
    <Box h="100%" pos="relative">
      <BoardBackgroundVideo />
      <LoadingOverlay
        visible={!isReady}
        transitionProps={{ duration: 500 }}
        loaderProps={{ size: "lg" }}
        h="calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-padding) - var(--app-shell-footer-offset, 0px) - var(--app-shell-padding))"
      />
      <GridStack
        h="100%"
        style={{ visibility: isReady ? "visible" : "hidden" }}
        section={rootSection}
      >
        <SectionContent />
      </GridStack>
    </Box>
  );
};

const getItemRef = (refs: UseGridstackRefs, id: string) => {
  return refs.items.current[id] as React.RefObject<HTMLDivElement>;
};

const SectionContent = () => {
  const { section, innerSections, refs } = useSectionContext();

  return (
    <>
      {section.items.map((item) => (
        <GridStackItem
          key={item.id}
          refs={refs}
          type="item"
          {...item}
          innerRef={getItemRef(refs, item.id)}
        >
          <ItemContent item={item} />
        </GridStackItem>
      ))}
      {innerSections.map((section) => (
        <GridStackItem
          key={section.id}
          refs={refs}
          type="section"
          {...section}
          innerRef={getItemRef(refs, section.id)}
        >
          <Card withBorder className="grid-stack-item-content">
            <GridStack section={section} h="100%">
              <SectionContent />
            </GridStack>
          </Card>
        </GridStackItem>
      ))}
    </>
  );
};

interface GridStackItemProps {
  id: string;
  type: "item" | "section";
  kind: WidgetKind | SectionKind;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  refs: UseGridstackRefs;
  innerRef: React.RefObject<HTMLDivElement>;
}

const GridStackItem = ({
  id,
  type,
  kind,
  xOffset,
  yOffset,
  width,
  height,
  innerRef,
  children,
}: PropsWithChildren<GridStackItemProps>) => {
  const clickOutsideRef = useClickOutside(() => {
    setSelected((prev) => (prev === id ? null : prev));
  });
  const mergedRef = useMergedRef(clickOutsideRef, innerRef);
  const [selected, setSelected] = useAtom(selectedItemAtom);
  const isEditMode = useAtomValue(editModeAtom);
  const onClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!isEditMode) return;
      const target = event.target as HTMLElement;
      if (target.classList.contains("ui-resizable-handle")) return;
      if (
        event.currentTarget
          .getElementsByClassName("mantine-ActionIcon-root")[0]
          ?.contains(target) ||
        target.classList.contains("mantine-ActionIcon-root")
      )
        return;
      setSelected((prev) => (prev === id ? null : id));
    },
    [isEditMode, id, setSelected],
  );

  return (
    <Box
      className="grid-stack-item"
      style={{
        boxShadow:
          selected === id
            ? "inset 0px 0px 15px 10px var(--mantine-color-primaryColor-light)"
            : undefined,
        borderRadius: 8,
      }}
      data-id={id}
      data-type={type}
      data-kind={kind}
      gs-x={xOffset}
      gs-y={yOffset}
      gs-w={width}
      gs-h={height}
      gs-min-w={1}
      gs-min-h={1}
      onClick={onClick}
      ref={mergedRef}
    >
      {children}
    </Box>
  );
};

const ItemContent = ({ item }: { item: Section["items"][number] }) => {
  const board = useRequiredBoard();
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  return (
    <Card
      ref={ref}
      className={combineClasses(classes.itemCard, "grid-stack-item-content")}
      withBorder
      styles={{
        root: {
          "--opacity": board.opacity / 100,
        },
      }}
      p={width >= 96 ? undefined : "xs"}
    >
      <BoardItem item={item} width={width + 32} height={height + 32} />
    </Card>
  );
};

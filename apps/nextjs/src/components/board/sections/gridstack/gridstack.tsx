"use client";

import type { BoxProps } from "@mantine/core";
import combineClasses from "clsx";

import type { DynamicSectionItem, Section } from "~/app/[locale]/boards/_types";
import { SectionContent } from "../content";
import { SectionProvider } from "../section-context";
import { useSectionItems } from "../use-section-items";
import { BoardEmptySpaceContextMenu } from "./board-empty-space-context-menu";
import { useGridstack } from "./use-gridstack";

interface Props extends BoxProps {
  section: Exclude<Section, { kind: "dynamic" }> | DynamicSectionItem;
}

export const GridStack = ({ section, ...props }: Props) => {
  const { items, innerSections } = useSectionItems(section.id);
  const itemIds = [...items, ...innerSections].map((item) => item.id);

  const { refs } = useGridstack(section, itemIds);

  return (
    <SectionProvider value={{ section, items, innerSections, refs }}>
      <BoardEmptySpaceContextMenu
        {...props}
        section={section}
        refs={refs}
        data-kind={section.kind}
        data-section-id={section.id}
        className={combineClasses(`grid-stack grid-stack-${section.kind}`, props.className)}
      >
        <SectionContent />
      </BoardEmptySpaceContextMenu>
    </SectionProvider>
  );
};

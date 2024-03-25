"use client";

import type { PropsWithChildren } from "react";
import combineClasses from "clsx";

import type { BoxProps } from "@homarr/ui";
import { Box } from "@homarr/ui";

import { useRequiredBoard } from "~/app/[locale]/boards/_context";
import type { Section } from "~/app/[locale]/boards/_types";
import { SectionProvider } from "../context";
import { useGridstack } from "./use-gridstack";

interface Props extends BoxProps {
  section: Section;
}

export const GridStack = ({
  section,
  children,
  ...props
}: PropsWithChildren<Props>) => {
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
    <SectionProvider value={{ section, innerSections, refs }}>
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
    </SectionProvider>
  );
};

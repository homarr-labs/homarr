"use client";

import type { BoxProps } from "@mantine/core";
import { Box } from "@mantine/core";
import combineClasses from "clsx";

import type { Section } from "~/app/[locale]/boards/_types";
import { SectionContent } from "../content";
import { SectionProvider } from "../section-context";
import { useSectionItems } from "../use-section-items";
import { useGridstack } from "./use-gridstack";

interface Props extends BoxProps {
  section: Section;
}

export const GridStack = ({ section, ...props }: Props) => {
  const { itemIds, innerSections } = useSectionItems(section);

  const { refs } = useGridstack(section, itemIds);

  return (
    <SectionProvider value={{ section, innerSections, refs }}>
      <Box
        {...props}
        data-kind={section.kind}
        data-section-id={section.id}
        className={combineClasses(`grid-stack grid-stack-${section.kind}`, props.className)}
        ref={refs.wrapper}
      >
        <SectionContent items={section.items} refs={refs} />
      </Box>
    </SectionProvider>
  );
};

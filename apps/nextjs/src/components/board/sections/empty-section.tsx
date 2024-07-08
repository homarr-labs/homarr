import combineClasses from "clsx";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { GridStack } from "./gridstack/gridstack";
import { useSectionItems } from "./use-section-items";

interface Props {
  section: EmptySection;
}

export const BoardEmptySection = ({ section }: Props) => {
  const { itemIds } = useSectionItems(section);
  const [isEditMode] = useEditMode();

  return (
    <GridStack
      section={section}
      style={{ transitionDuration: "0s" }}
      className={combineClasses(`min-row`, itemIds.length > 0 || isEditMode ? undefined : `grid-stack-empty-wrapper`)}
    />
  );
};

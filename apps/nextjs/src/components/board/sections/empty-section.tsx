import combineClasses from "clsx";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { GridStack } from "./gridstack/gridstack";
import { useSectionItems } from "./use-section-items";

interface Props {
  section: EmptySection;
}

export const BoardEmptySection = ({ section }: Props) => {
  const { items, innerSections } = useSectionItems(section.id);
  const totalLength = items.length + innerSections.length;
  const [isEditMode] = useEditMode();

  return (
    <GridStack
      section={section}
      style={{ transitionDuration: "0s" }}
      className={combineClasses("min-row", totalLength > 0 || isEditMode ? undefined : "grid-stack-empty-wrapper")}
    />
  );
};

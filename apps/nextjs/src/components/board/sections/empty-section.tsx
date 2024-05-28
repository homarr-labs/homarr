import type { RefObject } from "react";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { SectionContent } from "./content";
import { useGridstack } from "./gridstack/use-gridstack";

interface Props {
  section: EmptySection;
  mainRef: RefObject<HTMLDivElement>;
}

const defaultClasses = "grid-stack grid-stack-empty min-row";

export const BoardEmptySection = ({ section, mainRef }: Props) => {
  const { refs } = useGridstack({ section, mainRef });
  const [isEditMode] = useEditMode();

  return (
    <div
      className={section.items.length > 0 || isEditMode ? defaultClasses : `${defaultClasses} gridstack-empty-wrapper`}
      style={{ transitionDuration: "0s" }}
      data-empty
      data-section-id={section.id}
      ref={refs.wrapper}
    >
      <SectionContent items={section.items} refs={refs} />
    </div>
  );
};

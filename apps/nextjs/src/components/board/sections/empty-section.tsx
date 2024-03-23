import type { RefObject } from "react";
import { useAtomValue } from "jotai";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { editModeAtom } from "../editMode";
import { SectionContent } from "./content";
import { useGridstack } from "./gridstack/use-gridstack";

interface Props {
  section: EmptySection;
  mainRef: RefObject<HTMLDivElement>;
  nested?: boolean;
}

const defaultClasses = "grid-stack grid-stack-empty min-row";

export const BoardEmptySection = ({ section, mainRef, nested: _ }: Props) => {
  const { refs } = useGridstack({ section, mainRef });
  const isEditMode = useAtomValue(editModeAtom);

  return (
    <div
      className={
        section.items.length > 0 || isEditMode
          ? defaultClasses
          : `${defaultClasses} gridstack-empty-wrapper grid-stack-nested`
      }
      style={{ transitionDuration: "0s", "--gridstack-column-count": 4 }}
      data-empty
      data-section-id={section.id}
      ref={refs.wrapper}
    >
      <SectionContent items={section.items} refs={refs} />
    </div>
  );
};

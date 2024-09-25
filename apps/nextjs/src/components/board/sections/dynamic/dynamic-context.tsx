"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";

interface DynamicSectionContextProps {
  sectionIds: string[];
}

const DynamicSectionContext = createContext<DynamicSectionContextProps>({
  sectionIds: [],
});

interface DynamicSectionProviderProps {
  section: DynamicSection;
}

export const DynamicSectionProvider = ({ section, children }: PropsWithChildren<DynamicSectionProviderProps>) => {
  const aboveIds = useAboveDynamicSectionIds();
  const resetPrevious = usePlacedTopRightAndInDynamicSection({ sectionOrItem: section, previousId: aboveIds.at(-1) });

  return (
    <DynamicSectionContext.Provider value={{ sectionIds: resetPrevious ? [section.id] : [...aboveIds, section.id] }}>
      {children}
    </DynamicSectionContext.Provider>
  );
};

export const useAboveDynamicSectionIds = () => {
  return useContext(DynamicSectionContext).sectionIds;
};

interface UsePlacedTopRightAndInDynamicSectionProps {
  sectionOrItem: { width: number; xOffset: number; yOffset: number };
  previousId: string | undefined;
}

export const usePlacedTopRightAndInDynamicSection = ({
  sectionOrItem,
  previousId,
}: UsePlacedTopRightAndInDynamicSectionProps) => {
  const board = useRequiredBoard();
  const aboveSection = board.sections.find(
    (section): section is DynamicSection => section.id === previousId && section.kind === "dynamic",
  );

  // When not on top, no above section or not reaching the end of the above section, we want to reset the previous sections
  return (
    sectionOrItem.yOffset >= 1 || !aboveSection || sectionOrItem.xOffset + sectionOrItem.width !== aboveSection.width
  );
};

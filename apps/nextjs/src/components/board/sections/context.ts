import { createContext, useContext } from "react";

import type { Section } from "~/app/[locale]/boards/_types";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";

interface SectionContextProps {
  section: Section;
  innerSections: Section[];
  refs: UseGridstackRefs;
}

const SectionContext = createContext<SectionContextProps | null>(null);

export const useSectionContext = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSectionContext must be used within a SectionContext");
  }
  return context;
};

export const SectionProvider = SectionContext.Provider;

import { createContext, useContext } from "react";

import type { RouterOutputs } from "@homarr/api";

import type { ContainerSectionItem, Section, SectionItem } from "~/app/[locale]/boards/_types";
import type { GridEntryElementStore } from "./grid/grid-editor-registry";
import type { SectionGridPlacement } from "./grid/use-grid-layout-actions";

interface SectionContextProps {
  section: Exclude<Section, { kind: "container" }> | ContainerSectionItem;
  innerSections: ContainerSectionItem[];
  items: SectionItem[];
  integrations: RouterOutputs["integration"]["all"] | undefined;
  columnCount: number;
  maxRowCount: number | null;
  placements: readonly SectionGridPlacement[];
  interactionDisabled: boolean;
  announce: (message: string) => void;
  entryElementStore: GridEntryElementStore;
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

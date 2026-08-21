import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { SectionGrid } from "./grid/section-grid";
import { useSectionItems } from "./use-section-items";

interface Props {
  section: EmptySection;
  columnCount: number;
  requestedRowCount: number;
  railPlacement?: "main" | "left" | "right";
}

export const BoardEmptySection = ({ section, columnCount, requestedRowCount, railPlacement = "main" }: Props) => {
  const { items, innerSections } = useSectionItems(section.id);
  const totalLength = items.length + innerSections.length;
  const [isEditMode] = useEditMode();
  const t = useI18n("board.landmark");

  if (totalLength === 0 && !isEditMode && requestedRowCount === 0 && railPlacement !== "main") return null;

  return (
    <SectionGrid
      section={section}
      columnCount={columnCount}
      requestedRowCount={requestedRowCount}
      label={t("items")}
      railPlacement={railPlacement}
    />
  );
};

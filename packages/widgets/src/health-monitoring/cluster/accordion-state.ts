export const getClusterAccordionDefault = (
  displayMode: "compact" | "advanced" | undefined,
  visibleSections: readonly string[],
): string[] => (displayMode === "advanced" ? [...visibleSections] : visibleSections.slice(0, 1));

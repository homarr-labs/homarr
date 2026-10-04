export const clusterSections = ["node", "qemu", "lxc", "storage"] as const;

type ClusterSection = (typeof clusterSections)[number];

export const getClusterVisibleSections = (
  displayMode: "compact" | "advanced" | undefined,
  visibleSections: readonly ClusterSection[],
): ClusterSection[] => (displayMode === "advanced" ? [...clusterSections] : [...visibleSections]);

export const getClusterAccordionDefault = (
  displayMode: "compact" | "advanced" | undefined,
  visibleSections: readonly string[],
): string[] => (displayMode === "advanced" ? [...visibleSections] : visibleSections.slice(0, 1));

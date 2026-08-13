export type IndexerDisplayStatus = "healthy" | "unhealthy" | "disabled";

export const getIndexerDisplayStatus = ({
  enabled,
  status,
}: {
  enabled: boolean;
  status: boolean;
}): IndexerDisplayStatus => {
  if (!enabled) return "disabled";
  return status ? "healthy" : "unhealthy";
};

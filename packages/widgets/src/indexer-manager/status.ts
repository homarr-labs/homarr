export type IndexerDisplayStatus = "healthy" | "unhealthy" | "disabled" | "unknown";

export const getIndexerDisplayStatus = ({
  enabled,
  status,
}: {
  enabled: boolean;
  status: boolean | null;
}): IndexerDisplayStatus => {
  if (!enabled) return "disabled";
  if (status === null) return "unknown";
  return status ? "healthy" : "unhealthy";
};

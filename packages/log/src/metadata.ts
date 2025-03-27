export const formatMetadata = (metadata: Record<string, unknown> | Error, ignoreKeys?: string[]) => {
  const filteredMetadata = Object.keys(metadata)
    .filter((key) => !ignoreKeys?.includes(key))
    .map((key) => ({ key, value: metadata[key as keyof typeof metadata] }))
    .filter(({ value }) => typeof value !== "object" && typeof value !== "function");

  return filteredMetadata.map(({ key, value }) => `${key}="${value as string}"`).join(" ");
};

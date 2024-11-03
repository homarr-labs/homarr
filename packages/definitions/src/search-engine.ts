export const searchEngineTypes = ["generic", "fromIntegration"] as const;
export type SearchEngineTypes = (typeof searchEngineTypes)[number];

export const colorSchemes = ["auto", "light", "dark"] as const;
export type ColorScheme = (typeof colorSchemes)[number];

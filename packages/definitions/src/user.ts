export const colorSchemes = ["light", "dark", "auto"] as const;
export type ColorScheme = (typeof colorSchemes)[number];

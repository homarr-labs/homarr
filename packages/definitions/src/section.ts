export const sectionKinds = ["category", "empty", "sidebar"] as const;
export type SectionKind = (typeof sectionKinds)[number];

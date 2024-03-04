export const sectionKinds = ["category", "empty"] as const;
export type SectionKind = (typeof sectionKinds)[number];

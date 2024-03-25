export const sectionKinds = ["root", "card"] as const;
export type SectionKind = (typeof sectionKinds)[number];

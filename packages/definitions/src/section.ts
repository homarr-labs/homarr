export const sectionKinds = ["root", "card", "folder"] as const;
export type SectionKind = (typeof sectionKinds)[number];

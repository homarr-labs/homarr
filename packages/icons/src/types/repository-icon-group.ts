import type { RepositoryIcon } from "./repository-icon";

export type RepositoryIconGroup =
  | { success: true; icons: RepositoryIcon[]; slug: string }
  | { success: false; icons: []; slug: string; failure: "external-disabled" | "source-unavailable" };

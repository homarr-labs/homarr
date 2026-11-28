import type { RepositoryIcon } from "./repository-icon";

export type RepositoryIconGroup =
  | { slug: string; status: "updated"; icons: RepositoryIcon[]; etag?: string }
  | { slug: string; status: "unchanged" | "failed" };

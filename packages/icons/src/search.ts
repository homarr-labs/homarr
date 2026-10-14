import { getImageMatchRank, normalizeImageName } from "@homarr/common";

import { iconRepositorySources } from "./icons-fetcher";
import type { IconReadScope } from "./resources";

export { getImageMatchRank, normalizeImageName };

export interface PublicIcon {
  id: string;
  name: string;
  url: string;
}

export interface PublicIconGroup {
  id: string;
  slug: string;
  icons: PublicIcon[];
}

const string = (value: unknown) => {
  if (typeof value !== "string") throw new Error("Invalid icon projection");
  return value;
};

export const getIconRepositoryMetadata = (slug: string) => {
  if (slug === "local") return { name: "Local", license: undefined, repositoryUrl: undefined };
  const source = iconRepositorySources.find((repository) => repository.slug === slug);
  return { name: source?.name ?? slug, license: source?.license, repositoryUrl: source?.repositoryUrl?.href };
};

export const findIconsAsync = async (
  scope: IconReadScope,
  input: { searchText?: string; limitPerGroup: number },
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  const term = normalizeImageName(input.searchText ?? "");
  const parameter = scope.dialect === "postgresql" ? "$1" : "?";
  const baseQuery = `SELECT r."id" AS "repository_id", r."slug", i."id", i."name", i."url", ROW_NUMBER() OVER (PARTITION BY r."id" ORDER BY CASE WHEN i."name" LIKE '%.svg' THEN 0 ELSE 1 END, i."name") AS "group_position" FROM "iconRepository" r LEFT JOIN "icon" i ON i."icon_repository_id" = r."id" AND (r."slug" <> 'local' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = '/api/user-medias/' || m."id"))`;
  const queries = await Promise.allSettled([
    scope.queryAsync({
      sql: `WITH ranked_icons AS (${baseQuery}) SELECT "repository_id", "slug", "id", "name", "url" FROM ranked_icons${term.length === 0 ? ` WHERE "group_position" <= ${parameter}` : ""} ORDER BY CASE WHEN "slug" = 'local' THEN 0 ELSE 1 END, "slug", "group_position"`,
      parameters: term.length === 0 ? [input.limitPerGroup] : [],
    }),
    scope.queryAsync({ sql: 'SELECT count(*) AS "count" FROM "icon"', parameters: [] }),
  ]);
  const [rows, count] = queries;
  if (rows.status === "rejected") throw rows.reason;
  if (count.status === "rejected") throw count.reason;
  signal?.throwIfAborted();
  const repositories = new Map<string, PublicIconGroup>();
  for (const row of rows.value) {
    const id = string(row.repository_id);
    let repository = repositories.get(id);
    if (!repository) {
      repository = { id, slug: string(row.slug), icons: [] };
      repositories.set(id, repository);
    }
    if (row.id === null) continue;
    if (!term && repository.icons.length >= input.limitPerGroup) continue;
    repository.icons.push({ id: string(row.id), name: string(row.name), url: string(row.url) });
  }
  const matched = [...repositories.values()].map((repository) => ({
    ...repository,
    icons:
      term.length === 0
        ? repository.icons
        : repository.icons
            .flatMap((icon) => {
              const rank = getImageMatchRank(term, icon.name || icon.url);
              return rank === null ? [] : [{ icon, rank }];
            })
            .toSorted(
              (a, b) =>
                a.rank - b.rank ||
                Number(b.icon.name.toLowerCase().endsWith(".svg")) -
                  Number(a.icon.name.toLowerCase().endsWith(".svg")) ||
                a.icon.name.localeCompare(b.icon.name),
            )
            .slice(0, input.limitPerGroup)
            .map(({ icon }) => icon),
  }));
  const value = count.value[0]?.count;
  const countIcons = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(countIcons) || countIcons < 0) throw new Error("Invalid icon count");
  return {
    icons: term.length === 0 ? matched : matched.filter((repository) => repository.icons.length > 0),
    countIcons,
  };
};

export const isDirectImageUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};
export const isImageSource = (value: string) => isDirectImageUrl(value) || value.trim().startsWith("/");
export const isSvgImage = (value: string) => {
  try {
    return new URL(value, "http://homarr.local").pathname.toLowerCase().endsWith(".svg");
  } catch {
    return value.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(".svg") ?? false;
  }
};

export const arrangeIconPickerSections = (groups: readonly PublicIconGroup[], searchTerm = "") => {
  type PickerIcon = PublicIcon & { repositorySlug: string };
  const sections: { local: PickerIcon[]; svg: PickerIcon[]; other: PickerIcon[] } = { local: [], svg: [], other: [] };
  for (const group of groups)
    for (const icon of group.icons) {
      const pickerIcon = { ...icon, repositorySlug: group.slug };
      (group.slug === "local" ? sections.local : isSvgImage(icon.url) ? sections.svg : sections.other).push(pickerIcon);
    }
  const term = normalizeImageName(searchTerm);
  if (!term) return sections;
  const compare = (a: PickerIcon, b: PickerIcon) =>
    (getImageMatchRank(term, a.name || a.url) ?? Number.MAX_SAFE_INTEGER) -
      (getImageMatchRank(term, b.name || b.url) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
  return {
    local: sections.local.toSorted(compare),
    svg: sections.svg.toSorted(compare),
    other: sections.other.toSorted(compare),
  };
};

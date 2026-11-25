import { getImageMatchRank, normalizeImageName } from "@homarr/common";
import type { Database } from "@homarr/db";
import { icons } from "@homarr/db/schema";

export const iconCatalogSettingKey = "iconCatalogCache";

interface IconCatalogState {
  revision: string;
  etags: Record<string, string>;
}

export async function getIconCatalogStateAsync(database: Database) {
  const row = await database.query.serverSettings.findFirst({
    columns: { value: true },
    where: (table, { eq }) => eq(table.settingKey, iconCatalogSettingKey),
  });
  return row && (JSON.parse(row.value) as IconCatalogState);
}

const readIconGroupsAsync = (database: Database, scope: "all" | "local" | "external", limit?: number) =>
  database.query.iconRepositories.findMany({
    where: (table, { eq, ne }) => {
      if (scope === "local") return eq(table.slug, "local");
      if (scope === "external") return ne(table.slug, "local");
    },
    orderBy: (table, { asc, sql }) => [sql`CASE WHEN ${table.slug} = 'local' THEN 0 ELSE 1 END`, asc(table.slug)],
    with: {
      icons: {
        columns: { id: true, name: true, url: true },
        orderBy: (table, { asc, sql }) => [
          sql`CASE WHEN ${table.name} LIKE '%.svg' THEN 0 ELSE 1 END`,
          asc(table.name),
        ],
        limit,
      },
    },
  });

type IconGroup = Awaited<ReturnType<typeof readIconGroupsAsync>>[number];
type Icon = IconGroup["icons"][number];

const externalCatalogs = new WeakMap<
  Database,
  { revision: string; groups: ReturnType<typeof loadExternalCatalogAsync> }
>();

async function loadExternalCatalogAsync(database: Database) {
  const groups = await readIconGroupsAsync(database, "external");
  return groups.map((group) => ({
    ...group,
    icons: group.icons.map((icon) => ({
      icon,
      compactName: normalizeImageName(icon.name || icon.url).replaceAll(" ", ""),
    })),
  }));
}

function getExternalCatalogAsync(database: Database, revision: string | undefined) {
  if (revision === undefined) return loadExternalCatalogAsync(database);
  const cached = externalCatalogs.get(database);
  if (cached?.revision === revision) return cached.groups;

  const groups = loadExternalCatalogAsync(database).catch((error: unknown) => {
    if (externalCatalogs.get(database)?.groups === groups) externalCatalogs.delete(database);
    throw error;
  });
  externalCatalogs.set(database, { revision, groups });
  return groups;
}

function rankIcons(term: string, candidates: Icon[], limit: number) {
  return candidates
    .flatMap((icon) => {
      const rank = getImageMatchRank(term, icon.name || icon.url);
      if (rank === null) return [];
      return [{ icon, rank }];
    })
    .toSorted(
      (a, b) =>
        a.rank - b.rank ||
        Number(b.icon.name.toLowerCase().endsWith(".svg")) - Number(a.icon.name.toLowerCase().endsWith(".svg")) ||
        a.icon.name.localeCompare(b.icon.name),
    )
    .slice(0, limit)
    .map(({ icon }) => icon);
}

export async function findIconsAsync(database: Database, searchText: string, limitPerGroup: number) {
  const term = normalizeImageName(searchText);
  if (term.length === 0) {
    const [groups, countIcons] = await Promise.all([
      readIconGroupsAsync(database, "all", limitPerGroup),
      database.$count(icons),
    ]);
    return { icons: groups, countIcons };
  }

  const [state, local] = await Promise.all([
    getIconCatalogStateAsync(database),
    readIconGroupsAsync(database, "local"),
  ]);
  const external = await getExternalCatalogAsync(database, state?.revision);
  const countIcons = [...local, ...external].reduce((count, group) => count + group.icons.length, 0);

  // Every accepted rank requires each search token to occur in the compact name.
  // A single token narrows candidates without changing the ranker's matches.
  const token = term.split(" ").reduce((longest, word) => {
    if (word.length > longest.length) return word;
    return longest;
  });
  const matches = [
    ...local.map((group) => ({ ...group, icons: rankIcons(term, group.icons, limitPerGroup) })),
    ...external.map((group) => {
      const candidates = group.icons.filter(({ compactName }) => compactName.includes(token)).map(({ icon }) => icon);
      return { ...group, icons: rankIcons(term, candidates, limitPerGroup) };
    }),
  ];
  return { icons: matches.filter((group) => group.icons.length > 0), countIcons };
}

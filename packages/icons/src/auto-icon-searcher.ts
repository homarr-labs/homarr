import { getImageMatchRank, normalizeImageName } from "@homarr/common";
import type { Database } from "@homarr/db";
import { like } from "@homarr/db";
import { icons } from "@homarr/db/schema";

export const getIconForName = (db: Database, name: string) => {
  return db.query.icons.findFirst({
    where: like(icons.name, `%${name}%`),
  });
};

// Only exact name matches (ranks 0 and 1 of the icon picker) are accepted, so a short hostname label
// like "app" can't pick an unrelated icon. The hostname is tried before the title, since self hosted
// apps are usually named by their subdomain while titles vary widely or come from a bot challenge.
export const getIconForWebsiteAsync = async (db: Database, href: string, title: string | null) => {
  const { hostname } = new URL(href);
  const labels = /^[\d.]+$/.test(hostname) || hostname.startsWith("[") ? [] : hostname.split(".");
  const hostnameNames = (labels.length > 1 ? labels.slice(0, -1) : labels).filter((label) => label !== "www");
  const searches = [...hostnameNames, title ?? ""].map(normalizeImageName).filter((search) => search.length > 0);

  for (const search of searches) {
    const candidates = await db.query.icons.findMany({
      columns: { name: true, url: true },
      where: like(icons.name, `%${search.split(" ")[0]}%`),
      with: { repository: { columns: { slug: true } } },
    });
    // Same order as the icon picker: local icons first, then repositories by slug, svg before other formats
    const bestMatch = candidates
      .flatMap((icon) => {
        const rank = getImageMatchRank(search, icon.name);
        return rank !== null && rank <= 1 ? [{ icon, rank }] : [];
      })
      .toSorted(
        (a, b) =>
          a.rank - b.rank ||
          Number(a.icon.repository.slug !== "local") - Number(b.icon.repository.slug !== "local") ||
          a.icon.repository.slug.localeCompare(b.icon.repository.slug) ||
          Number(b.icon.name.toLowerCase().endsWith(".svg")) - Number(a.icon.name.toLowerCase().endsWith(".svg")),
      )[0];
    if (bestMatch) return bestMatch.icon.url;
  }

  return null;
};

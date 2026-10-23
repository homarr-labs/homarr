import { parse, stringify } from "superjson";

import { eq } from "../..";
import type { Database } from "../..";
import { items } from "../../schema";

interface LegacyReleasesOptions {
  newReleaseWithin?: unknown;
  staleReleaseWithin?: unknown;
  showOnlyHighlighted?: unknown;
  showDetails?: unknown;
  showOnlyIcon?: unknown;
  topReleases?: unknown;
}

const hoursPerUnit: Record<string, number> = { h: 1, d: 24, w: 24 * 7, m: 24 * 30, y: 24 * 365 };

const newReleaseWithinPresets = ["1d", "3d", "1w", "2w", "1M", "3M"];
const staleReleaseWithinPresets = ["1M", "3M", "6M", "1y", "2y"];
const allSections = ["new", "attention", "upToDate", "quiet"];
const legacyOptionKeys = ["showOnlyHighlighted", "showDetails", "showOnlyIcon", "topReleases"];

const toHours = (value: string) => {
  const match = /^(\d+)([hdwmy])$/i.exec(value);
  if (!match?.[1] || !match[2]) return null;
  const amount = Number.parseInt(match[1], 10);
  const unitHours = hoursPerUnit[match[2].toLowerCase()];
  if (amount <= 0 || unitHours === undefined) return null;
  return amount * unitHours;
};

const toClosestPreset = (value: unknown, presets: string[], fallback: string) => {
  if (value === "" || value === "never") return "never";
  if (typeof value !== "string") return fallback;
  if (presets.includes(value)) return value;

  const hours = toHours(value);
  if (hours === null) return fallback;

  const distance = (preset: string) => Math.abs(Math.log((toHours(preset) ?? 1) / hours));
  return presets.toSorted((left, right) => distance(left) - distance(right))[0] ?? fallback;
};

const toSections = (showOnlyHighlighted: unknown) => {
  if (showOnlyHighlighted === false) return allSections;
  return allSections.filter((section) => section !== "upToDate");
};

export async function migrateReleasesWidgetOptionsAsync(db: Database) {
  const releaseItems = await db.query.items.findMany({ where: eq(items.kind, "releases") });

  const itemsToUpdate = releaseItems
    .map((item) => ({ id: item.id, options: parse<LegacyReleasesOptions>(item.options) }))
    .filter(({ options }) => legacyOptionKeys.some((key) => key in options));

  console.log(`Migrating releases widget options count=${itemsToUpdate.length}`);

  await Promise.all(
    itemsToUpdate.map(async (item) => {
      const {
        showOnlyHighlighted,
        showDetails,
        showOnlyIcon: _showOnlyIcon,
        topReleases: _topReleases,
        ...options
      } = item.options;
      await db
        .update(items)
        .set({
          options: stringify({
            ...options,
            ...("showDetails" in item.options && { showChangelogPreview: showDetails !== false }),
            newReleaseWithin: toClosestPreset(options.newReleaseWithin, newReleaseWithinPresets, "1w"),
            staleReleaseWithin: toClosestPreset(options.staleReleaseWithin, staleReleaseWithinPresets, "6M"),
            sections: toSections(showOnlyHighlighted),
          }),
        })
        .where(eq(items.id, item.id));
    }),
  );

  console.log(`Migrated releases widget options count=${itemsToUpdate.length}`);
}

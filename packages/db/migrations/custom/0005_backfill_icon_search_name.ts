import { compactImageName } from "@homarr/common";
import { inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "../..";
import { icons } from "../../schema";

const batchSize = 200;

/**
 * Fills `icons.searchName` for rows written before the column existed.
 *
 * The icon search treats a null `searchName` as "always a candidate", so results
 * stay identical while this runs. Once every row is backfilled the query below
 * matches nothing and the migration exits immediately on later startups.
 */
export async function migrateIconSearchNameAsync(db: Database) {
  for (;;) {
    const pending = await db
      .select({ id: icons.id, name: icons.name, url: icons.url })
      .from(icons)
      .where(isNull(icons.searchName))
      .limit(batchSize);

    if (pending.length === 0) return;

    await db
      .update(icons)
      .set({
        // `getImageMatchRank` is called with `icon.name || icon.url` in findIcons.
        searchName: sql`case ${sql.join(
          pending.map((icon) => sql`when ${icons.id} = ${icon.id} then ${compactImageName(icon.name || icon.url)}`),
          sql.raw(" "),
        )} else ${icons.searchName} end`,
      })
      .where(
        inArray(
          icons.id,
          pending.map((icon) => icon.id),
        ),
      );
  }
}

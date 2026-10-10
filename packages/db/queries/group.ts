import { max } from "drizzle-orm";

import type { HomarrDatabase } from "../driver";
import { getSchemaForDatabase } from "../schema";

export const getMaxGroupPositionAsync = async (db: HomarrDatabase) => {
  const { groups } = getSchemaForDatabase(db);
  return await db
    .select({ value: max(groups.position) })
    .from(groups)
    .then((result) => result[0]?.value ?? 1);
};

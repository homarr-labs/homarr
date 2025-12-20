import { like } from "drizzle-orm";

import type { Database } from "@homarr/db";
import { icons } from "@homarr/db/schema";

export const getIconForName = (db: Database, name: string) => {
  return db.query.icons.findFirst({
    where: like(icons.name, `%${name}%`),
  });
};

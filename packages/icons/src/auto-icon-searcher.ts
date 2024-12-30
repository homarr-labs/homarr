import type { Database } from "@homarr/db";
import { like } from "@homarr/db";
import { icons } from "@homarr/db/schema";

export const getIconForNameAsync = async (db: Database, name: string) => {
  return await db.query.icons.findFirst({
    where: like(icons.name, `%${name}%`),
  });
};

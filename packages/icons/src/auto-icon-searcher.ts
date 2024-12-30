import { db, like } from "@homarr/db";
import { icons } from "@homarr/db/schema";

export const getIconForNameAsync = async (name: string) => {
  return await db.query.icons.findFirst({
    where: like(icons.name, `%${name}%`),
  });
};

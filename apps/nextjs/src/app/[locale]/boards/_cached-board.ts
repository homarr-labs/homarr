import { unstable_cache } from "next/cache";

import { db, eq, sql } from "@homarr/db";
import { boards } from "@homarr/db/schema";

import { getSharedBoardWithWhereAsync } from "@homarr/api/router/board";

export function getCachedBoardByName(name: string) {
  const tag = `board-${name.toLowerCase()}`;
  return unstable_cache(
    async () => {
      const where = eq(sql`UPPER(${boards.name})`, name.toUpperCase());
      return await getSharedBoardWithWhereAsync(db, where);
    },
    ["board-by-name", name.toLowerCase()],
    {
      tags: [tag],
      revalidate: 3600,
    },
  )();
}

import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { boards } from "@homarr/db/schema";

export const loadBoardGraphAsync = async (db: Database, boardId: string) => {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      layouts: true,
      sections: {
        with: {
          layouts: true,
        },
      },
      items: {
        with: {
          layouts: true,
          integrations: {
            with: {
              integration: {
                with: {
                  secrets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return board;
};

export type LoadedBoardGraph = NonNullable<Awaited<ReturnType<typeof loadBoardGraphAsync>>>;

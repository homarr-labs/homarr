import React from "react";

import { getScopedI18n } from "@homarr/translation/server";
import { Card, Grid, GridCol, Text, Title } from "@homarr/ui";

import { api } from "~/trpc/server";
import { CreateBoardButton } from "./_components/create-board-button";
import { DeleteBoardButton } from "./_components/delete-board-button";

export default async function ManageBoardsPage() {
  const t = await getScopedI18n("management.page.board");

  const boards = await api.board.getAll();

  return (
    <>
      <Title>{t("title")}</Title>

      <CreateBoardButton />

      <Grid>
        {boards.map((board) => (
          <GridCol span={{ xs: 12, md: 4 }} key={board.id}>
            <Card>
              <Text fw={500}>{board.name}</Text>

              <Text size="sm" my="md" style={{ lineBreak: "anywhere" }}>
                {JSON.stringify(board)}
              </Text>

              <DeleteBoardButton id={board.id} />
            </Card>
          </GridCol>
        ))}
      </Grid>
    </>
  );
}

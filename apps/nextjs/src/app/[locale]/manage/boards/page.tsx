import React from "react";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";
import { Card, Grid, GridCol, Group, Text, Title } from "@homarr/ui";

import { CreateBoardButton } from "./_components/create-board-button";
import { DeleteBoardButton } from "./_components/delete-board-button";

export default async function ManageBoardsPage() {
  const t = await getScopedI18n("management.page.board");

  const boards = await api.board.getAll();

  return (
    <>
      <Group justify="space-between">
        <Title mb="md">{t("title")}</Title>
        <CreateBoardButton boardNames={boards.map((board) => board.name)} />
      </Group>

      <Grid>
        {boards.map((board) => (
          <GridCol span={{ xs: 12, md: 4 }} key={board.id}>
            <Card>
              <Text fw="bolder" tt="uppercase">
                {board.name}
              </Text>

              <Text
                size="sm"
                my="md"
                c="dimmed"
                style={{ lineBreak: "anywhere" }}
              >
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

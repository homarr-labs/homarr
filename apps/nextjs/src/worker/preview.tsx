"use client";

import { Alert, Center, Loader } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { BoardPreviewProvider } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { ModalProvider } from "@homarr/modals";
import { widgetKinds } from "@homarr/widgets/manifest";

import { WidgetPreviewPageContent } from "~/app/[locale]/widgets/[kind]/_content";

export function WorkerWidgetPreview({ kind }: { kind: string }) {
  const home = clientApi.board.getHomeBoard.useQuery(undefined, { retry: false });
  const boards = clientApi.board.getAllBoards.useQuery(undefined, { enabled: home.isError });
  const name = boards.data?.[0]?.name ?? "";
  const named = clientApi.board.getBoardByName.useQuery({ name }, { enabled: home.isError && !!name });
  const board = home.data ?? named.data;
  if (!widgetKinds.includes(kind as WidgetKind)) return <Alert color="red">This widget does not exist.</Alert>;
  if (!board)
    return (
      <Center mih="80vh">
        <Loader aria-label="Loading widget preview" />
      </Center>
    );
  return (
    <BoardPreviewProvider board={board}>
      <ModalProvider>
        <Center mih="100vh">
          <WidgetPreviewPageContent kind={kind as WidgetKind} />
        </Center>
      </ModalProvider>
    </BoardPreviewProvider>
  );
}

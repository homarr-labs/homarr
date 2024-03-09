import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import type { RouterOutputs } from "@homarr/api";

import { widgetImports } from "..";
import { ClientServerDataInitalizer } from "./client";
import { GlobalItemServerDataProvider } from "./provider";

type Board = RouterOutputs["board"]["default"];

type Props = PropsWithChildren<{
  board: Board;
}>;

export const GlobalItemServerDataRunner = ({ board, children }: Props) => {
  const allItems = board.sections.flatMap((section) => section.items);

  return (
    <GlobalItemServerDataProvider initalItemIds={allItems.map(({ id }) => id)}>
      {allItems.map((item) => (
        <Suspense key={item.id}>
          <ItemDataLoader item={item} />
        </Suspense>
      ))}
      {children}
    </GlobalItemServerDataProvider>
  );
};

interface ItemDataLoaderProps {
  item: Board["sections"][number]["items"][number];
}

const ItemDataLoader = /*async*/ ({ item }: ItemDataLoaderProps) => {
  const widgetImport = widgetImports[item.kind];
  if (!("serverDataLoader" in widgetImport)) {
    return <ClientServerDataInitalizer id={item.id} serverData={undefined} />;
  }
  //const loader = await widgetImport.serverDataLoader();
  //const data = await loader.default(item as never);
  //return <ClientServerDataInitalizer id={item.id} serverData={data} />;
  return null;
};

import type { PropsWithChildren } from "react";
import { Suspense } from "react";

import type { RouterOutputs } from "@homarr/api";

import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "..";
import { ClientServerDataInitalizer } from "./client";
import { GlobalItemServerDataProvider } from "./provider";

type Board = RouterOutputs["board"]["getHomeBoard"];

type Props = PropsWithChildren<{
  shouldRun: boolean;
  board: Board;
}>;

export const GlobalItemServerDataRunner = ({ board, shouldRun, children }: Props) => {
  if (!shouldRun) return children;

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

const ItemDataLoader = async ({ item }: ItemDataLoaderProps) => {
  const widgetImport = widgetImports[item.kind];
  if (!("serverDataLoader" in widgetImport) || !widgetImport.serverDataLoader) {
    return <ClientServerDataInitalizer id={item.id} serverData={undefined} />;
  }
  const loader = await widgetImport.serverDataLoader();
  const optionsWithDefault = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const data = await loader.default({
    ...item,
    options: optionsWithDefault as never,
    itemId: item.id,
  });
  return <ClientServerDataInitalizer id={item.id} serverData={data} />;
};

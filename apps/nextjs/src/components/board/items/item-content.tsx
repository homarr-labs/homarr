import { Card } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import combineClasses from "clsx";
import { ErrorBoundary } from "react-error-boundary";

import { loadWidgetDynamic, reduceWidgetOptionsWithDefaultValues, useServerDataFor } from "@homarr/widgets";
import { WidgetError } from "@homarr/widgets/errors";

import type { Item } from "~/app/[locale]/boards/_types";
import { useEditMode, useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import classes from "../sections/item.module.css";
import { BoardItemMenu } from "./item-menu";
import { useItemActions } from "./item-actions";

interface BoardItemContentProps {
  item: Item;
}

export const BoardItemContent = ({ item }: BoardItemContentProps) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const board = useRequiredBoard();

  return (
    <Card
      ref={ref}
      className={combineClasses(
        classes.itemCard,
        `${item.kind}-wrapper`,
        "grid-stack-item-content",
        item.advancedOptions.customCssClasses.join(" "),
      )}
      withBorder
      styles={{
        root: {
          "--opacity": board.opacity / 100,
          containerType: "size",
        },
      }}
      p={0}
    >
      <InnerContent item={item} width={width} height={height} />
    </Card>
  );
};

interface InnerContentProps {
  item: Item;
  width: number;
  height: number;
}

const InnerContent = ({ item, ...dimensions }: InnerContentProps) => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const serverData = useServerDataFor(item.id);
  const Comp = loadWidgetDynamic(item.kind);
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const newItem = { ...item, options };
  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    useItemActions().updateItemOptions({ itemId: item.id, newOptions });

  if (!serverData?.isReady) return null;

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <>
              <BoardItemMenu offset={4} item={newItem} resetErrorBoundary={resetErrorBoundary} />
              <WidgetError kind={item.kind} error={error as unknown} resetErrorBoundary={resetErrorBoundary} />
            </>
          )}
        >
          <BoardItemMenu offset={4} item={newItem} />
          <Comp
            options={options as never}
            integrationIds={item.integrationIds}
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            serverData={serverData?.data as never}
            isEditMode={isEditMode}
            boardId={board.id}
            itemId={item.id}
            setOptions={updateOptions}
            {...dimensions}
          />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

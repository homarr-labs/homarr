import { Card } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "node_modules/@homarr/widgets/src/errors";
import { ErrorBoundary } from "react-error-boundary";

import { loadWidgetDynamic, reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetError } from "@homarr/widgets/errors";

import type { Item } from "~/app/[locale]/boards/_types";
import { useEditMode, useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import classes from "../sections/item.module.css";
import { useItemActions } from "./item-actions";
import { BoardItemMenu } from "./item-menu";

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
          overflow: item.kind === "iframe" ? "hidden" : undefined,
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
  const Comp = loadWidgetDynamic(item.kind);
  const { definition } = widgetImports[item.kind];
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, item.options);
  const newItem = { ...item, options };
  const { updateItemOptions } = useItemActions();
  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    updateItemOptions({ itemId: item.id, newOptions });
  const widgetSupportsIntegrations =
    "supportedIntegrations" in definition && definition.supportedIntegrations.length >= 1;

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
          <Throw
            error={new NoIntegrationSelectedError()}
            when={widgetSupportsIntegrations && item.integrationIds.length === 0}
          />
          <BoardItemMenu offset={4} item={newItem} />
          <Comp
            options={options as never}
            integrationIds={item.integrationIds}
            isEditMode={isEditMode}
            boardId={board.id}
            itemId={item.id}
            setOptions={(partialNewOptions) =>
              updateOptions({
                newOptions: {
                  ...partialNewOptions.newOptions,
                  ...options,
                },
              })
            }
            {...dimensions}
          />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};

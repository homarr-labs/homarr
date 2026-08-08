import type { ComponentType, MutableRefObject } from "react";
import { Suspense, use, useRef } from "react";
import dynamic from "next/dynamic";
import type { CardProps } from "@mantine/core";
import { Badge, Card, Center, Loader } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { WidgetError } from "@homarr/widgets/errors";
import { getWidgetQueryKeys } from "@homarr/widgets/definition";
import type { WidgetComponentProps, WidgetDefinition } from "@homarr/widgets/definition";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import classes from "../sections/item.module.css";
import { useItemActions } from "./item-actions";
import itemContentClasses from "./item-content.module.css";
import { WidgetContextMenu } from "./widget-context-menu";
import { removeWidgetDataQueries } from "./widget-query-recovery";

const BoardItemMenu = dynamic(() => import("./item-menu").then((module) => module.BoardItemMenu), {
  ssr: false,
});

interface BoardItemContentProps {
  item: SectionItem;
}

const getOverflowFromKind = (kind: SectionItem["kind"], hasCustomCssClasses: boolean) => {
  if (kind === "systemResources") return { overflowX: "visible", overflowY: "visible" } as const;
  if (kind === "iframe") return { overflowX: "hidden", overflowY: "hidden" } as const;
  if (hasCustomCssClasses) return {};
  return { overflowX: "hidden", overflowY: "auto" } as const;
};

type BoardItemCardProps = CardProps & {
  item: SectionItem;
  innerRef: (element: HTMLDivElement | null) => void;
};

const BoardItemCard = ({ item, innerRef, children, ...cardProps }: BoardItemCardProps) => {
  const board = useRequiredBoard();

  return (
    <Card
      {...cardProps}
      ref={innerRef}
      w="100%"
      h="100%"
      data-grid-item-content
      className={combineClasses(
        classes.itemCard,
        `${item.kind}-wrapper`,
        "board-grid-item-content",
        item.advancedOptions.customCssClasses.join(" "),
      )}
      radius={board.itemRadius}
      styles={{
        root: {
          "--opacity": board.opacity / 100,
          containerType: "size",
          ...getOverflowFromKind(item.kind, item.advancedOptions.customCssClasses.length > 0),
          "--border-color": item.advancedOptions.borderColor !== "" ? item.advancedOptions.borderColor : undefined,
        },
      }}
      p={0}
    >
      {children}
    </Card>
  );
};

const WidgetDefinitionLoadError = ({
  error,
  resetErrorBoundary,
  item,
  innerRef,
}: FallbackProps & Pick<BoardItemCardProps, "item" | "innerRef">) => (
  <BoardItemCard item={item} innerRef={innerRef}>
    <Center h="100%">
      <WidgetError error={error} resetErrorBoundary={resetErrorBoundary} />
    </Center>
  </BoardItemCard>
);

export const BoardItemContent = ({ item }: BoardItemContentProps) => {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const board = useRequiredBoard();
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);

  return (
    <>
      <ErrorBoundary
        resetKeys={[item.kind]}
        fallbackRender={(fallbackProps) => <WidgetDefinitionLoadError {...fallbackProps} item={item} innerRef={ref} />}
      >
        <Suspense
          fallback={
            <BoardItemCard item={item} innerRef={ref}>
              <Center h="100%">
                <Loader size="sm" />
              </Center>
            </BoardItemCard>
          }
        >
          <LoadedBoardItemContent
            item={item}
            width={width}
            height={height}
            widgetStateRef={widgetStateRef}
            innerRef={ref}
          />
        </Suspense>
      </ErrorBoundary>
      {item.advancedOptions.title?.trim() && (
        <Badge
          pos="absolute"
          // It's 4 because of the mantine-react-table that has z-index 3
          style={{ zIndex: 4 }}
          top={2}
          left={16}
          size="xs"
          radius={board.itemRadius}
          styles={{
            root: {
              "--border-color": item.advancedOptions.borderColor !== "" ? item.advancedOptions.borderColor : undefined,
              "--opacity": board.opacity / 100,
            },
          }}
          className={itemContentClasses.badge}
          c="var(--mantine-color-text)"
        >
          {item.advancedOptions.title}
        </Badge>
      )}
    </>
  );
};

interface LoadedBoardItemContentProps extends Omit<InnerContentProps, "definition" | "Component"> {
  innerRef: (element: HTMLDivElement | null) => void;
}

const LoadedBoardItemContent = ({ item, innerRef, ...innerContentProps }: LoadedBoardItemContentProps) => {
  const { definition, Component } = use(loadWidgetResources(item.kind));
  const [isEditMode] = useEditMode();

  return (
    <WidgetContextMenu item={item} definition={definition} widgetStateRef={innerContentProps.widgetStateRef}>
      <BoardItemCard item={item} innerRef={innerRef}>
        <ErrorBoundary
          resetKeys={[item.kind]}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <>
              <BoardItemMenu item={item} definition={definition} resetErrorBoundary={resetErrorBoundary} />
              <div
                className={itemContentClasses.editModeInertContent}
                data-board-grid-inert-content={isEditMode ? "true" : undefined}
                inert={isEditMode}
              >
                <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
              </div>
            </>
          )}
        >
          <InnerContent item={item} definition={definition} Component={Component} {...innerContentProps} />
        </ErrorBoundary>
      </BoardItemCard>
    </WidgetContextMenu>
  );
};

interface InnerContentProps {
  item: SectionItem;
  width: number;
  height: number;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<SectionItem["kind"]>>;
}

const InnerContent = ({ item, definition, Component, ...dimensions }: InnerContentProps) => {
  const settings = useSettings();
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const options = reduceWidgetOptionsWithDefinition(definition, settings, item.options);
  const newItem = { ...item, options };
  const { removeItem, updateItemOptions } = useItemActions();
  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    updateItemOptions({ itemId: item.id, newOptions });
  const widgetSupportsIntegrations =
    "supportedIntegrations" in definition && (definition.supportedIntegrations?.length ?? 0) >= 1;
  const queryClient = useQueryClient();
  const widgetQueryKeys = getWidgetQueryKeys(definition, item.kind);

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={() => {
            removeWidgetDataQueries(queryClient, widgetQueryKeys);
            reset();
          }}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <>
              {isEditMode && (
                <BoardItemMenu item={newItem} definition={definition} resetErrorBoundary={resetErrorBoundary} />
              )}
              <div
                className={itemContentClasses.editModeInertContent}
                data-board-grid-inert-content={isEditMode ? "true" : undefined}
                inert={isEditMode}
              >
                <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
              </div>
            </>
          )}
        >
          <Throw
            error={new NoIntegrationSelectedError()}
            when={
              widgetSupportsIntegrations &&
              item.integrationIds.length === 0 &&
              (!("integrationsRequired" in definition) || definition.integrationsRequired !== false)
            }
          />
          {isEditMode && <BoardItemMenu item={newItem} definition={definition} />}
          <div
            className={itemContentClasses.editModeInertContent}
            data-board-grid-inert-content={isEditMode ? "true" : undefined}
            data-homarr-widget-ready={item.kind}
            inert={isEditMode}
          >
            <Component
              options={options as never}
              integrationIds={item.integrationIds}
              isEditMode={isEditMode}
              boardId={board.id}
              itemId={item.id}
              removeItem={() => removeItem({ itemId: item.id })}
              setOptions={(partialNewOptions) =>
                updateOptions({
                  newOptions: {
                    ...options,
                    ...partialNewOptions.newOptions,
                  },
                })
              }
              {...dimensions}
            />
          </div>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};

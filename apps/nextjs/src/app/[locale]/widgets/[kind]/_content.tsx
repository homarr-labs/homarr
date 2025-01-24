"use client";

import { useCallback, useMemo, useState } from "react";
import { ActionIcon, Affix, Card } from "@mantine/core";
import { IconDimensions, IconPencil, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { clientApi } from "@homarr/api/client";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { BoardItemAdvancedOptions } from "@homarr/validation";
import { loadWidgetDynamic, reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetError } from "@homarr/widgets/errors";
import { WidgetEditModal } from "@homarr/widgets/modals";

import type { Dimensions } from "./_dimension-modal";
import { PreviewDimensionsModal } from "./_dimension-modal";

interface WidgetPreviewPageContentProps {
  kind: WidgetKind;
  integrationData: {
    id: string;
    name: string;
    url: string;
    kind: IntegrationKind;
  }[];
}

export const WidgetPreviewPageContent = ({ kind, integrationData }: WidgetPreviewPageContentProps) => {
  const [data] = clientApi.widget.options.getWidgetOptionSettings.useSuspenseQuery();
  const t = useScopedI18n("widgetPreview");
  const { openModal: openWidgetEditModal } = useModalAction(WidgetEditModal);
  const { openModal: openPreviewDimensionsModal } = useModalAction(PreviewDimensionsModal);
  const currentDefinition = useMemo(() => widgetImports[kind].definition, [kind]);
  const [editMode, setEditMode] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 128,
    height: 128,
  });
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrationIds: string[];
    advancedOptions: BoardItemAdvancedOptions;
  }>({
    options: reduceWidgetOptionsWithDefaultValues(kind, data, {}),
    integrationIds: [],
    advancedOptions: {
      customCssClasses: [],
    },
  });

  const handleOpenEditWidgetModal = useCallback(() => {
    openWidgetEditModal({
      kind,
      value: state,
      onSuccessfulEdit: (value) => {
        setState(value);
      },
      integrationData: integrationData.filter(
        (integration) =>
          "supportedIntegrations" in currentDefinition &&
          (currentDefinition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
      ),
      integrationSupport: "supportedIntegrations" in currentDefinition,
      optionSettings: data,
    });
  }, [currentDefinition, integrationData, kind, openWidgetEditModal, data, state]);

  const Comp = loadWidgetDynamic(kind);

  const toggleEditMode = useCallback(() => {
    setEditMode((editMode) => !editMode);
    showSuccessNotification({
      message: editMode ? t("toggle.disabled") : t("toggle.enabled"),
    });
  }, [editMode, t]);

  const openDimensionsModal = useCallback(() => {
    openPreviewDimensionsModal({
      dimensions,
      setDimensions,
    });
  }, [dimensions, openPreviewDimensionsModal]);

  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    setState({ ...state, options: { ...state.options, newOptions } });

  return (
    <>
      <Card withBorder w={dimensions.width} h={dimensions.height} p={dimensions.height >= 96 ? undefined : 4}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary, error }) => (
                <WidgetError kind={kind} error={error as unknown} resetErrorBoundary={resetErrorBoundary} />
              )}
            >
              <Comp
                options={state.options as never}
                integrationIds={state.integrationIds}
                width={dimensions.width}
                height={dimensions.height}
                isEditMode={editMode}
                boardId={undefined}
                itemId={undefined}
                setOptions={updateOptions}
              />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </Card>
      <Affix bottom={12} right={72}>
        <ActionIcon size={48} variant="default" radius="xl" onClick={handleOpenEditWidgetModal}>
          <IconPencil size={24} />
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 60}>
        <ActionIcon size={48} variant="default" radius="xl" onClick={toggleEditMode}>
          {editMode ? <IconToggleLeft size={24} /> : <IconToggleRight size={24} />}
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 120}>
        <ActionIcon size={48} variant="default" radius="xl" onClick={openDimensionsModal}>
          <IconDimensions size={24} />
        </ActionIcon>
      </Affix>
    </>
  );
};

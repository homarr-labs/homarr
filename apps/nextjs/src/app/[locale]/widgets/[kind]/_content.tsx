"use client";

/* eslint-disable react/no-unstable-nested-components -- Widget modules and definition-bound fallbacks are loaded dynamically. */

import { use, useCallback, useState } from "react";
import { ActionIcon, Affix, Card } from "@mantine/core";
import { IconDimensions, IconPencil, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { clientApi } from "@homarr/api/client";
import { getWidgetName } from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";
import { WidgetError } from "@homarr/widgets/errors";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { LazyWidgetEditModal, preloadWidgetEditModal } from "~/components/board/items/lazy-widget-edit-modal";
import type { Dimensions } from "./_dimension-popover";
import { PreviewDimensionsPopover } from "./_dimension-popover";

interface WidgetPreviewPageContentProps {
  kind: WidgetKind;
}

export const WidgetPreviewPageContent = ({ kind }: WidgetPreviewPageContentProps) => {
  const settings = useSettings();
  const t = useI18n();
  const utils = clientApi.useUtils();
  const { openModal: openWidgetEditModal } = useModalAction(LazyWidgetEditModal);
  const { definition: currentDefinition, Component } = use(loadWidgetResources(kind));
  const [editMode, setEditMode] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 128,
    height: 128,
  });
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrationIds: string[];
    advancedOptions: BoardItemAdvancedOptions;
  }>({
    options: reduceWidgetOptionsWithDefinition(currentDefinition, settings, {}),
    integrationIds: [],
    advancedOptions: {
      title: null,
      customCssClasses: [],
      borderColor: "",
    },
  });

  const handleOpenEditWidgetModal = useCallback(async () => {
    const hasIntegrationSupport = "supportedIntegrations" in currentDefinition;
    setIsEditorLoading(true);
    preloadWidgetEditModal();
    try {
      const integrationData = hasIntegrationSupport ? await utils.integration.all.ensureData() : [];
      openWidgetEditModal(
        {
          kind,
          definition: currentDefinition,
          value: state,
          onSuccessfulEdit: (value) => {
            setState(value);
          },
          integrationData: integrationData.filter((integration) =>
            (currentDefinition.supportedIntegrations ?? []).includes(integration.kind),
          ),
          integrationSupport: hasIntegrationSupport,
          settings,
          previewDimensions: dimensions,
        },
        {
          title(translate) {
            return `${translate("item.edit.title")} - ${getWidgetName(kind, translate)}`;
          },
        },
      );
    } catch (error) {
      showErrorNotification({
        title: t("common.error"),
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsEditorLoading(false);
    }
  }, [currentDefinition, dimensions, kind, openWidgetEditModal, settings, state, t, utils]);

  const toggleEditMode = useCallback(() => {
    setEditMode((currentEditMode) => !currentEditMode);
    showSuccessNotification({
      message: editMode ? t("widgetPreview.toggle.disabled") : t("widgetPreview.toggle.enabled"),
    });
  }, [editMode, t]);

  const updateOptions = useCallback(
    ({ newOptions }: { newOptions: Record<string, unknown> }) =>
      setState((current) => ({ ...current, options: { ...current.options, ...newOptions } })),
    [],
  );

  return (
    <>
      <Card w={dimensions.width} h={dimensions.height} p={dimensions.height >= 96 ? undefined : 4}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary, error }) => (
                <WidgetError definition={currentDefinition} error={error} resetErrorBoundary={resetErrorBoundary} />
              )}
            >
              <Component
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
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={() => void handleOpenEditWidgetModal()}
          onFocus={preloadWidgetEditModal}
          onPointerEnter={preloadWidgetEditModal}
          loading={isEditorLoading}
          aria-label={t("common.action.edit")}
        >
          <IconPencil size={24} />
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 60}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={toggleEditMode}
          aria-label={editMode ? t("widgetPreview.toggle.disabled") : t("widgetPreview.toggle.enabled")}
        >
          {editMode ? <IconToggleLeft size={24} /> : <IconToggleRight size={24} />}
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 120}>
        <PreviewDimensionsPopover
          dimensions={dimensions}
          setDimensions={setDimensions}
          target={(onClick) => (
            <ActionIcon
              size={48}
              variant="default"
              radius="xl"
              aria-label={t("widgetPreview.dimensions.title")}
              onClick={onClick}
            >
              <IconDimensions size={24} />
            </ActionIcon>
          )}
        />
      </Affix>
    </>
  );
};

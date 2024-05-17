"use client";

import { useCallback, useMemo, useState } from "react";
import { ActionIcon, Affix, Card } from "@mantine/core";
import {
  IconDimensions,
  IconPencil,
  IconToggleLeft,
  IconToggleRight,
} from "@tabler/icons-react";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type {
  BoardItemAdvancedOptions,
  BoardItemIntegration,
} from "@homarr/validation";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  WidgetEditModal,
  widgetImports,
} from "@homarr/widgets";

import { PreviewDimensionsModal } from "./_dimension-modal";
import type { Dimensions } from "./_dimension-modal";

interface WidgetPreviewPageContentProps {
  kind: WidgetKind;
  integrationData: {
    id: string;
    name: string;
    url: string;
    kind: IntegrationKind;
  }[];
}

export const WidgetPreviewPageContent = ({
  kind,
  integrationData,
}: WidgetPreviewPageContentProps) => {
  const t = useScopedI18n("widgetPreview");
  const { openModal: openWidgetEditModal } = useModalAction(WidgetEditModal);
  const { openModal: openPreviewDimensionsModal } = useModalAction(
    PreviewDimensionsModal,
  );
  const currentDefinition = useMemo(
    () => widgetImports[kind].definition,
    [kind],
  );
  const [editMode, setEditMode] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 128,
    height: 128,
  });
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrations: BoardItemIntegration[];
    advancedOptions: BoardItemAdvancedOptions;
  }>({
    options: reduceWidgetOptionsWithDefaultValues(kind, {}),
    integrations: [],
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
          (currentDefinition.supportedIntegrations as string[]).some(
            (kind) => kind === integration.kind,
          ),
      ),
      integrationSupport: "supportedIntegrations" in currentDefinition,
    });
  }, [currentDefinition, integrationData, kind, openWidgetEditModal, state]);

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

  return (
    <>
      <Card
        withBorder
        w={dimensions.width}
        h={dimensions.height}
        p={dimensions.height >= 96 ? undefined : 4}
      >
        <Comp
          options={state.options as never}
          integrations={state.integrations.map(
            (stateIntegration) =>
              integrationData.find(
                (integration) => integration.id === stateIntegration.id,
              )!,
          )}
          width={dimensions.width}
          height={dimensions.height}
          isEditMode={editMode}
          boardId={undefined}
          itemId={undefined}
        />
      </Card>
      <Affix bottom={12} right={72}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={handleOpenEditWidgetModal}
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
        >
          {editMode ? (
            <IconToggleLeft size={24} />
          ) : (
            <IconToggleRight size={24} />
          )}
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 120}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={openDimensionsModal}
        >
          <IconDimensions size={24} />
        </ActionIcon>
      </Affix>
    </>
  );
};

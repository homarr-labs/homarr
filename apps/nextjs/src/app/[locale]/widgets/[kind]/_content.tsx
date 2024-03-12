"use client";

import { useCallback, useMemo, useState } from "react";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import {
  ActionIcon,
  Affix,
  Card,
  IconDimensions,
  IconPencil,
  IconToggleLeft,
  IconToggleRight,
} from "@homarr/ui";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  widgetImports,
} from "@homarr/widgets";

import { modalEvents } from "../../modals";
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
    integrations: string[];
  }>({
    options: reduceWidgetOptionsWithDefaultValues(kind, {}),
    integrations: [],
  });

  const Comp = loadWidgetDynamic(kind);

  const openWitgetEditModal = useCallback(() => {
    return modalEvents.openManagedModal({
      modal: "widgetEditModal",
      innerProps: {
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
      },
    });
  }, [kind, state, integrationData, currentDefinition]);

  const toggleEditMode = useCallback(() => {
    setEditMode((editMode) => !editMode);
    showSuccessNotification({
      message: editMode ? t("toggle.disabled") : t("toggle.enabled"),
    });
  }, [editMode, t]);

  const openDimensionsModal = useCallback(() => {
    modalEvents.openManagedModal({
      modal: "dimensionsModal",
      title: t("dimensions.title"),
      innerProps: {
        dimensions,
        setDimensions,
      },
    });
  }, [dimensions, t]);

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
            (id) => integrationData.find((x) => x.id === id)!,
          )}
          width={dimensions.width}
          height={dimensions.height}
          isEditMode={editMode}
        />
      </Card>
      <Affix bottom={12} right={72}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={openWitgetEditModal}
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

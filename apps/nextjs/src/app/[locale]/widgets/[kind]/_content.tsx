"use client";

import { useState } from "react";
import type { WidgetOptionDefinition } from "node_modules/@homarr/widgets/src/options";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { showSuccessNotification } from "@homarr/notifications";
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
  const currentDefinition = widgetImports[kind].definition;
  const options = currentDefinition.options as Record<
    string,
    WidgetOptionDefinition
  >;
  const [editMode, setEditMode] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 128,
    height: 128,
  });
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrations: string[];
  }>({
    options: reduceWidgetOptionsWithDefaultValues(kind, options),
    integrations: [],
  });

  const Comp = loadWidgetDynamic(kind);

  return (
    <>
      <Card withBorder w={dimensions.width} h={dimensions.height}>
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
          onClick={() => {
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
                    currentDefinition.supportedIntegrations.some(
                      (kind) => kind === integration.kind,
                    ),
                ),
                integrationSupport:
                  "supportedIntegrations" in currentDefinition,
              },
            });
          }}
        >
          <IconPencil size={24} />
        </ActionIcon>
      </Affix>
      <Affix bottom={12} right={72 + 60}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={() => {
            setEditMode((editMode) => !editMode);
            showSuccessNotification({
              message: `Edit mode ${!editMode ? "enabled" : "disabled"}`,
            });
          }}
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
          onClick={() => {
            modalEvents.openManagedModal({
              modal: "dimensionsModal",
              title: "Change dimensions",
              innerProps: {
                dimensions,
                setDimensions,
              },
            });
          }}
        >
          <IconDimensions size={24} />
        </ActionIcon>
      </Affix>
    </>
  );
};

"use client";

import { useState } from "react";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { ActionIcon, Affix, IconPencil } from "@homarr/ui";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  widgetImports,
} from "@homarr/widgets";

import { modalEvents } from "../../modals";

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
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrations: string[];
  }>({
    options: reduceWidgetOptionsWithDefaultValues(kind, {}),
    integrations: [],
  });

  const Comp = loadWidgetDynamic(kind);

  return (
    <>
      <Comp
        options={state.options as never}
        integrations={state.integrations.map(
          (id) => integrationData.find((x) => x.id === id)!,
        )}
      />
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
                    (currentDefinition.supportedIntegrations as string[]).some(
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
    </>
  );
};

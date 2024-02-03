"use client";

import { useState } from "react";
import type { WidgetOptionDefinition } from "node_modules/@homarr/widgets/src/options";

import type { IntegrationKind } from "@homarr/definitions";
import { ActionIcon, Affix, IconPencil } from "@homarr/ui";
import type { WidgetSort } from "@homarr/widgets";
import {
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  widgetImports,
} from "@homarr/widgets";

import { modalEvents } from "../../modals";

interface WidgetPreviewPageContentProps {
  sort: WidgetSort;
  integrationData: {
    id: string;
    name: string;
    url: string;
    kind: IntegrationKind;
  }[];
}

export const WidgetPreviewPageContent = ({
  sort,
  integrationData,
}: WidgetPreviewPageContentProps) => {
  const currentDefinition = widgetImports[sort].definition;
  const options = currentDefinition.options as Record<
    string,
    WidgetOptionDefinition
  >;
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrations: string[];
  }>({
    options: reduceWidgetOptionsWithDefaultValues(options),
    integrations: [],
  });

  const Comp = loadWidgetDynamic(sort);

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
                sort,
                definition: currentDefinition.options,
                state: [state, setState],
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
    </>
  );
};

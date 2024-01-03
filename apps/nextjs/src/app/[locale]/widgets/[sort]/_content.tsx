"use client";

import { useState } from "react";

import type { IntegrationKind } from "@homarr/definitions";
import { ActionIcon, Affix, IconPencil } from "@homarr/ui";
import { loadWidgetDynamic, widgetImports } from "@homarr/widgets";
import type { WidgetSort } from "@homarr/widgets";

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
  const [state, setState] = useState<{
    options: Record<string, unknown>;
    integrations: { id: string }[];
  }>({ options: {}, integrations: [] });

  const Comp = loadWidgetDynamic(sort);
  const currentDefinition = widgetImports[sort].definition;

  return (
    <>
      <Comp
        options={state.options as never}
        integrations={state.integrations as never[]}
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

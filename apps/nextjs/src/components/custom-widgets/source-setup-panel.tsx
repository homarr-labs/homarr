"use client";

import { customWidgetIntegrationKinds } from "@homarr/custom-widgets/core";
import { CustomWidgetSourceSetupPanel } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceSetupPanelProps } from "@homarr/custom-widgets/workbench";

import { IntegrationSourceSelect } from "./integration-source-select";

export function SourceSetupPanel(props: CustomWidgetSourceSetupPanelProps) {
  return (
    <CustomWidgetSourceSetupPanel
      {...props}
      renderIntegrationSource={(setup, value) => {
        const kind = customWidgetIntegrationKinds.find((candidate) => candidate === setup.integrationKind);
        if (!kind) return null;
        return (
          <IntegrationSourceSelect
            kind={kind}
            integrationId={value.integrationId}
            onChange={(integrationId) => props.onChange(setup.sourceId, { ...value, integrationId })}
          />
        );
      }}
    />
  );
}

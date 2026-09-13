"use client";

import { Stack } from "@mantine/core";

import { CustomWidgetSourceSetupPanel } from "@homarr/custom-widgets/workbench";

import { ImportIntegrationSetup } from "./import-integration-setup";
import type { useCustomWidgetImport } from "./use-custom-widget-import";

export function CustomWidgetImportSetupPanel({ importer }: { importer: ReturnType<typeof useCustomWidgetImport> }) {
  return (
    <Stack gap="md">
      <CustomWidgetSourceSetupPanel
        setups={importer.setups}
        values={importer.values}
        onChange={importer.setValue}
        messages={importer.setupMessages}
      />
      <ImportIntegrationSetup
        widget={importer.integrationWidget}
        values={importer.integrationValues}
        onChange={importer.setIntegrationValue}
      />
    </Stack>
  );
}

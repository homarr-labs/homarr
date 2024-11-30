import { Card, Stack, Text } from "@mantine/core";

import type { InitialOldmarrImportSettings } from "../../settings";
import { OldmarrImportAppsSettings } from "../shared/apps-section";
import { SidebarBehaviourSelect } from "../shared/sidebar-behaviour-select";

interface ImportSettingsCardProps {
  settings: InitialOldmarrImportSettings;
  updateSetting: <TKey extends keyof InitialOldmarrImportSettings>(
    setting: TKey,
    value: InitialOldmarrImportSettings[TKey],
  ) => void;
}

export const ImportSettingsCard = ({ settings, updateSetting }: ImportSettingsCardProps) => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={500}>Import settings</Text>
          <Text size="sm" c="gray.6">
            Configure the import behavior
          </Text>
        </Stack>

        <OldmarrImportAppsSettings
          bg="transparent"
          onlyImportApps={{
            checked: settings.onlyImportApps,
            onChange: (event) => updateSetting("onlyImportApps", event.target.checked),
          }}
        />

        <SidebarBehaviourSelect
          value={settings.sidebarBehaviour}
          onChange={(value) => updateSetting("sidebarBehaviour", value)}
        />
      </Stack>
    </Card>
  );
};

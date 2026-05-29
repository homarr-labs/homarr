import { Group, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";
import { settingsChildrenOptions } from "../command/children/preferences/settings-children";

export const preferencesGroup = createGroup({
  keyPath: "key",
  title: (t) => t("search.mode.command.group.preferences.title"),
  options: [{ key: "settings" }],
  Component: () => {
    const t = useScopedI18n("search.mode.command.group.preferences");
    return (
      <Group px="md" py="sm" wrap="nowrap" gap="sm">
        <IconSettings stroke={1.5} />
        <Text>{t("title")}</Text>
      </Group>
    );
  },
  filter: (_query, _option) => true,
  useInteraction: interaction.children(settingsChildrenOptions),
});

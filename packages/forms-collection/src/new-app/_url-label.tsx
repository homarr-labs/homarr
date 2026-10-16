"use client";

import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

export const AppUrlLabel = () => {
  const tApp = useI18n("app");

  return (
    <Group component="span" gap={4} wrap="nowrap">
      {invariantTechnicalLabels.url}
      <Tooltip
        interactive
        withArrow
        multiline
        w={300}
        events={{ hover: true, focus: true, touch: true }}
        label={
          <Stack gap={4}>
            <Text inherit fw={600}>
              {tApp("field.url.examples")}
            </Text>
            {[
              "https://example.com",
              "http://server:8080",
              "microsoft-edge:https://example.com",
              "mailto:contact@example.com",
              "vscode://file/path",
            ].map((example) => (
              <Text key={example} component="code" size="xs" dir="ltr">
                {example}
              </Text>
            ))}
            <Text inherit>{tApp("field.url.requiresHandler")}</Text>
          </Stack>
        }
      >
        <ActionIcon type="button" variant="subtle" color="gray" size="sm" aria-label={tApp("field.url.helpLabel")}>
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

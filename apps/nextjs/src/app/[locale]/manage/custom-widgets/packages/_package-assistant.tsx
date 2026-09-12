"use client";

import { Button, Divider, Group, Popover, Stack, Text, Textarea } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { useI18n } from "@homarr/translation/client";
import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";

export function PackageAssistant() {
  const t = useI18n("customWidget.package.assistant");
  const assistant = useOptionalHomarrAssistant();
  const [request, setRequest] = useState("");
  const [opened, setOpened] = useState(false);
  if (!assistant?.enabled) return null;
  const send = (intent: string) => {
    assistant.open();
    if (
      assistant.sendPrompt(
        `${intent}\nWork on the currently visible trusted widget package v3 draft. First call read_widget_package_draft, then propose_widget_package_changes against its exact revision. Read relevant source examples through that tool when helpful. Keep credentials in local connections. Propose reviewable changes; do not save, activate, install or claim preview success.`,
      )
    ) {
      setOpened(false);
      setRequest("");
    }
  };
  return (
    <Popover opened={opened} onChange={setOpened} width={320} withinPortal position="bottom-start">
      <Popover.Target>
        <Button size="xs" variant="light" leftSection={<IconSparkles size={14} />} disabled={assistant.isRunning}>
          {t("open")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs" c="dimmed" mb="xs">
          {t("context")}
        </Text>
        <Textarea
          mx="xs"
          mb="xs"
          label={t("request")}
          placeholder={t("requestPlaceholder")}
          value={request}
          onChange={(event) => setRequest(event.currentTarget.value)}
          minRows={3}
        />
        <Group px="xs" pb="xs">
          <Button size="xs" disabled={!request.trim()} onClick={() => send(request)}>
            {t("send")}
          </Button>
        </Group>
        <Divider my="xs" />
        <Stack gap={4}>
          <Button variant="subtle" size="xs" justify="start" onClick={() => send(t("improvePrompt"))}>
            {t("improve")}
          </Button>
          <Button variant="subtle" size="xs" justify="start" onClick={() => send(t("advancedPrompt"))}>
            {t("advanced")}
          </Button>
          <Button variant="subtle" size="xs" justify="start" onClick={() => send(t("fixPrompt"))}>
            {t("fix")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

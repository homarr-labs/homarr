"use client";

import { ActionIcon, Alert, Button, Code, CopyButton, Group, List, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBrain, IconCheck, IconCopy, IconPlugConnected, IconSettings } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { useWorkerWorkspace } from "~/worker/context";

/** Hosted MCP uses account OAuth and explicit worker approvals rather than an instance API key. */
export function WorkerMcpInstructions() {
  const { platformPath, manageWorkers } = useWorkerWorkspace();
  const t = useI18n("management.page.tool.api.tab.mcp");
  const tCommon = useI18n("common");
  let origin = "https://homarr.dev";
  if (typeof window !== "undefined") origin = window.location.origin;
  const endpoint = new URL(`${platformPath.replace(/\/$/, "")}/mcp`, origin).href;
  const configuration = JSON.stringify({ mcpServers: { homarr: { url: endpoint } } }, null, 2);

  return (
    <Stack gap="xl" p="md">
      <Group gap="sm">
        <ThemeIcon variant="light" size="xl" radius="md">
          <IconBrain size={24} />
        </ThemeIcon>
        <div>
          <Title order={3}>{t("title")}</Title>
          <Text size="sm" c="dimmed">
            Use your Homarr account to reach your approved workers from an MCP client.
          </Text>
        </div>
      </Group>

      <List type="ordered" spacing="sm" size="sm">
        <List.Item>Open the worker control center and sign in with GitHub.</List.Item>
        <List.Item>Connect each worker through the relay and approve the services MCP may access.</List.Item>
        <List.Item>
          Add the address below to your MCP client, then complete the browser sign-in when prompted.
        </List.Item>
      </List>

      <Button variant="light" w="fit-content" leftSection={<IconSettings size={16} />} onClick={manageWorkers}>
        Open worker control center
      </Button>

      <Stack gap="xs">
        <Title order={5}>
          <Group gap="xs">
            <IconPlugConnected size={16} />
            {t("endpoint.title")}
          </Group>
        </Title>
        <CopyableCode value={endpoint} label={tCommon("action.copy")} />
      </Stack>

      <Stack gap="xs">
        <Title order={5}>{t("clientConfig.title")}</Title>
        <Text size="sm">For an MCP client with OAuth support:</Text>
        <CopyableCode value={configuration} label={tCommon("action.copy")} />
      </Stack>

      <Alert variant="light">
        Hosted MCP requires relay access and a separate approval from each worker. It can continue working while your
        browser is closed. Direct-only workers are available to your browser but cannot be reached by hosted MCP.
      </Alert>
    </Stack>
  );
}

function CopyableCode({ value, label }: { value: string; label: string }) {
  return (
    <Code block pos="relative" pr={40} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {value}
      <CopyButton value={value}>
        {({ copied, copy }) => {
          let icon = <IconCopy size={14} />;
          if (copied) icon = <IconCheck size={14} />;
          return (
            <ActionIcon variant="subtle" size="sm" onClick={copy} pos="absolute" top={8} right={8} aria-label={label}>
              {icon}
            </ActionIcon>
          );
        }}
      </CopyButton>
    </Code>
  );
}

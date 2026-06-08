"use client";

import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Group,
  List,
  ListItem,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBrain,
  IconCheck,
  IconCopy,
  IconKey,
  IconLock,
  IconPlus,
  IconPlugConnected,
  IconSparkles,
  IconTerminal,
  IconTools,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { CopyApiKeyModal } from "./copy-api-key-modal";
import type { McpToolGroup } from "./api-page-tabs";
import classes from "./mcp-tools-accordion.module.css";

const toolTypeDisplay: Record<"query" | "mutation", { color: string; method: string }> = {
  query: { color: "blue", method: "GET" },
  mutation: { color: "orange", method: "POST" },
};

interface McpInstructionsProps {
  baseUrl: string;
  hasApiKeys: boolean;
  toolGroups: McpToolGroup[];
}

export function McpInstructions({ baseUrl, hasApiKeys, toolGroups }: McpInstructionsProps) {
  const t = useScopedI18n("management.page.tool.api.tab.mcp");
  const { openModal } = useModalAction(CopyApiKeyModal);
  const { mutate: createApiKey, isPending } = clientApi.apiKeys.create.useMutation({
    async onSuccess(data) {
      openModal({ apiKey: data.apiKey });
      await revalidatePathActionAsync("/manage/tools/api");
    },
  });
  const mcpUrl = `${baseUrl}/api/mcp/mcp`;

  const streamableHttpConfig = JSON.stringify(
    {
      mcpServers: {
        homarr: {
          url: mcpUrl,
          headers: {
            ApiKey: "<your-api-key>",
          },
        },
      },
    },
    null,
    2,
  );

  const stdioConfig = JSON.stringify(
    {
      mcpServers: {
        homarr: {
          command: "npx",
          args: ["-y", "mcp-remote", mcpUrl, "--header", "ApiKey:<your-api-key>"],
        },
      },
    },
    null,
    2,
  );

  const testCommand = `curl -s -X POST -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "ApiKey: <your-api-key>" -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' ${mcpUrl}`;

  return (
    <Stack gap="xl" p="md">
      <Group gap="sm" align="center">
        <ThemeIcon variant="light" size="xl" radius="md">
          <IconBrain size={24} />
        </ThemeIcon>
        <div>
          <Title order={3}>{t("title")}</Title>
          <Text size="sm" c="dimmed">
            {t("subtitle")}
          </Text>
        </div>
      </Group>

      <Alert variant="light" icon={<IconSparkles size={18} />}>
        <Text size="sm">{t("description")}</Text>
      </Alert>

      {!hasApiKeys && (
        <Alert variant="light" color="yellow" icon={<IconKey size={18} />}>
          <Group justify="space-between" align="center">
            <Text size="sm">{t("noApiKey")}</Text>
            <Button
              size="compact-sm"
              variant="filled"
              leftSection={<IconPlus size={14} />}
              onClick={() => createApiKey()}
              loading={isPending}
            >
              {t("createApiKeyButton")}
            </Button>
          </Group>
        </Alert>
      )}

      <div>
        <Title order={5} mb="xs">
          <Group gap="xs">
            <IconPlugConnected size={16} />
            {t("endpoint.title")}
          </Group>
        </Title>
        <CopyableCode value={mcpUrl} copyLabel={t("copy")} />
      </div>

      <div>
        <Title order={5} mb="xs">
          <Group gap="xs">
            <IconLock size={16} />
            {t("authentication.title")}
          </Group>
        </Title>
        <Text size="sm" mb="sm">
          {t("authentication.intro")}
        </Text>

        <Accordion variant="separated" defaultValue="apikey">
          <AccordionItem value="apikey">
            <AccordionControl>
              <Group gap="xs">
                <IconKey size={16} />
                {t("authentication.apiKey.title")}
              </Group>
            </AccordionControl>
            <AccordionPanel>
              <Stack gap="xs">
                <Text size="sm">{t("authentication.apiKey.description")}</Text>
                <Text size="xs" c="dimmed">
                  {t("authentication.permissions")}
                </Text>
              </Stack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem value="oauth">
            <AccordionControl>
              <Group gap="xs">
                <IconWorld size={16} />
                {t("authentication.oauth.title")}
              </Group>
            </AccordionControl>
            <AccordionPanel>
              <Stack gap="xs">
                <Text size="sm">{t("authentication.oauth.description")}</Text>
                <Text size="xs" c="dimmed">
                  {t("authentication.oauth.hint")}
                </Text>
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <Title order={5} mb="sm">
          {t("clientConfig.title")}
        </Title>
        <Accordion variant="separated" defaultValue="streamable-http">
          <AccordionItem value="streamable-http">
            <AccordionControl>
              <Group gap="xs">
                <Badge size="xs" variant="filled">
                  {t("clientConfig.streamableHttp.recommended")}
                </Badge>
                {t("clientConfig.streamableHttp.title")}
              </Group>
            </AccordionControl>
            <AccordionPanel>
              <Stack gap="sm">
                <Text size="sm" fw={500}>
                  {t("clientConfig.streamableHttp.worksWith")}
                </Text>
                <Text size="sm" c="dimmed">
                  {t("clientConfig.streamableHttp.addToConfig")}
                </Text>
                <List size="xs" spacing={4}>
                  <ListItem>
                    {t("clientConfig.streamableHttp.cursor", {
                      name: "Cursor",
                      file: ".cursor/mcp.json",
                    })}
                  </ListItem>
                  <ListItem>
                    {t("clientConfig.streamableHttp.claudeDesktop", {
                      name: "Claude Desktop",
                      file: "claude_desktop_config.json",
                    })}
                  </ListItem>
                  <ListItem>
                    {t("clientConfig.streamableHttp.claudeCode", {
                      name: "Claude Code",
                      file: ".claude/mcp.json",
                      command: "claude mcp add homarr",
                    })}
                  </ListItem>
                  <ListItem>
                    {t("clientConfig.streamableHttp.vsCodeCopilot", {
                      name: "VS Code Copilot",
                      file: ".vscode/mcp.json",
                    })}
                  </ListItem>
                </List>
                <CopyableCode value={streamableHttpConfig} copyLabel={t("copy")} />
                <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={16} />} p="xs">
                  <Text size="xs">{t("clientConfig.streamableHttp.replaceHint")}</Text>
                </Alert>
              </Stack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem value="stdio">
            <AccordionControl>{t("clientConfig.stdio.title")}</AccordionControl>
            <AccordionPanel>
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  {t("clientConfig.stdio.description", { dependency: "npx" })}
                </Text>
                <CopyableCode value={stdioConfig} copyLabel={t("copy")} />
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <Title order={5} mb="xs">
          <Group gap="xs">
            <IconTerminal size={16} />
            {t("testConnection.title")}
          </Group>
        </Title>
        <Text size="sm" c="dimmed" mb="xs">
          {t("testConnection.description")}
        </Text>
        <CopyableCode value={testCommand} copyLabel={t("copy")} />
        <Text size="xs" c="dimmed" mt="xs">
          {t("testConnection.hint")}
        </Text>
      </div>

      <div>
        <Title order={5} mb="xs">
          <Group gap="xs">
            <IconTools size={16} />
            {t("availableTools.title")}
          </Group>
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          {t("availableTools.description", {
            count: String(toolGroups.reduce((sum, g) => sum + g.tools.length, 0)),
          })}
        </Text>
        <Accordion variant="separated" multiple>
          {toolGroups.map((group) => (
            <AccordionItem key={group.namespace} value={group.namespace}>
              <AccordionControl>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {group.namespace}
                  </Text>
                  <Badge size="xs" variant="light" circle>
                    {group.tools.length}
                  </Badge>
                </Group>
              </AccordionControl>
              <AccordionPanel>
                <Stack gap={6}>
                  {group.tools.map((tool) => (
                    <div key={tool.name} className={classes.toolRow}>
                      <Badge size="sm" w={50} radius="xs" variant="light" color={toolTypeDisplay[tool.type].color}>
                        {toolTypeDisplay[tool.type].method}
                      </Badge>
                      <div>
                        <Code fz="xs" fw={600}>
                          {tool.name}
                        </Code>
                        <Text size="xs" c="dimmed" lh={1.4}>
                          {tool.description}
                        </Text>
                      </div>
                    </div>
                  ))}
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Stack>
  );
}

function CopyableCode({ value, copyLabel }: { value: string; copyLabel: string }) {
  return (
    <Code block pos="relative" style={{ whiteSpace: "pre-wrap" }}>
      {value}
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <ActionIcon variant="subtle" size="sm" onClick={copy} pos="absolute" top={8} right={8} title={copyLabel}>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        )}
      </CopyButton>
    </Code>
  );
}

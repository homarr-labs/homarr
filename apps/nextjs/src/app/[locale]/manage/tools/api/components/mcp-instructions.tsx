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
  Divider,
  Group,
  List,
  ListItem,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
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
import { useMediaQuery } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { CopyApiKeyModal } from "./copy-api-key-modal";
import type { McpToolGroup } from "./api-page-tabs";

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
  const isDesktop = useMediaQuery("(min-width: 48em)");
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
        <TableScrollContainer minWidth={500} mx="xs">
          <Table
            verticalSpacing="xs"
            horizontalSpacing="sm"
            layout="fixed"
            withRowBorders
            withColumnBorders
            highlightOnHover
          >
            <TableThead>
              <TableTr>
                {isDesktop && <TableTh w={75}>{t("availableTools.columnType")}</TableTh>}
                <TableTh w={250}>{t("availableTools.columnName")}</TableTh>
                <TableTh>{t("availableTools.columnDescription")}</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {toolGroups.flatMap((group) =>
                group.tools.map((tool) => (
                  <TableTr key={tool.name}>
                    {isDesktop && (
                      <TableTd>
                        <Badge size="xs" radius="xs" variant="light" color={toolTypeDisplay[tool.type].color}>
                          {toolTypeDisplay[tool.type].method}
                        </Badge>
                      </TableTd>
                    )}
                    <TableTd>
                      <Code fz="xs" fw={600}>
                        {tool.name}
                      </Code>
                    </TableTd>
                    <TableTd>
                      <Text size="xs" c="dimmed">
                        {tool.description}
                      </Text>
                    </TableTd>
                  </TableTr>
                )),
              )}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </div>

      <Divider />

      <Accordion variant="default">
        <AccordionItem value="troubleshooting">
          <AccordionControl>
            <Group gap="xs">
              <IconAlertTriangle size={16} />
              <Text size="sm" fw={500}>
                {t("troubleshooting.title")}
              </Text>
            </Group>
          </AccordionControl>
          <AccordionPanel>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500}>
                  {t("troubleshooting.missingHeader.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("troubleshooting.missingHeader.description", {
                    header: "ApiKey",
                    section: "headers",
                  })}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  {t("troubleshooting.invalidFormat.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("troubleshooting.invalidFormat.description")}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  {t("troubleshooting.invalidKey.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("troubleshooting.invalidKey.description")}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  {t("troubleshooting.connectionRefused.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("troubleshooting.connectionRefused.description", {
                    localhost: "localhost",
                  })}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  {t("troubleshooting.toolsNotAppearing.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("troubleshooting.toolsNotAppearing.description")}
                </Text>
              </div>
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
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

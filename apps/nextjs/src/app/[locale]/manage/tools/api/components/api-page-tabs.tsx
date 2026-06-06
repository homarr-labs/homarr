"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";
import { IconBrain, IconCode, IconKey } from "@tabler/icons-react";

import { McpInstructions } from "./mcp-instructions";

export interface McpToolGroup {
  namespace: string;
  tools: { name: string; description: string; type: "query" | "mutation" }[];
}

interface ApiPageTabsProps {
  documentationLabel: string;
  apiKeyLabel: string;
  mcpLabel: string;
  documentationPanel: ReactNode;
  authenticationPanel: ReactNode;
  baseUrl: string;
  hasApiKeys: boolean;
  toolGroups: McpToolGroup[];
}

export function ApiPageTabs({
  documentationLabel,
  apiKeyLabel,
  mcpLabel,
  documentationPanel,
  authenticationPanel,
  baseUrl,
  hasApiKeys,
  toolGroups,
}: ApiPageTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>("documentation");

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <TabsList>
        <TabsTab value="documentation" leftSection={<IconCode size={16} />}>
          {documentationLabel}
        </TabsTab>
        <TabsTab value="authentication" leftSection={<IconKey size={16} />}>
          {apiKeyLabel}
        </TabsTab>
        <TabsTab value="mcp" leftSection={<IconBrain size={16} />}>
          {mcpLabel}
        </TabsTab>
      </TabsList>
      <TabsPanel value="authentication">{authenticationPanel}</TabsPanel>
      <TabsPanel value="documentation">{documentationPanel}</TabsPanel>
      <TabsPanel value="mcp">
        <McpInstructions baseUrl={baseUrl} hasApiKeys={hasApiKeys} toolGroups={toolGroups} />
      </TabsPanel>
    </Tabs>
  );
}

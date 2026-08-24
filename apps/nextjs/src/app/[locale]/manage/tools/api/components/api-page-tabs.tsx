"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";
import { IconBrain, IconCode, IconKey } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { ApiKeysManagement } from "./api-keys";
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
  apiKeys: RouterOutputs["apiKeys"]["getAll"];
  baseUrl: string;
  toolGroups: McpToolGroup[];
}

export function ApiPageTabs({
  documentationLabel,
  apiKeyLabel,
  mcpLabel,
  documentationPanel,
  apiKeys,
  baseUrl,
  toolGroups,
}: ApiPageTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>("documentation");
  const [hasApiKeys, setHasApiKeys] = useState(apiKeys.length > 0);

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
      <TabsPanel value="authentication">
        <ApiKeysManagement apiKeys={apiKeys} onCreated={() => setHasApiKeys(true)} />
      </TabsPanel>
      <TabsPanel value="documentation">{documentationPanel}</TabsPanel>
      <TabsPanel value="mcp">
        <McpInstructions
          baseUrl={baseUrl}
          hasApiKeys={hasApiKeys}
          toolGroups={toolGroups}
          onApiKeyCreated={() => setHasApiKeys(true)}
        />
      </TabsPanel>
    </Tabs>
  );
}

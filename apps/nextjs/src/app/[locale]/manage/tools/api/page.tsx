import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Stack } from "@mantine/core";

import { openApiDocument } from "@homarr/api/open-api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { getI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { extractMcpTools } from "~/app/api/mcp/_extract-tools";
import { ApiKeysManagement } from "./components/api-keys";
import { ApiPageTabs } from "./components/api-page-tabs";
import { ScalarApiReference } from "./components/scalar-api-reference";

import type { McpToolGroup } from "./components/api-page-tabs";

function getMcpToolGroups(): McpToolGroup[] {
  const tools = extractMcpTools();
  const groups = new Map<string, McpToolGroup["tools"]>();
  for (const tool of tools) {
    const namespace = tool.pathInRouter[0] ?? "other";
    if (!groups.has(namespace)) {
      groups.set(namespace, []);
    }
    groups.get(namespace)?.push({
      name: tool.name,
      description: tool.description,
      type: tool.type,
    });
  }
  return Array.from(groups.entries()).map(([namespace, items]) => ({
    namespace,
    tools: items,
  }));
}

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function ApiPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }
  const [requestHeaders, apiKeys, t, toolGroups] = await Promise.all([
    headers(),
    api.apiKeys.getAll(),
    getI18n("management.page.tool.api.tab"),
    getMcpToolGroups(),
  ]);
  const baseUrl = extractBaseUrlFromHeaders(requestHeaders);
  const document = openApiDocument(baseUrl);

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <ApiPageTabs
          documentationLabel={t("documentation.label")}
          apiKeyLabel={t("apiKey.label")}
          mcpLabel={t("mcp.label")}
          documentationPanel={<ScalarApiReference document={document} />}
          authenticationPanel={<ApiKeysManagement apiKeys={apiKeys} />}
          baseUrl={baseUrl}
          hasApiKeys={apiKeys.length > 0}
          toolGroups={toolGroups}
        />
      </Stack>
    </>
  );
}

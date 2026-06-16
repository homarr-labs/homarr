import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Stack } from "@mantine/core";

import { mcpRouter } from "@homarr/api/mcp";
import { openApiDocument } from "@homarr/api/open-api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { getScopedI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { extractMcpTools } from "~/app/api/mcp/_extract-tools";
import { ApiKeysManagement } from "./components/api-keys";
import { ApiPageTabs } from "./components/api-page-tabs";
import { ScalarApiReference } from "./components/scalar-api-reference";

import type { McpToolGroup } from "./components/api-page-tabs";

let cachedToolGroups: McpToolGroup[] | null = null;

function getMcpToolGroups(): McpToolGroup[] {
  if (cachedToolGroups) return cachedToolGroups;

  const tools = extractMcpTools();

  const procedures = (mcpRouter as any)._def.procedures as Record<string, { _def?: { type?: string } }>;
  const procedureTypeMap = new Map<string, "query" | "mutation">();
  for (const [key, proc] of Object.entries(procedures)) {
    const type = proc?._def?.type;
    if (type === "query" || type === "mutation") {
      procedureTypeMap.set(key, type);
    }
  }

  const groups = new Map<string, McpToolGroup["tools"]>();
  for (const tool of tools) {
    const namespace = tool.pathInRouter[0] ?? "other";
    if (!groups.has(namespace)) {
      groups.set(namespace, []);
    }
    const procedureKey = tool.pathInRouter.join(".");
    groups.get(namespace)?.push({
      name: tool.name,
      description: tool.description,
      type: procedureTypeMap.get(procedureKey) ?? "query",
    });
  }
  cachedToolGroups = Array.from(groups.entries()).map(([namespace, items]) => ({
    namespace,
    tools: items,
  }));
  return cachedToolGroups;
}

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function ApiPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }
  const requestHeaders = await headers();
  const baseUrl = extractBaseUrlFromHeaders(requestHeaders);
  const document = openApiDocument(baseUrl);
  const apiKeys = await api.apiKeys.getAll();
  const t = await getScopedI18n("management.page.tool.api.tab");
  const toolGroups = getMcpToolGroups();

  return (
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
  );
}

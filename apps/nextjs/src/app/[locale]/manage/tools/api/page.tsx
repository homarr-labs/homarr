import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Stack } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ApiPageTabs } from "./components/api-page-tabs";
import { ScalarApiReferenceFrame } from "./components/scalar-api-reference-frame";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getI18n("management");

  return {
    title: t("metaTitle"),
  };
}

export default async function ApiPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }
  const [requestHeaders, apiKeys, t, toolGroups] = await Promise.all([
    headers(),
    api.apiKeys.getAll.query(),
    getI18n("management.page.tool.api.tab"),
    api.frontend.mcpToolGroups.query(),
  ]);
  const baseUrl = extractBaseUrlFromHeaders(requestHeaders);

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <ApiPageTabs
          documentationLabel={t("documentation.label")}
          apiKeyLabel={t("apiKey.label")}
          mcpLabel={t("mcp.label")}
          documentationPanel={<ScalarApiReferenceFrame />}
          apiKeys={apiKeys}
          baseUrl={baseUrl}
          toolGroups={toolGroups}
        />
      </Stack>
    </>
  );
}

import { notFound } from "next/navigation";
import { Group, Title } from "@mantine/core";
import { z } from "zod/v4";

import { auth } from "@homarr/auth/next";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { IntegrationAvatar } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { env } from "~/env";
import { IntegrationNewFormWrapper } from "./_integration-new-form-wrapper";
import { IntegrationNewSelectGrid } from "./_integration-new-select-grid";

interface NewIntegrationPageProps {
  searchParams: Promise<{
    kind?: string;
    url?: string;
    name?: string;
  }>;
}

export default async function IntegrationsNewPage(props: NewIntegrationPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user.permissions.includes("integration-create")) {
    notFound();
  }

  const result = z.enum(integrationKinds).safeParse(searchParams.kind);

  if (!result.success) {
    const t = await getI18n("integration");
    return (
      <ManagePageLayout title={t("action.create")} container="default" breadcrumbPlacement="outside">
        <IntegrationNewSelectGrid enableMockIntegration={env.UNSAFE_ENABLE_MOCK_INTEGRATION} />
      </ManagePageLayout>
    );
  }

  const tCreate = await getI18n("integration.page.create");

  const currentKind = result.data;

  return (
    <ManagePageLayout
      title={
        <Group align="center">
          <IntegrationAvatar kind={currentKind} size="md" />
          <Title>{tCreate("title", { name: getIntegrationName(currentKind) })}</Title>
        </Group>
      }
      container="default"
      breadcrumbPlacement="outside"
    >
      <IntegrationNewFormWrapper kind={currentKind} initialUrl={searchParams.url} initialName={searchParams.name} />
    </ManagePageLayout>
  );
}

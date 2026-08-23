import { notFound } from "next/navigation";
import { Text } from "@mantine/core";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { createMetaTitle } from "~/metadata";
import { AssistantConfiguration } from "./_components/assistant-configuration";

export async function generateMetadata() {
  const t = await getI18n("management.page.settings.section.assistant");
  return {
    title: createMetaTitle(t("title")),
  };
}

export default async function AssistantPage() {
  const [session, serverSettings] = await Promise.all([auth(), getRscServerSettingsAsync()]);

  if (!serverSettings.featureControls.assistantEnabled || !session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getI18n("management.page.settings.section.assistant");
  return (
    <ManagePageLayout title={t("title")}>
      <Text c="dimmed" maw="70ch">
        {t("description")}
      </Text>
      <AssistantConfiguration />
    </ManagePageLayout>
  );
}

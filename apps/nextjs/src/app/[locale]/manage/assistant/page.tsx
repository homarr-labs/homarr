import { notFound } from "next/navigation";
import { Text } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { AssistantConfiguration } from "./_components/assistant-configuration";

export async function generateMetadata() {
  const t = await getI18n("management.page.settings.section.assistant");
  return {
    title: `${t("title")} • Homarr`,
  };
}

export default async function AssistantPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
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

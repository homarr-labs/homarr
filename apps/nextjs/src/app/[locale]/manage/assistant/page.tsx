import { notFound } from "next/navigation";
import { Stack, Text, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { AssistantConfiguration } from "./_components/assistant-configuration";

export async function generateMetadata() {
  const t = await getScopedI18n("management.page.settings.section.assistant");
  return {
    title: `${t("title")} • Homarr`,
  };
}

export default async function AssistantPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getScopedI18n("management.page.settings.section.assistant");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <div>
          <Title order={1}>{t("title")}</Title>
          <Text c="dimmed" maw="70ch">
            {t("description")}
          </Text>
        </div>
        <AssistantConfiguration />
      </Stack>
    </>
  );
}

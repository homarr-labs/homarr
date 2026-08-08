import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { SettingsForm } from "./_components/settings-form";

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const serverSettings = await api.serverSettings.getAll();
  const tSettings = await getScopedI18n("management.page.settings");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tSettings("title")}</Title>
        <SettingsForm initialData={serverSettings} />
      </Stack>
    </>
  );
}

import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { AnalyticsSettings } from "./_components/analytics.settings";

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function SettingsPage() {
  const serverSettings = await api.serverSettings.getAll();
  const t = await getScopedI18n("management.page.settings");
  return (
    <Stack>
      <Title order={1}>{t("title")}</Title>
      <AnalyticsSettings initialData={serverSettings.analytics} />
    </Stack>
  );
}

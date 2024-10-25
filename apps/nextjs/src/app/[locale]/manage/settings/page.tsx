import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { CrawlingAndIndexingSettings } from "~/app/[locale]/manage/settings/_components/crawling-and-indexing.settings";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { AnalyticsSettings } from "./_components/analytics.settings";
import { AppearanceSettingsForm } from "./_components/appearance-settings-form";
import { BoardSettingsForm } from "./_components/board-settings-form";
import { CultureSettingsForm } from "./_components/culture-settings-form";

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
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{t("title")}</Title>
        <AnalyticsSettings initialData={serverSettings.analytics} />
        <CrawlingAndIndexingSettings initialData={serverSettings.crawlingAndIndexing} />
        <Stack>
          <Title order={2}>Boards</Title>
          <BoardSettingsForm defaultValues={serverSettings.board} />
        </Stack>
        <Stack>
          <Title order={2}>Appearance</Title>
          <AppearanceSettingsForm defaultValues={serverSettings.appearance} />
        </Stack>
        <Stack>
          <Title order={2}>Culture</Title>
          <CultureSettingsForm defaultValues={serverSettings.culture} />
        </Stack>
      </Stack>
    </>
  );
}

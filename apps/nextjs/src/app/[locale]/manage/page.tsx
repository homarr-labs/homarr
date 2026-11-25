import type { Metadata } from "next";
import { Stack } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { ManagementHero } from "./_components/home/management-hero";
import { StatisticTiles } from "./_components/home/statistic-tiles";
import type { StatisticTile } from "./_components/home/statistic-tiles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n("management");

  return {
    title: t("metaTitle"),
  };
}

const statisticEntities = {
  app: "apps",
  board: "boards",
  group: "groups",
  integration: "integrations",
  invite: "invites",
  media: "media",
  searchEngine: "searchEngines",
  user: "users",
} as const;

export default async function ManagementPage() {
  const [statistics, t, tEntities, serverSettings, session] = await Promise.all([
    api.home.getStats(),
    getI18n("management.page.home"),
    getI18n("common.entity"),
    getRscServerSettingsAsync(),
    auth(),
  ]);
  const { appName } = serverSettings.branding;

  const tiles: StatisticTile[] = statistics.map((statistic) => ({
    key: statistic.titleKey,
    count: statistic.count,
    path: statistic.path,
    title: tEntities(statisticEntities[statistic.titleKey]),
    category: t(`statisticLabel.${statistic.subtitleKey}`),
  }));

  return (
    <>
      <DynamicBreadcrumb />
      <Stack gap="md">
        <ManagementHero appName={appName} userName={session?.user.name ?? null} />
        <StatisticTiles statistics={tiles} />
      </Stack>
    </>
  );
}

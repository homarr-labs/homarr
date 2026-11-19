"use client";

import { Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { AssistantConfiguration } from "~/app/[locale]/manage/assistant/_components/assistant-configuration";
import { ManagementHero } from "~/app/[locale]/manage/_components/home/management-hero";
import { StatisticTiles } from "~/app/[locale]/manage/_components/home/statistic-tiles";
import { SettingsForm } from "~/app/[locale]/manage/settings/_components/settings-form";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { useWorkerBootstrap } from "~/worker/context";

import { WorkerQuery, WorkerQueryStatus } from "./query-state";

export function WorkerSettingsRoute() {
  const settingsQuery = clientApi.serverSettings.getAll.useQuery();
  const boardsQuery = clientApi.board.getPublicBoards.useQuery();
  const enginesQuery = clientApi.searchEngine.getSelectable.useQuery({ withIntegrations: false });
  const t = useI18n("management.page.settings");
  if (!settingsQuery.data || !boardsQuery.data || !enginesQuery.data)
    return <WorkerQueryStatus queries={[settingsQuery, boardsQuery, enginesQuery]} />;
  return (
    <ManagePageLayout title={t("title")}>
      <SettingsForm
        initialData={settingsQuery.data}
        selectableBoards={boardsQuery.data}
        selectableSearchEngines={enginesQuery.data}
      />
    </ManagePageLayout>
  );
}

export function WorkerAssistantRoute() {
  const t = useI18n("management.page.settings.section.assistant");
  return (
    <ManagePageLayout title={t("title")}>
      <Text c="dimmed" maw="70ch">
        {t("description")}
      </Text>
      <AssistantConfiguration />
    </ManagePageLayout>
  );
}

export function WorkerManagementHome() {
  const query = clientApi.home.getStats.useQuery();
  const { serverSettings, session } = useWorkerBootstrap();
  const t = useI18n("management.page.home");
  const entities = useI18n("common.entity");
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
  return (
    <WorkerQuery query={query}>
      {(statistics) => (
        <>
          <DynamicBreadcrumb />
          <Stack gap="md">
            <ManagementHero appName={serverSettings.branding.appName} userName={session.user.name ?? null} />
            <StatisticTiles
              statistics={statistics.map((statistic) => ({
                key: statistic.titleKey,
                count: statistic.count,
                path: statistic.path,
                title: entities(statisticEntities[statistic.titleKey]),
                category: t(`statisticLabel.${statistic.subtitleKey}`),
              }))}
            />
          </Stack>
        </>
      )}
    </WorkerQuery>
  );
}

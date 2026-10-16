"use client";

import { Card, Group, SimpleGrid, Space, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { AssistantConfiguration } from "~/app/[locale]/manage/assistant/_components/assistant-configuration";
import { HeroBannerContent } from "~/app/[locale]/manage/_components/hero-banner-content";
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
  const { serverSettings } = useWorkerBootstrap();
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
          <HeroBannerContent
            appName={serverSettings.branding.appName}
            logoImageUrl={serverSettings.branding.logoImageUrl}
          />
          <Space h="md" />
          <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
            {statistics.map((statistic) => {
              const title = entities(statisticEntities[statistic.titleKey]);
              return (
                <Card
                  component={Link}
                  href={statistic.path}
                  key={statistic.path}
                  aria-label={`${statistic.count} ${title}`}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap">
                      <Text size="xl" fw={700}>
                        {statistic.count}
                      </Text>
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs">
                          {t(`statisticLabel.${statistic.subtitleKey}`)}
                        </Text>
                        <Text fw={600}>{title}</Text>
                      </Stack>
                    </Group>
                    <IconArrowRight size={16} stroke={1.5} color="var(--mantine-color-dimmed)" aria-hidden="true" />
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
        </>
      )}
    </WorkerQuery>
  );
}

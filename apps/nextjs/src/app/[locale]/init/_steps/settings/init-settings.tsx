"use client";

import { Button, Card, Group, Stack, Switch, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import type { TranslationObject } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

export const InitSettings = () => {
  const tSection = useScopedI18n("management.page.settings.section");
  const t = useI18n();

  return (
    <Stack>
      <Card w={64 * 12 + 8} maw="90vw">
        <Stack gap="sm">
          <Text fw={500}>{tSection("analytics.title")}</Text>

          <Stack gap="xs">
            <AnalyticsRow kind="general" />

            <Stack gap="xs" ps="md" w="100%">
              <AnalyticsRow kind="integrationData" />
              <AnalyticsRow kind="widgetData" />
              <AnalyticsRow kind="usersData" />
            </Stack>
          </Stack>
        </Stack>
      </Card>
      <Card w={64 * 12 + 8} maw="90vw">
        <Stack gap="sm">
          <Text fw={500}>{tSection("crawlingAndIndexing.title")}</Text>

          <Stack gap="xs">
            <CrawlingRow kind="noIndex" />
            <CrawlingRow kind="noFollow" />
            <CrawlingRow kind="noTranslate" />
            <CrawlingRow kind="noSiteLinksSearchBox" />
          </Stack>
        </Stack>
      </Card>

      <Button rightSection={<IconArrowRight size={16} stroke={1.5} />}>{t("common.action.continue")}</Button>
    </Stack>
  );
};

interface AnalyticsRowProps {
  kind: Exclude<keyof TranslationObject["management"]["page"]["settings"]["section"]["analytics"], "title">;
}

const AnalyticsRow = ({ kind }: AnalyticsRowProps) => {
  const tSection = useI18n("management.page.settings.section");

  return <SettingRow title={tSection(`analytics.${kind}.title`)} text={tSection(`analytics.${kind}.text`)} />;
};

interface CrawlingRowProps {
  kind: Exclude<
    keyof TranslationObject["management"]["page"]["settings"]["section"]["crawlingAndIndexing"],
    "title" | "warning"
  >;
}

const CrawlingRow = ({ kind }: CrawlingRowProps) => {
  const tSection = useI18n("management.page.settings.section");

  return (
    <SettingRow
      title={tSection(`crawlingAndIndexing.${kind}.title`)}
      text={tSection(`crawlingAndIndexing.${kind}.text`)}
    />
  );
};

const SettingRow = ({ title, text }: { title: string; text: string }) => {
  return (
    <Group wrap="nowrap" align="center">
      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {title}
        </Text>
        <Text size="xs" c="gray.5">
          {text}
        </Text>
      </Stack>

      <Switch />
    </Group>
  );
};

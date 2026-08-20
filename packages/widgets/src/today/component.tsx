"use client";

import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";

import { useCurrentIntlLocale, useScopedI18n } from "@homarr/translation/client";

import { formatLocalizedDate } from "../common/locale";
import { useWidgetNow } from "../common/use-widget-now";
import type { WidgetComponentProps } from "../definition";
import { getTodayLayout, getTodayStats } from "./date-stats";

const formatProgress = (value: number) => Math.round(value);

export default function TodayWidget({ options, width, height, displayMode }: WidgetComponentProps<"today">) {
  const now = useWidgetNow("minute");
  const locale = useCurrentIntlLocale();
  const t = useScopedI18n("widget.today");

  if (now === null) {
    return (
      <Stack h="100%" align="center" justify="center">
        <Text c="dimmed">—</Text>
      </Stack>
    );
  }

  const stats = getTodayStats(now, options.weekConvention, locale);
  if (displayMode === "advanced") {
    return <AdvancedToday now={now} locale={locale} options={options} stats={stats} />;
  }

  const layout = getTodayLayout(width, height);
  const weekday = formatLocalizedDate(now, locale, { weekday: "long" });
  const month = formatLocalizedDate(now, locale, { month: "long" });
  const fullDate = formatLocalizedDate(now, locale, { dateStyle: "long" });

  if (layout.tiny) {
    return (
      <Stack h="100%" align="center" justify="center" gap={0} px="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} truncate>
          {weekday} · {month}
        </Text>
        <Text component="time" dateTime={toDateTime(now)} fz={34} fw={700} lh={1}>
          {now.getDate()}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack h="100%" justify="center" gap="xs" px="md" py="sm" style={{ overflow: "hidden" }}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} truncate>
            {weekday}
          </Text>
          <Text component="time" dateTime={toDateTime(now)} fz={layout.showFullDate ? "lg" : 30} fw={700} truncate>
            {layout.showFullDate ? fullDate : `${month} ${now.getDate()}`}
          </Text>
        </Stack>
        {options.showYearProgress && (
          <Box>
            <RingProgress
              aria-hidden
              size={54}
              thickness={5}
              sections={[{ value: stats.yearProgress, color: "blue" }]}
              label={
                <Text size="xs" ta="center" fw={700}>
                  {formatProgress(stats.yearProgress)}%
                </Text>
              }
            />
            <VisuallyHidden>
              <progress value={stats.yearProgress} max={100}>
                {t("yearProgress", { progress: formatProgress(stats.yearProgress) })}
              </progress>
            </VisuallyHidden>
          </Box>
        )}
      </Group>

      {layout.showStats && (
        <Group gap={6} wrap="wrap">
          {options.showWeekNumber && <Badge variant="light">{t("weekNumber", { week: stats.weekNumber })}</Badge>}
          {options.showDayOfYear && (
            <Badge variant="light">{t("dayOfYear", { day: stats.dayOfYear, total: stats.daysInYear })}</Badge>
          )}
          {layout.showQuarter && options.showQuarter && (
            <Badge variant="light">{t("quarter", { quarter: stats.quarter })}</Badge>
          )}
          {layout.showQuarter && (
            <Text size="xs" c="dimmed">
              {t("daysAfterToday", { days: stats.daysAfterToday })}
            </Text>
          )}
        </Group>
      )}

      {layout.showMonthProgress && <ProgressMetric label={t("monthProgressLabel")} value={stats.monthProgress} />}
    </Stack>
  );
}

interface AdvancedTodayProps {
  now: Date;
  locale: string;
  options: WidgetComponentProps<"today">["options"];
  stats: ReturnType<typeof getTodayStats>;
}

const AdvancedToday = ({ now, locale, options, stats }: AdvancedTodayProps) => {
  const t = useScopedI18n("widget.today");
  const numberFormatter = new Intl.NumberFormat(locale);
  const visibleMetrics = [
    options.showWeekNumber && { label: t("advanced.week"), value: numberFormatter.format(stats.weekNumber) },
    options.showDayOfYear && {
      label: t("advanced.dayOfYear"),
      value: `${numberFormatter.format(stats.dayOfYear)} / ${numberFormatter.format(stats.daysInYear)}`,
    },
    options.showQuarter && { label: t("advanced.quarter"), value: `Q${stats.quarter}` },
    { label: t("advanced.daysRemaining"), value: numberFormatter.format(stats.daysAfterToday) },
  ].filter((metric): metric is { label: string; value: string } => Boolean(metric));

  return (
    <ScrollArea h="100%" w="100%" type="auto" offsetScrollbars scrollbarSize={6}>
      <Stack gap="md" p="md">
        <Stack gap={0}>
          <Text component="time" dateTime={toDateTime(now)} fz="xl" fw={700}>
            {formatLocalizedDate(now, locale, { dateStyle: "full" })}
          </Text>
          {options.showWeekNumber && (
            <Text size="sm" c="dimmed">
              {t(`weekConvention.${options.weekConvention}`)}
            </Text>
          )}
        </Stack>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          {visibleMetrics.map((metric) => (
            <Paper key={metric.label} withBorder p="sm">
              <Text size="xs" c="dimmed">
                {metric.label}
              </Text>
              <Text fz="xl" fw={700}>
                {metric.value}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <ProgressMetric label={t("weekProgressLabel")} value={stats.weekProgress} />
          <ProgressMetric label={t("monthProgressLabel")} value={stats.monthProgress} />
          {options.showYearProgress && <ProgressMetric label={t("yearProgressLabel")} value={stats.yearProgress} />}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }} spacing="xs">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const date = new Date(now.getFullYear(), monthIndex, 1);
            const isCurrent = monthIndex === stats.monthIndex;
            return (
              <Paper
                key={monthIndex}
                withBorder
                p="xs"
                bg={isCurrent ? "var(--mantine-primary-color-light)" : undefined}
              >
                <Text size="sm" fw={isCurrent ? 700 : 500} ta="center">
                  {formatLocalizedDate(date, locale, { month: "short" })}
                </Text>
                {isCurrent && (
                  <Text size="xs" c="dimmed" ta="center">
                    {now.getDate()}
                  </Text>
                )}
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
};

const ProgressMetric = ({ label, value }: { label: string; value: number }) => {
  const roundedValue = formatProgress(value);
  return (
    <Box>
      <Group justify="space-between" gap="xs" mb={3}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" fw={600}>
          {roundedValue}%
        </Text>
      </Group>
      <Progress value={value} aria-label={`${label}: ${roundedValue}%`} />
    </Box>
  );
};

const toDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

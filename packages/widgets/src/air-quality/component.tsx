"use client";

import { useId } from "react";
import { CompositeChart, Sparkline } from "@mantine/charts";
import { Box, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, VisuallyHidden } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { formatLocalizedDate, formatLocalizedTime } from "../common/locale";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator, WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import type { AirQualityData, PollutantKey, PollenKey } from "./display";
import {
  getAqiCategory,
  getAqiColor,
  getAqiStandard,
  getAqiValue,
  getCompactAirQualityLayout,
  getDailyAqiValue,
  getDominantPollutant,
  getStrongestPollen,
  getUpcomingHours,
  getUvCategory,
} from "./display";

export default function AirQualityWidget({ options, width, height, displayMode }: WidgetComponentProps<"airQuality">) {
  const t = useI18n("widget.airQuality");
  const query = clientApi.widget.airQuality.atLocation.useQuery({
    latitude: options.location.latitude,
    longitude: options.location.longitude,
  });
  const airQuality = getUsableWidgetQueryData(query);

  if (isInitialWidgetQueryPending(query)) return <WidgetQueryLoadingState />;
  if (!airQuality) return <WidgetEmptyState />;

  return (
    <Box h="100%" w="100%" pos="relative">
      {displayMode === "advanced" ? (
        <AdvancedAirQuality airQuality={airQuality} options={options} width={width} />
      ) : (
        <CompactAirQuality airQuality={airQuality} height={height} options={options} width={width} />
      )}
      {query.error && (
        <Box pos="absolute" top={4} right={4}>
          <WidgetQueryErrorIndicator error={query.error} label={t("name")} />
        </Box>
      )}
    </Box>
  );
}

interface AirQualityViewProps {
  airQuality: AirQualityData;
  options: WidgetComponentProps<"airQuality">["options"];
}

const CompactAirQuality = ({
  airQuality,
  height,
  options,
  width,
}: AirQualityViewProps & { height: number; width: number }) => {
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.airQuality");
  const layout = getCompactAirQualityLayout(width, height);
  const standard = getAqiStandard(options.aqiStandard, locale);
  const value = getAqiValue(airQuality.current, standard);
  const category = getAqiCategory(value, standard);
  const dominant = getDominantPollutant(airQuality.current, standard);
  const strongestPollen = getStrongestPollen(airQuality.current);
  const labels = useAirQualityLabels();
  const sixHours = getUpcomingHours(airQuality, 6)
    .map((hour) => getAqiValue(hour, standard))
    .filter((hour): hour is number => hour !== null);

  return (
    <Stack
      h="100%"
      w="100%"
      justify="center"
      align="center"
      gap={layout.tiny ? 2 : "xs"}
      p="xs"
      style={{ overflow: "hidden" }}
    >
      <Group gap="xs" wrap="nowrap" align="center">
        <Text fz={layout.tiny ? 34 : 42} fw={700} lh={1} c={getAqiColor(category)}>
          {formatAqi(value, locale)}
        </Text>
        <Stack gap={1} align="flex-start">
          <Text size={layout.tiny ? "xs" : "sm"} fw={600}>
            {t(`category.${category}`)}
          </Text>
        </Stack>
      </Group>

      {!layout.tiny && (
        <Group gap="md" justify="center" wrap="wrap">
          {options.showUv && (
            <MetricLine
              label={t("uv.label")}
              value={`${formatDecimal(airQuality.current.uvIndex, locale)} · ${t(`uv.category.${getUvCategory(airQuality.current.uvIndex)}`)}`}
            />
          )}
          {options.showPollutants && dominant && (
            <MetricLine label={t("dominantPollutant")} value={labels.pollutants[dominant.key]} />
          )}
        </Group>
      )}

      {!layout.tiny && layout.showParticulatesAndPollen && (
        <Group gap="md" justify="center" wrap="wrap">
          {options.showPollutants && (
            <>
              <MetricLine
                label={labels.pollutants.pm2_5}
                value={formatConcentration(airQuality.current.pollutants.pm2_5, locale, t)}
              />
              <MetricLine
                label={labels.pollutants.pm10}
                value={formatConcentration(airQuality.current.pollutants.pm10, locale, t)}
              />
            </>
          )}
          {options.showPollen && strongestPollen && (
            <MetricLine
              label={t("strongestPollen")}
              value={`${labels.pollen[strongestPollen.key]} · ${formatPollen(strongestPollen.value, locale, t)}`}
            />
          )}
        </Group>
      )}

      {!layout.tiny && layout.showSparkline && sixHours.length > 1 && (
        <Box component="figure" w="100%" h={34} m={0}>
          <Sparkline
            aria-hidden
            h="100%"
            w="100%"
            data={sixHours}
            color={getAqiColor(category)}
            curveType="monotone"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <VisuallyHidden component="figcaption">{t("compact.sixHourTrend")}</VisuallyHidden>
        </Box>
      )}
    </Stack>
  );
};

const AdvancedAirQuality = ({ airQuality, options, width }: AirQualityViewProps & { width: number }) => {
  const chartId = useId();
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.airQuality");
  const standard = getAqiStandard(options.aqiStandard, locale);
  const value = getAqiValue(airQuality.current, standard);
  const category = getAqiCategory(value, standard);
  const labels = useAirQualityLabels();
  const upcoming = getUpcomingHours(airQuality, 24);
  const chartData = upcoming.map((hour) => ({
    observedAt: hour.observedAt,
    aqi: getAqiValue(hour, standard) ?? Number.NaN,
    uv: hour.uvIndex ?? Number.NaN,
  }));
  const series = [
    { name: "aqi", label: t("aqiLabel"), color: getAqiColor(category), type: "line" as const },
    ...(options.showUv
      ? [{ name: "uv", label: t("uv.label"), color: "yellow.7", type: "line" as const, yAxisId: "right" as const }]
      : []),
  ];

  return (
    <ScrollArea h="100%" w="100%">
      <Stack gap="md" p="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Text fz={38} fw={700} lh={1} c={getAqiColor(category)}>
              {formatAqi(value, locale)}
            </Text>
            <Text fw={600}>{t(`category.${category}`)}</Text>
          </Stack>
          <Stack gap={2} align="flex-end">
            <Group gap={5} wrap="nowrap">
              <IconMapPin size="var(--mantine-font-size-md)" aria-hidden />
              <Text size="sm" fw={600}>
                {options.location.name}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {t("advanced.observedAt", {
                time: formatLocalizedTime(airQuality.current.observedAt, locale, { timeZone: airQuality.timezone }),
              })}
            </Text>
          </Stack>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <MetricCard label={t("aqiLabel")} value={formatAqi(value, locale)} />
          {options.showUv && (
            <MetricCard label={t("uv.label")} value={formatDecimal(airQuality.current.uvIndex, locale)} />
          )}
          {options.showPollutants && (
            <>
              <MetricCard
                label={labels.pollutants.pm2_5}
                value={formatConcentration(airQuality.current.pollutants.pm2_5, locale, t)}
              />
              <MetricCard
                label={labels.pollutants.pm10}
                value={formatConcentration(airQuality.current.pollutants.pm10, locale, t)}
              />
            </>
          )}
        </SimpleGrid>

        <SimpleGrid cols={width >= 800 ? 2 : 1} spacing="md">
          <Paper withBorder p="sm">
            <Text id={chartId} size="sm" fw={600} mb="xs">
              {t("advanced.next24Hours")}
            </Text>
            {chartData.length > 0 ? (
              <>
                <Box aria-hidden>
                  <CompositeChart
                    h={220}
                    data={chartData}
                    dataKey="observedAt"
                    series={series}
                    curveType="monotone"
                    gridAxis="y"
                    tickLine="none"
                    withDots={false}
                    withLegend
                    withRightYAxis={options.showUv}
                    rightYAxisProps={{ width: 34 }}
                    xAxisProps={{
                      tickFormatter: (time: string) =>
                        formatLocalizedTime(time, locale, { timeZone: airQuality.timezone }),
                    }}
                  />
                </Box>
                <VisuallyHidden>
                  <ul aria-labelledby={chartId}>
                    {upcoming.map((hour) => (
                      <li key={hour.observedAt}>
                        {formatLocalizedTime(hour.observedAt, locale, { timeZone: airQuality.timezone })}:{" "}
                        {t("advanced.aqiValue", {
                          value: formatAqi(getAqiValue(hour, standard), locale),
                        })}
                        {options.showUv
                          ? `, ${t("advanced.uvValue", { value: formatDecimal(hour.uvIndex, locale) })}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </VisuallyHidden>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                {t("advanced.noForecast")}
              </Text>
            )}
          </Paper>

          <Stack gap="md">
            {options.showPollutants && (
              <Paper withBorder p="sm">
                <Text size="sm" fw={600} mb="xs">
                  {t("advanced.pollutants")}
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  {pollutantKeys.map((key) => (
                    <MetricLine
                      key={key}
                      label={labels.pollutants[key]}
                      value={formatConcentration(airQuality.current.pollutants[key], locale, t)}
                    />
                  ))}
                </SimpleGrid>
              </Paper>
            )}

            {options.showPollen && hasAvailableValue(airQuality.current.pollen) && (
              <Paper withBorder p="sm">
                <Text size="sm" fw={600} mb="xs">
                  {t("advanced.pollen")}
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  {pollenKeys.map((key) => {
                    const pollen = airQuality.current.pollen[key];
                    if (pollen === null) return null;
                    return <MetricLine key={key} label={labels.pollen[key]} value={formatPollen(pollen, locale, t)} />;
                  })}
                </SimpleGrid>
              </Paper>
            )}
          </Stack>
        </SimpleGrid>

        <Paper withBorder p="sm">
          <Text size="sm" fw={600} mb="xs">
            {t("advanced.sevenDayForecast")}
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 4, md: 7 }} spacing="xs">
            {airQuality.daily.map((day) => {
              const dailyAqi = getDailyAqiValue(day, standard);
              return (
                <Stack key={day.date} gap={2} align="center">
                  <Text size="xs" c="dimmed">
                    {formatLocalizedDate(day.date, locale, { weekday: "short" })}
                  </Text>
                  <Text fw={700} c={getAqiColor(getAqiCategory(dailyAqi, standard))}>
                    {formatAqi(dailyAqi, locale)}
                  </Text>
                  {options.showUv && (
                    <Text size="xs">{t("advanced.uvShort", { value: formatDecimal(day.uvIndexMax, locale) })}</Text>
                  )}
                </Stack>
              );
            })}
          </SimpleGrid>
        </Paper>
      </Stack>
    </ScrollArea>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <Paper withBorder p="xs">
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text fz="lg" fw={700}>
      {value}
    </Text>
  </Paper>
);

const MetricLine = ({ label, value }: { label: string; value: string }) => (
  <Stack gap={0} miw={0}>
    <Text size="xs" c="dimmed" truncate>
      {label}
    </Text>
    <Text size="sm" fw={600} truncate>
      {value}
    </Text>
  </Stack>
);

const pollutantKeys: PollutantKey[] = ["pm2_5", "pm10", "ozone", "nitrogenDioxide", "sulphurDioxide", "carbonMonoxide"];
const pollenKeys: PollenKey[] = ["alder", "birch", "grass", "mugwort", "olive", "ragweed"];

const useAirQualityLabels = () => {
  const t = useI18n("widget.airQuality");
  return {
    pollutants: {
      pm2_5: t("pollutant.pm2_5"),
      pm10: t("pollutant.pm10"),
      ozone: t("pollutant.ozone"),
      nitrogenDioxide: t("pollutant.nitrogenDioxide"),
      sulphurDioxide: t("pollutant.sulphurDioxide"),
      carbonMonoxide: t("pollutant.carbonMonoxide"),
    } satisfies Record<PollutantKey, string>,
    pollen: {
      alder: t("pollen.alder"),
      birch: t("pollen.birch"),
      grass: t("pollen.grass"),
      mugwort: t("pollen.mugwort"),
      olive: t("pollen.olive"),
      ragweed: t("pollen.ragweed"),
    } satisfies Record<PollenKey, string>,
  };
};

const formatAqi = (value: number | null, locale: string) => {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
};

const formatDecimal = (value: number | null, locale: string) => {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
};

type ScopedAirQualityTranslator = ReturnType<typeof useI18n<"widget.airQuality">>;

const formatConcentration = (value: number | null, locale: string, t: ScopedAirQualityTranslator) =>
  t("unit.concentration", { value: formatDecimal(value, locale) });
const formatPollen = (value: number | null, locale: string, t: ScopedAirQualityTranslator) =>
  t("unit.pollen", { value: formatDecimal(value, locale) });
const hasAvailableValue = (values: Record<string, number | null>) =>
  Object.values(values).some((value) => value !== null);

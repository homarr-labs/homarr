import type { ReactNode } from "react";
import { useId } from "react";
import { CompositeChart } from "@mantine/charts";
import {
  Box,
  Group,
  Paper,
  Popover,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { IconDroplets, IconMapPin, IconSunHigh, IconSunrise, IconSunset, IconWind } from "@tabler/icons-react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetProps } from "../definition";
import { AnimatedWeatherIcon } from "./animated-icon";
import classes from "./component.module.css";
import { DailyWeatherDetails } from "./details";
import type { HourlyChartRow, WeatherData } from "./format";
import {
  getHourlyChartData,
  getPreferredDate,
  getPreferredTime,
  getPreferredUnit,
  getPreferredWindSpeed,
} from "./format";
import { getWeatherKind, WeatherDescription } from "./icon";
import { getAdvancedWeatherLayout } from "./layout";

interface AdvancedWeatherProps {
  height: number;
  options: WidgetProps<"weather">["options"];
  weather: WeatherData;
  width: number;
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

interface WeatherChartDatum {
  detailLabel: string;
  observedAt: string;
  precipitationProbability: number;
  precipitationSummary: string;
  temperature: number;
  temperatureSummary: string;
  tooltipLabel: string;
}

interface HourlyChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: WeatherChartDatum }>;
}

const HourlyChartTooltip = ({ active, payload }: HourlyChartTooltipProps) => {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  return (
    <Paper p="xs" radius="sm" shadow="md" withBorder>
      <Text size="sm" fw={600} mb={4}>
        {datum.tooltipLabel}
      </Text>
      <Text size="xs">
        {datum.temperatureSummary} · {datum.precipitationSummary}
      </Text>
      <Text size="xs">{datum.detailLabel}</Text>
    </Paper>
  );
};

const MetricCard = ({ icon, label, value }: MetricCardProps) => (
  <Paper className={classes.metricCard} p="sm" radius="md">
    <Group gap="xs" wrap="nowrap" align="flex-start">
      {icon}
      <Stack gap={0} miw={0}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={600} truncate>
          {value}
        </Text>
      </Stack>
    </Group>
  </Paper>
);

export const AdvancedWeather = ({ height, options, weather, width }: AdvancedWeatherProps) => {
  const headingId = useId();
  const chartId = useId();
  const locale = useCurrentIntlLocale();
  const t = useI18n("widget.weather");
  const tCommon = useI18n("common");
  const layout = getAdvancedWeatherLayout(width, height);
  const today = weather.daily[0];
  const observedAt = Date.parse(weather.current.observedAt);
  const nextHour = weather.hourly.find((hour) => Date.parse(hour.observedAt) > observedAt) ?? weather.hourly[0];
  const hourly = getHourlyChartData(weather, options.isFormatFahrenheit);
  const speedUnit = options.useImperialSpeed
    ? tCommon("unit.speed.milesPerHour")
    : tCommon("unit.speed.kilometersPerHour");
  const temperatureUnit = options.isFormatFahrenheit ? "°F" : "°C";
  const chartData = hourly.map<WeatherChartDatum>((hour) => {
    const condition = hour.weatherCode === null ? t("kind.unknown") : t(`kind.${getWeatherKind(hour.weatherCode)}`);
    const temperature = hour.temperature === null ? "?" : hour.temperature.toFixed(1);
    const precipitationProbability = hour.precipitationProbability ?? "?";
    let detailLabel = t("advanced.hourlyTooltipWithoutHumidity", {
      amount: hour.precipitation?.toFixed(1) ?? "?",
      feelsLike: hour.apparentTemperature?.toFixed(1) ?? "?",
      speed: getPreferredWindSpeed(hour.windSpeed, options.useImperialSpeed),
      speedUnit,
      temperatureUnit,
    });
    if (options.showHumidity) {
      detailLabel = t("advanced.hourlyTooltip", {
        amount: hour.precipitation?.toFixed(1) ?? "?",
        feelsLike: hour.apparentTemperature?.toFixed(1) ?? "?",
        humidity: hour.relativeHumidity ?? "?",
        speed: getPreferredWindSpeed(hour.windSpeed, options.useImperialSpeed),
        speedUnit,
        temperatureUnit,
      });
    }

    return {
      detailLabel,
      observedAt: hour.observedAt,
      precipitationProbability: hour.precipitationProbability ?? Number.NaN,
      precipitationSummary: `${t("advanced.precipitationChance")}: ${precipitationProbability}%`,
      temperature: hour.temperature ?? Number.NaN,
      temperatureSummary: `${t("advanced.temperature")}: ${temperature}${temperatureUnit}`,
      tooltipLabel: `${getPreferredTime(hour.observedAt, locale, weather.timezone)} · ${condition}`,
    };
  });
  const ticks = hourly.filter((_, index) => index % layout.hourlyTickStep === 0).map((hour) => hour.observedAt);

  return (
    <ScrollArea h="100%" w="100%">
      <Stack className={classes.advancedRoot} gap="md" p="md">
        <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
          <Group gap="md" wrap="nowrap">
            <AnimatedWeatherIcon
              animated={options.animateIcons}
              code={weather.current.weatherCode}
              isDay={weather.current.isDay}
              size={56}
            />
            <Stack gap={2}>
              <Text fz={32} fw={700} lh={1}>
                {getPreferredUnit(
                  weather.current.temperature,
                  options.isFormatFahrenheit,
                  options.disableTemperatureDecimals,
                )}
              </Text>
              <WeatherDescription weatherOnly weatherCode={weather.current.weatherCode} />
              <Text size="sm" c="dimmed">
                {t("advanced.feelsLike", {
                  temperature: getPreferredUnit(
                    weather.current.apparentTemperature,
                    options.isFormatFahrenheit,
                    options.disableTemperatureDecimals,
                  ),
                })}
              </Text>
            </Stack>
          </Group>
          <Stack gap={2} align="flex-end" className={classes.locationSummary}>
            <Group gap={5} wrap="nowrap" maw="100%">
              <IconMapPin size="var(--mantine-font-size-md)" aria-hidden />
              <Text size="sm" fw={600} truncate>
                {options.location.name}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {t("advanced.observedAt", {
                time: getPreferredTime(weather.current.observedAt, locale, weather.timezone),
              })}
            </Text>
            {today && (
              <Text size="sm">
                {t("advanced.highLow", {
                  maximum: getPreferredUnit(
                    today.maxTemperature,
                    options.isFormatFahrenheit,
                    options.disableTemperatureDecimals,
                  ),
                  minimum: getPreferredUnit(
                    today.minTemperature,
                    options.isFormatFahrenheit,
                    options.disableTemperatureDecimals,
                  ),
                })}
              </Text>
            )}
          </Stack>
        </Group>

        <SimpleGrid cols={layout.metricColumns} spacing="xs">
          <MetricCard
            icon={<IconDroplets size={18} aria-hidden />}
            label={t("advanced.nextHourPrecipitation")}
            value={t("advanced.precipitationValue", {
              amount: nextHour?.precipitation?.toFixed(1) ?? "?",
              probability: nextHour?.precipitationProbability ?? "?",
            })}
          />
          {options.showHumidity && (
            <MetricCard
              icon={<IconDroplets size={18} aria-hidden />}
              label={t("advanced.currentHumidity")}
              value={`${weather.current.relativeHumidity}%`}
            />
          )}
          <MetricCard
            icon={<IconWind size={18} aria-hidden />}
            label={t("advanced.currentWind")}
            value={t("advanced.windValue", {
              gusts: getPreferredWindSpeed(weather.current.windGusts, options.useImperialSpeed),
              speed: getPreferredWindSpeed(weather.current.windSpeed, options.useImperialSpeed),
              unit: speedUnit,
            })}
          />
          <MetricCard
            icon={<IconSunHigh size={18} aria-hidden />}
            label={t("advanced.todayUv")}
            value={today?.uvIndex?.toFixed(1) ?? "?"}
          />
          <MetricCard
            icon={<IconSunrise size={18} aria-hidden />}
            label={t("dailyForecast.sunrise")}
            value={getPreferredTime(today?.sunriseAt, locale, weather.timezone)}
          />
          <MetricCard
            icon={<IconSunset size={18} aria-hidden />}
            label={t("dailyForecast.sunset")}
            value={getPreferredTime(today?.sunsetAt, locale, weather.timezone)}
          />
        </SimpleGrid>

        {chartData.length > 0 && (
          <Box component="figure" m={0} aria-labelledby={chartId}>
            <Text id={chartId} component="figcaption" size="sm" fw={600} mb="xs">
              {t("advanced.hourlyForecast")}
            </Text>
            <Box aria-hidden>
              <CompositeChart
                h={layout.chartHeight}
                data={chartData}
                dataKey="observedAt"
                series={[
                  { name: "temperature", label: t("advanced.temperature"), color: "orange.6", type: "area" },
                  {
                    name: "precipitationProbability",
                    label: t("advanced.precipitationChance"),
                    color: "blue.5",
                    type: "bar",
                    yAxisId: "right",
                  },
                ]}
                curveType="monotone"
                gridAxis="y"
                tickLine="none"
                withDots={false}
                withLegend
                withRightYAxis={layout.showChartAxes}
                withYAxis={layout.showChartAxes}
                yAxisProps={{ width: 38, tickFormatter: (value: number) => `${value}°` }}
                rightYAxisProps={{ width: 38, domain: [0, 100], tickFormatter: (value: number) => `${value}%` }}
                xAxisProps={{
                  ticks,
                  interval: 0,
                  tickFormatter: (value: string) => getPreferredTime(value, locale, weather.timezone),
                }}
                tooltipAnimationDuration={0}
                tooltipProps={{ content: <HourlyChartTooltip /> }}
              />
            </Box>
            <VisuallyHidden>
              <HourlyWeatherTable
                hourly={hourly}
                locale={locale}
                speedUnit={speedUnit}
                temperatureUnit={temperatureUnit}
                timeZone={weather.timezone}
                useImperialSpeed={options.useImperialSpeed}
                showHumidity={options.showHumidity}
              />
            </VisuallyHidden>
          </Box>
        )}

        <Text id={headingId} component="h3" size="sm" fw={600} m={0}>
          {t("advanced.forecast")}
        </Text>
        <SimpleGrid aria-labelledby={headingId} cols={layout.dailyColumns} spacing="xs">
          {weather.daily.map((day) => (
            <Popover key={day.date} position="bottom" withArrow shadow="md" offset={10}>
              <Popover.Target>
                <UnstyledButton
                  className={classes.dailyCardButton}
                  aria-label={t("detailsFor", {
                    date: getPreferredDate(day.date, locale, { weekday: "long", month: "short", day: "numeric" }),
                  })}
                >
                  <Paper className={classes.dailyCard} p="sm" radius="md">
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Stack gap={0} miw={0}>
                          <Text size="sm" fw={700} tt="capitalize">
                            {getPreferredDate(day.date, locale, { weekday: "short" })}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {getPreferredDate(day.date, locale, { month: "short", day: "numeric" })}
                          </Text>
                        </Stack>
                        <AnimatedWeatherIcon animated={options.animateIcons} code={day.weatherCode} size={28} />
                      </Group>

                      <Text size="sm" fw={500} lineClamp={1}>
                        {t(`kind.${getWeatherKind(day.weatherCode)}`)}
                      </Text>

                      <Group gap="xs" align="baseline" wrap="nowrap">
                        <Text fz="lg" fw={700}>
                          {getPreferredUnit(
                            day.maxTemperature,
                            options.isFormatFahrenheit,
                            options.disableTemperatureDecimals,
                          )}
                        </Text>
                        <Text size="sm" c="dimmed" fw={500}>
                          {getPreferredUnit(
                            day.minTemperature,
                            options.isFormatFahrenheit,
                            options.disableTemperatureDecimals,
                          )}
                        </Text>
                      </Group>

                      <Group className={classes.dailyCardFacts} justify="space-between" gap={4} wrap="nowrap">
                        <Group gap={3} wrap="nowrap">
                          <IconDroplets size={14} aria-hidden />
                          <Text className={classes.dailyCardFact} fz={11}>
                            {day.precipitationProbability ?? "?"}%
                          </Text>
                        </Group>
                        <Group gap={3} wrap="nowrap">
                          <IconWind size={14} aria-hidden />
                          <Text className={classes.dailyCardFact} fz={11}>
                            {getPreferredWindSpeed(day.maxWindSpeed, options.useImperialSpeed)} {speedUnit}
                          </Text>
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                </UnstyledButton>
              </Popover.Target>
              <Popover.Dropdown className={classes.dailyDetailsDropdown}>
                <DailyWeatherDetails
                  animateIcons={options.animateIcons}
                  day={day}
                  dateFormat={options.dateFormat}
                  disableTemperatureDecimals={options.disableTemperatureDecimals}
                  isFahrenheit={options.isFormatFahrenheit}
                  showHumidity={options.showHumidity}
                  timeZone={weather.timezone}
                  useImperialSpeed={options.useImperialSpeed}
                />
              </Popover.Dropdown>
            </Popover>
          ))}
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
};

interface HourlyDetailProps {
  locale: string;
  showHumidity: boolean;
  speedUnit: string;
  temperatureUnit: string;
  timeZone: string;
  useImperialSpeed: boolean;
}

const HourlyWeatherTable = ({
  hourly,
  locale,
  showHumidity,
  speedUnit,
  temperatureUnit,
  timeZone,
  useImperialSpeed,
}: HourlyDetailProps & { hourly: HourlyChartRow[] }) => {
  const t = useI18n("widget.weather");
  return (
    <table>
      <caption>{t("advanced.hourlyForecast")}</caption>
      <thead>
        <tr>
          <th>{t("advanced.time")}</th>
          <th>{t("advanced.conditions")}</th>
          <th>{t("advanced.temperature")}</th>
          <th>{t("advanced.feelsLikeLabel")}</th>
          <th>{t("advanced.precipitationChance")}</th>
          {showHumidity && <th>{t("advanced.humidity")}</th>}
          <th>{t("advanced.wind", { unit: speedUnit })}</th>
        </tr>
      </thead>
      <tbody>
        {hourly.map((hour) => (
          <tr key={hour.observedAt}>
            <td>{getPreferredTime(hour.observedAt, locale, timeZone)}</td>
            <td>{hour.weatherCode === null ? t("kind.unknown") : t(`kind.${getWeatherKind(hour.weatherCode)}`)}</td>
            <td>{hour.temperature === null ? "?" : `${hour.temperature.toFixed(1)}${temperatureUnit}`}</td>
            <td>
              {hour.apparentTemperature === null ? "?" : `${hour.apparentTemperature.toFixed(1)}${temperatureUnit}`}
            </td>
            <td>{hour.precipitationProbability === null ? "?" : `${hour.precipitationProbability}%`}</td>
            {showHumidity && <td>{hour.relativeHumidity === null ? "?" : `${hour.relativeHumidity}%`}</td>}
            <td>
              {getPreferredWindSpeed(hour.windSpeed, useImperialSpeed)} /{" "}
              {getPreferredWindSpeed(hour.windGusts, useImperialSpeed)} {speedUnit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

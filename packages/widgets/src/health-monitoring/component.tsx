"use client";

import { AreaChart, getFilteredChartTooltipPayload } from "@mantine/charts";
import type { DefaultMantineColor } from "@mantine/core";
import { Box, Group, Progress, Stack, Tabs, Text } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import { humanFileSize } from "@homarr/common";
import type { HealthMonitoring } from "@homarr/integrations";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

import "@mantine/charts/styles.css";

import type { AtLeastOneOf } from "@homarr/common/types";

import { NoIntegrationSelectedError } from "../errors/no-integration-selected";

dayjs.extend(duration);

export default function HealthMonitoringWidget(props: WidgetComponentProps<"healthMonitoring">) {
  const [healthData] = clientApi.widget.healthMonitoring.getHealthStatus.useSuspenseQuery(
    {
      integrationIds: props.integrationIds,
      maxElements: Number(props.options.pointDensity),
      pointCount: Number(props.options.pointDensity),
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const utils = clientApi.useUtils();

  clientApi.widget.healthMonitoring.subscribeHealthStatus.useSubscription(
    {
      integrationIds: props.integrationIds,
      maxElements: Number(props.options.pointDensity),
    },
    {
      onData(data) {
        utils.widget.healthMonitoring.getHealthStatus.setData(
          {
            integrationIds: props.integrationIds,
            maxElements: Number(props.options.pointDensity),
            pointCount: Number(props.options.pointDensity),
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }
            const newData = prevData.map((item) =>
              item.integration.id === data.integration.id
                ? {
                    integration: item.integration,
                    healthInfo: {
                      timestamp: data.healthInfo.timestamp,
                      data: {
                        ...data.healthInfo.data,
                        history: [...item.healthInfo.data.history, ...data.healthInfo.data.history].slice(
                          -Number(props.options.pointDensity),
                        ) as AtLeastOneOf<HealthMonitoring["history"][number]>,
                      },
                    },
                  }
                : item,
            );
            return newData;
          },
        );
      },
    },
  );

  const t = useI18n();

  if (props.integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <Tabs
      defaultValue={props.integrationIds[0]}
      h="100%"
      display="flex"
      dir="vertical"
      style={{ flexDirection: "column" }}
    >
      <Tabs.List flex={0} display={healthData.length > 1 ? "flex" : "none"}>
        {healthData.map(({ integration }) => (
          <Tabs.Tab value={integration.id} key={integration.id}>
            {integration.name}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {healthData.map(({ integration, healthInfo: { data } }) => {
        return (
          <Tabs.Panel
            value={integration.id}
            key={integration.id}
            flex="1 1 auto"
            display="flex"
            style={{ flexDirection: "column" }}
            h="100%"
          >
            {props.options.systemInfo && (
              <Box p="sm">
                <Stack gap={2} align="center">
                  <Text fz="md" fw="bold">{data.system.name}</Text>
                  <Text fz="sm">{formatUptime(data.system.uptime, t)}</Text>
                </Stack>
              </Box>
            )}
            {props.options.cpu && (
              <GridAreaChart columns={Number(props.options.cpuColumns)} data={data} series={["cpu"]} />
            )}
            {props.options.memory && data.system.type === "single" && (
              <GridAreaChart columns={1} data={data} series={["memory"]} />
            )}
            {props.options.network && <GridAreaChart columns={1} data={data} series={["networkUp", "networkDown"]} />}
            {props.options.fileSystem && (
              <StorageEntries columns={1} fahrenheit={props.options.fahrenheit} storages={data.storage} />
            )}
          </Tabs.Panel>
        );
      })}
    </Tabs>
  );
}

type HistoryKeys = keyof Omit<HealthMonitoring["history"][number], "timestamp">;

const historyFormatTable = {
  cpu: { key: "cpu", color: "blue", format: "percent", negative: false },
  memory: { key: "memory", color: "orange", format: "humanFileSize", negative: false },
  networkUp: { key: "network", color: "green", format: "humanFileSize", negative: false },
  networkDown: { key: "network", color: "red", format: "humanFileSize", negative: true },
} satisfies Record<
  HistoryKeys,
  {
    key: keyof Pick<HealthMonitoring, "cpu" | "memory" | "network">;
    color: DefaultMantineColor;
    format: "percent" | "humanFileSize";
    negative: boolean;
  }
>;

const dataToGraph = (data: HealthMonitoring, series: AtLeastOneOf<HistoryKeys>) => {
  const referenceArray = data.history[0][series[0]];
  // Check that all selected series have the same length
  if (series.some((name) => data.history[0][name].length !== data.history[0][series[0]].length)) {
    return null;
  }

  return referenceArray.map(({ id }) => ({
    id,
    negative: series.some((key) => historyFormatTable[key].negative),
    graph: data.history.map((item) => ({
      date: item.timestamp,
      name: data[historyFormatTable[series[0]].key].find((element) => element.id === id)?.name ?? "",
      ...series.reduce(
        (acc, key) => {
          const value = item[key].find((element) => element.id === id)?.value ?? null;
          const scale = data[historyFormatTable[key].key].find((element) => element.id === id)?.maxValue ?? 100;
          acc[`original.${key}`] = value;
          acc[`max.${key}`] = scale;
          acc[`format.${key}`] = historyFormatTable[key].format;
          acc[key] = value ? value / (scale / (historyFormatTable[key].negative ? -100 : 100)) : null;
          return acc;
        },
        {} as Partial<Record<HistoryKeys | `${string}.${HistoryKeys}`, number | string | null>>,
      ),
    })),
  }));
};

interface GridAreaChartProps {
  data: HealthMonitoring;
  series: AtLeastOneOf<HistoryKeys>;
  columns?: number;
}

const GridAreaChart = ({ data, series, columns = 1 }: GridAreaChartProps) => {
  const formattedData = dataToGraph(data, series);
  const formattedSeries = series.map((name) => ({
    name,
    color: historyFormatTable[name].color,
  }));
  if (!formattedData || formattedData.length === 0) return null;
  return (
    <Box
      display="grid"
      flex="1 1 auto"
      w="100%"
      style={{
        gap: 7,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: "auto-fit",
        height: "50px",
      }}
    >
      {formattedData.map(({ id, negative, graph }) => {
        return (
          <AreaChart
            data={graph}
            key={id}
            h="100%"
            w="100%"
            bg="var(--background-color)"
            p={0}
            yAxisProps={{ domain: [negative ? -100 : 0, 100] }}
            dataKey="date"
            series={formattedSeries}
            gridAxis="none"
            dotProps={{ r: 0 }}
            activeDotProps={{ r: 3 }}
            withYAxis={false}
            withXAxis={false}
            flex="1 1 auto"
            style={{ borderRadius: "3cqmin", border: "1px red solid" }}
            tooltipProps={{
              content: ({ payload }) => <CustomTooltip payload={payload as Record<string, unknown>[] | undefined} />,
            }}
          />
        )
      })}
    </Box>
  );
};

interface CustomTooltipProps {
  payload: Record<string, unknown>[] | undefined;
}

const CustomTooltip = ({ payload }: CustomTooltipProps) => {
  if (!payload) return;
  // TODO: check why this is needed?
  // const filteredData = getFilteredChartTooltipPayload(payload);
  const filteredData = payload;
  return (
    <Box bg="var(--background-color)" p="md" style={{ borderRadius: "3cqmin" }}>
      <Text>{((filteredData[0]?.payload ?? { name: "" }) as { name: string }).name}</Text>
      {filteredData.map(({ dataKey, payload: subPayload }) => {
        const values = subPayload as Record<string, number> & Record<`format.${string}`, string>;
        const displayValue =
          historyFormatTable[dataKey as keyof typeof historyFormatTable].format === "humanFileSize"
            ? `${humanFileSize(values[`original.${dataKey}`] ?? 0)}/${humanFileSize(values[`max.${dataKey}`] ?? 0)}`
            : `${values[dataKey as string]?.toFixed()}%`;
        return (
          <Text key={dataKey as string} fz="md">
            {`${dataKey}: ${displayValue}`}
          </Text>
        );
      })}
    </Box>
  );
};

interface StorageEntriesProps {
  columns: number;
  fahrenheit: boolean;
  storages: HealthMonitoring["storage"];
}

const StorageEntries = ({ columns, fahrenheit, storages }: StorageEntriesProps) => {
  return (
    <Box
      display="grid"
      p="xs"
      w="100%"
      style={{
        gap: "0.5cqmin",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {storages.map((storage) => {
        const percentage = (storage.used / storage.size) * 100;
        return (
          <Stack
            key={storage.name}
            bg="var(--background-color)"
            gap="xs"
            w="100%"
            flex="1 1 auto"
            style={{ borderRadius: "3cqmin" }}
          >
            <Group w="100%" justify="space-between" gap="1cqmin">
              <Text fz="md">{storage.name}</Text>
              {storage.temp && (
                <Group>
                  <Text fz="md">{temperatureFormatter(storage.temp, fahrenheit)}</Text>
                </Group>
              )}
              <Text fz="md">{`${humanFileSize(storage.used)}/${humanFileSize(storage.size)}`}</Text>
            </Group>
            <Progress value={percentage} color={progressColor(percentage)} />
          </Stack>
        );
      })}
    </Box>
  );
};

const temperatureFormatter = (temperature: number, fahrenheit: boolean) =>
  fahrenheit ? `${temperature * (9 / 5) + 32}°F` : `${temperature}°C`;

export const progressColor = (percentage: number) => {
  if (percentage < 40) return "green";
  else if (percentage < 60) return "yellow";
  else if (percentage < 90) return "orange";
  else return "red";
};

export const formatUptime = (time: number, t: TranslationFunction) => {
  const timeDiff = dayjs.duration(time, "milliseconds");
  return t("widget.healthMonitoring.popover.uptime", {
    months: `${Math.floor(timeDiff.as("months"))}`,
    days: `${Math.floor(timeDiff.as("days"))}`,
    //replace with timeDiff.hours() and timeDiff.minutes() once it's fixed
    hours: `${Math.floor(timeDiff.as("hours") % 24)}`,
    minutes: `${Math.floor(timeDiff.as("minutes") % 60)}`,
  });
};

interface FileSystem {
  deviceName: string;
  used: string;
  available: string;
  percentage: number;
}

interface SmartData {
  deviceName: string;
  temperature: number;
  overallStatus: string;
}

export const matchFileSystemAndSmart = (fileSystems: FileSystem[], smartData: SmartData[]) => {
  return fileSystems
    .map((fileSystem) => {
      const baseDeviceName = fileSystem.deviceName.replace(/[0-9]+$/, "");
      const smartDisk = smartData.find((smart) => smart.deviceName === baseDeviceName);

      return {
        deviceName: smartDisk?.deviceName ?? fileSystem.deviceName,
        used: fileSystem.used,
        available: fileSystem.available,
        percentage: fileSystem.percentage,
        temperature: smartDisk?.temperature ?? 0,
        overallStatus: smartDisk?.overallStatus ?? "",
      };
    })
    .sort((fileSystemA, fileSystemB) => fileSystemA.deviceName.localeCompare(fileSystemB.deviceName));
};

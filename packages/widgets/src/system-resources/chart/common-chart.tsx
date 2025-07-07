/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LineChartSeries } from "@mantine/charts";
import { LineChart } from "@mantine/charts";
import { Card, Center, Text } from "@mantine/core";
import type { TooltipProps, YAxisProps } from "recharts";

export const CommonChart = ({
  data,
  dataKey,
  series,
  title,
  tooltipProps,
  yAxisProps
}: {
  data: Record<string, any>[];
  dataKey: string;
  series: LineChartSeries[];
  title: string;
  tooltipProps?: TooltipProps<number, any>;
  yAxisProps?: Omit<YAxisProps, 'ref'>;
}) => {
  return (
    <Card h={"100%"} pos={"relative"} p={0}>
      <Text c={"dimmed"} pos={"absolute"} fw={"bold"} top={0} left={0} ps={6}>
        {title}
      </Text>
      <LineChart
        data={data}
        dataKey={dataKey}
        h={"100%"}
        series={series}
        curveType="linear"
        tickLine="none"
        gridAxis="none"
        withXAxis={false}
        withYAxis={false}
        withDots={false}
        bg={"#434343"}
        styles={{ root: { padding: 5, borderRadius: 5 } }}
        tooltipProps={tooltipProps}
        yAxisProps={yAxisProps}
      />
      {data.length == 0 && (
        <Center pos="absolute" w="100%" h="100%">
          <Text c="dimmed" size="xs">There is currently no data</Text>
        </Center>
      )}
    </Card>
  );
};

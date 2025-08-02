/* eslint-disable @typescript-eslint/no-explicit-any */
import type {LineChartSeries} from "@mantine/charts";
import {LineChart} from "@mantine/charts";
import {Group, Card, Center, Loader, Stack, Text, useMantineColorScheme, useMantineTheme} from "@mantine/core";
import {useElementSize, useHover, useMergedRef} from "@mantine/hooks";
import type {TooltipProps, YAxisProps} from "recharts";

import {useRequiredBoard} from "@homarr/boards/context";

export const CommonChart = ({
                              data,
                              dataKey,
                              series,
                              title,
                              tooltipProps,
                              yAxisProps,
                              lastValue
                            }: {
  data: Record<string, any>[];
  dataKey: string;
  series: LineChartSeries[];
  title: string;
  tooltipProps?: TooltipProps<number, any>;
  yAxisProps?: Omit<YAxisProps, "ref">;
  lastValue?: string;
}) => {
  const {ref: elementSizeRef, height} = useElementSize();
  const theme = useMantineTheme();
  const scheme = useMantineColorScheme();
  const board = useRequiredBoard();
  const { hovered, ref: hoverRef } = useHover();
  const ref = useMergedRef(elementSizeRef, hoverRef);

  const opacity = board.opacity / 100;
  const backgroundColor =
    scheme.colorScheme === "dark" ? `rgba(57, 57, 57, ${opacity})` : `rgba(246, 247, 248, ${opacity})`;

  return (
    <Card
      ref={ref}
      h={"100%"}
      pos={"relative"}
      style={{overflow: "visible"}}
      p={0}
      bg={data.length <= 1 ? backgroundColor : undefined}
      radius={board.itemRadius}
    >
      {data.length > 1 && height > 40 && !hovered && (
        <Group pos={"absolute"} top={0} left={0} p={8} pt={6} gap={5} wrap={"nowrap"} style={{ zIndex: 2, pointerEvents: "none" }}>
          <Text c={"dimmed"} size={height > 100 ? "md" : "xs"} fw={"bold"}>
            {title}
          </Text>
          {lastValue && (
            <Text c={"dimmed"} size={height > 100 ? "md" : "xs"} lineClamp={1}>{lastValue}</Text>
          )}
        </Group>
      )}
      {data.length <= 1 ? (
        <Center pos="absolute" w="100%" h="100%">
          <Stack px={"xs"} align={"center"}>
            <Loader type="bars" size={height > 100 ? "md" : "xs"} color={"rgba(94, 94, 94, 1)"}/>
          </Stack>
        </Center>
      ) : (
        <LineChart
          data={data}
          dataKey={dataKey}
          h={"100%"}
          series={series}
          curveType="monotone"
          tickLine="none"
          gridAxis="none"
          withXAxis={false}
          withYAxis={false}
          withDots={false}
          bg={backgroundColor}
          styles={{root: {padding: 5, borderRadius: theme.radius[board.itemRadius]}}}
          tooltipAnimationDuration={200}
          tooltipProps={tooltipProps}
          withTooltip={height >= 64}
          yAxisProps={yAxisProps}
        />
      )}
    </Card>
  );
};

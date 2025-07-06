import { Card, Text } from "@mantine/core";
import { LineChart } from "@mantine/charts";

export const CommonChart = ({ data, dataKey, series, title }: { data: Record<string, any>[], dataKey: string, series: LineChartSeries[], title: string }) => {
  return (
    <Card h={"100%"} pos={"relative"} p={0}>
      <Text c={"dimmed"} pos={"absolute"} fw={"bold"} top={0} left={0} ps={6}>{title}</Text>
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
      />
    </Card>
  )
}
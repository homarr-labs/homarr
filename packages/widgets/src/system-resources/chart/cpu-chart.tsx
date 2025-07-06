import { LineChart } from "@mantine/charts";
import { Card, Text } from "@mantine/core";

export const SystemResourceCPUChart = () => {
  const data = [
    {
      date: 'Mar 22',
      Apples: 2890,
      Oranges: 2338,
      Tomatoes: 2452,
    },
    {
      date: 'Mar 23',
      Apples: 2756,
      Oranges: 2103,
      Tomatoes: 2402,
    },
    {
      date: 'Mar 24',
      Apples: 3322,
      Oranges: 986,
      Tomatoes: 1821,
    },
    {
      date: 'Mar 25',
      Apples: 3470,
      Oranges: 2108,
      Tomatoes: 2809,
    },
    {
      date: 'Mar 26',
      Apples: 3129,
      Oranges: 1726,
      Tomatoes: 2290,
    },
  ];

  return (
    <Card h={"100%"} pos={"relative"} p={0}>
      <Text c={"dimmed"} pos={"absolute"} fw={"bold"} top={0} left={0} ps={6}>CPU</Text>
      <LineChart
        data={data}
        dataKey="date"
        h={"100%"}
        series={[
          { name: 'Apples', color: 'indigo.6' },
          { name: 'Oranges', color: 'blue.6' },
          { name: 'Tomatoes', color: 'teal.6' },
        ]}
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
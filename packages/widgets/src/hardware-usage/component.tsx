import { Group, Paper, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { ResponsiveLine } from "@nivo/line";

import { clientApi } from "@homarr/api/client";
import { CpuLoad, MemoryLoad, NetworkLoad } from "@homarr/integrations";

import type { WidgetComponentProps } from "../definition";

export default function HardwareUsageWidget({ serverData, integrationIds }: WidgetComponentProps<"hardwareUsage">) {
  if (!serverData) {
    return null;
  }
  const [hardwareUsage, hardwareUsageHandlers] = useListState<{
    cpuLoad: CpuLoad;
    memoryLoad: MemoryLoad;
    networkLoad: NetworkLoad;
  }>([serverData.initialData.hardwareInformationHistory]);

  clientApi.widget.hardwareUsage.subscribeCpu.useSubscription(
    {
      integrationId: integrationIds[0],
    },
    {
      onData: (data) => {
        hardwareUsageHandlers.append(data);
        if (hardwareUsage.length > 15) {
          hardwareUsageHandlers.shift();
        }
      },
    },
  );

  const data = [
    {
      id: "cpuLoad",
      color: "red",
      data: hardwareUsage.map((usage, index) => ({
        x: `${index}`,
        y: usage.cpuLoad.sumLoad,
      })),
    },
  ];

  const hasLast = hardwareUsage.length > 0;

  return (
    <Stack p={"md"}>
      <Paper pos={"relative"} radius={"md"} w={"100%"} h={250}>
        <Group pos={"absolute"} gap={"xs"} top={5} left={10}>
          <Text fw={"bold"}>CPU</Text>
          {hasLast && <Text c={"dimmed"}>{hardwareUsage[hardwareUsage.length - 1]!.cpuLoad.sumLoad.toFixed(2)}%</Text>}
        </Group>
        <ResponsiveLine
          data={data}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min: 0,
            max: 100,
            stacked: false,
            reverse: false,
          }}
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            if (slice.points.length === 0) {
              return null;
            }
            return (
              <Paper p={5} px={8} radius={"lg"} withBorder>
                <Text c={"dimmed"} size={"xs"}>
                  {slice.points[0]!.data.yFormatted}%
                </Text>
              </Paper>
            );
          }}
          curve={"monotoneX"}
          yFormat=" >-.2f"
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={null}
          enablePoints={false}
          enableTouchCrosshair={true}
          enableGridX={false}
          enableGridY={false}
          enableCrosshair={true}
          useMesh={true}
          animate={false}
        />
      </Paper>

      {JSON.stringify(hardwareUsage[hardwareUsage.length - 1])}
    </Stack>
  );
}

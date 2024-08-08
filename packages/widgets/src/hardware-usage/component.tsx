import {useListState} from "@mantine/hooks";
import type {WidgetComponentProps} from "../definition";
import {Group, Paper, Stack, Text} from "@mantine/core";
import {clientApi} from "@homarr/api/client";
import {CpuLoad} from "@homarr/integrations";
import {ResponsiveLine} from '@nivo/line'

export default function HardwareUsageWidget({serverData, integrationIds}: WidgetComponentProps<"hardwareUsage">) {
  if (!serverData) {
    return null;
  }
  const [cpuUsage, cpuUsageHandlers] = useListState<{ cpuLoad: CpuLoad }>([serverData.initialData.cpuHistory]);

  clientApi.widget.hardwareUsage.subscribeCpu.useSubscription({
    integrationId: integrationIds[0]
  }, {
    onData: (data) => {
      cpuUsageHandlers.append(data);
      if (cpuUsage.length > 15) {
        cpuUsageHandlers.shift();
      }
    }
  });

  const data = [{
    id: "cpuLoad",
    color: "red",
    data: cpuUsage.map((usage, index) => ({
      x: `${index}`,
      y: usage.cpuLoad.sumLoad
    }))
  }];

  const hasLast = cpuUsage.length > 0;

  return <Stack p={"md"}>
    <Paper pos={"relative"} radius={"md"} w={"100%"} h={250}>
      <Group pos={"absolute"} top={5} left={10}>
        <Text fw={"bold"}>CPU</Text>
        {hasLast && (
          <Text c={"dimmed"}>{cpuUsage[cpuUsage.length - 1]!.cpuLoad.sumLoad.toFixed(2)}%</Text>
        )}
      </Group>
      <ResponsiveLine
        data={data}
        margin={{top: 10, right: 10, bottom: 10, left: 10}}
        xScale={{type: 'point'}}
        yScale={{
          type: 'linear',
          min: 0,
          max: 100,
          stacked: false,
          reverse: false,
        }}
        enableSlices="x"
        sliceTooltip={({slice}) => {
          return <Paper p={"xs"} withBorder>
            <Text size={"xs"}>{slice.points[0].data.yFormatted}%</Text>
          </Paper>
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
        animate={false}/>
    </Paper>
  </Stack>
}
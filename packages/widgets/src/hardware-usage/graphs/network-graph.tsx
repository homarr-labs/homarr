import type { ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { ResponsiveLine } from "@nivo/line";
import { IconDownload, IconUpload } from "@tabler/icons-react";

import { humanFileSize } from "@homarr/common";
import type { NetworkLoad } from "@homarr/integrations";

import { GraphWrapper } from "./wrapper";

interface MemoryGraphProps {
  networkLoad: NetworkLoad[];
  hasLast: boolean;
}

export const NetworkGraph = ({ networkLoad, hasLast }: MemoryGraphProps) => {
  const data = [
    {
      id: "networkUp",
      color: "red",
      data: networkLoad.map((usage, index) => ({
        x: `${index}`,
        y: usage.up,
      })),
    },
    {
      id: "networkDown",
      color: "green",
      data: networkLoad.map((usage, index) => ({
        x: `${index}`,
        y: usage.down,
      })),
    },
  ];

  const lastDatapoint = networkLoad.length > 0 ? networkLoad[networkLoad.length - 1] : undefined;
  const subtitle: ReactNode = lastDatapoint ? (
    <Group gap={"xs"} wrap={"nowrap"}>
      <Group gap={5} wrap={"nowrap"}>
        <IconUpload size={15} />
        {humanFileSize(Math.round(lastDatapoint.up))}ps
      </Group>
      <Group gap={5} wrap={"nowrap"}>
        <IconDownload size={15} />
        {humanFileSize(Math.round(lastDatapoint.down))}ps
      </Group>
    </Group>
  ) : (
    <></>
  );

  return (
    <GraphWrapper title={"Network"} subtitle={subtitle} showSubtitle={hasLast}>
      <ResponsiveLine
        data={data}
        margin={{ top: 40, right: 10, bottom: 10, left: 10 }}
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: 0,
          stacked: false,
          reverse: false,
        }}
        enableSlices="x"
        sliceTooltip={({ slice }) => {
          if (slice.points.length != 2) {
            return null;
          }
          return (
            <Paper p={5} px={8} radius={"lg"} withBorder>
              <Stack gap={"xs"}>
                <Group gap={4}>
                  <IconDownload size={15} />
                  <Text c={"dimmed"} size={"xs"}>
                    {humanFileSize(Math.round(slice.points[1]?.data.y.valueOf() as number))}
                  </Text>
                </Group>
                <Group gap={4}>
                  <IconUpload size={15} />
                  <Text c={"dimmed"} size={"xs"}>
                    {humanFileSize(Math.round(slice.points[0]?.data.y.valueOf() as number))}
                  </Text>
                </Group>
              </Stack>
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
    </GraphWrapper>
  );
};

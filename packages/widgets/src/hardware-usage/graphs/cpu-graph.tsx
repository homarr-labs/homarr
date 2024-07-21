import { Paper, Text } from "@mantine/core";
import { ResponsiveLine } from "@nivo/line";

import type { CpuLoad } from "@homarr/integrations";

import { GraphWrapper } from "./wrapper";

interface CpuGraphProps {
  cpuLoad: CpuLoad[];
  hasLast: boolean;
}

export const CpuGraph = ({ cpuLoad, hasLast }: CpuGraphProps) => {
  const data = [
    {
      id: "cpuLoad",
      color: "red",
      data: cpuLoad.map((usage, index) => ({
        x: `${index}`,
        y: usage.sumLoad,
      })),
    },
  ];
  return (
    <GraphWrapper
      title={"CPU"}
      subtitle={`${cpuLoad.length > 0 ? cpuLoad[cpuLoad.length - 1]?.sumLoad.toFixed(2) : 0}%`}
      showSubtitle={hasLast}
    >
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
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
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
    </GraphWrapper>
  );
};

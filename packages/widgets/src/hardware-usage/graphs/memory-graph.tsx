import type { MemoryLoad } from "@homarr/integrations";
import { GraphWrapper } from "./wrapper";
import { ResponsiveLine } from "@nivo/line";
import { Paper, Text } from "@mantine/core";
import { humanFileSize } from "@homarr/common";

interface MemoryGraphProps {
  memoryLoad: MemoryLoad[];
  hasLast: boolean;
  maxAvailableBytes: number; // TODO: pass this value
}

export const MemoryGraph = ({ memoryLoad, hasLast, maxAvailableBytes }: MemoryGraphProps) => {
  const data = [
    {
      id: "memoryLoad",
      color: "red",
      data: memoryLoad.map((usage, index) => ({
        x: `${index}`,
        y: usage.loadInBytes,
      })),
    },
  ];
  return (
    <GraphWrapper title={"Memory"} subtitle={`${humanFileSize(memoryLoad[memoryLoad.length - 1]!.loadInBytes)} / ${humanFileSize(maxAvailableBytes)}`} showSubtitle={hasLast}>
      <ResponsiveLine
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        xScale={{ type: "point" }}
        yScale={{
          type: "linear",
          min: 0,
          max: maxAvailableBytes,
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
                {humanFileSize(slice.points[0]!.data.y.valueOf() as number)}
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
  )
}
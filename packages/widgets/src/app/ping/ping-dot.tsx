import type { MantineColor } from "@mantine/core";
import { Box, Tooltip } from "@mantine/core";

import { useSettings } from "@homarr/settings";
import type { TablerIcon } from "@homarr/ui";

interface PingDotProps {
  icon: TablerIcon;
  color: MantineColor;
  tooltip: string;
}

export const PingDot = ({ color, tooltip, ...props }: PingDotProps) => {
  const { pingIconsEnabled } = useSettings();

  return (
    <Box bottom="2.5cqmin" right="2.5cqmin" pos="absolute">
      <Tooltip label={tooltip}>
        {pingIconsEnabled ? (
          <props.icon style={{ width: "10cqmin", height: "10cqmin" }} color={color} />
        ) : (
          <Box
            bg={color}
            style={{
              borderRadius: "100%",
            }}
            w="10cqmin"
            h="10cqmin"
          ></Box>
        )}
      </Tooltip>
    </Box>
  );
};

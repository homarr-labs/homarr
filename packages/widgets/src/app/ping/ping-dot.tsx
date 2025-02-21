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
    <Box bottom={10} right={10} pos="absolute">
      <Tooltip label={tooltip}>
        {pingIconsEnabled ? (
          <props.icon style={{ width: 10, height: 10 }} color={color} />
        ) : (
          <Box
            bg={color}
            style={{
              borderRadius: "100%",
            }}
            w={10}
            h={10}
          ></Box>
        )}
      </Tooltip>
    </Box>
  );
};

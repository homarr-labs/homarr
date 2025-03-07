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
    <Box bottom={10} right={10} pos="absolute" display={"flex"}>
      <Tooltip label={tooltip}>
        {pingIconsEnabled ? (
          <props.icon style={{ width: 20, height: 20 }} strokeWidth={5} color={color} />
        ) : (
          <Box
            bg={color}
            style={{
              borderRadius: "100%",
            }}
            w={16}
            h={16}
          ></Box>
        )}
      </Tooltip>
    </Box>
  );
};

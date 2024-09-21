import type { MantineColor } from "@mantine/core";
import { Box, Tooltip } from "@mantine/core";

interface PingDotProps {
  color: MantineColor;
  tooltip: string;
}

export const PingDot = ({ color, tooltip }: PingDotProps) => {
  return (
    <Box bottom="2.5cqmin" right="2.5cqmin" pos="absolute">
      <Tooltip label={tooltip}>
        <Box
          bg={color}
          style={{
            borderRadius: "100%",
          }}
          w="10cqmin"
          h="10cqmin"
        ></Box>
      </Tooltip>
    </Box>
  );
};

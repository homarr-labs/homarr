import type { ReactNode } from "react";
import { Group, Paper, Text } from "@mantine/core";

interface GraphWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string | ReactNode;
  showSubtitle?: boolean;
  height?: number;
}

export const GraphWrapper = ({ showSubtitle, subtitle, title, children, height = 125 }: GraphWrapperProps) => {
  return (
    <Paper pos={"relative"} radius={"md"} w={"100%"} h={height}>
      <Group pos={"absolute"} gap={"xs"} top={5} left={10} wrap={"nowrap"} style={{ overflowX: "hidden" }}>
        <Text fw={"bold"}>{title}</Text>
        {showSubtitle && <Text c={"dimmed"}>{subtitle}</Text>}
      </Group>
      {children}
    </Paper>
  );
};

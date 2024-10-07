import { Box, Card } from "@mantine/core";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import { DynamicSectionProvider } from "./dynamic/dynamic-context";
import { BoardDynamicSectionMenu } from "./dynamic/dynamic-menu";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";

interface Props {
  section: DynamicSection;
}

export const BoardDynamicSection = ({ section }: Props) => {
  const board = useRequiredBoard();

  return (
    <Box className="grid-stack-item-content">
      <Card
        className={classes.itemCard}
        w="100%"
        h="100%"
        withBorder
        styles={{
          root: {
            "--opacity": board.opacity / 100,
            overflow: "hidden",
          },
        }}
        p={0}
      >
        <DynamicSectionProvider section={section}>
          <GridStack section={section} className="min-row" />
        </DynamicSectionProvider>
      </Card>
      <BoardDynamicSectionMenu section={section} />
    </Box>
  );
};

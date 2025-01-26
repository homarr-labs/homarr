import { Box, Card } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
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
        <GridStack section={section} className="min-row" />
      </Card>
      <BoardDynamicSectionMenu section={section} />
    </Box>
  );
};

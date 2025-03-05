import { Box, Card } from "@mantine/core";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import type { DynamicSectionItem } from "~/app/[locale]/boards/_types";
import { BoardDynamicSectionMenu } from "./dynamic/dynamic-menu";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";

interface Props {
  section: DynamicSectionItem;
}

export const BoardDynamicSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const options = section.options;

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
            "--border-color": options.borderColor !== "" ? options.borderColor : undefined,
          },
        }}
        radius={board.itemRadius}
        p={0}
      >
        {/* Use unique key by layout to reinitialize gridstack */}
        <GridStack key={`${currentLayoutId}-${section.id}`} section={section} className="min-row" />
      </Card>
      <BoardDynamicSectionMenu section={section} />
    </Box>
  );
};

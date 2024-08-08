import { Card } from "@mantine/core";
import combineClasses from "clsx";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";

interface Props {
  section: DynamicSection;
}

export const BoardDynamicSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  return (
    <Card
      className={combineClasses(classes.itemCard, "grid-stack-item-content")}
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
  );
};

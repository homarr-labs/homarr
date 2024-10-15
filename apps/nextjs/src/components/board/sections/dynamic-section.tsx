import { ActionIcon, Box, Card } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical } from "@tabler/icons-react";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import { DynamicSectionProvider, useAboveDynamicSectionIds } from "./dynamic/dynamic-context";
import { BoardDynamicSectionMenu } from "./dynamic/dynamic-menu";
import { StackedMenu } from "./dynamic/stacked-menu";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";

interface Props {
  section: DynamicSection;
}

export const BoardDynamicSection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const aboveIds = useAboveDynamicSectionIds();

  const hasItemInTopRightCorner =
    section.items.some((item) => item.xOffset + item.width === section.width && item.yOffset === 0) ||
    board.sections.some(
      (innerSection) =>
        innerSection.kind === "dynamic" &&
        innerSection.parentSectionId === section.id &&
        innerSection.xOffset + innerSection.width == section.width &&
        innerSection.yOffset == 0,
    );

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
      {hasItemInTopRightCorner ? null : aboveIds.length > 0 ? (
        <StackedMenu
          target={
            <ActionIcon variant="default" radius="xl" pos="absolute" top={4} right={4} style={{ zIndex: 10 }}>
              <IconDotsVertical size="1rem" />
            </ActionIcon>
          }
          items={aboveIds.map((id) => ({ type: "section" as const, id })).concat({ type: "section", id: section.id })}
        />
      ) : (
        <DefaultMenu section={section} />
      )}
    </Box>
  );
};

const DefaultMenu = ({ section }: { section: DynamicSection }) => {
  const [opened, { close, toggle }] = useDisclosure(false);

  return (
    <BoardDynamicSectionMenu
      section={section}
      withinPortal
      target={
        <ActionIcon variant="default" radius="xl" pos="absolute" top={4} right={4} style={{ zIndex: 10 }}>
          <IconDotsVertical size="1rem" />
        </ActionIcon>
      }
      opened={opened}
      onClose={close}
      onToggle={toggle}
    />
  );
};

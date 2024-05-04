"use client";

import { Box, Card, Center, Flex, Loader, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";

interface BoardPreviewProps {
  board: RouterOutputs["board"]["getAllBoards"][number];
}

export const BoardPreview = ({ board }: BoardPreviewProps) => {
  const { ref, width } = useElementSize();

  return (
    <Card
      h="100%"
      mah={width ? (width / 1920) * 1080 : undefined}
      ref={ref}
      styles={{
        root: {
          "--gridstack-column-count": board.columnCount,
          "--gridstack-widget-width": width / board.columnCount,
        },
      }}
    >
      {width === 0 ? (
        <Center h="100%">
          <Loader size="sm" />
        </Center>
      ) : (
        <>
          {board.sections.map((section) => (
            <Section
              key={section.id}
              section={section}
              itemWidth={width / board.columnCount}
            />
          ))}
        </>
      )}
    </Card>
  );
};

interface SectionProps {
  section: RouterOutputs["board"]["getAllBoards"][number]["sections"][number];
  itemWidth: number;
}

const Section = ({ section, itemWidth }: SectionProps) => {
  const maxHeight = Math.max(
    ...section.items.map((item) => item.yOffset + item.height),
  );

  return (
    <Card
      withBorder={section.kind === "category"}
      h={maxHeight * itemWidth}
      key={section.id}
      className="grid-stack"
    >
      {section.items.map((item) => (
        <Box
          className="grid-stack-item"
          gs-h={item.height}
          gs-w={item.width}
          gs-x={item.xOffset}
          gs-y={item.yOffset}
          key={item.id}
          p={4}
        >
          <Card withBorder h="100%" p={0}>
            <Flex justify="center" align="center" h="100%" w="100%">
              <Text fz={itemWidth / 4}>{dayjs().format("HH:mm")}</Text>
            </Flex>
          </Card>
        </Box>
      ))}
    </Card>
  );
};

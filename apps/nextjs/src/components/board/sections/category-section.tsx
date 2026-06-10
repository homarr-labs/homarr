import { Card, Collapse, Group, Stack, Title, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { CategoryMenu } from "./category/category-menu";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";
import { useCategoryCollapse } from "./use-category-collapse";

interface Props {
  section: CategorySection;
}

export const BoardCategorySection = ({ section }: Props) => {
  const board = useRequiredBoard();
  const [opened, { toggle }] = useCategoryCollapse(section);

  return (
    <Card style={{ "--opacity": board.opacity / 100 }} radius={board.itemRadius} p={0} className={classes.itemCard}>
      <Stack>
        <Group wrap="nowrap" gap="sm">
          <UnstyledButton w="100%" p="sm" onClick={toggle}>
            <Group wrap="nowrap">
              {opened ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              <Title order={3}>{section.name}</Title>
            </Group>
          </UnstyledButton>
          <CategoryMenu category={section} />
        </Group>
        <Collapse expanded={opened} p="sm" pt={0}>
          <GridStack section={section} />
        </Collapse>
      </Stack>
    </Card>
  );
};

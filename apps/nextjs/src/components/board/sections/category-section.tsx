import { Card, Collapse, Group, Stack, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { CategoryMenu } from "./category/category-menu";
import { GridStack } from "./gridstack/gridstack";

interface Props {
  section: CategorySection;
}

export const BoardCategorySection = ({ section }: Props) => {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Card withBorder p={0}>
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
        <Collapse in={opened} p="sm" pt={0}>
          <GridStack section={section} />
        </Collapse>
      </Stack>
    </Card>
  );
};

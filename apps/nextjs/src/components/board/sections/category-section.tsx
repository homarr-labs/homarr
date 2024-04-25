import type { RefObject } from "react";
import {
  Card,
  Collapse,
  Group,
  Stack,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { CategoryMenu } from "./category/category-menu";
import { SectionContent } from "./content";
import { useGridstack } from "./gridstack/use-gridstack";

interface Props {
  section: CategorySection;
  mainRef: RefObject<HTMLDivElement>;
}

export const BoardCategorySection = ({ section, mainRef }: Props) => {
  const { refs } = useGridstack({ section, mainRef });
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Card withBorder p={0}>
      <Stack>
        <Group wrap="nowrap" gap="sm">
          <UnstyledButton w="100%" p="sm" onClick={toggle}>
            <Group wrap="nowrap">
              {opened ? (
                <IconChevronUp size={20} />
              ) : (
                <IconChevronDown size={20} />
              )}
              <Title order={3}>{section.name}</Title>
            </Group>
          </UnstyledButton>
          <CategoryMenu category={section} />
        </Group>
        <Collapse in={opened} p="sm" pt={0}>
          <div
            className="grid-stack grid-stack-category"
            data-category
            data-section-id={section.id}
            ref={refs.wrapper}
          >
            <SectionContent items={section.items} refs={refs} />
          </div>
        </Collapse>
      </Stack>
    </Card>
  );
};

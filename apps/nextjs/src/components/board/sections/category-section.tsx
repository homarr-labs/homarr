import type { RefObject } from "react";
import { useDisclosure } from "@mantine/hooks";

import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  Stack,
  Title,
  UnstyledButton,
} from "@homarr/ui";

import { SectionContent } from "./content";
import { useGridstack } from "./gridstack/use-gridstack";
import type { CategorySection } from "./type";

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
          <ActionIcon mr="sm" variant="transparent">
            <IconDotsVertical size={20} />
          </ActionIcon>
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

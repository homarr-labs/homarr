import { Card, Collapse, Group, Stack, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";

import type { CategorySection } from "~/app/[locale]/boards/_types";
import { CategoryMenu } from "./category/category-menu";
import { GridStack } from "./gridstack/gridstack";
import classes from "./item.module.css";

const localStorageKey = (sectionId: string) => `homarr-section-collapsed-${sectionId}`;

interface Props {
  section: CategorySection;
}

export const BoardCategorySection = ({ section }: Props) => {
  const { status } = useSession();
  const { mutate } = clientApi.section.changeCollapsed.useMutation();
  const board = useRequiredBoard();

  const initialCollapsed =
    typeof window !== "undefined"
      ? (localStorage.getItem(localStorageKey(section.id)) ?? String(section.collapsed)) === "true"
      : section.collapsed;

  const [opened, { toggle }] = useDisclosure(initialCollapsed, {
    onOpen() {
      if (status === "authenticated") {
        mutate({ sectionId: section.id, collapsed: true });
      } else if (status === "unauthenticated") {
        localStorage.setItem(localStorageKey(section.id), "true");
      }
    },
    onClose() {
      if (status === "authenticated") {
        mutate({ sectionId: section.id, collapsed: false });
      } else if (status === "unauthenticated") {
        localStorage.setItem(localStorageKey(section.id), "false");
      }
    },
  });

  return (
    <Card
      style={{ "--opacity": board.opacity / 100 }}
      radius={board.itemRadius}
      withBorder
      p={0}
      className={classes.itemCard}
    >
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

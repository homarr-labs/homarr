import { ActionIcon, Menu } from "@mantine/core";
import { IconArrowsMove, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem } from "@homarr/ui/inline-confirm-action";
import { removeBoardContainer } from "../../features/boards/draft";
import type { ContainerSectionItem } from "./runtime";
import { useBoardRuntime } from "./runtime";

interface ContainerMenuProps {
  section: ContainerSectionItem;
  position: { left?: number | string; right?: number | string; top: number | string };
}

export const BoardContainerMenu = ({ section, position }: ContainerMenuProps) => {
  const tContainer = useI18n("section.container");
  const tItem = useI18n("item");
  const { editing, onEditElement, onUpdate, resources } = useBoardRuntime();
  const label = section.options.title || tContainer("action.create");

  if (!editing) return null;

  const openEditModal = () =>
    onEditElement?.(
      {
        id: section.id,
        type: "section",
        x: section.xOffset,
        y: section.yOffset,
        w: section.width,
        h: section.height,
      },
      section.parentSectionId,
    );

  return (
    <Menu withinPortal position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon
          data-grid-no-drag
          variant="default"
          size={24}
          radius="sm"
          pos="absolute"
          {...position}
          style={{ zIndex: 26, minWidth: 0, minHeight: 0, maxWidth: "100%", maxHeight: "100%" }}
          aria-label={tItem("menu.label.settingsFor", { name: label })}
        >
          <IconLayoutKanban size="1rem" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128} data-grid-no-drag>
        <Menu.Item leftSection={<IconPencil size={16} />} disabled={!onEditElement} onClick={openEditModal}>
          {tItem("action.edit")}
        </Menu.Item>
        <Menu.Item leftSection={<IconArrowsMove size={16} />} disabled={!onEditElement} onClick={openEditModal}>
          {tItem("action.moveResize")}
        </Menu.Item>
        <Menu.Divider />
        <InlineConfirmMenuItem
          color="red"
          disabled={!onUpdate}
          confirmLabel={tContainer("remove.message")}
          leftSection={<IconTrash size={16} />}
          onConfirm={() => onUpdate?.((board) => removeBoardContainer(board, section.id, resources))}
        >
          {tContainer("action.remove")}
        </InlineConfirmMenuItem>
      </Menu.Dropdown>
    </Menu>
  );
};

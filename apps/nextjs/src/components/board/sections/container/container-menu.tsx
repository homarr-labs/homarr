import { ActionIcon, Menu } from "@mantine/core";
import { IconArrowsMove, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";

import { useEditMode } from "@homarr/boards/edit-mode";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem } from "@homarr/ui";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { useOpenItemMoveModal } from "../../items/item-move-modal";
import { useSectionContext } from "../section-context";
import { useContainerActions } from "./container-actions";
import { ContainerEditModal } from "./container-edit-modal";

export const BoardContainerMenu = ({ section }: { section: ContainerSectionItem }) => {
  const tContainer = useI18n("section.container");
  const tItem = useI18n("item");
  const { openModal } = useModalAction(ContainerEditModal);
  const openMoveModal = useOpenItemMoveModal();
  const { updateContainer, removeContainer } = useContainerActions();
  const [isEditMode] = useEditMode();
  const { section: parentSection } = useSectionContext();
  const label = section.options.title || tContainer("action.create");
  const menuLeftOffset = parentSection.kind === "container" ? 36 : 4;

  if (!isEditMode) return null;

  const openEditModal = () => {
    openModal({
      value: section.options,
      onSuccessfulEdit: (options) => updateContainer({ containerId: section.id, newOptions: options }),
    });
  };

  return (
    <Menu withinPortal position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon
          variant="default"
          size={24}
          radius="sm"
          pos="absolute"
          top={4}
          left={menuLeftOffset}
          style={{ zIndex: 10 }}
          aria-label={tItem("menu.label.settingsFor", { name: label })}
        >
          <IconLayoutKanban size="1rem" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>
          {tItem("action.edit")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconArrowsMove size={16} />}
          onClick={() => openMoveModal({ entry: section, sourceSectionId: section.parentSectionId })}
        >
          {tItem("action.moveResize")}
        </Menu.Item>
        <Menu.Divider />
        <InlineConfirmMenuItem
          color="red"
          confirmLabel={tContainer("remove.message")}
          leftSection={<IconTrash size={16} />}
          onConfirm={() => removeContainer({ id: section.id })}
        >
          {tContainer("action.remove")}
        </InlineConfirmMenuItem>
      </Menu.Dropdown>
    </Menu>
  );
};

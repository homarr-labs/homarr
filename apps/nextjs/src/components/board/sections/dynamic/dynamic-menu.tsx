import { ActionIcon, Menu } from "@mantine/core";
import { IconArrowsMove, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";

import { useEditMode } from "@homarr/boards/edit-mode";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { DynamicSectionItem } from "~/app/[locale]/boards/_types";
import { useOpenItemMoveModal } from "../../items/item-move-modal";
import { useSectionContext } from "../section-context";
import { useDynamicSectionActions } from "./dynamic-actions";
import { DynamicSectionEditModal } from "./dynamic-edit-modal";

export const BoardDynamicSectionMenu = ({ section }: { section: DynamicSectionItem }) => {
  const t = useI18n();
  const tDynamic = useScopedI18n("section.dynamic");
  const tItem = useScopedI18n("item");
  const { openModal } = useModalAction(DynamicSectionEditModal);
  const openMoveModal = useOpenItemMoveModal();
  const { updateDynamicSection, removeDynamicSection } = useDynamicSectionActions();
  const { openConfirmModal } = useConfirmModal();
  const [isEditMode] = useEditMode();
  const { section: parentSection } = useSectionContext();
  const label = section.options.title || tDynamic("action.create");
  const menuRightOffset = parentSection.kind === "dynamic" ? 44 : 4;

  if (!isEditMode) return null;

  const openEditModal = () => {
    openModal({
      value: section.options,
      onSuccessfulEdit: (options) => {
        updateDynamicSection({
          itemId: section.id,
          newOptions: options,
        });
      },
    });
  };

  const openRemoveModal = () => {
    openConfirmModal({
      title: tDynamic("remove.title"),
      children: tDynamic("remove.message"),
      onConfirm: () => {
        removeDynamicSection({ id: section.id });
      },
    });
  };

  return (
    <Menu withinPortal position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon
          variant="default"
          radius={"xl"}
          pos="absolute"
          top={4}
          right={menuRightOffset}
          style={{ zIndex: 10 }}
          aria-label={tItem("menu.label.settingsFor", { name: label })}
        >
          <IconLayoutKanban size={"1rem"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label>{tItem("menu.label.settings")}</Menu.Label>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>
          {tItem("action.edit")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconArrowsMove size={16} />}
          onClick={() =>
            openMoveModal({
              entry: section,
              sourceSectionId: section.parentSectionId,
            })
          }
        >
          {tItem("action.moveResize")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>
          {tDynamic("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

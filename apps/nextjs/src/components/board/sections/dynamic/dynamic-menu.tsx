import type { ReactNode } from "react";
import { Menu } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { useConfirmModal } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { useDynamicSectionActions } from "./dynamic-actions";

interface Props {
  section: DynamicSection;
  withinPortal?: boolean;
  target: ReactNode;
}

export const BoardDynamicSectionMenu = ({ withinPortal, section, target }: Props) => {
  const t = useI18n();
  const tDynamic = useScopedI18n("section.dynamic");
  const { removeDynamicSection } = useDynamicSectionActions();
  const { openConfirmModal } = useConfirmModal();
  const [isEditMode] = useEditMode();

  if (!isEditMode) return null;

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
    <Menu withinPortal={withinPortal} withArrow position="right-start" arrowPosition="center">
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>
          {tDynamic("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

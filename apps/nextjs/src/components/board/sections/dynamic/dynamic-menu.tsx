import { cloneElement } from "react";
import type { JSXElementConstructor, ReactElement } from "react";
import { Menu } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { useConfirmModal } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { useDynamicSectionActions } from "./dynamic-actions";

interface Props {
  section: Pick<DynamicSection, "id">;
  withinPortal: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: ReactElement<any, string | JSXElementConstructor<any>>;
  opened: boolean;
  onClose: () => void;
  onToggle: () => void;
  onKeyDown?: (event: React.KeyboardEvent<Element>) => void;
  returnFocus?: boolean;
  closeOnClickOutside?: boolean;
}

export const BoardDynamicSectionMenu = ({
  withinPortal,
  section,
  target,
  opened,
  onClose,
  onToggle,
  onKeyDown,
  returnFocus,
  closeOnClickOutside,
}: Props) => {
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
    <Menu
      withinPortal={withinPortal}
      withArrow
      position="right-start"
      arrowPosition="center"
      opened={opened}
      onClose={onClose}
      returnFocus={returnFocus}
      closeOnClickOutside={closeOnClickOutside}
    >
      <Menu.Target>
        {cloneElement(target, {
          onClick: onToggle,
        })}
      </Menu.Target>
      <Menu.Dropdown miw={128} onKeyDown={onKeyDown}>
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal} onKeyDown={onKeyDown}>
          {tDynamic("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

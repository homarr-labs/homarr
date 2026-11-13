import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { IconCopy, IconDotsVertical, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem } from "@homarr/ui";
import type { WidgetDefinition } from "@homarr/widgets/definition";
import type { WidgetPreviewDimensions } from "@homarr/widgets/modals";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useEditItemInPlace } from "~/components/board/in-place-editor/use-edit-item-in-place";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { ItemMenuDropdown } from "./item-menu-dropdown";
import itemContentClasses from "./item-content.module.css";
import { useOpenItemMoveModal } from "./item-move-modal";

interface BoardItemMenuProps {
  item: SectionItem;
  definition: WidgetDefinition;
  previewDimensions: WidgetPreviewDimensions;
  resetErrorBoundary?: () => void;
}

export const BoardItemMenu = (props: BoardItemMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  if (!session || !isEditMode) return null;

  return <BoardItemMenuInner {...props} />;
};
interface BoardItemContextMenuProps extends BoardItemMenuProps {
  children: ReactNode;
  disabled?: boolean;
}

export const BoardItemContextMenu = (props: BoardItemContextMenuProps) => <BoardItemMenuInner {...props} />;

const BoardItemMenuInner = ({
  item,
  resetErrorBoundary,
  children,
  disabled,
}: BoardItemMenuProps & { children?: ReactNode; disabled?: boolean }) => {
  const { data: session } = useSession();
  const canDuplicate = item.kind !== "customApi" || (session?.user.permissions.includes("admin") ?? false);
  const refResetErrorBoundaryOnNextRender = useRef(false);
  const tItem = useI18n("item");
  const t = useI18n();
  const openMoveModal = useOpenItemMoveModal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { duplicateItem, removeItem } = useItemActions();
  const { section } = useSectionContext();
  const label = item.advancedOptions.title?.trim() || getWidgetName(item.kind, t);

  // Reset error boundary on next render if item has been edited
  useEffect(() => {
    if (refResetErrorBoundaryOnNextRender.current) {
      resetErrorBoundary?.();
      refResetErrorBoundaryOnNextRender.current = false;
    }
  }, [item, resetErrorBoundary]);

  const editInPlace = useEditItemInPlace(item, () => {
    refResetErrorBoundaryOnNextRender.current = true;
  });

  useEffect(() => {
    if (children) return;
    const entry = document.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`)?.closest(".board-grid-entry");
    if (!entry) return;
    const handleDoubleClick = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-board-widget-settings], button, a")) return;
      editInPlace();
    };
    entry.addEventListener("dblclick", handleDoubleClick);
    return () => entry.removeEventListener("dblclick", handleDoubleClick);
  }, [children, editInPlace, item.id]);

  const menuItems = (
    <>
      <Menu.Item leftSection={<IconPencil size={16} />} onClick={editInPlace}>
        {tItem("action.edit")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconLayoutKanban size={16} />}
        onClick={() => {
          openMoveModal({
            entry: item,
            sourceSectionId: section.id,
          });
        }}
      >
        {tItem("action.moveResize")}
      </Menu.Item>
      {canDuplicate && (
        <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => duplicateItem({ itemId: item.id })}>
          {tItem("action.duplicate")}
        </Menu.Item>
      )}
      <Menu.Divider />
      <InlineConfirmMenuItem
        color="red"
        confirmLabel={tItem("remove.message")}
        leftSection={<IconTrash size={16} />}
        onConfirm={() => removeItem({ itemId: item.id })}
      >
        {tItem("action.remove")}
      </InlineConfirmMenuItem>
    </>
  );

  return (
    <Menu withinPortal position="right-start" arrowPosition="center" opened={isMenuOpen} onChange={setIsMenuOpen}>
      {children ? (
        <Menu.ContextMenu disabled={disabled}>{children}</Menu.ContextMenu>
      ) : (
        <Menu.Target>
          <ActionIcon
            variant="default"
            size={24}
            radius="sm"
            className={itemContentClasses.settingsButton}
            classNames={{ icon: itemContentClasses.settingsButtonIcon }}
            data-menu-open={isMenuOpen || undefined}
            data-board-widget-settings
            aria-label={tItem("menu.label.settingsFor", { name: label })}
          >
            <IconDotsVertical size="1rem" />
          </ActionIcon>
        </Menu.Target>
      )}
      {children ? (
        <ItemMenuDropdown opened={isMenuOpen} onClose={() => setIsMenuOpen(false)} title={label}>
          {menuItems}
        </ItemMenuDropdown>
      ) : (
        <Menu.Dropdown miw={128}>{menuItems}</Menu.Dropdown>
      )}
    </Menu>
  );
};

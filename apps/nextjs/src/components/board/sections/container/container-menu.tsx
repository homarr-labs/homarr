import type { CSSProperties } from "react";
import { useRef } from "react";
import { Button, Menu } from "@mantine/core";
import { IconArrowsMove, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";
import combineClasses from "clsx";

import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem } from "@homarr/ui";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { useOpenItemMoveModal } from "../../items/item-move-modal";
import { useContainerActions } from "./container-actions";
import { useOpenContainerEditor } from "./lazy-container-edit-modal";
import classes from "./container-menu.module.css";

interface ContainerEditBarProps {
  section: ContainerSectionItem;
  placement: "border" | "header";
  depth: number;
}

export const BoardContainerEditBar = ({ section, placement, depth }: ContainerEditBarProps) => {
  const tContainer = useI18n("section.container");
  const tItem = useI18n("item");
  const openEditor = useOpenContainerEditor(section);
  const editButton = useRef<HTMLButtonElement>(null);
  const openMoveModal = useOpenItemMoveModal();
  const { removeContainer } = useContainerActions();
  const [isEditMode] = useEditMode();

  if (!isEditMode) return null;

  const label = section.options.title.trim() || tContainer("untitled");
  const isSmart = section.options.smart?.enabled;
  const isNarrow = isSmart && section.width === 1;

  return (
    <div
      className={combineClasses(classes.anchor, placement === "header" ? classes.headerAnchor : classes.borderAnchor)}
      style={{ "--container-edit-bar-depth": depth } as CSSProperties}
      data-narrow={isNarrow || undefined}
    >
      <div className={classes.bar} data-board-container-edit-bar data-grid-no-drag>
        {placement === "border" && (
          <div className={classes.name} title={label}>
            <IconLayoutKanban size="var(--mantine-font-size-sm)" stroke={1.75} className={classes.nameIcon} />
            <span className={classes.nameText}>{label}</span>
          </div>
        )}
        <Menu withinPortal position="bottom-end">
          <Menu.Target>
            <Button
              ref={editButton}
              size="compact-xs"
              variant="subtle"
              color="blue"
              leftSection={<IconPencil size="var(--mantine-font-size-xs)" />}
              className={classes.editButton}
              classNames={{ label: classes.editLabel, section: classes.editSection }}
              aria-label={`${tContainer("editBar.edit")}: ${label}`}
            >
              {tContainer("editBar.edit")}
            </Button>
          </Menu.Target>
          <Menu.Dropdown miw={128} maw="min(26rem, calc(100vw - 2rem))">
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => openEditor(editButton.current)}>
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
              styles={{ itemLabel: { whiteSpace: "normal", overflowWrap: "anywhere" } }}
              leftSection={<IconTrash size={16} />}
              onConfirm={() => removeContainer({ id: section.id })}
            >
              {tContainer("action.remove")}
            </InlineConfirmMenuItem>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
};

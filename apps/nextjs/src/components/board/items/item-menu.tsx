import { useEffect, useRef, useState } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { IconCopy, IconDotsVertical, IconLayoutKanban, IconPencil } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getWidgetName } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { WidgetDefinition } from "@homarr/widgets/definition";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { BoardRemoveConfirmationMenuItem } from "../remove-confirmation-menu-item";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { useOpenItemMoveModal } from "./item-move-modal";
import itemContentClasses from "./item-content.module.css";
import { LazyWidgetEditModal, preloadWidgetEditModal } from "./lazy-widget-edit-modal";

interface BoardItemMenuProps {
  item: SectionItem;
  definition: WidgetDefinition;
  previewDimensions: { width: number; height: number; scale?: number };
  resetErrorBoundary?: () => void;
}

export const BoardItemMenu = (props: BoardItemMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  if (!session || !isEditMode) return null;

  return <BoardItemMenuInner {...props} />;
};
const BoardItemMenuInner = ({ item, definition, previewDimensions, resetErrorBoundary }: BoardItemMenuProps) => {
  const { data: session } = useSession();
  const canDuplicate = item.kind !== "customApi" || (session?.user.permissions.includes("admin") ?? false);
  const refResetErrorBoundaryOnNextRender = useRef(false);
  const tItem = useI18n("item");
  const t = useI18n();
  const { openModal } = useModalAction(LazyWidgetEditModal);
  const openMoveModal = useOpenItemMoveModal();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, duplicateItem, removeItem } =
    useItemActions();
  const { integrations: integrationData, section } = useSectionContext();
  const settings = useSettings();
  const label = item.advancedOptions.title?.trim() || getWidgetName(item.kind, t);

  // Reset error boundary on next render if item has been edited
  useEffect(() => {
    if (refResetErrorBoundaryOnNextRender.current) {
      resetErrorBoundary?.();
      refResetErrorBoundaryOnNextRender.current = false;
    }
  }, [item, resetErrorBoundary]);

  const openEditModal = () => {
    openModal(
      {
        kind: item.kind,
        definition,
        value: {
          advancedOptions: item.advancedOptions,
          options: item.options,
          integrationIds: item.integrationIds,
        },
        onSuccessfulEdit: ({ options, integrationIds, advancedOptions }) => {
          updateItemOptions({
            itemId: item.id,
            newOptions: options,
          });
          updateItemAdvancedOptions({
            itemId: item.id,
            newAdvancedOptions: advancedOptions,
          });
          updateItemIntegrations({
            itemId: item.id,
            newIntegrations: integrationIds,
          });
          refResetErrorBoundaryOnNextRender.current = true;
        },
        onIntegrationSaved: resetErrorBoundary,
        integrationData: (integrationData ?? []).filter(
          (integration) =>
            integration.permissions.hasUseAccess &&
            "supportedIntegrations" in definition &&
            (definition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
        ),
        integrationSupport: "supportedIntegrations" in definition,
        settings,
        itemId: item.id,
        previewDimensions,
        appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
      },
      {
        title(translate) {
          return `${translate("item.edit.title")} - ${getWidgetName(item.kind, translate)}`;
        },
      },
    );
  };

  return (
    <Menu withinPortal position="right-start" arrowPosition="center" opened={isMenuOpen} onChange={setIsMenuOpen}>
      <Menu.Target>
        <ActionIcon
          variant="default"
          size={24}
          radius="sm"
          className={itemContentClasses.settingsButton}
          data-menu-open={isMenuOpen || undefined}
          data-board-widget-settings
          aria-label={tItem("menu.label.settingsFor", { name: label })}
        >
          <IconDotsVertical size="1rem" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Item
          leftSection={<IconPencil size={16} />}
          onClick={openEditModal}
          onFocus={preloadWidgetEditModal}
          onPointerEnter={preloadWidgetEditModal}
        >
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
        <BoardRemoveConfirmationMenuItem
          label={tItem("action.remove")}
          confirmationLabel={tItem("remove.message")}
          onConfirm={() => removeItem({ itemId: item.id })}
        />
      </Menu.Dropdown>
    </Menu>
  );
};

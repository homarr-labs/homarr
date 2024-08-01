import { useEffect, useMemo, useRef } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { IconDotsVertical, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { WidgetEditModal, widgetImports } from "@homarr/widgets";

import type { Item } from "~/app/[locale]/boards/_types";
import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { useItemActions } from "./item-actions";

export const BoardItemMenu = ({
  offset,
  item,
  resetErrorBoundary,
}: {
  offset: number;
  item: Item;
  resetErrorBoundary?: () => void;
}) => {
  const refResetErrorBoundaryOnNextRender = useRef(false);
  const tItem = useScopedI18n("item");
  const t = useI18n();
  const { openModal } = useModalAction(WidgetEditModal);
  const { openConfirmModal } = useConfirmModal();
  const [isEditMode] = useEditMode();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, removeItem } = useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery();
  const currentDefinition = useMemo(() => widgetImports[item.kind].definition, [item.kind]);

  // Reset error boundary on next render if item has been edited
  useEffect(() => {
    if (refResetErrorBoundaryOnNextRender.current) {
      resetErrorBoundary?.();
      refResetErrorBoundaryOnNextRender.current = false;
    }
  }, [item, resetErrorBoundary]);

  if (!isEditMode || isPending) return null;

  const openEditModal = () => {
    openModal({
      kind: item.kind,
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
      integrationData: (integrationData ?? []).filter(
        (integration) =>
          "supportedIntegrations" in currentDefinition &&
          (currentDefinition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
      ),
      integrationSupport: "supportedIntegrations" in currentDefinition,
    });
  };

  const openRemoveModal = () => {
    openConfirmModal({
      title: tItem("remove.title"),
      children: tItem("remove.message"),
      onConfirm: () => {
        removeItem({ itemId: item.id });
      },
    });
  };

  return (
    <Menu withinPortal withArrow position="right-start" arrowPosition="center">
      <Menu.Target>
        <ActionIcon variant="default" radius={"xl"} pos="absolute" top={offset} right={offset} style={{ zIndex: 10 }}>
          <IconDotsVertical size={"1rem"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label>{tItem("menu.label.settings")}</Menu.Label>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>
          {tItem("action.edit")}
        </Menu.Item>
        <Menu.Item leftSection={<IconLayoutKanban size={16} />}>{tItem("action.move")}</Menu.Item>
        <Menu.Divider />
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>
          {tItem("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

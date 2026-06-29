"use client";

import { useCallback, useMemo } from "react";
import { Menu } from "@mantine/core";
import { IconCopy, IconLayoutKanban, IconPencil, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { WidgetContextMenuAction } from "@homarr/widgets";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetEditModal } from "@homarr/widgets/modals";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { useSectionContext } from "../sections/section-context";
import { useItemActions } from "./item-actions";
import { ItemMoveModal } from "./item-move-modal";

interface WidgetContextMenuProps {
  item: SectionItem;
  widgetStateRef: React.MutableRefObject<Record<string, unknown> | null>;
  children: React.ReactNode;
}

export const WidgetContextMenu = ({ item, widgetStateRef, children }: WidgetContextMenuProps) => {
  const { data: session } = useSession();
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const tItem = useScopedI18n("item");
  const t = useI18n();
  const settings = useSettings();
  const { openModal } = useModalAction(WidgetEditModal);
  const { openModal: openMoveModal } = useModalAction(ItemMoveModal);
  const { openConfirmModal } = useConfirmModal();
  const { updateItemOptions, updateItemAdvancedOptions, updateItemIntegrations, duplicateItem, removeItem } =
    useItemActions();
  const { data: integrationData, isPending } = clientApi.integration.all.useQuery();
  const currentDefinition = useMemo(() => widgetImports[item.kind].definition, [item.kind]);
  const { gridstack } = useSectionContext().refs;

  const options = useMemo(
    () => reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options) as Record<string, unknown>,
    [item.kind, settings, item.options],
  );

  type OptionDef = { type: string; skipContextMenu?: boolean };
  const autoToggleActions = useMemo(() => {
    const rawOptions = currentDefinition.createOptions(settings) as unknown as Record<string, OptionDef>;
    return Object.entries(rawOptions)
      .filter(([, def]) => def.type === "switch" && !def.skipContextMenu)
      .map<WidgetContextMenuAction>(([key]) => ({
        key: `toggle-${key}`,
        label: `widget.${item.kind}.option.${key}.label`,
        onClick: () => {
          const currentValue = options[key] as boolean | undefined;
          const newOptions = { [key]: !currentValue };
          updateItemOptions({
            itemId: item.id,
            newOptions: { ...options, ...newOptions },
          });
        },
      }));
  }, [currentDefinition, settings, options, item, updateItemOptions]);

  const widgetContextActions = useMemo(() => {
    const def = currentDefinition as Record<string, unknown>;
    if (typeof def.contextActions !== "function") return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = (def.contextActions as any)({
      options,
      setOptions: (partial: Record<string, unknown>) => {
        updateItemOptions({
          itemId: item.id,
          newOptions: { ...options, ...partial },
        });
      },
      integrationIds: item.integrationIds,
      context: {
        isEditMode,
        boardId: board.id,
        itemId: item.id,
      },
      widgetStateRef,
    });
    return (Array.isArray(actions) ? actions : []) as WidgetContextMenuAction[];
  }, [currentDefinition, options, item, updateItemOptions, isEditMode, widgetStateRef]);

  const openEditModal = useCallback(() => {
    openModal(
      {
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
        },
        integrationData: (integrationData ?? []).filter(
          (integration) =>
            "supportedIntegrations" in currentDefinition &&
            (currentDefinition.supportedIntegrations as string[]).some((kind) => kind === integration.kind),
        ),
        integrationSupport: "supportedIntegrations" in currentDefinition,
        settings,
        appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { title: (translateFn: any) => `${translateFn("item.edit.title")} - ${translateFn(`widget.${item.kind}.name`)}` },
    );
  }, [
    openModal,
    item,
    updateItemOptions,
    updateItemAdvancedOptions,
    updateItemIntegrations,
    integrationData,
    currentDefinition,
    settings,
  ]);

  const openRemoveModal = useCallback(() => {
    openConfirmModal({
      title: tItem("remove.title"),
      children: tItem("remove.message"),
      onConfirm: () => {
        removeItem({ itemId: item.id });
      },
    });
  }, [openConfirmModal, tItem, removeItem, item.id]);

  const allActions = useMemo(() => {
    const actions: WidgetContextMenuAction[] = [];

    if (isEditMode) {
      actions.push({
        key: "edit",
        label: tItem("action.edit"),
        icon: IconPencil,
        onClick: openEditModal,
        disabled: isPending,
      });
      actions.push({
        key: "moveResize",
        label: tItem("action.moveResize"),
        icon: IconLayoutKanban,
        onClick: () => {
          if (!gridstack.current) return;
          openMoveModal({
            item,
            columnCount: gridstack.current.getColumn(),
            gridStack: gridstack.current,
          });
        },
      });
      actions.push({
        key: "duplicate",
        label: tItem("action.duplicate"),
        icon: IconCopy,
        onClick: () => duplicateItem({ itemId: item.id }),
      });
    }

    const widgetActions: WidgetContextMenuAction[] = [...autoToggleActions, ...widgetContextActions];
    actions.push(...widgetActions);

    if (isEditMode) {
      actions.push({
        key: "remove",
        label: tItem("action.remove"),
        icon: IconTrash,
        onClick: openRemoveModal,
        color: "red",
      });
    }

    return actions.filter((a) => !a.hidden);
  }, [
    isEditMode,
    isPending,
    autoToggleActions,
    widgetContextActions,
    openEditModal,
    openRemoveModal,
    tItem,
    gridstack,
    item,
    openMoveModal,
    duplicateItem,
  ]);

  if (!session) return <>{children}</>;

  return (
    <Menu shadow="md" width={200}>
      <Menu.ContextMenu>{children}</Menu.ContextMenu>
      <Menu.Dropdown>
        {allActions.map((action) => {
          const label = String(translateIfNecessary(t, action.label));
          const Icon = action.icon;
          return (
            <Menu.Item
              key={action.key}
              leftSection={Icon ? <Icon size={16} /> : undefined}
              onClick={action.onClick}
              disabled={action.disabled}
              c={action.color}
            >
              {label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
};

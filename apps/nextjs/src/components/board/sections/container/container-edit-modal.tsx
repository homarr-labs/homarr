"use client";

import { useId, useMemo, useState } from "react";
import { Stack, Switch, Tabs, TextInput } from "@mantine/core";
import { IconAdjustments, IconLayersIntersect, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useUpdateBoard } from "@homarr/boards/updater";
import { createId } from "@homarr/common";
import { getWidgetName } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { createModal, ModalFormFooter, useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { ContainerSectionOptions, SmartContainerOptions } from "@homarr/validation/shared";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";
import { WidgetEditFooter, WidgetEditWorkspace } from "@homarr/widgets/edit-workspace";
import { loadWidgetDefinition } from "@homarr/widgets/manifest";

import type { Item } from "~/app/[locale]/boards/_types";
import { getLogicalGridSize } from "~/components/board/layout";
import { ItemSelectModal } from "../../items/item-select-modal";
import { LazyWidgetEditModal } from "../../items/lazy-widget-edit-modal";
import {
  applyContainerEditorDraft,
  createContainerEditorItem,
  getContainerEditorSmartOptions,
} from "./container-editor-draft";
import { ContainerStatePreview, ContainerStateSettings } from "./container-state-editor";
import classes from "./container-editor.module.css";
import { ContainerAppearanceSettings, ContainerRotationSettings } from "./container-option-fields";
import { SmartContainerEditorPreview } from "../smart-container/smart-container-editor-preview";

interface ModalProps {
  containerId: string;
  value: ContainerSectionOptions;
  onSuccessfulEdit?: (value: ContainerSectionOptions) => void;
}

export const ContainerEditModal = createModal<ModalProps>(({ actions, innerProps }) => {
  const t = useI18n("section.container.smart");
  const tSection = useI18n("section");
  const translate = useI18n();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { updateBoard } = useUpdateBoard();
  const settings = useSettings();
  const formId = useId();
  const utils = clientApi.useUtils();
  const [initialSmart] = useState(() =>
    getContainerEditorSmartOptions(innerProps.value, board.items, innerProps.containerId, `${t("state")} 1`),
  );
  const form = useZodForm(containerSectionOptionsSchema.unwrap(), {
    mode: "controlled",
    initialValues: { ...innerProps.value, smart: initialSmart },
  });
  const smart = form.values.smart ?? initialSmart;
  const [selectedStateId, setSelectedStateId] = useState(initialSmart.states[0]?.id ?? "");
  const [newItems, setNewItems] = useState<Item[]>([]);
  const [editedItems, setEditedItems] = useState<Map<string, Item>>(() => new Map());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const { openModal: openItemPicker } = useModalAction(ItemSelectModal);
  const { openModal: openWidgetEditor } = useModalAction(LazyWidgetEditModal);
  const items = useMemo(
    () =>
      [
        ...board.items.map((item) => editedItems.get(item.id) ?? item),
        ...newItems.map((item) => editedItems.get(item.id) ?? item),
      ].filter((item) => !deletedIds.has(item.id)),
    [board.items, newItems, editedItems, deletedIds],
  );
  const setSmart = (value: SmartContainerOptions) => form.setFieldValue("smart", value);
  const setSmartOption = <K extends keyof SmartContainerOptions>(key: K, value: SmartContainerOptions[K]) =>
    setSmart({ ...smart, [key]: value });
  const changeStateItems = (stateId: string, itemIds: string[]) =>
    setSmart({
      ...smart,
      states: smart.states.map((state) => {
        if (state.id !== stateId) return state;
        return { ...state, itemIds };
      }),
    });
  const addState = (offset: number) => {
    const index = Math.max(
      0,
      smart.states.findIndex((state) => state.id === selectedStateId),
    );
    const state = { id: createId(), title: `${t("state")} ${smart.states.length + 1}`, priority: 50, itemIds: [] };
    const states = [...smart.states];
    states.splice(index + offset, 0, state);
    setSmart({ ...smart, states });
    setSelectedStateId(state.id);
  };
  const deleteState = () => {
    if (smart.states.length <= 1) return;
    const index = smart.states.findIndex((state) => state.id === selectedStateId);
    const deleted = smart.states[index];
    if (!deleted) return;
    const states = smart.states.filter((state) => state.id !== selectedStateId);
    const destination = states[Math.min(index, states.length - 1)];
    if (!destination) return;
    setSmart({
      ...smart,
      states: states.map((state) => {
        if (state.id !== destination.id) return state;
        return { ...state, itemIds: [...state.itemIds, ...deleted.itemIds] };
      }),
    });
    setSelectedStateId(destination.id);
  };
  const addItem = (index: number) => {
    const stateId = selectedStateId;
    openItemPicker({
      boardId: board.id,
      initialTargetSectionId: innerProps.containerId,
      onConfiguredItem: (input) => {
        const item = createContainerEditorItem(board, items, input, innerProps.containerId);
        if (!item) return;
        setNewItems((previous) => [...previous, item]);
        form.setFieldValue("smart", (previous) => {
          const options = previous ?? initialSmart;
          return {
            ...options,
            states: options.states.map((state) => {
              if (state.id !== stateId) return state;
              const itemIds = [...state.itemIds];
              itemIds.splice(index, 0, item.id);
              return { ...state, itemIds };
            }),
          };
        });
      },
    });
  };
  const editItem = async (item: Item) => {
    if (loadingItemId) return;
    setLoadingItemId(item.id);
    try {
      const [definition, integrationData] = await Promise.all([
        loadWidgetDefinition(item.kind),
        utils.integration.all.ensureData(),
      ]);
      const layout = item.layouts.find((entry) => entry.layoutId === currentLayoutId) ?? item.layouts[0];
      openWidgetEditor(
        {
          kind: item.kind,
          allowResourceEditing: false,
          definition,
          value: { options: item.options, integrationIds: item.integrationIds, advancedOptions: item.advancedOptions },
          onSuccessfulEdit: (value) =>
            setEditedItems((previous) => new Map(previous).set(item.id, { ...item, ...value })),
          integrationData: integrationData.filter(
            (integration) =>
              integration.permissions.hasUseAccess &&
              (definition.supportedIntegrations ?? []).some((kind) => kind === integration.kind),
          ),
          integrationSupport: "supportedIntegrations" in definition,
          settings,
          boardId: board.id,
          itemId: item.id,
          previewSectionId: innerProps.containerId,
          previewDimensions: {
            width: getLogicalGridSize(layout?.width ?? 2),
            height: getLogicalGridSize(layout?.height ?? 2),
          },
          appId: item.kind === "app" ? (item.options.appId as string | undefined) : undefined,
        },
        { title: (titleT) => `${titleT("item.edit.title")} - ${getWidgetName(item.kind, titleT)}` },
      );
    } catch (error) {
      showErrorNotification({
        title: translate("common.error"),
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingItemId(null);
    }
  };
  const deleteItem = (itemId: string) => {
    setDeletedIds((previous) => new Set(previous).add(itemId));
    setSmart({
      ...smart,
      states: smart.states.map((state) => ({ ...state, itemIds: state.itemIds.filter((id) => id !== itemId) })),
    });
  };
  const moveItem = (itemId: string, direction: number) => {
    const selected = smart.states.find((state) => state.id === selectedStateId);
    if (!selected) return;
    const index = selected.itemIds.indexOf(itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selected.itemIds.length) return;
    const itemIds = [...selected.itemIds];
    itemIds.splice(index, 1);
    itemIds.splice(nextIndex, 0, itemId);
    changeStateItems(selected.id, itemIds);
  };
  const moveItemToState = (itemId: string, stateId: string) =>
    setSmart({
      ...smart,
      states: smart.states.map((state) => {
        const itemIds = state.itemIds.filter((id) => id !== itemId);
        if (state.id === stateId) itemIds.push(itemId);
        return { ...state, itemIds };
      }),
    });
  const submit = form.onSubmit((values) => {
    const addedItems = newItems.map((item) => editedItems.get(item.id) ?? item);
    updateBoard((previous) =>
      applyContainerEditorDraft(previous, innerProps.containerId, values, addedItems, editedItems, deletedIds),
    );
    innerProps.onSuccessfulEdit?.(values);
    actions.closeModal();
  });
  const previewBoard = {
    ...board,
    items,
    sections: board.sections.map((section) => {
      if (section.id !== innerProps.containerId || section.kind !== "container") return section;
      return { ...section, options: form.values };
    }),
  };
  return (
    <Tabs defaultValue="widgets" keepMountedMode="display-none" className={classes.editor}>
      <Tabs.List grow className={classes.mobileTabs} mb="sm">
        <Tabs.Tab value="widgets" className={classes.tab}>
          {t("editorContent")}
        </Tabs.Tab>
        <Tabs.Tab value="settings" className={classes.tab}>
          {t("editorSettings")}
        </Tabs.Tab>
      </Tabs.List>
      <WidgetEditWorkspace
        preview={
          <Tabs.Panel value="widgets" className={classes.editorPanel}>
            <ContainerStatePreview
              smart={smart}
              selectedStateId={selectedStateId}
              items={items}
              title={form.values.title}
              loadingItemId={loadingItemId}
              preview={
                <SmartContainerEditorPreview
                  board={previewBoard}
                  containerId={innerProps.containerId}
                  selectedStateId={selectedStateId}
                  onSelectState={setSelectedStateId}
                  layoutId={currentLayoutId}
                />
              }
              onSelectState={setSelectedStateId}
              onAddItem={addItem}
              onEditItem={(item) => void editItem(item)}
              onDeleteItem={deleteItem}
              onMoveItem={moveItem}
              onMoveItemToState={moveItemToState}
            />
          </Tabs.Panel>
        }
      >
        <Tabs.Panel value="settings" className={classes.editorPanel}>
          <form id={formId} className={classes.settings} onSubmit={submit}>
            <Stack gap="md">
              <TextInput
                label={tSection("container.option.title.label")}
                data-autofocus
                {...form.getInputProps("title")}
              />
              <Switch
                label={t("enabled")}
                description={t("enabledDescription")}
                checked={smart.enabled}
                onChange={(event) => setSmartOption("enabled", event.currentTarget.checked)}
              />
              <Tabs defaultValue="states" keepMounted>
                <Tabs.List grow className={classes.tabsList}>
                  <Tabs.Tab className={classes.tab} value="states" leftSection={<IconLayersIntersect size={16} />}>
                    {t("states")}
                  </Tabs.Tab>
                  <Tabs.Tab className={classes.tab} value="rotation" leftSection={<IconPlayerPlay size={16} />}>
                    {t("rotation")}
                  </Tabs.Tab>
                  <Tabs.Tab className={classes.tab} value="appearance" leftSection={<IconAdjustments size={16} />}>
                    {t("appearance")}
                  </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="states" pt="md">
                  <ContainerStateSettings
                    smart={smart}
                    selectedStateId={selectedStateId}
                    onSelectState={setSelectedStateId}
                    onChange={setSmart}
                    onAddState={addState}
                    onDeleteState={deleteState}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="rotation" pt="md">
                  <ContainerRotationSettings smart={smart} setSmartOption={setSmartOption} />
                </Tabs.Panel>
                <Tabs.Panel value="appearance" pt="md">
                  <ContainerAppearanceSettings form={form} smart={smart} setSmartOption={setSmartOption} />
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </form>
        </Tabs.Panel>
      </WidgetEditWorkspace>
      <WidgetEditFooter>
        <ModalFormFooter onCancel={actions.closeModal} form={formId} />
      </WidgetEditFooter>
    </Tabs>
  );
}).withOptions({
  defaultTitle: (t) => t("section.container.smart.edit"),
  size: "100rem",
  keepMounted: true,
  closeOnClickOutside: false,
});

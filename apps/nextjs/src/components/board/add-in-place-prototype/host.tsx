"use client";

import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { Drawer } from "@mantine/core";

import { useCurrentLayout } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { createId } from "@homarr/common";
import { getWidgetName } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { useIsMobile } from "@homarr/ui/hooks";

import { useItemActions } from "~/components/board/items/item-actions";
import { useAreaAnchorRect } from "./anchor";
import { AreaSizeInputs } from "./area-size-inputs";
import { BoundEditorForm, editorFormId } from "./bound-editor-form";
import { useAddInPlaceCatalog } from "./catalog";
import { CreateAppForm } from "./create-app";
import { DimLayer } from "./dim-layer";
import { useAreaKeyboard } from "./keyboard";
import { PrototypeSwitcher } from "./prototype-switcher";
import { useTargetResources } from "./resources";
import { addInPlaceActions, getTargetKind, setCommitBridge, useAddInPlaceSession, useAddInPlaceStep } from "./store";
import * as variantA from "./variants/a";
import * as variantB from "./variants/b";
import * as variantC from "./variants/c";
import type { AddInPlacePanelProps, AddInPlaceVariant } from "./variants/contract";

export const variants: Record<string, AddInPlaceVariant> = {
  A: variantA,
  B: variantB,
  C: variantC,
};

const useBoundCatalog = (search: string) => {
  const session = useAddInPlaceSession();
  return useAddInPlaceCatalog(search, session?.baseArea ?? { w: 1, h: 1 });
};

const panelProps = { "data-add-in-place-inside": "" } as const;

export const AddInPlaceHost = () => {
  const t = useI18n();
  const step = useAddInPlaceStep();
  const session = useAddInPlaceSession();
  const [isEditMode] = useEditMode();
  const layoutId = useCurrentLayout();
  const { createItem } = useItemActions();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const anchorRect = useAreaAnchorRect();
  const onKeyDown = useAreaKeyboard();
  const wasEditMode = useRef(isEditMode);
  const variantKey = (searchParams.get("variant") ?? "A").toUpperCase();
  const variant = variants[variantKey] ?? variantA;

  useEffect(() => {
    setCommitBridge({
      create: (current, draft, size) => {
        if (!current.picked) return;
        const kind = getTargetKind(current.picked);
        const id = createId();
        const updated = createItem({
          id,
          kind,
          options: draft.options,
          integrationIds: draft.integrationIds,
          targetSectionId: current.sectionId,
          advancedOptions: draft.advancedOptions,
          size,
          position: { layoutId, x: current.area.x, y: current.area.y },
        });
        if (!updated?.items.some((item) => item.id === id)) {
          showErrorNotification({
            title: t("item.create.notification.error.title"),
            message: t("item.create.notification.error.message"),
          });
          return;
        }
        showSuccessNotification({
          title: t("item.create.notification.success.title"),
          message: t("item.create.notification.success.message", { name: getWidgetName(kind, t) }),
        });
      },
    });
    return () => setCommitBridge(null);
  }, [createItem, layoutId, t]);

  useEffect(() => {
    if (wasEditMode.current && !isEditMode) addInPlaceActions.cancel();
    wasEditMode.current = isEditMode;
  }, [isEditMode]);

  if (!isEditMode || step === "idle" || !session)
    return <PrototypeSwitcher variants={variants} activeKey={variantKey} />;

  const Panel = variant.Panel as ComponentType<AddInPlacePanelProps>;
  const presentation = isMobile ? "sheet" : "floating";
  const panel = (
    <Panel
      step={step}
      session={session}
      anchorRect={anchorRect}
      presentation={presentation}
      useCatalog={useBoundCatalog}
      useTargetResources={useTargetResources}
      actions={addInPlaceActions}
      BoundEditorForm={BoundEditorForm}
      editorFormId={editorFormId}
      AreaSizeInputs={AreaSizeInputs}
      CreateAppForm={CreateAppForm}
      onKeyDown={onKeyDown}
      panelProps={panelProps}
    />
  );

  return (
    <>
      <DimLayer anchorRect={anchorRect} />
      {isMobile ? (
        <Drawer
          opened
          position="bottom"
          size="auto"
          withOverlay={false}
          lockScroll={false}
          trapFocus={false}
          closeOnClickOutside={false}
          withCloseButton={false}
          zIndex={251}
          onClose={() => addInPlaceActions.cancel()}
          styles={{ body: { padding: 0 } }}
        >
          {panel}
        </Drawer>
      ) : (
        panel
      )}
      <PrototypeSwitcher variants={variants} activeKey={variantKey} />
    </>
  );
};

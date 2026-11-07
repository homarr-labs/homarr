"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { Drawer, Portal } from "@mantine/core";

import { useCurrentLayout } from "@homarr/boards/context";
import { useSession } from "@homarr/auth/client";
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
import { handleAreaShortcut, useAreaKeyboard } from "./keyboard";
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
  const { data: authSession } = useSession();
  const canCreateApp = authSession?.user.permissions.includes("app-create") ?? false;
  const actions = useMemo(
    () => ({
      ...addInPlaceActions,
      openCreateApp: (name?: string) => {
        if (canCreateApp) addInPlaceActions.openCreateApp(name);
      },
    }),
    [canCreateApp],
  );
  const layoutId = useCurrentLayout();
  const { createItem } = useItemActions();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const anchorRect = useAreaAnchorRect();
  const onKeyDown = useAreaKeyboard();
  const wasEditMode = useRef(isEditMode);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const returnLocationRef = useRef<{ sectionId: string; x: number; y: number; itemId?: string } | null>(null);
  const active = isEditMode && step !== "idle";
  const variantKey = (searchParams.get("variant") ?? "A").toUpperCase();
  const variant = variants[variantKey] ?? variantA;

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleAreaShortcut, true);
    return () => window.removeEventListener("keydown", handleAreaShortcut, true);
  }, [active]);

  useLayoutEffect(() => {
    if (active) {
      if (returnFocusRef.current) return;
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const menuTriggerId = focused?.closest('[role="menu"]')?.getAttribute("aria-labelledby");
      returnFocusRef.current = (menuTriggerId && document.getElementById(menuTriggerId)) || focused;
      if (session)
        returnLocationRef.current = {
          sectionId: session.sectionId,
          x: session.area.x,
          y: session.area.y,
          itemId: session.editItemId,
        };
      return;
    }
    const target = returnFocusRef.current;
    const location = returnLocationRef.current;
    if (!target) return;
    returnFocusRef.current = null;
    returnLocationRef.current = null;
    requestAnimationFrame(() => {
      if (
        target.isConnected &&
        target !== document.body &&
        !target.matches('[data-testid="board-edit-mode-toggle"]') &&
        target.getAttribute("aria-label") !== t("board.setting.section.layout.edit.save")
      )
        target.focus({ preventScroll: true });
      else {
        const section = location && document.querySelector(`[data-section-id="${CSS.escape(location.sectionId)}"]`);
        const entry =
          location?.itemId &&
          document.querySelector<HTMLElement>(`[data-grid-item-id="${CSS.escape(location.itemId)}"]`);
        const cell =
          location &&
          section?.querySelector<HTMLElement>(
            `button[aria-label="Add widget at column ${location.x + 1}, row ${location.y + 1}"]`,
          );
        const placed =
          location &&
          section?.querySelector<HTMLElement>(
            `[data-grid-item-id][data-grid-x="${location.x}"][data-grid-y="${location.y}"]`,
          );
        const fallback =
          entry ||
          cell ||
          placed ||
          Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              `button[aria-label="${CSS.escape(t("board.action.addContent"))}"]`,
            ),
          ).find((element) => element.getClientRects().length > 0);
        fallback?.focus({ preventScroll: true });
      }
    });
  }, [active, session, t]);

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

  useEffect(() => {
    if (step === "createApp" && !canCreateApp) addInPlaceActions.back();
  }, [canCreateApp, step]);

  if (!isEditMode || step === "idle" || !session)
    return <PrototypeSwitcher variants={variants} activeKey={variantKey} />;

  const Panel = variant.Panel as ComponentType<AddInPlacePanelProps>;
  const presentation = isMobile ? "sheet" : "floating";
  const panel = (
    <Panel
      step={step === "createApp" && !canCreateApp ? "pick" : step}
      session={session}
      anchorRect={anchorRect}
      presentation={presentation}
      useCatalog={useBoundCatalog}
      useTargetResources={useTargetResources}
      actions={actions}
      BoundEditorForm={BoundEditorForm}
      editorFormId={editorFormId}
      AreaSizeInputs={AreaSizeInputs}
      CreateAppForm={CreateAppForm}
      canCreateApp={canCreateApp}
      onKeyDown={onKeyDown}
      panelProps={panelProps}
    />
  );

  return (
    <Portal>
      <DimLayer anchorRect={anchorRect} zIndex={variant === variantA ? 1099 : 250} />
      {isMobile && variant !== variantA ? (
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
    </Portal>
  );
};

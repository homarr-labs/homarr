"use client";

import type { ComponentPropsWithoutRef, KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DataAttributes } from "@mantine/core";
import { Center, Fieldset, Loader, MantineThemeProvider, Portal, SegmentedControl, Text } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useBoardDraftChanges } from "@homarr/boards/draft-changes";
import { useConfirmModal } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { EmbeddedAppEditFormHandle, WidgetEditorFormProps } from "@homarr/widgets/modals";
import { EmbeddedAppEditForm, WidgetEditorForm } from "@homarr/widgets/modals";

import { getTargetKey, useTargetResources } from "./resources";
import { addInPlaceActions, getAddInPlaceState, useAddInPlaceSession } from "./store";
import type { PickTarget } from "./types";
import type { InPlaceEditorFormProps } from "./panel/types";

export const editorFormId = "add-in-place-editor-form";

const submitOnModEnter = (event: KeyboardEvent) => {
  if (
    event.key !== "Enter" ||
    !(event.ctrlKey || event.metaKey) ||
    event.defaultPrevented ||
    event.nativeEvent.isComposing
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  document.querySelector<HTMLFormElement>(`#${editorFormId}`)?.requestSubmit();
};

interface AppEditorFormProps extends WidgetEditorFormProps, InPlaceEditorFormProps {
  appId?: string;
  target: PickTarget;
}

const getSelectedAppId = (draft: WidgetEditorFormProps["value"] | undefined) => {
  if (typeof draft?.options.appId === "string") return draft.options.appId;
  return undefined;
};

interface AppEditPaneProps {
  appId: string;
  active: boolean;
  hidden: boolean;
  onHandleChange: (appId: string, handle: EmbeddedAppEditFormHandle | null) => void;
}

const AppEditPane = ({ appId, active, hidden, onHandleChange }: AppEditPaneProps) => {
  const portalTargetId = `app-edit-pane-portals-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;
  const handleRef = useCallback(
    (handle: EmbeddedAppEditFormHandle | null) => onHandleChange(appId, handle),
    [appId, onHandleChange],
  );

  return (
    <MantineThemeProvider
      theme={{ components: { Portal: Portal.extend({ defaultProps: { target: `#${portalTargetId}` } }) } }}
    >
      <div hidden={hidden} inert={hidden}>
        <EmbeddedAppEditForm appId={appId} active={active} handleRef={handleRef} />
        <div id={portalTargetId} />
      </div>
    </MantineThemeProvider>
  );
};

const AppEditorForm = ({ appId, target, headerControlTarget, ...widgetFormProps }: AppEditorFormProps) => {
  const tItem = useI18n("item.edit");
  const [activeView, setActiveView] = useState<"widget" | "app">("widget");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { openConfirmModal } = useConfirmModal();
  const portalTargetId = `app-editor-portals-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;
  const appEditHandles = useRef(new Map<string, EmbeddedAppEditFormHandle>());
  const submittingRef = useRef(false);
  const discardConfirmationRef = useRef<((confirmed: boolean) => void) | null>(null);
  useEffect(() => () => discardConfirmationRef.current?.(false), []);
  useBoardDraftChanges(widgetFormProps.boardId, () =>
    Array.from(appEditHandles.current.values()).some((handle) => handle.isDirty()),
  );
  const onAppHandleChange = useCallback((id: string, handle: EmbeddedAppEditFormHandle | null) => {
    if (handle) {
      appEditHandles.current.set(id, handle);
      return;
    }
    appEditHandles.current.delete(id);
  }, []);
  const appIdsToRender = Array.from(appEditHandles.current.values())
    .filter((handle) => handle.isDirty())
    .map((handle) => handle.appId);
  if (appId && !appIdsToRender.includes(appId)) appIdsToRender.push(appId);

  const handleSubmit: WidgetEditorFormProps["onSubmit"] = async (draft) => {
    if (submittingRef.current) return;
    const currentSession = getAddInPlaceState().session;
    if (currentSession?.picked !== target) return;
    const submittedAppId = getSelectedAppId(draft);
    const appEditHandle = appEditHandles.current.get(submittedAppId ?? "");
    if (
      submittedAppId &&
      (submittedAppId !== appId ||
        appEditHandle?.appId !== submittedAppId ||
        (currentSession.draft && getSelectedAppId(currentSession.draft) !== submittedAppId))
    ) {
      // The widget's change effect may not have reached the bound App form yet.
      widgetFormProps.onChange?.(draft);
      setActiveView("app");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    const isCurrentSubmission = () => {
      const latestSession = getAddInPlaceState().session;
      return (
        latestSession?.picked === target &&
        getSelectedAppId(latestSession.draft) === submittedAppId &&
        appEditHandles.current.get(submittedAppId ?? "") === appEditHandle
      );
    };
    try {
      const hasOtherAppDrafts = Array.from(appEditHandles.current.values()).some(
        (handle) => handle.appId !== submittedAppId && handle.isDirty(),
      );
      if (hasOtherAppDrafts) {
        const confirmed = await new Promise<boolean>((resolve) => {
          discardConfirmationRef.current = resolve;
          openConfirmModal(
            {
              title: tItem("app.confirmDiscard.title"),
              children: tItem("app.confirmDiscard.message"),
              labels: { confirm: tItem("app.confirmDiscard.confirm") },
              cancelProps: { "data-autofocus": true } as ComponentPropsWithoutRef<"button"> & DataAttributes,
              confirmProps: { "data-autofocus": undefined } as ComponentPropsWithoutRef<"button"> & DataAttributes,
              onConfirm: () => resolve(true),
            },
            { onClose: () => resolve(false) },
          );
        });
        discardConfirmationRef.current = null;
        if (!confirmed || !isCurrentSubmission()) return;
      }
      if (!appEditHandle) {
        widgetFormProps.onSubmit(draft);
        return;
      }
      const appSaved = await appEditHandle.submitIfDirty();
      // A save may finish after this editor was closed or another item was selected.
      if (!isCurrentSubmission()) return;
      if (!appSaved) {
        setActiveView("app");
        return;
      }
      widgetFormProps.onSubmit(draft);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {headerControlTarget &&
        createPortal(
          <SegmentedControl<"widget" | "app">
            size="xs"
            value={activeView}
            onChange={setActiveView}
            disabled={isSubmitting}
            aria-label={tItem("settings.label")}
            data={[
              { value: "widget", label: tItem("tab.widget") },
              { value: "app", label: tItem("tab.app"), disabled: !appId },
            ]}
          />,
          headerControlTarget,
        )}
      <MantineThemeProvider
        theme={{ components: { Portal: Portal.extend({ defaultProps: { target: `#${portalTargetId}` } }) } }}
      >
        <Fieldset variant="unstyled" disabled={isSubmitting} inert={isSubmitting} aria-label={tItem("settings.label")}>
          <div hidden={activeView !== "widget"}>
            <WidgetEditorForm
              {...widgetFormProps}
              onSubmit={handleSubmit}
              onValidationError={() => setActiveView("widget")}
            />
          </div>
          {appIdsToRender.map((id) => (
            <AppEditPane
              key={id}
              appId={id}
              active={id === appId}
              hidden={activeView !== "app" || id !== appId}
              onHandleChange={onAppHandleChange}
            />
          ))}
          <div id={portalTargetId} />
        </Fieldset>
      </MantineThemeProvider>
    </>
  );
};

export const BoundEditorForm = ({ headerControlTarget }: InPlaceEditorFormProps) => {
  const board = useRequiredBoard();
  const t = useI18n("item.inPlace");
  const session = useAddInPlaceSession();
  const { data: authSession } = useSession();
  const settings = useSettings();
  const resources = useTargetResources(session?.picked);
  const pendingSubmitRef = useRef(false);

  useEffect(() => {
    if (resources.status !== "ready" || !pendingSubmitRef.current) return;
    pendingSubmitRef.current = false;
    document.getElementById(editorFormId)?.closest("form")?.requestSubmit();
  }, [resources.status]);

  if (!session?.picked) return null;
  if (resources.status === "error") {
    return (
      <Text size="sm" c="red">
        {t("widgetLoadError")}
      </Text>
    );
  }
  if (resources.status !== "ready" || !resources.definition || !resources.kind || !resources.baseValue) {
    return (
      <form
        id={editorFormId}
        onSubmit={(event) => {
          event.preventDefault();
          pendingSubmitRef.current = true;
        }}
      >
        <Center py="md">
          <Loader size="sm" />
        </Center>
      </form>
    );
  }

  const widgetFormProps: WidgetEditorFormProps = {
    kind: resources.kind,
    definition: resources.definition,
    value: resources.baseValue,
    integrationData: resources.integrationData,
    integrationSupport: resources.integrationSupport,
    settings,
    itemId: session.editItemId,
    boardId: board.id,
    formId: editorFormId,
    showSettingsHeading: false,
    canConfigureWidget: resources.kind !== "customApi" || (authSession?.user.permissions.includes("admin") ?? false),
    onChange: addInPlaceActions.setDraft,
    onSubmit: (draft) => addInPlaceActions.commit(draft),
  };
  const targetKey = getTargetKey(session.picked, session.editItemId);
  let form = <WidgetEditorForm key={targetKey} {...widgetFormProps} />;
  if (resources.kind === "app" && resources.appId && authSession?.user.permissions.includes("app-modify-all")) {
    let selectedAppId = resources.appId;
    if (session.draft) selectedAppId = getSelectedAppId(session.draft) ?? "";
    form = (
      <AppEditorForm
        key={targetKey}
        {...widgetFormProps}
        appId={selectedAppId}
        target={session.picked}
        headerControlTarget={headerControlTarget}
      />
    );
  }

  return (
    <div role="presentation" onKeyDown={submitOnModEnter}>
      {form}
    </div>
  );
};

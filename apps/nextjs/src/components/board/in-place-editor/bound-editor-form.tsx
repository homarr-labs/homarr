"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Center, Fieldset, Loader, MantineThemeProvider, Portal, SegmentedControl, Text } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useBoardDraftChanges } from "@homarr/boards/draft-changes";
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

const AppEditorForm = ({ appId, target, headerControlTarget, ...widgetFormProps }: AppEditorFormProps) => {
  const tItem = useI18n("item.edit");
  const [activeView, setActiveView] = useState<"widget" | "app">("widget");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const portalTargetId = `app-editor-portals-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;
  const appEditRef = useRef<EmbeddedAppEditFormHandle>(null);
  const submittingRef = useRef(false);
  useBoardDraftChanges(widgetFormProps.boardId, () => appEditRef.current?.isDirty() ?? false);

  const handleSubmit: WidgetEditorFormProps["onSubmit"] = async (draft) => {
    if (submittingRef.current) return;
    const currentSession = getAddInPlaceState().session;
    if (currentSession?.picked !== target) return;
    const submittedAppId = getSelectedAppId(draft);
    if (!submittedAppId) {
      widgetFormProps.onSubmit(draft);
      return;
    }
    const appEditHandle = appEditRef.current;
    if (
      submittedAppId !== appId ||
      appEditHandle?.appId !== submittedAppId ||
      (currentSession.draft && getSelectedAppId(currentSession.draft) !== submittedAppId)
    ) {
      // The widget's change effect may not have reached the bound App form yet.
      widgetFormProps.onChange?.(draft);
      setActiveView("app");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const appSaved = await appEditHandle.submitIfDirty();
      // A save may finish after this editor was closed or another item was selected.
      const latestSession = getAddInPlaceState().session;
      if (latestSession?.picked !== target || getSelectedAppId(latestSession.draft) !== submittedAppId) return;
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
          <div hidden={activeView !== "app"}>
            {appId && <EmbeddedAppEditForm key={appId} appId={appId} handleRef={appEditRef} />}
          </div>
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

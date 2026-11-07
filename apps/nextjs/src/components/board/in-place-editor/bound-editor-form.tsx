"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { Center, Loader, Text } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import { useSettings } from "@homarr/settings";
import { WidgetEditorForm } from "@homarr/widgets/modals";

import { getTargetKey, useTargetResources } from "./resources";
import { addInPlaceActions, useAddInPlaceSession } from "./store";

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

export const BoundEditorForm = () => {
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
        Could not load this widget.
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

  return (
    <div role="presentation" onKeyDown={submitOnModEnter}>
      <WidgetEditorForm
        key={getTargetKey(session.picked, session.editItemId)}
        kind={resources.kind}
        definition={resources.definition}
        value={resources.baseValue}
        integrationData={resources.integrationData}
        integrationSupport={resources.integrationSupport}
        settings={settings}
        itemId={session.editItemId}
        formId={editorFormId}
        showSettingsHeading={false}
        canConfigureWidget={
          resources.kind !== "customApi" || (authSession?.user.permissions.includes("admin") ?? false)
        }
        onChange={addInPlaceActions.setDraft}
        onSubmit={(draft) => addInPlaceActions.commit(draft)}
      />
    </div>
  );
};

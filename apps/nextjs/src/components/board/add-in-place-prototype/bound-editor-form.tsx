"use client";

import type { KeyboardEvent } from "react";
import { Center, Loader, Text } from "@mantine/core";

import { useSettings } from "@homarr/settings";
import { WidgetEditorForm } from "@homarr/widgets/modals";

import { getTargetKey, useTargetResources } from "./resources";
import { addInPlaceActions, useAddInPlaceSession } from "./store";

export const editorFormId = "add-in-place-editor-form";

const submitOnModEnter = (event: KeyboardEvent) => {
  if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  document.querySelector<HTMLFormElement>(`#${editorFormId}`)?.requestSubmit();
};

export const BoundEditorForm = () => {
  const session = useAddInPlaceSession();
  const settings = useSettings();
  const resources = useTargetResources(session?.picked);

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
      <Center py="md">
        <Loader size="sm" />
      </Center>
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
        onChange={addInPlaceActions.setDraft}
        onSubmit={(draft) => addInPlaceActions.commit(draft)}
      />
    </div>
  );
};

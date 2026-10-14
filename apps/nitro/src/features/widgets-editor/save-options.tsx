import { useRef, useState } from "react";
import { Alert, Button, Stack } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import type { EditorInputs, EditorTranslate, WidgetEditorClient, WidgetEditorQueryUtils } from "./contracts";

export function SaveWidgetOptions(props: {
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  input: EditorInputs["widget"]["options"]["saveItemOptions"];
  canModifyBoard: boolean;
  saveAvailable?: boolean;
  valid: boolean;
  t: EditorTranslate;
  onSaved(): void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  const queryClient = useQueryClient();
  const queries = props.queryUtils;
  const save = async () => {
    if (lock.current || !props.canModifyBoard || !props.valid || !props.saveAvailable) return;
    lock.current = true;
    setPending(true);
    setError(false);
    try {
      await props.client.widget.options.saveItemOptions(props.input);
      props.onSaved();
      void queryClient.invalidateQueries({ queryKey: queries.widget.key() });
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <Stack gap="xs">
      {!props.saveAvailable && <Alert color="yellow">{props.t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
      {error && (
        <Alert color="red" role="alert">
          {props.t("common.notification.update.error")}
        </Alert>
      )}
      <Button
        loading={pending}
        disabled={!props.canModifyBoard || !props.valid || !props.saveAvailable}
        onClick={() => void save()}
      >
        {props.t("common.action.saveChanges")}
      </Button>
    </Stack>
  );
}

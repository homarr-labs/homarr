import { useRef, useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";

import type { BoardDraft, BoardEditorClient, EditorTranslate, WidgetEditorDomain } from "./contracts";

export function BoardDraftApply(props: {
  draft: BoardDraft;
  writer?: Pick<BoardEditorClient, "saveBoard">;
  canModifyBoard: boolean;
  dirty: boolean;
  domain: WidgetEditorDomain;
  t: EditorTranslate;
  onCommitted(snapshot: BoardDraft): void;
  onDiscard(): void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const apply = async () => {
    if (lock.current || !props.canModifyBoard || !props.dirty) return;
    if (!props.writer) {
      setError(props.t("nitro.widgetEditor.boardWriterUnavailable"));
      return;
    }
    const parsed = props.domain.boardSaveSchema.safeParse(props.draft);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
      return;
    }
    const snapshot = structuredClone(parsed.data);
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await props.writer.saveBoard(snapshot);
      props.onCommitted(snapshot);
    } catch {
      setError(props.t("nitro.widgetEditor.boardApplyFailedNoRetry"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  if (!props.dirty) return null;
  return (
    <>
      <Stack gap="sm">
        {!props.writer && <Alert color="yellow">{props.t("nitro.widgetEditor.boardWriterUnavailable")}</Alert>}
        {error && (
          <Alert color="red" role="alert" style={{ whiteSpace: "pre-wrap" }}>
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" disabled={pending} onClick={() => setDiscard(true)}>
            {props.t("common.action.discard")}
          </Button>
          <Button loading={pending} disabled={!props.canModifyBoard || !props.writer} onClick={() => void apply()}>
            {props.t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
      <Modal opened={discard} onClose={() => setDiscard(false)} title={props.t("nitro.widgetEditor.discardTitle")}>
        <Stack>
          <Text>{props.t("nitro.widgetEditor.discardDescription")}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDiscard(false)}>
              {props.t("common.action.cancel")}
            </Button>
            <Button
              color="red"
              onClick={() => {
                props.onDiscard();
                setDiscard(false);
              }}
            >
              {props.t("common.action.discard")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

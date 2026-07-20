import type { EditorView } from "@codemirror/view";
import { Alert, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { EditorDiagnostic } from "./analyzer";
import type { CustomWidgetEditorMessages } from "./code-editor-types";
import classes from "./code-editor.module.css";

export function EditorDiagnostics({
  diagnostics,
  editorView,
  messages,
}: {
  diagnostics: EditorDiagnostic[];
  editorView: EditorView | null;
  messages: CustomWidgetEditorMessages;
}) {
  if (diagnostics.length === 0) return null;
  return (
    <Stack component="ul" gap={6} mt="xs" pl={0} style={{ listStyle: "none" }} aria-label={messages.diagnosticsTitle}>
      {diagnostics.map((diagnostic, index) => (
        <li key={`${diagnostic.code}-${diagnostic.line ?? 0}-${index}`}>
          <UnstyledButton
            type="button"
            w="100%"
            className={classes.diagnosticButton}
            onClick={() => {
              if (!editorView || diagnostic.index === undefined) return;
              const anchor = Math.min(diagnostic.index, editorView.state.doc.length);
              editorView.dispatch({ selection: { anchor }, scrollIntoView: true });
              editorView.focus();
            }}
          >
            <Alert
              color={diagnostic.severity === "error" ? "red" : "yellow"}
              variant="light"
              p="xs"
              icon={<IconAlertTriangle size={15} />}
            >
              <Text size="xs">{messages.diagnostic(diagnostic)}</Text>
            </Alert>
          </UnstyledButton>
        </li>
      ))}
    </Stack>
  );
}

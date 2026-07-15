import type { EditorView } from "@codemirror/view";
import { Alert, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { EditorDiagnostic } from "@homarr/custom-widgets/workbench";

import classes from "./_code-editor.module.css";

interface CodeEditorDiagnosticsProps {
  diagnostics: EditorDiagnostic[];
  editorView: EditorView | null;
  title: string;
  formatDiagnostic: (diagnostic: EditorDiagnostic) => string;
}

export function CodeEditorDiagnostics({
  diagnostics,
  editorView,
  title,
  formatDiagnostic,
}: CodeEditorDiagnosticsProps) {
  if (diagnostics.length === 0) return null;
  return (
    <Stack component="ul" gap={6} mt="xs" pl={0} style={{ listStyle: "none" }} aria-label={title}>
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
              <Text size="xs">{formatDiagnostic(diagnostic)}</Text>
            </Alert>
          </UnstyledButton>
        </li>
      ))}
    </Stack>
  );
}

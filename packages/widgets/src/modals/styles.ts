import type { ModalProps } from "@mantine/core";

// Lazy modal definitions share this layout without loading the editor runtime.
export const widgetEditorModalStyles = {
  content: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    padding: 0,
  },
} satisfies ModalProps["styles"];

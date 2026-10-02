export type ModalPresentation = "default" | "inspector";

interface InspectorClassNames {
  inner: string;
  content: string;
}

export const getModalPresentationClassNames = (
  presentation: ModalPresentation | undefined,
  inspectorClassNames: InspectorClassNames,
) => {
  if (presentation !== "inspector") return undefined;

  return {
    inner: inspectorClassNames.inner,
    content: inspectorClassNames.content,
  };
};

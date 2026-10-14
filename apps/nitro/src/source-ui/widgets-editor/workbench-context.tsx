import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { EditorIntegration, EditorTranslate, WidgetEditorBindings } from "../../features/widgets-editor/contracts";

export interface CustomWidgetWorkbenchBindings {
  t: EditorTranslate;
  CodeEditor: NonNullable<WidgetEditorBindings["CodeEditor"]>;
  integrations: readonly EditorIntegration[];
  integrationsPending?: boolean;
  integrationsError?: string;
  clearSecret?: (sourceId: string, kind: "apiKey" | "username" | "password") => Promise<void>;
  clearSecretPending?: boolean;
  disabled?: boolean;
}

const WorkbenchContext = createContext<CustomWidgetWorkbenchBindings | null>(null);

export function CustomWidgetWorkbenchProvider(props: CustomWidgetWorkbenchBindings & { children: ReactNode }) {
  return <WorkbenchContext.Provider value={props}>{props.children}</WorkbenchContext.Provider>;
}

export function useWorkbenchBindings() {
  const bindings = useContext(WorkbenchContext);
  if (!bindings) throw new Error("Custom widget workbench provider is missing");
  return bindings;
}

export function useI18n(namespace: string): EditorTranslate {
  const { t } = useWorkbenchBindings();
  return (key, values) => t(`${namespace}.${key}`, values);
}

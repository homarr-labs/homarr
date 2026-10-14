import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";

export type CustomWidgetSectionId = "general" | "sources" | "requests" | "options" | "jsx" | "preview";

export interface EditorSectionProps {
  id: string;
  title: string;
  icon: Icon;
  children: ReactNode;
}

export interface SaveActionsProps {
  dirty: boolean;
  savePending: boolean;
  previewPending: boolean;
  invalid: boolean;
  mode: "create" | "edit";
  onPreview(): void;
  copy: {
    status: { invalid: string; unsaved: string; ready: string };
    action: { previewLoading: string; preview: string; create: string; save: string };
  };
}

export interface CustomWidgetSectionNavigationProps {
  invalidSections: ReadonlySet<CustomWidgetSectionId>;
  onSelect(section: CustomWidgetSectionId): void;
  copy: {
    sectionNavigation: string;
    invalid: string;
    sections: Record<CustomWidgetSectionId, string>;
  };
}

export type PreviewOutcome = "idle" | "loading" | "success" | "error";

export interface PreviewResultProps {
  outcome: PreviewOutcome;
  title: string;
  description: string;
}

export interface PreviewStatusDotProps {
  outcome: PreviewOutcome;
  label: string;
}

export interface CustomWidgetPreviewSizeControlProps {
  value: string;
  onChange(value: string): void;
  copy: { compact: string; standard: string; wide: string };
}

export interface CustomWidgetSaveIssueView {
  path: string;
  message: string;
}

export interface CustomWidgetSaveIssuesAlertProps {
  issues: readonly CustomWidgetSaveIssueView[];
  copy: { title: string; description: string; errors: string; copied: string; copy: string };
}

export interface LazyOnceAccordionProps {
  label: ReactNode;
  children: ReactNode;
}

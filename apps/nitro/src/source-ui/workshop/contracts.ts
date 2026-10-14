import type { ComponentType, ReactNode } from "react";

import type { CustomWidgetCodeEditorProps } from "../../../../../packages/custom-widgets/src/workbench/code-editor-types";
import type { WorkshopSubmissionDetail, WorkshopSubmissionSummary } from "../../../../../packages/workshop/src/schema";

export type { WorkshopSubmissionDetail, WorkshopSubmissionSummary };

export type WorkshopCardItem = Pick<
  WorkshopSubmissionSummary,
  "id" | "title" | "type" | "description" | "authorName" | "outdated" | "reportCount" | "score"
> & {
  screenshots?: string[];
};

export interface WorkshopLightboxProps {
  opened: boolean;
  onClose(): void;
  slides: { src: string; thumbSrc: string; alt: string; caption: string }[];
  currentIndex: number;
  onIndexChange(index: number): void;
  withNavigation: boolean;
  withThumbnails: boolean;
  withZoom: boolean;
  withKeyboardEvents: boolean;
  returnFocus: boolean;
  loop: boolean;
  labels: {
    lightboxLabel: string;
    slideLabel(index: number): string;
    slidesLabel: string;
    thumbnailLabel(index: number): string;
    previousSlideLabel: string;
    nextSlideLabel: string;
    showThumbnailsLabel: string;
    hideThumbnailsLabel: string;
    closeLabel: string;
  };
}

export interface WorkshopPresentation {
  lightbox?: ComponentType<WorkshopLightboxProps>;
  code?: ComponentType<Omit<CustomWidgetCodeEditorProps, "onChange" | "readOnly">>;
}

export type WorkshopGridState =
  | { status: "loading" }
  | { status: "failed"; pending: boolean; retry(): void }
  | { status: "held"; content: ReactNode }
  | { status: "loaded"; items: readonly WorkshopCardItem[] };

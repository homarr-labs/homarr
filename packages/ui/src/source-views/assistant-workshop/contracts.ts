import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "@mantine/core";

export type AssistantDotMatrixState =
  | "idle"
  | "loading"
  | "thinking"
  | "streaming"
  | "searching"
  | "syncing"
  | "connecting"
  | "waiting"
  | "uploading"
  | "downloading"
  | "listening"
  | "speaking"
  | "recording"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "paused"
  | "stopped"
  | "offline";

export interface AssistantDotMatrixProps extends Omit<ComponentProps<"output">, "children"> {
  state?: AssistantDotMatrixState;
  label?: string;
}

export interface WorkshopSubmissionCardViewProps {
  title: string;
  type: "customWidget" | "customCss";
  authorLabel: string;
  description: string;
  outdated: boolean;
  reportCount: number;
  screenshot: { url: string; alt: string } | null;
  outdatedLabel: string;
  reportWarningLabel: string;
  reportCountLabel: string;
  actions: ReactNode;
}

export type WorkshopSubmissionGridViewState =
  | { status: "loading"; source: "query" }
  | { status: "failed"; retryPending: boolean; onRetry(): void }
  | { status: "loaded"; cards: readonly ReactNode[] }
  | { status: "unavailable"; content: ReactNode };

export interface WorkshopSubmissionGridViewProps {
  state: WorkshopSubmissionGridViewState;
  ariaLabel: string;
  emptyState: ReactNode;
  cols?: StyleProp<number>;
  unavailableTitle: string;
  unavailableDescription: string;
  retryLabel: string;
}

export type WorkshopVoteDirection = 1 | -1;

export interface WorkshopVoteControlViewProps {
  score: number;
  ownVote: WorkshopVoteDirection | null;
  canVote: boolean;
  pending: boolean;
  pendingDirection: WorkshopVoteDirection | null;
  size?: "sm" | "md";
  upvoteLabel: string;
  downvoteLabel: string;
  scoreLabel: string;
  signInHint: string;
  onCastVote(value: WorkshopVoteDirection): void;
}

export type WorkshopReportCategory = "outdated" | "malicious" | "spam" | "copyright" | "inappropriate" | "other";

export interface WorkshopReportFormViewProps {
  opened: boolean;
  category: WorkshopReportCategory;
  explanation: string;
  error: string | null;
  pending: boolean;
  title: string;
  explanationLabel: string;
  reasonLabel: string;
  categoryLabels: Record<WorkshopReportCategory, string>;
  closeLabel: string;
  cancelLabel: string;
  sendLabel: string;
  onCategoryChange(value: WorkshopReportCategory): void;
  onExplanationChange(value: string): void;
  onClose(): void;
  onSubmit(): void;
}

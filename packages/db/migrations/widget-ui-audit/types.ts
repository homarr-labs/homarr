import type { WidgetKind } from "@homarr/definitions";

export const WIDGET_UI_AUDIT_SIZES = [
  { width: 1, height: 1 },
  { width: 1, height: 2 },
  { width: 2, height: 1 },
  { width: 2, height: 2 },
  { width: 2, height: 3 },
  { width: 3, height: 2 },
  { width: 3, height: 3 },
  { width: 5, height: 3 },
  { width: 3, height: 5 },
  { width: 5, height: 5 },
] as const;

export type WidgetUiAuditSize = (typeof WIDGET_UI_AUDIT_SIZES)[number];

export interface WidgetUiAuditFamily {
  id: string;
  name: string;
  description: string;
  kinds: readonly WidgetKind[];
}

export type WidgetUiAuditDataSource = "mock-integration-fixture" | "public-api" | "static-fixture";

export type WidgetUiAuditCaptureSet = "inventory" | "assistant-isolated";

export interface WidgetUiAuditItemMetadata {
  boardId: string;
  boardName: string;
  familyId: string;
  familyName: string;
  captureSet: WidgetUiAuditCaptureSet;
  itemId: string;
  kind: WidgetKind;
  width: number;
  height: number;
  dataSource: WidgetUiAuditDataSource;
}

export interface WidgetUiAuditIsolatedBoardMetadata {
  boardId: string;
  boardName: string;
  familyId: "assistant-isolated";
  familyName: "Assistant isolated size fixtures";
  captureSet: "assistant-isolated";
  itemId: string;
  kind: "assistant";
  width: number;
  height: number;
  dataSource: "static-fixture";
}

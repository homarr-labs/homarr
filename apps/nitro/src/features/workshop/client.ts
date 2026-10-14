import type { RouterClient } from "@orpc/server";

import type { BackendPrincipal } from "../../../../../packages/api/src/nitro/context";
import type { createCustomWidgetProcedures } from "../../../../../packages/api/src/nitro/routers/custom-widget";
import type { createIntegrationManagementProcedures } from "../../../../../packages/api/src/nitro/routers/integration";
import type { WorkshopBackend } from "../../../../../packages/workshop/src/backend";
import type { CustomWidgetSourceSetupValue } from "../../../../../packages/custom-widgets/src/workbench/source-setup";
import type * as Core from "../../../../../packages/custom-widgets/src/core/index";
import type * as Workbench from "../../../../../packages/custom-widgets/src/workbench/index";
import type { WorkshopPresentation } from "../../source-ui/workshop/contracts";
import type * as CommunitySchema from "../../../../../packages/workshop/src/schema";

export interface WorkshopFeatureClient {
  customWidget: RouterClient<
    Pick<
      ReturnType<typeof createCustomWidgetProcedures>,
      | "workshopSearch"
      | "workshopGet"
      | "workshopInstall"
      | "get"
      | "import"
      | "export"
      | "readTemplate"
      | "sourceConfigure"
      | "configurationRequestUser"
      | "previewCreate"
      | "previewGet"
      | "previewQuery"
      | "previewAction"
      | "previewJournal"
      | "createFromPreview"
      | "updateFromPreview"
    >
  >;
  integration: RouterClient<Pick<ReturnType<typeof createIntegrationManagementProcedures>, "all" | "getKinds">>;
}

export type WorkshopTransport =
  | { kind: "held" }
  | {
      kind: "available";
      authorityKey: string;
      client: Pick<
        WorkshopBackend,
        "list" | "get" | "create" | "update" | "listReportSummaries" | "fileUrl" | "currentUser"
      >;
    };

export type WorkshopCore = Pick<
  typeof Core,
  | "getCustomWidgetSourceSetups"
  | "applyCustomWidgetSourceSetup"
  | "getImportReview"
  | "parseCustomWidgetClipboardDetailed"
  | "formatCustomWidgetImportIssues"
  | "exportCustomWidgetDefinition"
>;

export type WorkshopWorkbench = Pick<
  typeof Workbench,
  "CustomWidgetSourceSetupPanel" | "createCustomWidgetSourceSetupValues" | "isCustomWidgetSourceSetupReady"
>;

export interface WorkshopFeatureBinding {
  client: WorkshopFeatureClient;
  principal: BackendPrincipal;
  authorityKey: string;
  readOnly: boolean;
  transport: WorkshopTransport;
  core: WorkshopCore;
  workbench: WorkshopWorkbench;
  presentation?: WorkshopPresentation;
  communitySchema?: Pick<typeof CommunitySchema, "validateWorkshopContent" | "workshopExportFilename">;
  onDefinitionsChanged(): void;
}

export type WorkshopWidget = Awaited<ReturnType<WorkshopFeatureClient["customWidget"]["export"]>>;
export type WorkshopDetail = Awaited<ReturnType<WorkshopFeatureClient["customWidget"]["workshopGet"]>>;
export type WorkshopSourceSetup = WorkshopDetail["sourceSetup"][number];
export type WorkshopSourceValue = CustomWidgetSourceSetupValue;
export type WorkshopSecrets = NonNullable<Parameters<WorkshopFeatureClient["customWidget"]["import"]>[0]["secrets"]>;
export type WorkshopPreview = Awaited<ReturnType<WorkshopFeatureClient["customWidget"]["previewCreate"]>>;

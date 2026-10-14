import type { lookup } from "node:dns/promises";

import type * as common from "@homarr/common";
import type * as database from "@homarr/db";
import type * as schema from "@homarr/db/schema";
import type * as definitions from "@homarr/definitions";
import type { DEFAULT_TIMETABLE_BASE_URL, normalizeTimetableBaseUrl } from "@homarr/request-handler/timetable-url";
import type { ServerSettings } from "@homarr/server-settings";
import type * as validation from "@homarr/validation/board";
import type { zodUnionFromArray } from "@homarr/validation/enums";
import type { sectionSchema, sharedItemSchema } from "@homarr/validation/shared";

export interface BoardMutationResources {
  readonly execution: {
    readonly kind: "hold";
    readonly reason: string;
  };
  readonly tables: Pick<
    typeof schema,
    | "boards"
    | "users"
    | "groups"
    | "groupMembers"
    | "boardUserPermissions"
    | "boardGroupPermissions"
    | "sections"
    | "layouts"
    | "items"
    | "itemLayouts"
    | "sectionLayouts"
    | "sectionCollapseStates"
    | "integrationItems"
    | "integrations"
    | "integrationUserPermissions"
    | "integrationGroupPermissions"
  >;
  readonly operators: Pick<typeof database, "eq" | "and" | "inArray" | "asc" | "not" | "isNull" | "sql">;
  readonly handleTransactionsAsync: typeof database.handleTransactionsAsync;
  readonly common: Pick<
    typeof common,
    "createId" | "generateResponsiveGridFor" | "getLayoutResizeSource" | "serializeLayoutResizeSource" | "isRecord"
  >;
  readonly definitions: Pick<
    typeof definitions,
    | "boardLanes"
    | "emptySuperJSON"
    | "everyoneGroup"
    | "getBoardLaneColumnCount"
    | "getRootSectionLane"
    | "getWidgetIntegrationIssue"
    | "getWidgetIntegrationIssueMessage"
    | "normalizeBoardLayoutRoles"
    | "rootSectionOffsets"
    | "widgetDefaultSizes"
    | "widgetKinds"
  >;
  readonly schemas: Pick<
    typeof validation,
    | "boardCreateSchema"
    | "boardDuplicateSchema"
    | "boardRenameSchema"
    | "boardChangeVisibilitySchema"
    | "boardByNameSchema"
    | "boardSaveLayoutsSchema"
    | "boardResetLayoutSchema"
    | "boardSavePartialSettingsSchema"
    | "boardSaveSchema"
    | "boardSavePermissionsSchema"
    | "addItemToBoardSchema"
    | "updateBoardItemLayoutSchema"
  > & {
    readonly sectionSchema: typeof sectionSchema;
    readonly sharedItemSchema: typeof sharedItemSchema;
    readonly zodUnionFromArray: typeof zodUnionFromArray;
  };
  readonly timetable: {
    readonly defaultBaseUrl: typeof DEFAULT_TIMETABLE_BASE_URL;
    readonly normalizeBaseUrl: typeof normalizeTimetableBaseUrl;
    readonly lookup: typeof lookup;
  };
  readonly logger: { warn(message: string, metadata: { error: string }): void };
  getBoardServerSettingsAsync(db: database.Database): Promise<ServerSettings["board"]>;
}

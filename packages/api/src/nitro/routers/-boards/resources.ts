import type { and, asc, eq, gt, gte, inArray, like, lt, or, sql } from "@homarr/db";
import type {
  apps,
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  itemLayouts,
  layouts,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import type {
  boardLanes,
  everyoneGroup,
  getBoardLaneColumnCount,
  getPermissionsWithChildren,
  getPermissionsWithParents,
  getRootSectionLane,
} from "@homarr/definitions";
import type { boardSettingsSchema, boardSummarySchema } from "@homarr/validation/board";
import type { byIdSchema } from "@homarr/validation/common";

import type { BackendContext, BackendPrincipal } from "../../context";

export interface BoardReadLease {
  readonly db: BackendContext["db"];
  readonly principal: BackendPrincipal;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface BoardProcedureResources {
  readonly tables: {
    readonly apps: typeof apps;
    readonly boardGroupPermissions: typeof boardGroupPermissions;
    readonly boards: typeof boards;
    readonly boardUserPermissions: typeof boardUserPermissions;
    readonly groupMembers: typeof groupMembers;
    readonly groupPermissions: typeof groupPermissions;
    readonly groups: typeof groups;
    readonly itemLayouts: typeof itemLayouts;
    readonly layouts: typeof layouts;
    readonly sectionLayouts: typeof sectionLayouts;
    readonly sections: typeof sections;
    readonly users: typeof users;
  };
  readonly operators: {
    readonly and: typeof and;
    readonly asc: typeof asc;
    readonly eq: typeof eq;
    readonly gt: typeof gt;
    readonly gte: typeof gte;
    readonly inArray: typeof inArray;
    readonly like: typeof like;
    readonly lt: typeof lt;
    readonly or: typeof or;
    readonly sql: typeof sql;
  };
  readonly definitions: {
    readonly boardLanes: typeof boardLanes;
    readonly everyoneGroup: typeof everyoneGroup;
    readonly getBoardLaneColumnCount: typeof getBoardLaneColumnCount;
    readonly getPermissionsWithChildren: typeof getPermissionsWithChildren;
    readonly getPermissionsWithParents: typeof getPermissionsWithParents;
    readonly getRootSectionLane: typeof getRootSectionLane;
  };
  readonly schemas: {
    readonly boardSettingsSchema: typeof boardSettingsSchema;
    readonly boardSummarySchema: typeof boardSummarySchema;
    readonly byIdSchema: typeof byIdSchema;
  };
  acquireReadAsync(context: BackendContext): Promise<BoardReadLease>;
}

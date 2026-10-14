import type { BoardProjection } from "../../contracts/schemas";

export const restPrefix = "/api";
export const boardReadPath = "/boards/{boardId}";
export const publicBoardRestPath = `${restPrefix}/boards/public`;
export const privateBoardRestPath = `${restPrefix}/boards/private`;
export const openApiVersion = "3.1.0";
export const fixtureCookieName = "nitro_fixture_session";

export const publicBoardExample: BoardProjection = {
  id: "public",
  visibility: "public",
  revision: 1,
  content: {
    label: "Public fixture dashboard",
    columns: 2,
    widget: { displayLabel: "Synthetic inventory" },
  },
  capabilities: { canEdit: false, variant: "public-reader" },
};

export const publicOwnerExample: BoardProjection = {
  ...publicBoardExample,
  capabilities: { canEdit: true, variant: "owner" },
};

export const privateBoardExample: BoardProjection = {
  ...publicBoardExample,
  id: "private",
  visibility: "private",
  content: { ...publicBoardExample.content, label: "Private fixture dashboard" },
  capabilities: { canEdit: true, variant: "owner" },
};

export const deniedBoardExample = {
  code: "FORBIDDEN",
  message: "Fixture access denied",
  data: { reason: "fixture-access-denied" },
};

import { sourcePortRows } from "../port-map";
import type { SourcePortRow } from "../port-map";

type SelectedRow<TRow extends SourcePortRow, TColumn extends 3 | 4> = TRow extends SourcePortRow
  ? TRow[TColumn] extends "-"
    ? never
    : TRow
  : never;

export type SelectedRestSourceRow = SelectedRow<SourcePortRow, 3>;
export type SelectedMcpSourceRow = SelectedRow<SourcePortRow, 4>;
export type SelectedRestSourcePath = SelectedRestSourceRow[0];
export type SelectedMcpSourcePath = SelectedMcpSourceRow[0];
export type SelectedSourcePath = SelectedRestSourcePath | SelectedMcpSourcePath;
export type SelectedMcpAlias = SelectedMcpSourceRow[4];

export const selectedRestSourceRows = Object.freeze(
  sourcePortRows.filter((row): row is SelectedRestSourceRow => row[3] !== "-"),
);

export const selectedMcpSourceRows = Object.freeze(
  sourcePortRows.filter((row): row is SelectedMcpSourceRow => row[4] !== "-"),
);

type RestSourceOperations = {
  readonly [TRow in SelectedRestSourceRow as TRow[0]]: readonly [
    TRow[3],
    "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    `/api/${string}`,
  ];
};

export const selectedRestOperations = Object.freeze({
  "app.getPaginated": ["R01", "GET", "/api/apps/paginated"],
  "app.all": ["R02", "GET", "/api/apps"],
  "app.search": ["R03", "GET", "/api/apps/search"],
  "app.selectable": ["R04", "GET", "/api/apps/selectable"],
  "app.byId": ["R05", "GET", "/api/apps/{id}"],
  "app.create": ["R06", "POST", "/api/apps"],
  "app.update": ["R07", "PATCH", "/api/apps/{id}"],
  "app.delete": ["R08", "DELETE", "/api/apps/{id}"],
  "board.getAllBoards": ["R09", "GET", "/api/boards"],
  "board.createBoard": ["R10", "POST", "/api/boards"],
  "board.duplicateBoard": ["R11", "POST", "/api/boards/{id}/duplicate"],
  "board.renameBoard": ["R12", "PATCH", "/api/boards/{id}/name"],
  "board.changeBoardVisibility": ["R13", "PATCH", "/api/boards/{id}/visibility"],
  "board.deleteBoard": ["R14", "DELETE", "/api/boards/{id}"],
  "board.setHomeBoard": ["R15", "PATCH", "/api/boards/{id}/home"],
  "board.setMobileHomeBoard": ["R16", "PATCH", "/api/boards/{id}/mobile-home"],
  "board.getBoardSettings": ["R17", "GET", "/api/boards/{id}/settings"],
  "board.saveLayouts": ["R18", "PUT", "/api/boards/{id}/layouts"],
  "board.resetLayout": ["R19", "POST", "/api/boards/{boardId}/layouts/{layoutId}/reset"],
  "board.savePartialBoardSettings": ["R20", "PATCH", "/api/boards/{id}/settings"],
  "board.saveBoard": ["R21", "PUT", "/api/boards/{id}/content"],
  "board.addItem": ["R22", "POST", "/api/boards/items"],
  "board.updateItemLayout": ["R23", "PATCH", "/api/boards/{boardId}/items/{itemId}/layouts/{layoutId}"],
  "info.getInfo": ["R24", "GET", "/api/info"],
  "invite.getAll": ["R25", "GET", "/api/invites"],
  "invite.createInvite": ["R26", "POST", "/api/invites"],
  "invite.deleteInvite": ["R27", "DELETE", "/api/invites/{id}"],
  "serverSettings.getBoardSettings": ["R28", "GET", "/api/settings/board"],
  "serverSettings.updateBoardSettings": ["R29", "PATCH", "/api/settings/board"],
  "user.create": ["R30", "POST", "/api/users"],
  "user.setProfileImage": ["R31", "PUT", "/api/users/profileImage"],
  "user.getAll": ["R32", "GET", "/api/users"],
  "user.selectable": ["R33", "GET", "/api/users/selectable"],
  "user.search": ["R34", "POST", "/api/users/search"],
  "user.getPreferences": ["R35", "GET", "/api/users/preferences"],
  "user.getById": ["R36", "GET", "/api/users/{userId}"],
  "user.editProfile": ["R37", "PUT", "/api/users/profile"],
  "user.delete": ["R38", "DELETE", "/api/users/{userId}"],
  "user.changePassword": ["R39", "PATCH", "/api/users/{userId}/changePassword"],
  "user.updatePreferences": ["R40", "PATCH", "/api/users/preferences"],
  "user.changeHomeBoards": ["R41", "PATCH", "/api/users/changeHome"],
  "user.changeDefaultSearchEngine": ["R42", "PATCH", "/api/users/changeSearchEngine"],
  "user.changeSearchPreferences": ["R43", "PATCH", "/api/users/search-preferences"],
  "user.changeColorScheme": ["R44", "PATCH", "/api/users/changeScheme"],
  "user.changeEnableRightClickOnWidgets": ["R45", "PATCH", "/api/users/right-click-widgets"],
  "user.changeHeaderPreferences": ["R46", "PATCH", "/api/users/header-preferences"],
  "user.changeDdgBangs": ["R47", "PATCH", "/api/users/ddg-bangs"],
  "user.changeFirstDayOfWeek": ["R48", "PATCH", "/api/users/firstDayOfWeek"],
  "certificates.getCertificate": ["R49", "GET", "/api/certificates/{fileName}"],
  "certificates.ensureRootCertificate": ["R50", "POST", "/api/certificates/root"],
  "integration.request": ["R51", "POST", "/api/integrations/request"],
  "integration.testConnection": ["R52", "GET", "/api/integrations/{id}/test-connection"],
} as const satisfies RestSourceOperations);

for (const operation of Object.values(selectedRestOperations)) Object.freeze(operation);

export function getSelectedRestOperation(path: SelectedSourcePath) {
  const row = selectedRestSourceRows.find((candidate) => candidate[0] === path);
  return row ? selectedRestOperations[row[0]] : undefined;
}

export function getSelectedMcpSourceRow(path: SelectedSourcePath) {
  return selectedMcpSourceRows.find((candidate) => candidate[0] === path);
}

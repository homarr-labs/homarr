import { appIntegrationBoardMode } from "./app-integration-board";
import { commandMode } from "./command";
import { externalMode } from "./external";
import { homeMode } from "./home";
import { mediaMode } from "./media";
import { pageMode } from "./page";
import { userGroupMode } from "./user-group";

export const searchModes = [
  userGroupMode,
  appIntegrationBoardMode,
  externalMode,
  commandMode,
  pageMode,
  mediaMode,
  homeMode,
] as const;

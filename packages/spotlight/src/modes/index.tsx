import { appIntegrationBoardMode } from "./app-integration-board";
import { commandMode } from "./command";
import { externalMode } from "./external";
import { homeMode } from "./home";
import { pageMode } from "./page";
import { userGroupMode } from "./user-group";

export const searchModes = [userGroupMode, appIntegrationBoardMode, externalMode, commandMode, pageMode, homeMode] as const;

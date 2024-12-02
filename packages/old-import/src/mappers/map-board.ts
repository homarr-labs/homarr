import type { InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db";
import type { boards } from "@homarr/db/schema/sqlite";

import type { prepareMultipleImports } from "../prepare/prepare-multiple";
import { mapColor } from "./map-colors";
import { mapColumnCount } from "./map-column-count";

type PreparedBoard = ReturnType<typeof prepareMultipleImports>["preparedBoards"][number];
export type ScreenSize = PreparedBoard["size"];

const boardSizeSuffix: Record<ScreenSize, string> = {
  lg: "large",
  md: "medium",
  sm: "small",
};

const mapBoardName = (fileName: string, screenSize: ScreenSize) => {
  return `${fileName.replace(".json", "")}-${boardSizeSuffix[screenSize]}`;
};

export const mapBoard = (preparedBoard: PreparedBoard): InferInsertModel<typeof boards> => ({
  id: createId(),
  name: mapBoardName(preparedBoard.name, preparedBoard.size),
  backgroundImageAttachment: preparedBoard.config.settings.customization.backgroundImageAttachment,
  backgroundImageUrl: preparedBoard.config.settings.customization.backgroundImageUrl,
  backgroundImageRepeat: preparedBoard.config.settings.customization.backgroundImageRepeat,
  backgroundImageSize: preparedBoard.config.settings.customization.backgroundImageSize,
  columnCount: mapColumnCount(preparedBoard.config, preparedBoard.size),
  faviconImageUrl: preparedBoard.config.settings.customization.faviconUrl,
  isPublic: preparedBoard.config.settings.access.allowGuests,
  logoImageUrl: preparedBoard.config.settings.customization.logoImageUrl,
  pageTitle: preparedBoard.config.settings.customization.pageTitle,
  metaTitle: preparedBoard.config.settings.customization.metaTitle,
  opacity: preparedBoard.config.settings.customization.appOpacity,
  primaryColor: mapColor(preparedBoard.config.settings.customization.colors.primary, "#fa5252"),
  secondaryColor: mapColor(preparedBoard.config.settings.customization.colors.secondary, "#fd7e14"),
});

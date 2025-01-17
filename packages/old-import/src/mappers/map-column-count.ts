import type { OldmarrConfig } from "@homarr/old-schema";

import type { OldmarrImportConfiguration } from "../settings";

export const mapColumnCount = (old: OldmarrConfig, screenSize: OldmarrImportConfiguration["screenSize"]) => {
  switch (screenSize) {
    case "lg":
      return old.settings.customization.gridstack.columnCountLarge;
    case "md":
      return old.settings.customization.gridstack.columnCountMedium;
    case "sm":
      return old.settings.customization.gridstack.columnCountSmall;
    default:
      return 10;
  }
};
